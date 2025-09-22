#!/bin/bash

# Create DynamoDB tables without environment prefix
# Usage: ./scripts/create-tables-no-prefix.sh

set -e
export AWS_PAGER=""

# Configuration
REGION=${AWS_REGION:-us-east-1}

# Table names (no environment prefix)
USERS_TABLE="therapeutic-wave-users"
SESSIONS_TABLE="therapeutic-wave-sessions"
PROGRESS_TABLE="therapeutic-wave-progress"
SETTINGS_TABLE="therapeutic-wave-settings"

echo "🚀 Creating DynamoDB tables without environment prefix"
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

# Create Users table with GSI
echo "📝 Creating Users table: ${USERS_TABLE}"
if table_exists "$USERS_TABLE"; then
    echo "⚠️  Table ${USERS_TABLE} already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "$USERS_TABLE" \
        --attribute-definitions \
            AttributeName=userId,AttributeType=S \
            AttributeName=isAnonymous,AttributeType=S \
            AttributeName=lastActiveAt,AttributeType=S \
        --key-schema \
            AttributeName=userId,KeyType=HASH \
        --global-secondary-indexes '[
            {
                "IndexName": "isAnonymous-lastActiveAt-index",
                "KeySchema": [
                    {"AttributeName": "isAnonymous", "KeyType": "HASH"},
                    {"AttributeName": "lastActiveAt", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"}
            }
        ]' \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    
    wait_for_table "$USERS_TABLE"
fi

# Create Sessions table with GSI
echo "📝 Creating Sessions table: ${SESSIONS_TABLE}"
if table_exists "$SESSIONS_TABLE"; then
    echo "⚠️  Table ${SESSIONS_TABLE} already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "$SESSIONS_TABLE" \
        --attribute-definitions \
            AttributeName=sessionId,AttributeType=S \
            AttributeName=userId,AttributeType=S \
            AttributeName=startTime,AttributeType=S \
        --key-schema \
            AttributeName=sessionId,KeyType=HASH \
        --global-secondary-indexes '[
            {
                "IndexName": "userId-startTime-index",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "startTime", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"}
            }
        ]' \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    
    wait_for_table "$SESSIONS_TABLE"
fi

# Create Progress table with GSI
echo "📝 Creating Progress table: ${PROGRESS_TABLE}"
if table_exists "$PROGRESS_TABLE"; then
    echo "⚠️  Table ${PROGRESS_TABLE} already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "$PROGRESS_TABLE" \
        --attribute-definitions \
            AttributeName=progressId,AttributeType=S \
            AttributeName=userId,AttributeType=S \
            AttributeName=weekStartDate,AttributeType=S \
        --key-schema \
            AttributeName=progressId,KeyType=HASH \
        --global-secondary-indexes '[
            {
                "IndexName": "userId-weekStartDate-index",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "weekStartDate", "KeyType": "RANGE"}
                ],
                "Projection": {"ProjectionType": "ALL"}
            }
        ]' \
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
        --attribute-definitions \
            AttributeName=settingsId,AttributeType=S \
        --key-schema \
            AttributeName=settingsId,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
    
    wait_for_table "$SETTINGS_TABLE"
fi

echo ""
echo "🎉 All tables created successfully without environment prefix!"
echo ""
echo "📊 Table Summary:"
echo "   Users:    ${USERS_TABLE}"
echo "   Sessions: ${SESSIONS_TABLE}"
echo "   Progress: ${PROGRESS_TABLE}"
echo "   Settings: ${SETTINGS_TABLE}"
echo ""
echo "🔧 Environment variables to add to .env:"
echo "DYNAMODB_USERS_TABLE=${USERS_TABLE}"
echo "DYNAMODB_SESSIONS_TABLE=${SESSIONS_TABLE}"
echo "DYNAMODB_PROGRESS_TABLE=${PROGRESS_TABLE}"
echo "DYNAMODB_SETTINGS_TABLE=${SETTINGS_TABLE}"
echo ""
echo "🗑️  To delete old tables with environment prefix, run:"
echo "   aws dynamodb delete-table --table-name therapeutic-wave-users-dev --region ${REGION}"
echo "   aws dynamodb delete-table --table-name therapeutic-wave-sessions-dev --region ${REGION}"
echo "   aws dynamodb delete-table --table-name therapeutic-wave-progress-dev --region ${REGION}"
echo "   aws dynamodb delete-table --table-name therapeutic-wave-settings-dev --region ${REGION}"