"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HopeTherapeuticStack = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const ecsPatterns = require("aws-cdk-lib/aws-ecs-patterns");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const kms = require("aws-cdk-lib/aws-kms");
const iam = require("aws-cdk-lib/aws-iam");
const logs = require("aws-cdk-lib/aws-logs");
const cloudwatch = require("aws-cdk-lib/aws-cloudwatch");
const route53 = require("aws-cdk-lib/aws-route53");
const route53Targets = require("aws-cdk-lib/aws-route53-targets");
const certificatemanager = require("aws-cdk-lib/aws-certificatemanager");
class HopeTherapeuticStack extends cdk.Stack {
    constructor(scope, id, props) {
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
            removalPolicy: cdk.RemovalPolicy.RETAIN,
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
            encryptionKey: therapeuticDataKey,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
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
            natGateways: 2,
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
            cpu: 1024,
            memoryLimitMiB: 2048,
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
            expression: cdk.Fn.conditionAnd(cdk.Fn.conditionEquals(enableHttpsParam.valueAsString, 'true'), cdk.Fn.conditionNot(cdk.Fn.conditionEquals(certificateArnParam.valueAsString, ''))),
        });
        // Import the certificate (will only be used if condition is true)
        const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'ImportedCertificate', certificateArnParam.valueAsString);
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
            timeout: cdk.Duration.seconds(10),
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
                target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(fargateService.loadBalancer)),
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
            value: cdk.Fn.conditionIf(httpsCondition.logicalId, `https://${domainNameParam.valueAsString}`, `http://${domainNameParam.valueAsString}`).toString(),
            description: 'URL of the Hope Therapeutic service',
            exportName: 'HopeTherapeuticServiceURL',
        });
        new cdk.CfnOutput(this, 'LoadBalancerURL', {
            value: cdk.Fn.conditionIf(httpsCondition.logicalId, `https://${fargateService.loadBalancer.loadBalancerDnsName}`, `http://${fargateService.loadBalancer.loadBalancerDnsName}`).toString(),
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
exports.HopeTherapeuticStack = HopeTherapeuticStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9wZS10aGVyYXBldXRpYy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvcGUtdGhlcmFwZXV0aWMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsNERBQTREO0FBQzVELGdFQUFnRTtBQUNoRSxxREFBcUQ7QUFDckQsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyw2Q0FBNkM7QUFDN0MseURBQXlEO0FBQ3pELG1EQUFtRDtBQUNuRCxrRUFBa0U7QUFDbEUseUVBQXlFO0FBUXpFLE1BQWEsb0JBQXFCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDakQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFpQztRQUN6RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4Q0FBOEM7UUFDOUMsd0NBQXdDO1FBQ3hDLDhDQUE4QztRQUU5QyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUMvRCxJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxrR0FBa0c7WUFDL0csT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFFSCxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDdkUsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsK0ZBQStGO1lBQzVHLE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO1FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNqRSxJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSwyREFBMkQ7WUFDeEUsT0FBTyxFQUFFLE9BQU87WUFDaEIsYUFBYSxF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b3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgZWNzUGF0dGVybnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcy1wYXR0ZXJucyc7XG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgcm91dGU1M1RhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBjZXJ0aWZpY2F0ZW1hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBIb3BlVGhlcmFwZXV0aWNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBkb21haW5OYW1lPzogc3RyaW5nO1xuICBjZXJ0aWZpY2F0ZUFybj86IHN0cmluZzsgLy8gUmVxdWlyZWQgZm9yIEhUVFBTIC0gZ2V0IGZyb20gQVdTIENlcnRpZmljYXRlIE1hbmFnZXJcbn1cblxuZXhwb3J0IGNsYXNzIEhvcGVUaGVyYXBldXRpY1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBIb3BlVGhlcmFwZXV0aWNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQ0RLIFBhcmFtZXRlcnMgZm9yIEVhc3kgQ29uZmlndXJhdGlvblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGNvbnN0IGRvbWFpbk5hbWVQYXJhbSA9IG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdEb21haW5OYW1lJywge1xuICAgICAgdHlwZTogJ1N0cmluZycsXG4gICAgICBkZXNjcmlwdGlvbjogJ0RvbWFpbiBuYW1lIGZvciB0aGUgYXBwbGljYXRpb24gKGUuZy4sIG15YXBwLmV4YW1wbGUuY29tKS4gTGVhdmUgZW1wdHkgZm9yIEhUVFAtb25seSBkZXBsb3ltZW50LicsXG4gICAgICBkZWZhdWx0OiAnJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNlcnRpZmljYXRlQXJuUGFyYW0gPSBuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnQ2VydGlmaWNhdGVBcm4nLCB7XG4gICAgICB0eXBlOiAnU3RyaW5nJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBTU0wgY2VydGlmaWNhdGUgZnJvbSBBV1MgQ2VydGlmaWNhdGUgTWFuYWdlci4gUmVxdWlyZWQgaWYgZG9tYWluIG5hbWUgaXMgcHJvdmlkZWQuJyxcbiAgICAgIGRlZmF1bHQ6ICcnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZW5hYmxlSHR0cHNQYXJhbSA9IG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdFbmFibGVIdHRwcycsIHtcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxuICAgICAgZGVzY3JpcHRpb246ICdFbmFibGUgSFRUUFMgKHJlcXVpcmVkIGZvciBtaWNyb3Bob25lIGFjY2VzcyBpbiBicm93c2VycyknLFxuICAgICAgZGVmYXVsdDogJ2ZhbHNlJyxcbiAgICAgIGFsbG93ZWRWYWx1ZXM6IFsndHJ1ZScsICdmYWxzZSddLFxuICAgIH0pO1xuXG4gICAgLy8gR2V0IHBhcmFtZXRlciB2YWx1ZXNcbiAgICBjb25zdCBkb21haW5OYW1lID0gZG9tYWluTmFtZVBhcmFtLnZhbHVlQXNTdHJpbmc7XG4gICAgY29uc3QgY2VydGlmaWNhdGVBcm4gPSBjZXJ0aWZpY2F0ZUFyblBhcmFtLnZhbHVlQXNTdHJpbmc7XG4gICAgY29uc3QgZW5hYmxlSHR0cHMgPSBlbmFibGVIdHRwc1BhcmFtLnZhbHVlQXNTdHJpbmcgPT09ICd0cnVlJztcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBLTVMgS2V5IGZvciBUaGVyYXBldXRpYyBEYXRhIEVuY3J5cHRpb25cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgdGhlcmFwZXV0aWNEYXRhS2V5ID0gbmV3IGttcy5LZXkodGhpcywgJ1RoZXJhcGV1dGljRGF0YUtleScsIHtcbiAgICAgIGRlc2NyaXB0aW9uOiAnSG9wZSBBSSBUaGVyYXBldXRpYyBUcmFuc2NyaXB0IEVuY3J5cHRpb24gS2V5JyxcbiAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLCAvLyBLZWVwIGVuY3J5cHRpb24ga2V5cyBmb3IgY29tcGxpYW5jZVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGtleSBhbGlhcyBmb3IgZWFzaWVyIG1hbmFnZW1lbnRcbiAgICBuZXcga21zLkFsaWFzKHRoaXMsICdUaGVyYXBldXRpY0RhdGFLZXlBbGlhcycsIHtcbiAgICAgIGFsaWFzTmFtZTogJ2FsaWFzL2hvcGUtdGhlcmFwZXV0aWMtZGF0YScsXG4gICAgICB0YXJnZXRLZXk6IHRoZXJhcGV1dGljRGF0YUtleSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBVc2VycyBUYWJsZVxuICAgIGNvbnN0IHVzZXJzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1RoZXJhcGV1dGljVXNlcnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3RoZXJhcGV1dGljLXdhdmUtdXNlcnMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sIC8vIFByb3RlY3QgdXNlciBkYXRhXG4gICAgICBzdHJlYW06IGR5bmFtb2RiLlN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBHU0kgZm9yIGFub255bW91cyB1c2Vyc1xuICAgIHVzZXJzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnaXNBbm9ueW1vdXMtbGFzdEFjdGl2ZUF0LWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaXNBbm9ueW1vdXMnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnbGFzdEFjdGl2ZUF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIFNlc3Npb25zIFRhYmxlXG4gICAgY29uc3Qgc2Vzc2lvbnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVGhlcmFwZXV0aWNTZXNzaW9uc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAndGhlcmFwZXV0aWMtd2F2ZS1zZXNzaW9ucycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Nlc3Npb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkNVU1RPTUVSX01BTkFHRUQsXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGVyYXBldXRpY0RhdGFLZXksIC8vIFVzZSBvdXIgS01TIGtleSBmb3Igc2Vzc2lvbnNcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sIC8vIFByb3RlY3QgdGhlcmFwZXV0aWMgZGF0YVxuICAgICAgc3RyZWFtOiBkeW5hbW9kYi5TdHJlYW1WaWV3VHlwZS5ORVdfQU5EX09MRF9JTUFHRVMsXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgR1NJIGZvciB1c2VyIHNlc3Npb25zIGxvb2t1cCAobGVnYWN5IC0ga2VlcCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICBzZXNzaW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC1zdGFydFRpbWUtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdHU0kxUEsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnR1NJMVNLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBuZXcgR1NJIHdpdGggZGlyZWN0IGZpZWxkIG5hbWVzIGZvciBjbGVhbmVyIHF1ZXJpZXNcbiAgICBzZXNzaW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC1zdGFydFRpbWUtZGlyZWN0LWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3N0YXJ0VGltZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gVlBDIGFuZCBOZXR3b3JraW5nXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdIb3BlVGhlcmFwZXV0aWNWUEMnLCB7XG4gICAgICBtYXhBenM6IDMsXG4gICAgICBuYXRHYXRld2F5czogMiwgLy8gSGlnaCBhdmFpbGFiaWxpdHlcbiAgICAgIGVuYWJsZURuc0hvc3RuYW1lczogdHJ1ZSxcbiAgICAgIGVuYWJsZURuc1N1cHBvcnQ6IHRydWUsXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogJ1B1YmxpYycsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgIG5hbWU6ICdQcml2YXRlJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBFQ1MgQ2x1c3RlclxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdIb3BlVGhlcmFwZXV0aWNDbHVzdGVyJywge1xuICAgICAgdnBjLFxuICAgICAgY2x1c3Rlck5hbWU6ICdob3BlLXRoZXJhcGV1dGljLWNsdXN0ZXInLFxuICAgICAgY29udGFpbmVySW5zaWdodHM6IHRydWUsIC8vIEVuYWJsZSBDbG91ZFdhdGNoIENvbnRhaW5lciBJbnNpZ2h0c1xuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIElBTSBSb2xlIGZvciBFQ1MgVGFza3NcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgdGFza1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0hvcGVUaGVyYXBldXRpY1Rhc2tSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyksXG4gICAgICBkZXNjcmlwdGlvbjogJ1JvbGUgZm9yIEhvcGUgVGhlcmFwZXV0aWMgRUNTIHRhc2tzJyxcbiAgICB9KTtcblxuICAgIC8vIEJlZHJvY2sgcGVybWlzc2lvbnNcbiAgICB0YXNrUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJyxcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW1xuICAgICAgICBgYXJuOmF3czpiZWRyb2NrOiR7dGhpcy5yZWdpb259Ojpmb3VuZGF0aW9uLW1vZGVsL2FtYXpvbi5ub3ZhLXNvbmljLXYxOjBgLFxuICAgICAgICBgYXJuOmF3czpiZWRyb2NrOiR7dGhpcy5yZWdpb259Ojpmb3VuZGF0aW9uLW1vZGVsL2FtYXpvbi5ub3ZhLW1pY3JvLXYxOjBgLFxuICAgICAgXSxcbiAgICB9KSk7XG5cbiAgICAvLyBEeW5hbW9EQiBwZXJtaXNzaW9uc1xuICAgIHRhc2tSb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxuICAgICAgICAnZHluYW1vZGI6U2NhbicsXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgIHVzZXJzVGFibGUudGFibGVBcm4sXG4gICAgICAgIHNlc3Npb25zVGFibGUudGFibGVBcm4sXG4gICAgICAgIGAke3VzZXJzVGFibGUudGFibGVBcm59L2luZGV4LypgLFxuICAgICAgICBgJHtzZXNzaW9uc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcbiAgICAgIF0sXG4gICAgfSkpO1xuXG4gICAgLy8gS01TIHBlcm1pc3Npb25zIGZvciB0aGVyYXBldXRpYyBkYXRhXG4gICAgdGFza1JvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAna21zOkVuY3J5cHQnLFxuICAgICAgICAna21zOkRlY3J5cHQnLFxuICAgICAgICAna21zOlJlRW5jcnlwdConLFxuICAgICAgICAna21zOkdlbmVyYXRlRGF0YUtleSonLFxuICAgICAgICAna21zOkRlc2NyaWJlS2V5JyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFt0aGVyYXBldXRpY0RhdGFLZXkua2V5QXJuXSxcbiAgICB9KSk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIExvZ3MgcGVybWlzc2lvbnNcbiAgICB0YXNrUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDbG91ZFdhdGNoIExvZyBHcm91cFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdIb3BlVGhlcmFwZXV0aWNMb2dHcm91cCcsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9lY3MvaG9wZS10aGVyYXBldXRpYycsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEgsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEVDUyBTZXJ2aWNlIHdpdGggQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlclxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBmYXJnYXRlU2VydmljZSA9IG5ldyBlY3NQYXR0ZXJucy5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlZEZhcmdhdGVTZXJ2aWNlKHRoaXMsICdIb3BlVGhlcmFwZXV0aWNTZXJ2aWNlJywge1xuICAgICAgY2x1c3RlcixcbiAgICAgIHNlcnZpY2VOYW1lOiAnaG9wZS10aGVyYXBldXRpYy1zZXJ2aWNlJyxcbiAgICAgIGNwdTogMTAyNCwgLy8gMSB2Q1BVXG4gICAgICBtZW1vcnlMaW1pdE1pQjogMjA0OCwgLy8gMiBHQiBSQU1cbiAgICAgIGRlc2lyZWRDb3VudDogMSxcbiAgICAgIHB1YmxpY0xvYWRCYWxhbmNlcjogdHJ1ZSxcblxuICAgICAgLy8gVGFzayBEZWZpbml0aW9uXG4gICAgICB0YXNrSW1hZ2VPcHRpb25zOiB7XG4gICAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbUFzc2V0KCcuLicsIHtcbiAgICAgICAgICBmaWxlOiAnRG9ja2VyZmlsZScsXG4gICAgICAgIH0pLFxuICAgICAgICBjb250YWluZXJQb3J0OiAzMDAwLFxuICAgICAgICB0YXNrUm9sZSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICAgIEFXU19SRUdJT046IHRoaXMucmVnaW9uLFxuICAgICAgICAgIERZTkFNT0RCX1VTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICBEWU5BTU9EQl9TRVNTSU9OU19UQUJMRTogc2Vzc2lvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgS01TX0tFWV9JRDogdGhlcmFwZXV0aWNEYXRhS2V5LmtleUlkLFxuICAgICAgICB9LFxuICAgICAgICBsb2dEcml2ZXI6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xuICAgICAgICAgIHN0cmVhbVByZWZpeDogJ2hvcGUtdGhlcmFwZXV0aWMnLFxuICAgICAgICAgIGxvZ0dyb3VwLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG5cbiAgICAgIC8vIExvYWQgQmFsYW5jZXIgQ29uZmlndXJhdGlvbiAtIEFsd2F5cyBzdGFydCB3aXRoIEhUVFAsIGFkZCBIVFRQUyBsaXN0ZW5lciBzZXBhcmF0ZWx5XG4gICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxuXG4gICAgICAvLyBIZWFsdGggQ2hlY2tcbiAgICAgIGhlYWx0aENoZWNrR3JhY2VQZXJpb2Q6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDb25maWd1cmUgQUxCIGZvciBXZWJTb2NrZXQgU3VwcG9ydFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIFNldCBBTEIgaWRsZSB0aW1lb3V0IHRvIDMwMCBzZWNvbmRzICg1IG1pbnV0ZXMpIGZvciBXZWJTb2NrZXQgY29ubmVjdGlvbnNcbiAgICBmYXJnYXRlU2VydmljZS5sb2FkQmFsYW5jZXIuc2V0QXR0cmlidXRlKCdpZGxlX3RpbWVvdXQudGltZW91dF9zZWNvbmRzJywgJzMwMCcpO1xuXG4gICAgLy8gRGlzYWJsZSBIVFRQLzIgdG8gZW5zdXJlIFdlYlNvY2tldCBjb21wYXRpYmlsaXR5IChXZWJTb2NrZXRzIHJlcXVpcmUgSFRUUC8xLjEpXG4gICAgZmFyZ2F0ZVNlcnZpY2UubG9hZEJhbGFuY2VyLnNldEF0dHJpYnV0ZSgncm91dGluZy5odHRwMi5lbmFibGVkJywgJ2ZhbHNlJyk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQWRkIEhUVFBTIExpc3RlbmVyIChhbHdheXMgY3JlYXRlIHdoZW4gY2VydGlmaWNhdGUgQVJOIGlzIHByb3ZpZGVkKVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBcbiAgICAvLyBDcmVhdGUgSFRUUFMgbGlzdGVuZXIgY29uZGl0aW9uYWxseSB1c2luZyBDREsgY29uZGl0aW9uc1xuICAgIGNvbnN0IGh0dHBzQ29uZGl0aW9uID0gbmV3IGNkay5DZm5Db25kaXRpb24odGhpcywgJ0VuYWJsZUh0dHBzQ29uZGl0aW9uJywge1xuICAgICAgZXhwcmVzc2lvbjogY2RrLkZuLmNvbmRpdGlvbkFuZChcbiAgICAgICAgY2RrLkZuLmNvbmRpdGlvbkVxdWFscyhlbmFibGVIdHRwc1BhcmFtLnZhbHVlQXNTdHJpbmcsICd0cnVlJyksXG4gICAgICAgIGNkay5Gbi5jb25kaXRpb25Ob3QoY2RrLkZuLmNvbmRpdGlvbkVxdWFscyhjZXJ0aWZpY2F0ZUFyblBhcmFtLnZhbHVlQXNTdHJpbmcsICcnKSlcbiAgICAgICksXG4gICAgfSk7XG5cbiAgICAvLyBJbXBvcnQgdGhlIGNlcnRpZmljYXRlICh3aWxsIG9ubHkgYmUgdXNlZCBpZiBjb25kaXRpb24gaXMgdHJ1ZSlcbiAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IGNlcnRpZmljYXRlbWFuYWdlci5DZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oXG4gICAgICB0aGlzLCBcbiAgICAgICdJbXBvcnRlZENlcnRpZmljYXRlJywgXG4gICAgICBjZXJ0aWZpY2F0ZUFyblBhcmFtLnZhbHVlQXNTdHJpbmdcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIEhUVFBTIGxpc3RlbmVyXG4gICAgY29uc3QgaHR0cHNMaXN0ZW5lciA9IG5ldyBlbGJ2Mi5DZm5MaXN0ZW5lcih0aGlzLCAnSHR0cHNMaXN0ZW5lcicsIHtcbiAgICAgIGxvYWRCYWxhbmNlckFybjogZmFyZ2F0ZVNlcnZpY2UubG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckFybixcbiAgICAgIHBvcnQ6IDQ0MyxcbiAgICAgIHByb3RvY29sOiAnSFRUUFMnLFxuICAgICAgY2VydGlmaWNhdGVzOiBbe1xuICAgICAgICBjZXJ0aWZpY2F0ZUFybjogY2VydGlmaWNhdGVBcm5QYXJhbS52YWx1ZUFzU3RyaW5nLFxuICAgICAgfV0sXG4gICAgICBkZWZhdWx0QWN0aW9uczogW3tcbiAgICAgICAgdHlwZTogJ2ZvcndhcmQnLFxuICAgICAgICB0YXJnZXRHcm91cEFybjogZmFyZ2F0ZVNlcnZpY2UudGFyZ2V0R3JvdXAudGFyZ2V0R3JvdXBBcm4sXG4gICAgICB9XSxcbiAgICB9KTtcbiAgICBcbiAgICAvLyBBcHBseSBjb25kaXRpb24gdG8gSFRUUFMgbGlzdGVuZXJcbiAgICBodHRwc0xpc3RlbmVyLmNmbk9wdGlvbnMuY29uZGl0aW9uID0gaHR0cHNDb25kaXRpb247XG5cbiAgICAvLyBDcmVhdGUgc2VjdXJpdHkgZ3JvdXAgcnVsZSBmb3IgSFRUUFNcbiAgICBjb25zdCBodHRwc1NlY3VyaXR5R3JvdXBSdWxlID0gbmV3IGVjMi5DZm5TZWN1cml0eUdyb3VwSW5ncmVzcyh0aGlzLCAnSHR0cHNTZWN1cml0eUdyb3VwUnVsZScsIHtcbiAgICAgIGdyb3VwSWQ6IGZhcmdhdGVTZXJ2aWNlLmxvYWRCYWxhbmNlci5jb25uZWN0aW9ucy5zZWN1cml0eUdyb3Vwc1swXS5zZWN1cml0eUdyb3VwSWQsXG4gICAgICBpcFByb3RvY29sOiAndGNwJyxcbiAgICAgIGZyb21Qb3J0OiA0NDMsXG4gICAgICB0b1BvcnQ6IDQ0MyxcbiAgICAgIGNpZHJJcDogJzAuMC4wLjAvMCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FsbG93IEhUVFBTIHRyYWZmaWMgZnJvbSBhbnl3aGVyZScsXG4gICAgfSk7XG4gICAgXG4gICAgLy8gQXBwbHkgY29uZGl0aW9uIHRvIHNlY3VyaXR5IGdyb3VwIHJ1bGVcbiAgICBodHRwc1NlY3VyaXR5R3JvdXBSdWxlLmNmbk9wdGlvbnMuY29uZGl0aW9uID0gaHR0cHNDb25kaXRpb247XG5cbiAgICAvLyBDcmVhdGUgSFRUUCB0byBIVFRQUyByZWRpcmVjdCBydWxlXG4gICAgY29uc3QgcmVkaXJlY3RSdWxlID0gbmV3IGVsYnYyLkNmbkxpc3RlbmVyUnVsZSh0aGlzLCAnSHR0cFRvSHR0cHNSZWRpcmVjdCcsIHtcbiAgICAgIGxpc3RlbmVyQXJuOiBmYXJnYXRlU2VydmljZS5saXN0ZW5lci5saXN0ZW5lckFybixcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgY29uZGl0aW9uczogW3tcbiAgICAgICAgZmllbGQ6ICdwYXRoLXBhdHRlcm4nLFxuICAgICAgICB2YWx1ZXM6IFsnKiddLFxuICAgICAgfV0sXG4gICAgICBhY3Rpb25zOiBbe1xuICAgICAgICB0eXBlOiAncmVkaXJlY3QnLFxuICAgICAgICByZWRpcmVjdENvbmZpZzoge1xuICAgICAgICAgIHByb3RvY29sOiAnSFRUUFMnLFxuICAgICAgICAgIHBvcnQ6ICc0NDMnLFxuICAgICAgICAgIHN0YXR1c0NvZGU6ICdIVFRQXzMwMScsXG4gICAgICAgIH0sXG4gICAgICB9XSxcbiAgICB9KTtcbiAgICBcbiAgICAvLyBBcHBseSBjb25kaXRpb24gdG8gcmVkaXJlY3QgcnVsZVxuICAgIHJlZGlyZWN0UnVsZS5jZm5PcHRpb25zLmNvbmRpdGlvbiA9IGh0dHBzQ29uZGl0aW9uO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENvbmZpZ3VyZSBUYXJnZXQgR3JvdXAgZm9yIFdlYlNvY2tldCBTdXBwb3J0XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gQ29uZmlndXJlIGhlYWx0aCBjaGVja3MgZm9yIEVDUyBjb250YWluZXJzXG4gICAgZmFyZ2F0ZVNlcnZpY2UudGFyZ2V0R3JvdXAuY29uZmlndXJlSGVhbHRoQ2hlY2soe1xuICAgICAgcGF0aDogJy9oZWFsdGgnLFxuICAgICAgaGVhbHRoeUh0dHBDb2RlczogJzIwMCcsXG4gICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLCAvLyBJbmNyZWFzZWQgdGltZW91dCBmb3IgY29udGFpbmVyIHN0YXJ0dXAgZGVsYXlzXG4gICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXG4gICAgICB1bmhlYWx0aHlUaHJlc2hvbGRDb3VudDogNSwgLy8gSW5jcmVhc2VkIHRocmVzaG9sZCBmb3Igc3RhYmxlIGNvbm5lY3Rpb25zXG4gICAgfSk7XG5cbiAgICAvLyBFbmFibGUgc3RpY2t5IHNlc3Npb25zIHdpdGggY29va2llLWJhc2VkIHNlc3Npb24gYWZmaW5pdHkgZm9yIFdlYlNvY2tldCBjb25uZWN0aW9uc1xuICAgIGZhcmdhdGVTZXJ2aWNlLnRhcmdldEdyb3VwLnNldEF0dHJpYnV0ZSgnc3RpY2tpbmVzcy5lbmFibGVkJywgJ3RydWUnKTtcbiAgICBmYXJnYXRlU2VydmljZS50YXJnZXRHcm91cC5zZXRBdHRyaWJ1dGUoJ3N0aWNraW5lc3MudHlwZScsICdsYl9jb29raWUnKTtcbiAgICBmYXJnYXRlU2VydmljZS50YXJnZXRHcm91cC5zZXRBdHRyaWJ1dGUoJ3N0aWNraW5lc3MubGJfY29va2llLmR1cmF0aW9uX3NlY29uZHMnLCAnMzYwMCcpOyAvLyAxIGhvdXIgZHVyYXRpb25cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBdXRvIFNjYWxpbmdcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3Qgc2NhbGFibGVUYXJnZXQgPSBmYXJnYXRlU2VydmljZS5zZXJ2aWNlLmF1dG9TY2FsZVRhc2tDb3VudCh7XG4gICAgICBtaW5DYXBhY2l0eTogMixcbiAgICAgIG1heENhcGFjaXR5OiAyMCxcbiAgICB9KTtcblxuICAgIC8vIFNjYWxlIGJhc2VkIG9uIENQVSB1dGlsaXphdGlvblxuICAgIHNjYWxhYmxlVGFyZ2V0LnNjYWxlT25DcHVVdGlsaXphdGlvbignQ3B1U2NhbGluZycsIHtcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXG4gICAgICBzY2FsZUluQ29vbGRvd246IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgc2NhbGVPdXRDb29sZG93bjogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksXG4gICAgfSk7XG5cbiAgICAvLyBTY2FsZSBiYXNlZCBvbiBtZW1vcnkgdXRpbGl6YXRpb25cbiAgICBzY2FsYWJsZVRhcmdldC5zY2FsZU9uTWVtb3J5VXRpbGl6YXRpb24oJ01lbW9yeVNjYWxpbmcnLCB7XG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDgwLFxuICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENsb3VkV2F0Y2ggQWxhcm1zIGFuZCBNb25pdG9yaW5nXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gSGlnaCBDUFUgQWxhcm1cbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnSGlnaENwdUFsYXJtJywge1xuICAgICAgbWV0cmljOiBmYXJnYXRlU2VydmljZS5zZXJ2aWNlLm1ldHJpY0NwdVV0aWxpemF0aW9uKCksXG4gICAgICB0aHJlc2hvbGQ6IDg1LFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdIaWdoIENQVSB1dGlsaXphdGlvbiBpbiBIb3BlIFRoZXJhcGV1dGljIHNlcnZpY2UnLFxuICAgIH0pO1xuXG4gICAgLy8gSGlnaCBNZW1vcnkgQWxhcm1cbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnSGlnaE1lbW9yeUFsYXJtJywge1xuICAgICAgbWV0cmljOiBmYXJnYXRlU2VydmljZS5zZXJ2aWNlLm1ldHJpY01lbW9yeVV0aWxpemF0aW9uKCksXG4gICAgICB0aHJlc2hvbGQ6IDkwLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdIaWdoIG1lbW9yeSB1dGlsaXphdGlvbiBpbiBIb3BlIFRoZXJhcGV1dGljIHNlcnZpY2UnLFxuICAgIH0pO1xuXG4gICAgLy8gRHluYW1vREIgVGhyb3R0bGluZyBBbGFybXNcbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnVXNlcnNUYWJsZVRocm90dGxlQWxhcm0nLCB7XG4gICAgICBtZXRyaWM6IHVzZXJzVGFibGUubWV0cmljVGhyb3R0bGVkUmVxdWVzdHNGb3JPcGVyYXRpb25zKHtcbiAgICAgICAgb3BlcmF0aW9uczogW2R5bmFtb2RiLk9wZXJhdGlvbi5QVVRfSVRFTSwgZHluYW1vZGIuT3BlcmF0aW9uLkdFVF9JVEVNXSxcbiAgICAgIH0pLFxuICAgICAgdGhyZXNob2xkOiA1LFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnRHluYW1vREIgdGhyb3R0bGluZyBvbiB1c2VycyB0YWJsZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU2Vzc2lvbnNUYWJsZVRocm90dGxlQWxhcm0nLCB7XG4gICAgICBtZXRyaWM6IHNlc3Npb25zVGFibGUubWV0cmljVGhyb3R0bGVkUmVxdWVzdHNGb3JPcGVyYXRpb25zKHtcbiAgICAgICAgb3BlcmF0aW9uczogW2R5bmFtb2RiLk9wZXJhdGlvbi5QVVRfSVRFTSwgZHluYW1vZGIuT3BlcmF0aW9uLkdFVF9JVEVNLCBkeW5hbW9kYi5PcGVyYXRpb24uUVVFUlldLFxuICAgICAgfSksXG4gICAgICB0aHJlc2hvbGQ6IDUsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdEeW5hbW9EQiB0aHJvdHRsaW5nIG9uIHNlc3Npb25zIHRhYmxlJyxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBSb3V0ZSA1MyAoT3B0aW9uYWwpIC0gT25seSBjcmVhdGUgaWYgZG9tYWluIGlzIHByb3ZpZGVkIGFuZCBub3QgYSB0b2tlblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBpZiAoZG9tYWluTmFtZSAmJiBkb21haW5OYW1lLmxlbmd0aCA+IDAgJiYgIWNkay5Ub2tlbi5pc1VucmVzb2x2ZWQoZG9tYWluTmFtZSkpIHtcbiAgICAgIC8vIEV4dHJhY3QgdGhlIHJvb3QgZG9tYWluIGZvciBob3N0ZWQgem9uZSBsb29rdXBcbiAgICAgIGNvbnN0IGRvbWFpblBhcnRzID0gZG9tYWluTmFtZS5zcGxpdCgnLicpO1xuICAgICAgY29uc3Qgcm9vdERvbWFpbiA9IGRvbWFpblBhcnRzLnNsaWNlKC0yKS5qb2luKCcuJyk7XG5cbiAgICAgIGNvbnN0IGhvc3RlZFpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUxvb2t1cCh0aGlzLCAnSG9zdGVkWm9uZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogcm9vdERvbWFpbixcbiAgICAgIH0pO1xuXG4gICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBbGlhc1JlY29yZCcsIHtcbiAgICAgICAgem9uZTogaG9zdGVkWm9uZSxcbiAgICAgICAgcmVjb3JkTmFtZTogZG9tYWluTmFtZSxcbiAgICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMoXG4gICAgICAgICAgbmV3IHJvdXRlNTNUYXJnZXRzLkxvYWRCYWxhbmNlclRhcmdldChmYXJnYXRlU2VydmljZS5sb2FkQmFsYW5jZXIpXG4gICAgICAgICksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gT3V0cHV0c1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9hZEJhbGFuY2VyRE5TJywge1xuICAgICAgdmFsdWU6IGZhcmdhdGVTZXJ2aWNlLmxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJEbnNOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdETlMgbmFtZSBvZiB0aGUgbG9hZCBiYWxhbmNlcicsXG4gICAgICBleHBvcnROYW1lOiAnSG9wZVRoZXJhcGV1dGljTG9hZEJhbGFuY2VyRE5TJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZXJ2aWNlVVJMJywge1xuICAgICAgdmFsdWU6IGNkay5Gbi5jb25kaXRpb25JZihcbiAgICAgICAgaHR0cHNDb25kaXRpb24ubG9naWNhbElkLFxuICAgICAgICBgaHR0cHM6Ly8ke2RvbWFpbk5hbWVQYXJhbS52YWx1ZUFzU3RyaW5nfWAsXG4gICAgICAgIGBodHRwOi8vJHtkb21haW5OYW1lUGFyYW0udmFsdWVBc1N0cmluZ31gXG4gICAgICApLnRvU3RyaW5nKCksXG4gICAgICBkZXNjcmlwdGlvbjogJ1VSTCBvZiB0aGUgSG9wZSBUaGVyYXBldXRpYyBzZXJ2aWNlJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdIb3BlVGhlcmFwZXV0aWNTZXJ2aWNlVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2FkQmFsYW5jZXJVUkwnLCB7XG4gICAgICB2YWx1ZTogY2RrLkZuLmNvbmRpdGlvbklmKFxuICAgICAgICBodHRwc0NvbmRpdGlvbi5sb2dpY2FsSWQsXG4gICAgICAgIGBodHRwczovLyR7ZmFyZ2F0ZVNlcnZpY2UubG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckRuc05hbWV9YCxcbiAgICAgICAgYGh0dHA6Ly8ke2ZhcmdhdGVTZXJ2aWNlLmxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJEbnNOYW1lfWBcbiAgICAgICkudG9TdHJpbmcoKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0IGxvYWQgYmFsYW5jZXIgVVJMICh1c2UgdGhpcyBpZiBkb21haW4gaXMgbm90IGNvbmZpZ3VyZWQpJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdIb3BlVGhlcmFwZXV0aWNMb2FkQmFsYW5jZXJVUkwnLFxuICAgIH0pO1xuXG4gICAgLy8gSFRUUFMtc3BlY2lmaWMgb3V0cHV0cyAob25seSBjcmVhdGVkIHdoZW4gSFRUUFMgaXMgZW5hYmxlZClcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSHR0cHNVUkwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtmYXJnYXRlU2VydmljZS5sb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyRG5zTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdIVFRQUyBVUkwgZm9yIHNlY3VyZSBtaWNyb3Bob25lIGFjY2VzcycsXG4gICAgICBjb25kaXRpb246IGh0dHBzQ29uZGl0aW9uLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0h0dHBVUkwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHA6Ly8ke2ZhcmdhdGVTZXJ2aWNlLmxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJEbnNOYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0hUVFAgVVJMICh3aWxsIHJlZGlyZWN0IHRvIEhUVFBTKScsXG4gICAgICBjb25kaXRpb246IGh0dHBzQ29uZGl0aW9uLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0tNU0tleUlkJywge1xuICAgICAgdmFsdWU6IHRoZXJhcGV1dGljRGF0YUtleS5rZXlJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnS01TIEtleSBJRCBmb3IgdGhlcmFwZXV0aWMgZGF0YSBlbmNyeXB0aW9uJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdIb3BlVGhlcmFwZXV0aWNLTVNLZXlJZCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnS01TS2V5QXJuJywge1xuICAgICAgdmFsdWU6IHRoZXJhcGV1dGljRGF0YUtleS5rZXlBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0tNUyBLZXkgQVJOIGZvciB0aGVyYXBldXRpYyBkYXRhIGVuY3J5cHRpb24nLFxuICAgICAgZXhwb3J0TmFtZTogJ0hvcGVUaGVyYXBldXRpY0tNU0tleUFybicsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlcnNUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIFVzZXJzIFRhYmxlIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogJ0hvcGVUaGVyYXBldXRpY1VzZXJzVGFibGUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Nlc3Npb25zVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IHNlc3Npb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBTZXNzaW9ucyBUYWJsZSBOYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdIb3BlVGhlcmFwZXV0aWNTZXNzaW9uc1RhYmxlJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbHVzdGVyTmFtZScsIHtcbiAgICAgIHZhbHVlOiBjbHVzdGVyLmNsdXN0ZXJOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdFQ1MgQ2x1c3RlciBOYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdIb3BlVGhlcmFwZXV0aWNDbHVzdGVyTmFtZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2VydmljZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogZmFyZ2F0ZVNlcnZpY2Uuc2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRUNTIFNlcnZpY2UgTmFtZScsXG4gICAgICBleHBvcnROYW1lOiAnSG9wZVRoZXJhcGV1dGljU2VydmljZU5hbWUnLFxuICAgIH0pO1xuICB9XG59Il19