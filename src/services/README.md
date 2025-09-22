# Therapeutic Services - AI-Powered Session Management

This directory contains the core services for managing therapeutic sessions with AI-powered transcript processing, user continuity tracking, and progress analysis.

## Overview

The therapeutic services provide:

1. **Transcript Processing**: AI-powered summarization and analysis of therapy sessions
2. **User Continuity**: Context-aware session management for returning users
3. **Progress Tracking**: Long-term therapeutic progress analysis and insights
4. **Session Management**: Complete workflow orchestration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                       │
│  (Socket.IO, Wave Interface, User Interactions)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Session Manager                             │
│  • Session initialization with context                     │
│  • Session completion with AI processing                   │
│  • Progress insights and recommendations                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌────▼────────┐ ┌──▼──────────────┐
│ Transcript   │ │ User        │ │ Database        │
│ Processor    │ │ Continuity  │ │ Repositories    │
│              │ │ Service     │ │                 │
│ • AI Summary │ │ • Context   │ │ • Users         │
│ • Progress   │ │ • History   │ │ • Sessions      │
│ • Insights   │ │ • Greeting  │ │ • Progress      │
└──────────────┘ └─────────────┘ └─────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │      AWS Bedrock          │
        │  (Claude 3 Haiku)         │
        │  • Summarization          │
        │  • Progress Analysis      │
        │  • Recommendations        │
        └───────────────────────────┘
```

## Core Services

### 1. Transcript Processor (`transcript-processor.ts`)

Handles AI-powered analysis of therapy session transcripts.

**Key Features:**
- Secure transcript storage with encryption
- AI-powered summarization using AWS Bedrock (Claude 3 Haiku)
- Emotional insights extraction
- Therapeutic progress analysis
- Continuity notes for next sessions

**Usage:**
```typescript
import { transcriptProcessor } from './services/transcript-processor';

// Process session transcript
const summary = await transcriptProcessor.processSessionTranscript(
  sessionId,
  conversationTranscript,
  userConsent
);

// Analyze user progress
const progressAnalysis = await transcriptProcessor.analyzeUserProgress(userId);
```

### 2. User Continuity Service (`user-continuity.ts`)

Provides context-aware session management for returning users.

**Key Features:**
- User context retrieval (session history, progress trends)
- Personalized greetings based on history
- Session context with emotional baselines
- Personalized AI system prompts
- Progress tracking across sessions

**Usage:**
```typescript
import { userContinuityService, getUserContext } from './services/user-continuity';

// Get comprehensive user context
const userContext = await getUserContext(userId);

// Generate personalized system prompt
const systemPrompt = await userContinuityService.generatePersonalizedSystemPrompt(userId);
```

### 3. Session Manager (`session-manager.ts`)

Orchestrates the complete therapeutic session workflow.

**Key Features:**
- Session initialization with full context
- Session completion with AI processing
- Progress insights and recommendations
- Wave theme recommendations
- Integration with existing systems

**Usage:**
```typescript
import { sessionManager } from './services/session-manager';

// Initialize session
const sessionData = await sessionManager.initializeSession(userId, initialEmotionalState);

// Complete session
const completionData = await sessionManager.completeSession(
  sessionId, userId, transcript, finalEmotionalState, metrics, userConsent
);
```

## Data Flow

### Session Initialization
1. User connects to application
2. System checks for existing user or creates anonymous user
3. User context retrieved (history, preferences, progress)
4. Session initialized with personalized context
5. AI system prompt generated based on user history
6. Personalized greeting and recommendations sent to client

### Session Completion
1. Session transcript collected
2. Transcript sanitized and encrypted (if user consents)
3. AI analysis generates summary and insights
4. Session record updated with completion data
5. User progress tracking updated
6. Recommendations generated for next session
7. Insights sent to client

### Progress Tracking
1. Session data aggregated weekly
2. Trends analyzed across multiple sessions
3. Milestones tracked and celebrated
4. Recommendations updated based on progress
5. Context maintained for future sessions

## AI Integration

### Bedrock Models Used

**Claude 3 Haiku** - Primary model for:
- Fast, cost-effective summarization
- Emotional insights extraction
- Progress analysis
- Recommendation generation

### Prompt Engineering

The system uses carefully crafted prompts for:

1. **Session Summarization**:
   - Therapeutic perspective
   - Emotional insights
   - Progress indicators
   - Continuity notes

2. **Progress Analysis**:
   - Trend identification
   - Metric calculation
   - Milestone recognition
   - Recommendation generation

3. **Personalized System Prompts**:
   - User history integration
   - Context-aware responses
   - Therapeutic continuity
   - Adaptive focus areas

## Privacy & Security

### Data Protection
- **Encryption**: All sensitive data encrypted with AES-256-GCM
- **Sanitization**: PII automatically removed before storage
- **Consent**: User consent required for transcript storage
- **Anonymization**: Anonymous user IDs by default

### Compliance
- **HIPAA**: Encrypted storage and transmission
- **GDPR**: User data control and deletion rights
- **SOC 2**: Audit logging and access controls

## Configuration

### Environment Variables
```bash
# AWS Configuration
AWS_REGION=us-east-1

# DynamoDB Tables
DYNAMODB_USERS_TABLE=therapeutic-wave-users
DYNAMODB_SESSIONS_TABLE=therapeutic-wave-sessions
DYNAMODB_PROGRESS_TABLE=therapeutic-wave-progress
DYNAMODB_SETTINGS_TABLE=therapeutic-wave-settings

# Encryption
ENCRYPTION_KEY=your-secure-encryption-key
```

### Bedrock Model Configuration
- **Model**: `anthropic.claude-3-haiku-20240307-v1:0`
- **Max Tokens**: 1000 (summaries), 800 (progress analysis)
- **Temperature**: Default (balanced creativity/consistency)

## Integration Example

```typescript
// In your main server file
import { integrateTherapeuticServices } from './services/integration-example';

// Integrate with Socket.IO server
integrateTherapeuticServices(io);

// The integration handles:
// - User connection with context
// - Personalized greetings
// - Session completion processing
// - Dashboard data retrieval
```

## Testing

### Configuration Test
```bash
npm run db:config
```

### Workflow Test
```bash
npm run test:workflow
```

### Manual Testing
```typescript
import { testWorkflow } from './services/integration-example';
await testWorkflow();
```

## Performance Considerations

### AI Processing
- **Async Processing**: Transcript analysis runs asynchronously
- **Fallback Handling**: Graceful degradation if AI fails
- **Cost Optimization**: Uses efficient Haiku model
- **Caching**: User context cached for session duration

### Database Optimization
- **Indexed Queries**: Optimized for user and time-based queries
- **Batch Operations**: Efficient progress aggregation
- **Connection Pooling**: Managed by AWS SDK

## Monitoring & Observability

### Logging
- Session initialization and completion
- AI processing success/failure
- Progress tracking updates
- Error handling and recovery

### Metrics
- Session completion rates
- AI processing latency
- User engagement trends
- Progress improvement rates

## Future Enhancements

### Planned Features
1. **Multi-language Support**: Transcript processing in multiple languages
2. **Advanced Analytics**: Machine learning-based progress prediction
3. **Integration APIs**: RESTful APIs for external systems
4. **Real-time Insights**: Live session analysis and recommendations
5. **Group Sessions**: Multi-user session support

### Scalability
- **Microservices**: Service separation for independent scaling
- **Event-driven**: Async processing with message queues
- **Caching**: Redis integration for session state
- **Load Balancing**: Horizontal scaling support

## Support

For questions or issues:
1. Check the integration example for usage patterns
2. Review the test workflow for expected behavior
3. Examine the database models for data structure
4. Consult the main README for overall architecture