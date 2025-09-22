# Amazon Nova Sonic TypeScript Example: Real-time Audio Streaming with AWS Bedrock Integration

This project implements a bidirectional WebSocket-based audio streaming application that integrates with Amazon Nova Sonic model for real-time speech-to-speech conversion. The application enables natural conversational interactions through a web interface while leveraging Amazon's new powerful Nova Sonic model for processing and generating responses.

The system consists of a server that handles the bidirectional streaming and AWS Bedrock integration, paired with a modern web client that manages audio streaming and user interactions. Key features include real-time audio streaming, integration with Amazon Nova Sonic model, bidirectional communication handling, and a responsive web interface with chat history management. It supports also command-line interface to run an interaction with a recorded audio.

## Repository Structure
```
.
├── public/                 # Frontend web application files
│   ├── index.html          # Main application entry point
│   └── src/                # Frontend source code
│       ├── lib/            # Core frontend libraries
│       │   ├── play/       # Audio playback components
│       │   └── util/       # Utility functions and managers
│       ├── main.js         # Main application logic
│       └── style.css       # Application styling
├── src/                    # TypeScript source files
│   ├── client.ts           # AWS Bedrock client implementation
│   ├── server.ts           # Express server implementation
│   └── types.ts            # TypeScript type definitions
└── tsconfig.json           # TypeScript configuration
```

## Usage Instructions
### Prerequisites
- Node.js (v14 or higher)
- AWS Account with Bedrock access
- AWS CLI configured with appropriate credentials
- Modern web browser with WebAudio API support


### Installation
1. Clone the repository:
```bash
git clone https://github.com/tokarev-artem/Hope-the-therapist.git
cd Hope-the-therapist
```

2. Install dependencies:
```bash
npm install
```

3. Configure AWS credentials:
```bash
# Configure AWS CLI with your credentials
export AWS_ACCESS_KEY_ID=""
export AWS_SECRET_ACCESS_KEY=""
export AWS_SESSION_TOKEN=""
```

**Note**: For demo purposes, no additional configuration is needed. The application uses default encryption keys and will work out of the box. For production use, set a custom `ENCRYPTION_KEY` environment variable.

4. Create DynamoDB tables:

**Users Table:**
```bash
aws dynamodb create-table \
  --table-name therapeutic-wave-users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=isAnonymous,AttributeType=S \
    AttributeName=lastActiveAt,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "isAnonymous-lastActiveAt-index",
      "KeySchema": [
        {"AttributeName":"isAnonymous","KeyType":"HASH"},
        {"AttributeName":"lastActiveAt","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

```

**Sessions Table:**
```bash
aws dynamodb create-table \
  --table-name therapeutic-wave-sessions \
  --attribute-definitions \
    AttributeName=sessionId,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=sessionId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "userId-startTime-index",
      "KeySchema": [
        {"AttributeName":"GSI1PK","KeyType":"HASH"},
        {"AttributeName":"GSI1SK","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

```

5. Build the TypeScript code:
```bash
npm run build
```

### Quick Start
1. Start the server:
```bash
npm start
```

2. Open your browser:
```
http://localhost:3000
```

3. Grant microphone permissions when prompted.

## Data Flow
The application processes audio input through a pipeline that converts speech to text, processes it with AWS Bedrock, and returns both text and audio responses.

```ascii
User Speech -> Browser → Server → Client
     ↑                               ↓
     │                   Amazon Nova Sonic Model
     │                               ↓
Audio Output ← Browser ← Server ← Client
```

Key flow components:
1. User speaks into the microphone through Browser
2. Audio is streamed through Server to Client
3. Client sends audio to Amazon Nova Sonic Model
4. Nova Sonic processes audio and generates AI response
5. Response is sent back through client to server to browser
6. Browser plays audio response to user


## Database Structure
The application uses DynamoDB to store user data and session information:

### Tables
- **therapeutic-wave-users**: Stores user profiles, preferences, and metadata
- **therapeutic-wave-sessions**: Stores individual therapy sessions with conversation data

### Key Features
- Encrypted conversation transcripts for privacy
- Session continuity and user recognition
- Emotional state tracking and progress monitoring
- Secure user identification with UUID-based system

## Infrastructure
The application runs on a Node.js server with the following key components:

- Express.js server handling WebSocket connections
- Socket.IO for real-time communication
- Nova Sonic client for speech to speech model processing
- DynamoDB for persistent data storage
