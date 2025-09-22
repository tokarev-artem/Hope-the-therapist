#!/bin/bash

# Quick setup script for DynamoDB tables
# This creates tables and updates your .env file automatically

set -e

ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "🚀 Quick DynamoDB Setup for Therapeutic Wave Interface"
echo ""

# Create tables
./scripts/create-dynamodb-tables.sh "$ENVIRONMENT"

# Update .env file
echo ""
echo "📝 Updating .env file..."

# Table names
USERS_TABLE="therapeutic-wave-users-${ENVIRONMENT}"
SESSIONS_TABLE="therapeutic-wave-sessions-${ENVIRONMENT}"
PROGRESS_TABLE="therapeutic-wave-progress-${ENVIRONMENT}"
SETTINGS_TABLE="therapeutic-wave-settings-${ENVIRONMENT}"

# Create or update .env file
if [ ! -f .env ]; then
    echo "Creating new .env file..."
    cp .env.example .env
fi

# Update table names in .env
sed -i.bak "s/DYNAMODB_USERS_TABLE=.*/DYNAMODB_USERS_TABLE=${USERS_TABLE}/" .env
sed -i.bak "s/DYNAMODB_SESSIONS_TABLE=.*/DYNAMODB_SESSIONS_TABLE=${SESSIONS_TABLE}/" .env
sed -i.bak "s/DYNAMODB_PROGRESS_TABLE=.*/DYNAMODB_PROGRESS_TABLE=${PROGRESS_TABLE}/" .env
sed -i.bak "s/DYNAMODB_SETTINGS_TABLE=.*/DYNAMODB_SETTINGS_TABLE=${SETTINGS_TABLE}/" .env

# Remove backup file
rm -f .env.bak

echo "✅ .env file updated with table names"
echo ""

# Test configuration
echo "🧪 Testing database configuration..."
npm run db:config

echo ""
echo "🎉 Setup complete! Your DynamoDB tables are ready to use."
echo ""
echo "📋 What was created:"
echo "   ✅ 4 DynamoDB tables with proper indexes"
echo "   ✅ Updated .env file with table names"
echo "   ✅ Tested database configuration"
echo ""
echo "🚀 Next steps:"
echo "   1. Start your application: npm run dev"
echo "   2. Test the user modal and database integration"
echo "   3. Check AWS Console to see your tables"