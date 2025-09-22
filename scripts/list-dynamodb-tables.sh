#!/bin/bash

# List and describe DynamoDB tables for Therapeutic Wave Interface
# Usage: ./scripts/list-dynamodb-tables.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
TABLE_PREFIX="therapeutic-wave"

echo "📋 DynamoDB Tables for Therapeutic Wave Interface"
echo "📍 Region: ${REGION}"
echo "🏷️  Environment: ${ENVIRONMENT}"
echo ""

# Get all tables
echo "🔍 All DynamoDB tables in region:"
aws dynamodb list-tables --region "$REGION" --query 'TableNames' --output table

echo ""
echo "🎯 Therapeutic Wave Interface tables:"

# Table names
USERS_TABLE="${TABLE_PREFIX}-users-${ENVIRONMENT}"
SESSIONS_TABLE="${TABLE_PREFIX}-sessions-${ENVIRONMENT}"
PROGRESS_TABLE="${TABLE_PREFIX}-progress-${ENVIRONMENT}"
SETTINGS_TABLE="${TABLE_PREFIX}-settings-${ENVIRONMENT}"

# Function to describe table if it exists
describe_table() {
    local table_name=$1
    if aws dynamodb describe-table --table-name "$table_name" --region "$REGION" >/dev/null 2>&1; then
        echo "✅ $table_name"
        aws dynamodb describe-table --table-name "$table_name" --region "$REGION" \
            --query 'Table.{Status:TableStatus,ItemCount:ItemCount,SizeBytes:TableSizeBytes,CreationDateTime:CreationDateTime}' \
            --output table
        echo ""
    else
        echo "❌ $table_name (does not exist)"
        echo ""
    fi
}

describe_table "$USERS_TABLE"
describe_table "$SESSIONS_TABLE"
describe_table "$PROGRESS_TABLE"
describe_table "$SETTINGS_TABLE"

echo "💡 Commands:"
echo "   Create tables: ./scripts/create-dynamodb-tables.sh $ENVIRONMENT"
echo "   Delete tables: ./scripts/delete-dynamodb-tables.sh $ENVIRONMENT"
echo "   Test connection: npm run db:config"