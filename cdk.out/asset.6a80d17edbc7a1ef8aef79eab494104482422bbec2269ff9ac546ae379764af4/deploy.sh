#!/bin/bash

# Hope - AI Therapeutic Companion Deployment Script
# This script deploys the complete infrastructure using AWS CDK

set -e

echo "🏥 Hope - AI Therapeutic Companion Deployment"
echo "=============================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

echo "📋 Deployment Configuration:"
echo "   AWS Account: $AWS_ACCOUNT"
echo "   AWS Region: $AWS_REGION"
echo "   Environment: ${ENVIRONMENT:-production}"

# Install CDK dependencies
echo ""
echo "📦 Installing CDK dependencies..."
cd infrastructure
npm install
cd ..

# Bootstrap CDK (if not already done)
echo ""
echo "🚀 Bootstrapping CDK..."
npx cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION

# Build the application
echo ""
echo "🔨 Building application..."
npm run build

# Deploy the stack
echo ""
echo "🚀 Deploying Hope Therapeutic Stack..."
npx cdk deploy HopeTherapeuticStack \
    --require-approval never \
    --outputs-file cdk-outputs.json

# Display deployment results
echo ""
echo "✅ Deployment Complete!"
echo "======================="

if [ -f "cdk-outputs.json" ]; then
    echo ""
    echo "📊 Deployment Outputs:"
    cat cdk-outputs.json | jq -r '.HopeTherapeuticStack | to_entries[] | "   \(.key): \(.value)"'
    
    # Extract the service URL
    SERVICE_URL=$(cat cdk-outputs.json | jq -r '.HopeTherapeuticStack.ServiceURL // empty')
    if [ ! -z "$SERVICE_URL" ]; then
        echo ""
        echo "🌐 Your Hope Therapeutic AI is now available at:"
        echo "   $SERVICE_URL"
        echo ""
        echo "🔗 Health Check:"
        echo "   $SERVICE_URL/health"
    fi
fi

echo ""
echo "🎉 Hope is now ready to provide therapeutic support!"
echo "   - High availability with auto-scaling"
echo "   - Encrypted therapeutic conversations"
echo "   - Real-time voice processing with Amazon Bedrock"
echo "   - Persistent memory across sessions"
echo ""
echo "📚 Next Steps:"
echo "   1. Test the health endpoint"
echo "   2. Configure your domain (optional)"
echo "   3. Set up monitoring alerts"
echo "   4. Review CloudWatch logs"