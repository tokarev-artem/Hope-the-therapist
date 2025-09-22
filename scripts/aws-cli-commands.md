# AWS CLI Commands for DynamoDB Tables

## Quick Setup (Recommended)

```bash
# Create all tables and update .env file automatically
npm run db:quick-setup

# Or with custom environment
npm run db:quick-setup prod
```

## Individual Commands

### Create Tables

```bash
# Create all tables for dev environment
npm run db:create

# Create all tables for production
npm run db:create prod

# Or run the script directly
./scripts/create-dynamodb-tables.sh dev
```

### List Tables

```bash
# List all tables
npm run db:list

# List tables for specific environment
npm run db:list prod
```

### Delete Tables (Careful!)

```bash
# Delete all tables for dev environment
npm run db:delete

# Delete tables for production (with confirmation)
npm run db:delete prod
```

## Manual AWS CLI Commands

If you prefer to run individual commands manually:

### 1. Users Table

```bash
aws dynamodb create-table \
    --table-name "therapeutic-wave-users-dev" \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=isAnonymous,AttributeType=S \
        AttributeName=lastActiveAt,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=isAnonymous-lastActiveAt-index,KeySchema=[{AttributeName=isAnonymous,KeyType=HASH},{AttributeName=lastActiveAt,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --sse-specification Enabled=true \
    --tags \
        Key=Application,Value=TherapeuticWaveInterface \
        Key=Environment,Value=dev
```

### 2. Sessions Table

```bash
aws dynamodb create-table \
    --table-name "therapeutic-wave-sessions-dev" \
    --attribute-definitions \
        AttributeName=sessionId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=startTime,AttributeType=S \
    --key-schema \
        AttributeName=sessionId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=userId-startTime-index,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=startTime,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --sse-specification Enabled=true \
    --tags \
        Key=Application,Value=TherapeuticWaveInterface \
        Key=Environment,Value=dev \
        Key=DataType,Value=SessionData
```

### 3. Progress Table

```bash
aws dynamodb create-table \
    --table-name "therapeutic-wave-progress-dev" \
    --attribute-definitions \
        AttributeName=progressId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=weekStartDate,AttributeType=S \
    --key-schema \
        AttributeName=progressId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=userId-weekStartDate-index,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=weekStartDate,KeyType=RANGE}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --sse-specification Enabled=true \
    --tags \
        Key=Application,Value=TherapeuticWaveInterface \
        Key=Environment,Value=dev \
        Key=DataType,Value=ProgressData
```

### 4. Settings Table

```bash
aws dynamodb create-table \
    --table-name "therapeutic-wave-settings-dev" \
    --attribute-definitions \
        AttributeName=settingsId,AttributeType=S \
    --key-schema \
        AttributeName=settingsId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --sse-specification Enabled=true \
    --tags \
        Key=Application,Value=TherapeuticWaveInterface \
        Key=Environment,Value=dev \
        Key=DataType,Value=UserSettings
```

## Verification Commands

```bash
# List all tables
aws dynamodb list-tables

# Describe a specific table
aws dynamodb describe-table --table-name "therapeutic-wave-users-dev"

# Check table status
aws dynamodb describe-table --table-name "therapeutic-wave-users-dev" \
    --query 'Table.TableStatus' --output text
```

## Environment Variables

After creating tables, update your `.env` file:

```bash
# Development
DYNAMODB_USERS_TABLE=therapeutic-wave-users-dev
DYNAMODB_SESSIONS_TABLE=therapeutic-wave-sessions-dev
DYNAMODB_PROGRESS_TABLE=therapeutic-wave-progress-dev
DYNAMODB_SETTINGS_TABLE=therapeutic-wave-settings-dev

# Production
DYNAMODB_USERS_TABLE=therapeutic-wave-users-prod
DYNAMODB_SESSIONS_TABLE=therapeutic-wave-sessions-prod
DYNAMODB_PROGRESS_TABLE=therapeutic-wave-progress-prod
DYNAMODB_SETTINGS_TABLE=therapeutic-wave-settings-prod
```

## Cost Optimization

All tables use `PAY_PER_REQUEST` billing mode, which means:
- No upfront costs
- Pay only for what you use
- Automatic scaling
- Perfect for development and variable workloads

For production with predictable traffic, consider switching to `PROVISIONED` mode for cost savings.

## Security Features

All tables include:
- ✅ **Encryption at rest** (SSE)
- ✅ **DynamoDB Streams** for change tracking
- ✅ **Resource tags** for organization
- ✅ **Global Secondary Indexes** for efficient queries

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Check your AWS credentials
   aws sts get-caller-identity
   
   # Configure AWS CLI if needed
   aws configure
   ```

2. **Table Already Exists**
   ```bash
   # List existing tables
   aws dynamodb list-tables
   
   # Delete table if needed
   aws dynamodb delete-table --table-name "table-name"
   ```

3. **Region Issues**
   ```bash
   # Set region explicitly
   export AWS_REGION=us-east-1
   
   # Or specify in command
   aws dynamodb list-tables --region us-east-1
   ```