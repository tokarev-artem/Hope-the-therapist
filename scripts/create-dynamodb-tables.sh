#!/bin/bash

# Create DynamoDB tables for Therapeutic Wave Interface
# Usage: ./scripts/create-dynamodb-tables.sh [environment]
# Example: ./scripts/create-dynamodb-tables.sh dev

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

echo "🚀 Creating DynamoDB tables for environment: ${ENVIRONMENT}"
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

# Create Users table
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
        --global-secondary-indexes file://scripts/users-gsi.json \
        --billing-mode PAY_PER_REQUEST \
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
        --sse-specification Enabled=true \
        --tags \
            Key=Application,Value=TherapeuticWaveInterface \
            Key=Environment,Value="$ENVIRONMENT" \
        --region "$REGION"
    
    wait_for_table "$USERS_TABLE"
fi

# Create Sessions table
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
        --global-secondary-indexes file://scripts/sessions-gsi.json \
        --billing-mode PAY_PER_REQUEST \
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
        --sse-specification Enabled=true \
        --tags \
            Key=Application,Value=TherapeuticWaveInterface \
            Key=Environment,Value="$ENVIRONMENT" \
            Key=DataType,Value=SessionData \
        --region "$REGION"
    
    wait_for_table "$SESSIONS_TABLE"
fi

# Create Progress table
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
        --global-secondary-indexes file://scripts/progress-gsi.json \
        --billing-mode PAY_PER_REQUEST \
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
        --sse-specification Enabled=true \
        --tags \
            Key=Application,Value=TherapeuticWaveInterface \
            Key=Environment,Value="$ENVIRONMENT" \
            Key=DataType,Value=ProgressData \
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
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
        --sse-specification Enabled=true \
        --tags \
            Key=Application,Value=TherapeuticWaveInterface \
            Key=Environment,Value="$ENVIRONMENT" \
            Key=DataType,Value=UserSettings \
        --region "$REGION"
    
    wait_for_table "$SETTINGS_TABLE"
fi

echo ""
echo "🎉 All tables created successfully!"
echo ""
echo "📊 Table Summary:"
echo "   Users:    ${USERS_TABLE}"
echo "   Sessions: ${SESSIONS_TABLE}"
echo "   Progress: ${PROGRESS_TABLE}"
echo "   Settings: ${SETTINGS_TABLE}"
echo ""
echo "💡 Next steps:"
echo "   1. Update your .env file with these table names"
echo "   2. Test the connection: npm run db:config"
echo "   3. Start using the database in your application"
echo ""
echo "🔧 Environment variables to add to .env:"
echo "DYNAMODB_USERS_TABLE=${USERS_TABLE}"
echo "DYNAMODB_SESSIONS_TABLE=${SESSIONS_TABLE}"
echo "DYNAMODB_PROGRESS_TABLE=${PROGRESS_TABLE}"
echo "DYNAMODB_SETTINGS_TABLE=${SETTINGS_TABLE}"