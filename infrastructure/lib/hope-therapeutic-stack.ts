import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface HopeTherapeuticStackProps extends cdk.StackProps {
  domainName?: string;
  certificateArn?: string; // Required for HTTPS - get from AWS Certificate Manager
}

export class HopeTherapeuticStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: HopeTherapeuticStackProps) {
    super(scope, id, props);

    // ===========================================
    // CDK Parameters for Easy Configuration
    // ===========================================

    const domainNameParam = new cdk.CfnParameter(this, 'DomainName', {
      type: 'String',
      description: 'Domain name for the application (e.g., myapp.example.com). Leave empty for HTTP-only deployment.',
      default: '',
    });

    const certificateArnParam = new cdk.CfnParameter(this, 'CertificateArn', {
      type: 'String',
      description: 'ARN of the SSL certificate from AWS Certificate Manager. Required if domain name is provided.',
      default: '',
    });

    const enableHttpsParam = new cdk.CfnParameter(this, 'EnableHttps', {
      type: 'String',
      description: 'Enable HTTPS (required for microphone access in browsers)',
      default: 'false',
      allowedValues: ['true', 'false'],
    });

    // Get parameter values
    const domainName = domainNameParam.valueAsString;
    const certificateArn = certificateArnParam.valueAsString;
    const enableHttps = enableHttpsParam.valueAsString === 'true';

    // ===========================================
    // KMS Key for Therapeutic Data Encryption
    // ===========================================
    const therapeuticDataKey = new kms.Key(this, 'TherapeuticDataKey', {
      description: 'Hope AI Therapeutic Transcript Encryption Key',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep encryption keys for compliance
    });

    // Add key alias for easier management
    new kms.Alias(this, 'TherapeuticDataKeyAlias', {
      aliasName: 'alias/hope-therapeutic-data',
      targetKey: therapeuticDataKey,
    });

    // ===========================================
    // DynamoDB Tables
    // ===========================================

    // Users Table
    const usersTable = new dynamodb.Table(this, 'TherapeuticUsersTable', {
      tableName: 'therapeutic-wave-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Protect user data
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Add GSI for anonymous users
    usersTable.addGlobalSecondaryIndex({
      indexName: 'isAnonymous-lastActiveAt-index',
      partitionKey: { name: 'isAnonymous', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastActiveAt', type: dynamodb.AttributeType.STRING },
    });

    // Sessions Table
    const sessionsTable = new dynamodb.Table(this, 'TherapeuticSessionsTable', {
      tableName: 'therapeutic-wave-sessions',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: therapeuticDataKey, // Use our KMS key for sessions
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Protect therapeutic data
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Add GSI for user sessions lookup (legacy - keep for backward compatibility)
    sessionsTable.addGlobalSecondaryIndex({
      indexName: 'userId-startTime-index',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // Add new GSI with direct field names for cleaner queries
    sessionsTable.addGlobalSecondaryIndex({
      indexName: 'userId-startTime-direct-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'startTime', type: dynamodb.AttributeType.STRING },
    });

    // ===========================================
    // VPC and Networking
    // ===========================================
    const vpc = new ec2.Vpc(this, 'HopeTherapeuticVPC', {
      maxAzs: 3,
      natGateways: 2, // High availability
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // ===========================================
    // ECS Cluster
    // ===========================================
    const cluster = new ecs.Cluster(this, 'HopeTherapeuticCluster', {
      vpc,
      clusterName: 'hope-therapeutic-cluster',
      containerInsights: true, // Enable CloudWatch Container Insights
    });

    // ===========================================
    // IAM Role for ECS Tasks
    // ===========================================
    const taskRole = new iam.Role(this, 'HopeTherapeuticTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for Hope Therapeutic ECS tasks',
    });

    // Bedrock permissions
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-sonic-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-micro-v1:0`,
      ],
    }));

    // DynamoDB permissions
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        usersTable.tableArn,
        sessionsTable.tableArn,
        `${usersTable.tableArn}/index/*`,
        `${sessionsTable.tableArn}/index/*`,
      ],
    }));

    // KMS permissions for therapeutic data
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kms:Encrypt',
        'kms:Decrypt',
        'kms:ReEncrypt*',
        'kms:GenerateDataKey*',
        'kms:DescribeKey',
      ],
      resources: [therapeuticDataKey.keyArn],
    }));

    // CloudWatch Logs permissions
    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    // ===========================================
    // CloudWatch Log Group
    // ===========================================
    const logGroup = new logs.LogGroup(this, 'HopeTherapeuticLogGroup', {
      logGroupName: '/ecs/hope-therapeutic',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ===========================================
    // ECS Service with Application Load Balancer
    // ===========================================
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'HopeTherapeuticService', {
      cluster,
      serviceName: 'hope-therapeutic-service',
      cpu: 1024, // 1 vCPU
      memoryLimitMiB: 2048, // 2 GB RAM
      desiredCount: 1,
      publicLoadBalancer: true,

      // Task Definition
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('..', {
          file: 'Dockerfile',
        }),
        containerPort: 3000,
        taskRole,
        environment: {
          NODE_ENV: 'production',
          AWS_REGION: this.region,
          DYNAMODB_USERS_TABLE: usersTable.tableName,
          DYNAMODB_SESSIONS_TABLE: sessionsTable.tableName,
          KMS_KEY_ID: therapeuticDataKey.keyId,
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'hope-therapeutic',
          logGroup,
        }),
      },

      // Load Balancer Configuration - Always start with HTTP, add HTTPS listener separately
      protocol: elbv2.ApplicationProtocol.HTTP,

      // Health Check
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    // ===========================================
    // Configure ALB for WebSocket Support
    // ===========================================

    // Set ALB idle timeout to 300 seconds (5 minutes) for WebSocket connections
    fargateService.loadBalancer.setAttribute('idle_timeout.timeout_seconds', '300');

    // Disable HTTP/2 to ensure WebSocket compatibility (WebSockets require HTTP/1.1)
    fargateService.loadBalancer.setAttribute('routing.http2.enabled', 'false');

    // ===========================================
    // Add HTTPS Listener (always create when certificate ARN is provided)
    // ===========================================

    // Create HTTPS listener conditionally using CDK conditions
    const httpsCondition = new cdk.CfnCondition(this, 'EnableHttpsCondition', {
      expression: cdk.Fn.conditionAnd(
        cdk.Fn.conditionEquals(enableHttpsParam.valueAsString, 'true'),
        cdk.Fn.conditionNot(cdk.Fn.conditionEquals(certificateArnParam.valueAsString, ''))
      ),
    });

    // Import the certificate (will only be used if condition is true)
    const certificate = certificatemanager.Certificate.fromCertificateArn(
      this,
      'ImportedCertificate',
      certificateArnParam.valueAsString
    );

    // Create HTTPS listener
    const httpsListener = new elbv2.CfnListener(this, 'HttpsListener', {
      loadBalancerArn: fargateService.loadBalancer.loadBalancerArn,
      port: 443,
      protocol: 'HTTPS',
      certificates: [{
        certificateArn: certificateArnParam.valueAsString,
      }],
      defaultActions: [{
        type: 'forward',
        targetGroupArn: fargateService.targetGroup.targetGroupArn,
      }],
    });

    // Apply condition to HTTPS listener
    httpsListener.cfnOptions.condition = httpsCondition;

    // Create security group rule for HTTPS
    const httpsSecurityGroupRule = new ec2.CfnSecurityGroupIngress(this, 'HttpsSecurityGroupRule', {
      groupId: fargateService.loadBalancer.connections.securityGroups[0].securityGroupId,
      ipProtocol: 'tcp',
      fromPort: 443,
      toPort: 443,
      cidrIp: '0.0.0.0/0',
      description: 'Allow HTTPS traffic from anywhere',
    });

    // Apply condition to security group rule
    httpsSecurityGroupRule.cfnOptions.condition = httpsCondition;

    // Create HTTP to HTTPS redirect rule
    const redirectRule = new elbv2.CfnListenerRule(this, 'HttpToHttpsRedirect', {
      listenerArn: fargateService.listener.listenerArn,
      priority: 1,
      conditions: [{
        field: 'path-pattern',
        values: ['*'],
      }],
      actions: [{
        type: 'redirect',
        redirectConfig: {
          protocol: 'HTTPS',
          port: '443',
          statusCode: 'HTTP_301',
        },
      }],
    });

    // Apply condition to redirect rule
    redirectRule.cfnOptions.condition = httpsCondition;

    // ===========================================
    // Configure Target Group for WebSocket Support
    // ===========================================

    // Configure health checks for ECS containers
    fargateService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(10), // Increased timeout for container startup delays
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5, // Increased threshold for stable connections
    });

    // Enable sticky sessions with cookie-based session affinity for WebSocket connections
    fargateService.targetGroup.setAttribute('stickiness.enabled', 'true');
    fargateService.targetGroup.setAttribute('stickiness.type', 'lb_cookie');
    fargateService.targetGroup.setAttribute('stickiness.lb_cookie.duration_seconds', '3600'); // 1 hour duration

    // ===========================================
    // Auto Scaling
    // ===========================================
    const scalableTarget = fargateService.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 20,
    });

    // Scale based on CPU utilization
    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(2),
    });

    // Scale based on memory utilization
    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(2),
    });

    // ===========================================
    // CloudWatch Alarms and Monitoring
    // ===========================================

    // High CPU Alarm
    new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      metric: fargateService.service.metricCpuUtilization(),
      threshold: 85,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High CPU utilization in Hope Therapeutic service',
    });

    // High Memory Alarm
    new cloudwatch.Alarm(this, 'HighMemoryAlarm', {
      metric: fargateService.service.metricMemoryUtilization(),
      threshold: 90,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'High memory utilization in Hope Therapeutic service',
    });

    // DynamoDB Throttling Alarms
    new cloudwatch.Alarm(this, 'UsersTableThrottleAlarm', {
      metric: usersTable.metricThrottledRequestsForOperations({
        operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.GET_ITEM],
      }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'DynamoDB throttling on users table',
    });

    new cloudwatch.Alarm(this, 'SessionsTableThrottleAlarm', {
      metric: sessionsTable.metricThrottledRequestsForOperations({
        operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.GET_ITEM, dynamodb.Operation.QUERY],
      }),
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'DynamoDB throttling on sessions table',
    });

    // ===========================================
    // Route 53 (Optional) - Only create if domain is provided and not a token
    // ===========================================
    if (domainName && domainName.length > 0 && !cdk.Token.isUnresolved(domainName)) {
      // Extract the root domain for hosted zone lookup
      const domainParts = domainName.split('.');
      const rootDomain = domainParts.slice(-2).join('.');

      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: rootDomain,
      });

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.LoadBalancerTarget(fargateService.loadBalancer)
        ),
      });
    }

    // ===========================================
    // Outputs
    // ===========================================
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'DNS name of the load balancer',
      exportName: 'HopeTherapeuticLoadBalancerDNS',
    });

    new cdk.CfnOutput(this, 'ServiceURL', {
      value: cdk.Fn.conditionIf(
        httpsCondition.logicalId,
        `https://${domainNameParam.valueAsString}`,
        `http://${domainNameParam.valueAsString}`
      ).toString(),
      description: 'URL of the Hope Therapeutic service',
      exportName: 'HopeTherapeuticServiceURL',
    });

    new cdk.CfnOutput(this, 'LoadBalancerURL', {
      value: cdk.Fn.conditionIf(
        httpsCondition.logicalId,
        `https://${fargateService.loadBalancer.loadBalancerDnsName}`,
        `http://${fargateService.loadBalancer.loadBalancerDnsName}`
      ).toString(),
      description: 'Direct load balancer URL (use this if domain is not configured)',
      exportName: 'HopeTherapeuticLoadBalancerURL',
    });

    // HTTPS-specific outputs (only created when HTTPS is enabled)
    new cdk.CfnOutput(this, 'HttpsURL', {
      value: `https://${fargateService.loadBalancer.loadBalancerDnsName}`,
      description: 'HTTPS URL for secure microphone access',
      condition: httpsCondition,
    });

    new cdk.CfnOutput(this, 'HttpURL', {
      value: `http://${fargateService.loadBalancer.loadBalancerDnsName}`,
      description: 'HTTP URL (will redirect to HTTPS)',
      condition: httpsCondition,
    });

    new cdk.CfnOutput(this, 'KMSKeyId', {
      value: therapeuticDataKey.keyId,
      description: 'KMS Key ID for therapeutic data encryption',
      exportName: 'HopeTherapeuticKMSKeyId',
    });

    new cdk.CfnOutput(this, 'KMSKeyArn', {
      value: therapeuticDataKey.keyArn,
      description: 'KMS Key ARN for therapeutic data encryption',
      exportName: 'HopeTherapeuticKMSKeyArn',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      description: 'DynamoDB Users Table Name',
      exportName: 'HopeTherapeuticUsersTable',
    });

    new cdk.CfnOutput(this, 'SessionsTableName', {
      value: sessionsTable.tableName,
      description: 'DynamoDB Sessions Table Name',
      exportName: 'HopeTherapeuticSessionsTable',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: 'HopeTherapeuticClusterName',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: fargateService.service.serviceName,
      description: 'ECS Service Name',
      exportName: 'HopeTherapeuticServiceName',
    });
  }
}