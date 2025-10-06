# Design Document

## Overview

The AWS Bedrock Nova Sonic streaming service has a 59-second timeout for gaps between audio chunks or interactive content. The issue occurs specifically when running in ECS behind an Application Load Balancer, but works fine on EC2 instances or locally. This suggests the problem is related to load balancer timeout configurations and WebSocket connection handling in the ECS environment, not just audio streaming gaps.

## Architecture

### Current Flow
```
Client Audio → Socket.IO → Server → Nova Sonic Stream → Response
```

### Enhanced Flow with Load Balancer Fixes
```
Client Audio → ALB (WebSocket) → ECS Task → Socket.IO → Server → Nova Sonic Stream → Response
                ↓                    ↓
        Sticky Sessions      Connection Keepalive
        Timeout Config       Health Checks
```

## Components and Interfaces

### 1. Load Balancer Configuration Updates
**Location:** `infrastructure/hope-therapeutic-stack.ts`

**Responsibilities:**
- Configure ALB for WebSocket support with proper timeouts
- Enable sticky sessions for WebSocket connections
- Set appropriate health check configurations
- Configure target group settings for long-lived connections

**Key Settings:**
```typescript
interface LoadBalancerConfig {
  idleTimeout: Duration; // 300 seconds (5 minutes)
  stickySessionsEnabled: boolean; // true
  websocketUpgradeEnabled: boolean; // true
  healthCheckPath: string; // '/health'
  healthCheckInterval: Duration; // 30 seconds
}
```

### 2. Audio Buffer Manager
**Location:** `src/services/audio-buffer-manager.ts`

**Responsibilities:**
- Track timing of audio chunks
- Generate and send keepalive audio when needed
- Manage audio streaming state
- Handle reconnection logic
- Monitor ECS container health

**Interface:**
```typescript
interface AudioBufferManager {
  startSession(sessionId: string): void;
  processAudioChunk(audioBuffer: Buffer): Promise<void>;
  stopSession(sessionId: string): void;
  isSessionActive(sessionId: string): boolean;
  getConnectionHealth(): ConnectionHealth;
}
```

### 2. Keepalive Audio Generator
**Location:** `src/utils/keepalive-audio.ts`

**Responsibilities:**
- Generate silent audio chunks in the correct format
- Ensure compatibility with Nova Sonic requirements
- Minimize impact on speech recognition

**Interface:**
```typescript
interface KeepaliveAudioGenerator {
  generateSilentChunk(durationMs: number): Buffer;
  getOptimalChunkSize(): number;
}
```

### 3. ECS Health Check Endpoint
**Location:** Updates to `src/server.ts`

**Responsibilities:**
- Provide detailed health status for ALB health checks
- Monitor Nova Sonic connection status
- Report container readiness and liveness
- Handle graceful shutdown scenarios

### 4. Enhanced Session Management
**Location:** Updates to `src/server.ts`

**Responsibilities:**
- Integrate audio buffer manager with existing session handling
- Provide connection status feedback to clients
- Handle reconnection scenarios
- Implement WebSocket ping/pong for connection health

## Data Models

### Audio Session State
```typescript
interface AudioSessionState {
  sessionId: string;
  lastAudioTime: number;
  keepaliveActive: boolean;
  keepaliveTimer?: NodeJS.Timeout;
  reconnectAttempts: number;
  connectionStatus: 'active' | 'keepalive' | 'reconnecting' | 'failed';
}
```

### Keepalive Configuration
```typescript
interface KeepaliveConfig {
  maxGapSeconds: number; // 45 seconds (safety margin from 59s limit)
  keepaliveIntervalMs: number; // 30 seconds
  silentChunkDurationMs: number; // 100ms
  maxReconnectAttempts: number; // 3
}
```

## Error Handling

### Timeout Recovery Strategy
1. **Detection:** Monitor for Nova Sonic timeout errors
2. **Immediate Response:** Log error details and notify client
3. **Reconnection:** Attempt to establish new streaming session
4. **Fallback:** If reconnection fails, provide graceful degradation

### Error Types and Responses
```typescript
enum StreamingErrorType {
  TIMEOUT = 'timeout',
  CONNECTION_LOST = 'connection_lost',
  KEEPALIVE_FAILED = 'keepalive_failed',
  RECONNECT_FAILED = 'reconnect_failed'
}
```

### Client Notification Strategy
- Real-time status updates via Socket.IO
- Visual indicators for connection health
- User-friendly error messages
- Automatic retry prompts

## Implementation Details

### Keepalive Timing Strategy
- **Trigger Point:** 45 seconds after last audio chunk
- **Keepalive Frequency:** Every 30 seconds while active
- **Audio Format:** Silent PCM chunks matching Nova Sonic requirements
- **Chunk Size:** 100ms of silent audio (minimal overhead)

### Silent Audio Generation
```typescript
// Generate silent PCM audio chunk
function generateSilentPCM(durationMs: number, sampleRate: number = 16000): Buffer {
  const samplesPerMs = sampleRate / 1000;
  const totalSamples = Math.floor(durationMs * samplesPerMs);
  const bytesPerSample = 2; // 16-bit PCM
  return Buffer.alloc(totalSamples * bytesPerSample, 0);
}
```

### Load Balancer Timeout Configuration
```typescript
// ALB Configuration for WebSocket support
const albConfig = {
  idleTimeout: cdk.Duration.seconds(300), // 5 minutes
  http2Enabled: false, // WebSocket requires HTTP/1.1
  ipAddressType: elbv2.IpAddressType.IPV4,
  internetFacing: true
};

// Target Group Configuration
const targetGroupConfig = {
  port: 3000,
  protocol: elbv2.ApplicationProtocol.HTTP,
  healthCheckPath: '/health',
  healthCheckIntervalSeconds: 30,
  healthyThresholdCount: 2,
  unhealthyThresholdCount: 5,
  healthCheckTimeoutSeconds: 10,
  stickinessCookieDuration: cdk.Duration.hours(1)
};
```

### Connection Status Management
- Track connection health in real-time
- Provide visual feedback to users
- Implement graceful degradation strategies
- Log detailed metrics for monitoring
- Monitor ALB target health status

### Memory Management
- Clean up keepalive timers on session end
- Prevent memory leaks from abandoned sessions
- Optimize audio buffer allocation
- Monitor resource usage patterns
- Handle ECS task recycling gracefully