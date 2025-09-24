# Hope - AI Therapeutic Companion

**A compassionate AI assistant designed to support individuals experiencing mental health challenges through natural voice conversations.**

## 🌟 What is Hope?

Hope is an AI-powered therapeutic companion built to provide a safe, non-judgmental space for people struggling with:

- **Post-Traumatic Stress Disorder (PTSD)** - Offering grounding techniques and emotional support
- **Depression and Anxiety** - Providing coping strategies and active listening
- **Social Isolation** - Helping those who find it difficult to open up to others
- **Emotional Processing** - Supporting users in expressing and understanding their feelings

## 💙 Who is this for?

This application is designed for individuals who:

- **Struggle to open up to others** - Hope provides a judgment-free environment to start sharing
- **Need immediate emotional support** - Available 24/7 when traditional therapy isn't accessible  
- **Want to practice expressing their feelings** - A safe space to work through emotions before speaking with humans
- **Benefit from consistent therapeutic support** - Hope remembers your journey and builds on previous conversations
- **Prefer voice-based interaction** - Natural speech feels more personal than text-based chat

## 🧠 Key Therapeutic Features

### **Conversation Memory & Continuity**
- **Remembers your story** - Hope recalls your previous sessions and personal details
- **Builds on progress** - References past conversations to show growth and patterns
- **Personalized support** - Adapts responses based on your unique situation and needs

### **Evidence-Based Techniques**
- **Grounding exercises** - 5-4-3-2-1 technique and breathing exercises
- **Active listening** - Validates feelings and reflects back what you share
- **Psychoeducation** - Explains trauma responses and mental health concepts
- **Crisis support** - Provides immediate resources when needed

### **Safe & Private**
- **Encrypted conversations** - All session data is securely stored
- **Anonymous option** - Use without providing personal information
- **No judgment** - Designed to be patient, understanding, and supportive

## 🎯 How Hope Helps

1. **Breaking the Silence** - For those who've never spoken about their trauma or feelings
2. **Consistent Support** - Available whenever you need someone to listen
3. **Skill Building** - Learn coping techniques and emotional regulation strategies
4. **Progress Tracking** - See your emotional journey over time
5. **Bridge to Human Care** - Builds confidence to eventually seek professional therapy

## 🔧 Technical Implementation

This project implements a bidirectional WebSocket-based audio streaming application that integrates with Amazon Nova Sonic model for real-time speech-to-speech conversion. The application enables natural conversational interactions through a web interface while leveraging Amazon's powerful Nova Sonic model for processing and generating empathetic responses.

The system consists of a server that handles the bidirectional streaming and AWS Bedrock integration, paired with a modern web client that manages audio streaming and user interactions. Key technical features include real-time audio streaming, integration with Amazon Nova Sonic model, bidirectional communication handling, persistent conversation memory, and a responsive web interface.

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

3. **Enter your name** (or remain anonymous) and begin your therapeutic journey
4. **Grant microphone permissions** when prompted
5. **Start speaking** - Hope will listen and respond with voice and understanding

## 🗣️ How to Use Hope

### **First Time Users**
1. **Introduce yourself** - Share your name or stay anonymous
2. **Start simple** - "Hello" or "I'm having a difficult day"
3. **Take your time** - Hope is patient and won't rush you
4. **Be honest** - Share what feels comfortable

### **Returning Users**
- Hope will **remember you** and reference previous conversations
- Ask **"What did we talk about before?"** to continue where you left off
- Hope tracks your **emotional journey** and progress over time

### **During Conversations**
- **Speak naturally** - No special commands needed
- **Take pauses** - Hope understands silence and processing time
- **Ask for help** - "Can you help me calm down?" or "I need grounding techniques"
- **Set boundaries** - "I don't want to talk about that today"

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


## ⚠️ Important Disclaimers

**Hope is not a replacement for professional mental health care.** This AI assistant:

- **Provides supportive listening** and evidence-based coping techniques
- **Offers crisis resources** and encourages professional help when needed
- **Creates a safe space** for emotional expression and processing
- **Does not diagnose** mental health conditions
- **Does not provide therapy** or clinical treatment
- **Cannot replace** licensed mental health professionals

**If you're experiencing thoughts of self-harm or suicide, please contact:**
- **Crisis Text Line**: Text HOME to 741741
- **National Suicide Prevention Lifeline**: 988
- **Emergency Services**: 911

## 🎭 Therapeutic Approach

Hope is designed with trauma-informed principles:

- **Safety First** - User safety is the top priority in all interactions
- **Validation** - All feelings and experiences are acknowledged and validated
- **Empowerment** - Focus on user strengths and ability to cope
- **Patience** - No rushing to solutions; users guide the conversation
- **Boundaries** - Clear limits on what Hope can and cannot provide

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
