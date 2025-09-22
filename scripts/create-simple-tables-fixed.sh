#!/bin/bash

# Create simple DynamoDB tables without GSI for quick testing
# Usage: ./scripts/create-simple-tables-fixed.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
TABLE_PREFIX="therapeutic-wave"

# Table names
USERS_TABLE="${TABLE_PREFIX}-users-${ENVIRONMENT}"
SESSIONS_TABLE="${TABLE_PREFIX}-sessions-${ENVIRONMENT}"
PROGRESS_TABLE="${TABLE_PREFIX}-progress-${ENVIRONMENT}"
SETTINGS_TABLE="${TABLE_PREFIX}-settings-${ENVIRONMENT}"

echo "🚀 Creating simple DynamoDB tables for environment: ${ENVIRONMENT}"
echo "📍 Region: ${REGION}"
echo ""

# Function to check if table exists
table_exists() {
    aws dynamodb describe-table --table-name "$1" --region "$REGION" >/dev/null 2>&1
}

# Function to wait for table to be active
wait_for_table() {
    echo "⏳ Waiting for table $1 to become active..."
    aws dynamodb wait table-exists --table-name "$1" --region "$REGION"
    echo "✅ Table $1 is now active"
}

# Create Progress table (simple version)
echo "📝 Creating Progress table: ${PROGRESS_TABLE}"
if table_exists "$PROGRESS_TABLE"; then
    echo "⚠️  Table ${PROGRESS_TABLE} already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "$PROGRESS_TABLE" \
        --attribute-definitions AttributeName=progressId,AttributeType=S \
        --key-schema AttributeName=progressId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    
    wait_for_table "$PROGRESS_TABLE"
fi

# Create Settings table
echo "📝 Creating Settings table: ${SETTINGS_TABLE}"
if table_exists "$SETTINGS_TABLE"; then
    echo "⚠️  Table ${SETTINGS_TABLE} already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "$SETTINGS_TABLE" \
        --attribute-definitions AttributeName=settingsId,AttributeType=S \
        --key-schema AttributeName=settingsId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    
    wait_for_table "$SETTINGS_TABLE"
fi

echo ""
echo "🎉 All simple tables created successfully!"
echo ""
echo "📊 Table Summary:"
echo "   Users:    ${USERS_TABLE}"
echo "   Sessions: ${SESSIONS_TABLE}"
echo "   Progress: ${PROGRESS_TABLE}"
echo "   Settings: ${SETTINGS_TABLE}"
echo ""
echo "⚠️  Note: These are simplified tables without Global Secondary Indexes"
echo ""
echo "🔧 Environment variables to add to .env:"
echo "DYNAMODB_USERS_TABLE=${USERS_TABLE}"
echo "DYNAMODB_SESSIONS_TABLE=${SESSIONS_TABLE}"
echo "DYNAMODB_PROGRESS_TABLE=${PROGRESS_TABLE}"
echo "DYNAMODB_SETTINGS_TABLE=${SETTINGS_TABLE}"