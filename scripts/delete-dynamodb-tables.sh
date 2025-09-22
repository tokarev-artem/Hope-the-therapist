#!/bin/bash

# Delete DynamoDB tables for Therapeutic Wave Interface
# Usage: ./scripts/delete-dynamodb-tables.sh [environment]
# Example: ./scripts/delete-dynamodb-tables.sh dev

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

echo "🗑️  Deleting DynamoDB tables for environment: ${ENVIRONMENT}"
echo "📍 Region: ${REGION}"
echo ""

# Confirmation prompt
read -p "⚠️  Are you sure you want to delete all tables? This cannot be undone! (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 1
fi

# Function to check if table exists
table_exists() {
    aws dynamodb describe-table --table-name "$1" --region "$REGION" >/dev/null 2>&1
}

# Function to delete table if it exists
delete_table() {
    if table_exists "$1"; then
        echo "🗑️  Deleting table: $1"
        aws dynamodb delete-table --table-name "$1" --region "$REGION"
        echo "✅ Table $1 deletion initiated"
    else
        echo "⚠️  Table $1 does not exist, skipping..."
    fi
}

# Delete all tables
delete_table "$USERS_TABLE"
delete_table "$SESSIONS_TABLE"
delete_table "$PROGRESS_TABLE"
delete_table "$SETTINGS_TABLE"

echo ""
echo "🎉 All table deletions initiated!"
echo ""
echo "⏳ Note: Tables are being deleted in the background."
echo "   It may take a few minutes for them to be completely removed."
echo ""
echo "🔍 Check status with:"
echo "   aws dynamodb list-tables --region $REGION"