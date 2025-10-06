#!/bin/bash

# Hope AI Therapeutic Companion - Easy Deployment Script
# For hackathons and quick demos

set -e

echo "🚀 Hope AI Therapeutic Companion - Deployment Script"
echo "=================================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK not installed. Installing..."
    npm install -g aws-cdk
fi

echo "✅ AWS CDK available"

# Get deployment preferences
echo ""
echo "🔧 Deployment Configuration"
echo "=========================="

read -p "Do you have a domain name? (y/n): " has_domain

if [[ $has_domain == "y" || $has_domain == "Y" ]]; then
    read -p "Enter your domain name (e.g., myapp.example.com): " domain_name
    read -p "Enter your certificate ARN from AWS Certificate Manager: " cert_arn
    
    echo ""
    echo "📋 Deployment Summary:"
    echo "Domain: $domain_name"
    echo "Certificate: $cert_arn"
    echo "Protocol: HTTPS"
    
    read -p "Proceed with HTTPS deployment? (y/n): " confirm
    
    if [[ $confirm == "y" || $confirm == "Y" ]]; then
        DEPLOY_CMD="cdk deploy --parameters DomainName=$domain_name --parameters CertificateArn=$cert_arn --parameters EnableHttps=true"
    else
        echo "❌ Deployment cancelled"
        exit 1
    fi
else
    echo ""
    echo "📋 Deployment Summary:"
    echo "Protocol: HTTP (for testing only)"
    echo "⚠️  Note: You'll need HTTPS for microphone access in browsers"
    echo "💡 Tip: Use ngrok after deployment for HTTPS testing"
    
    read -p "Proceed with HTTP deployment? (y/n): " confirm
    
    if [[ $confirm == "y" || $confirm == "Y" ]]; then
        DEPLOY_CMD="cdk deploy --parameters EnableHttps=false"
    else
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd infrastructure
npm install

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# Bootstrap CDK if needed
echo ""
echo "🏗️  Bootstrapping CDK (if needed)..."
cdk bootstrap

# Deploy
echo ""
echo "🚀 Deploying Hope AI Therapeutic Companion..."
echo "Command: $DEPLOY_CMD"
echo ""

eval $DEPLOY_CMD

echo ""
echo "🎉 Deployment Complete!"
echo "======================"

# Get outputs
echo ""
echo "📊 Getting deployment outputs..."
SERVICE_URL=$(aws cloudformation describe-stacks --stack-name HopeTherapeuticStack --query 'Stacks[0].Outputs[?OutputKey==`ServiceURL`].OutputValue' --output text 2>/dev/null || echo "Not available")
LB_URL=$(aws cloudformation describe-stacks --stack-name HopeTherapeuticStack --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' --output text 2>/dev/null || echo "Not available")

echo ""
echo "🌐 Your Hope AI Application URLs:"
echo "================================"
echo "Service URL: $SERVICE_URL"
echo "Load Balancer URL: $LB_URL"

if [[ $has_domain != "y" && $has_domain != "Y" ]]; then
    echo ""
    echo "💡 For HTTPS testing (required for microphone):"
    echo "1. Install ngrok: npm install -g ngrok"
    echo "2. Run: ngrok http $LB_URL"
    echo "3. Use the https://xxx.ngrok.io URL"
fi

echo ""
echo "✅ Hope AI is ready to help! 🤗"