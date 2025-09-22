# Database Setup - Therapeutic Wave Interface

This directory contains the complete DynamoDB database implementation for the Therapeutic Wave Interface, including schemas, connection utilities, encryption, and repository patterns.

## Quick Start

### AWS Production Setup (Recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure AWS credentials:**
   - Set up AWS CLI: `aws configure`
   - Or set environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - Or use IAM roles (recommended for EC2/Lambda)

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your table names and AWS region
   ```

4. **Create DynamoDB tables using CDK/Terraform:**
   ```bash
   # Use your preferred IaC tool to create tables with the configured names
   # Table names are defined in .env file
   ```

5. **Test the configuration:**
   ```bash
   npm run db:config
   ```

### Local Development Setup (Optional)

1. **Start DynamoDB Local:**
   ```bash
   npm run dynamodb:local
   ```

2. **Update .env for local development:**
   ```bash
   # Uncomment DYNAMODB_ENDPOINT in .env
   DYNAMODB_ENDPOINT=http://localhost:8000
   ```

3. **Create local tables (for testing only):**
   ```bash
   npm run db:setup
   ```

## Database Schema

### Tables Overview

| Table | Purpose | Primary Key | GSI |
|-------|---------|-------------|-----|
| **Users** | User profiles and preferences | `userId` | `isAnonymous-lastActiveAt-index` |
| **Sessions** | Conversation sessions and metrics | `sessionId` | `userId-startTime-index` |
| **Progress** | Weekly therapeutic progress tracking | `progressId` | `userId-weekStartDate-index` |
| **Settings** | User customization settings | `settingsId` (= userId) | None |

### Data Models

#### User
- Anonymous or authenticated user profiles
- Therapeutic preferences and accessibility settings
- Encrypted sensitive data support

#### Session
- Individual conversation sessions
- Real-time wave pattern data
- Emotional state tracking
- Encrypted conversation transcripts

#### Progress
- Weekly aggregated progress metrics
- Milestone tracking
- Trend analysis
- Encrypted personal notes

#### Settings
- Wave animation preferences
- Audio configuration
- Privacy controls
- Therapeutic customization

## Security Features

### Encryption
- **AES-256-GCM** encryption for sensitive data
- Automatic PII sanitization before encryption
- Configurable encryption keys
- Metadata tracking for audit purposes

### Privacy
- Anonymous user support
- Configurable data retention
- Opt-in conversation storage
- Secure user ID generation

## Repository Pattern

The database uses a repository pattern for clean data access:

```typescript
import { usersRepository, sessionsRepository } from './database';

// Create a new user
const user = await usersRepository.createUser({
  isAnonymous: true,
  preferences: { theme: 'ocean-calm', motionIntensity: 0.8 }
});

// Create a session
const session = await sessionsRepository.createSession({
  userId: user.userId,
  emotionalState: { initialMood: 6, stressLevel: 7 },
  wavePatterns: [],
  therapeuticMetrics: { sessionQuality: 8 }
});
```

## Environment Configuration

### Development (.env)
```bash
NODE_ENV=development
AWS_REGION=us-east-1
ENCRYPTION_KEY=development-key-change-in-production

# Table names (created via CDK/Terraform)
DYNAMODB_USERS_TABLE=therapeutic-wave-users-dev
DYNAMODB_SESSIONS_TABLE=therapeutic-wave-sessions-dev
DYNAMODB_PROGRESS_TABLE=therapeutic-wave-progress-dev
DYNAMODB_SETTINGS_TABLE=therapeutic-wave-settings-dev
```

### Production (.env)
```bash
NODE_ENV=production
AWS_REGION=us-east-1
ENCRYPTION_KEY=your-secure-production-key

# Table names (created via CDK/Terraform)
DYNAMODB_USERS_TABLE=therapeutic-wave-users-prod
DYNAMODB_SESSIONS_TABLE=therapeutic-wave-sessions-prod
DYNAMODB_PROGRESS_TABLE=therapeutic-wave-progress-prod
DYNAMODB_SETTINGS_TABLE=therapeutic-wave-settings-prod
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:config` | Test database configuration |
| `npm run db:setup` | Create database tables (reference only) |
| `npm run db:test` | Test database connection (requires tables) |
| `npm run dynamodb:local` | Start DynamoDB Local (for local dev) |

## Monitoring and Health Checks

The database includes built-in health checking:

```typescript
import { checkDatabaseHealth } from './database';

const health = await checkDatabaseHealth();
console.log(health.status); // 'healthy' or 'unhealthy'
```

## Data Migration

For schema changes, create migration scripts in `src/database/migrations/`:

```typescript
// Example migration
export async function migrateV1ToV2() {
  // Migration logic here
}
```

## Troubleshooting

### Common Issues

1. **Connection refused (local development):**
   - Ensure DynamoDB Local is running: `npm run dynamodb:local`
   - Check DYNAMODB_ENDPOINT in .env

2. **Access denied (AWS):**
   - Verify AWS credentials
   - Check IAM permissions for DynamoDB

3. **Table already exists:**
   - Use `--force` flag to recreate: `npm run db:setup -- --force`

4. **Encryption errors:**
   - Verify ENCRYPTION_KEY is set
   - Run encryption test: `npm run db:test`

### Debug Mode

Enable verbose logging:
```bash
npm run db:setup -- --verbose
npm run db:test -- --verbose
```

## Performance Considerations

- **Read/Write Capacity:** Uses on-demand billing by default
- **Indexes:** Optimized for common query patterns
- **Encryption:** Minimal performance impact with AES-256-GCM
- **Connection Pooling:** Automatic with AWS SDK v3

## Compliance

- **HIPAA:** Encryption at rest and in transit
- **GDPR:** User data deletion and export capabilities
- **SOC 2:** Audit logging and access controls