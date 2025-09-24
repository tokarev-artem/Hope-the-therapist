/**
 * Data models and interfaces for user sessions, conversation history, and therapeutic progress
 * Designed for DynamoDB storage with encryption support for sensitive data
 */

export interface User {
  userId: string; // Primary key - anonymous UUID or authenticated user ID
  createdAt: string; // ISO timestamp
  lastActiveAt: string; // ISO timestamp
  isAnonymous: boolean;
  userName?: string; // Optional user name (encrypted if sensitive)
  frontendUserId?: string; // Original UUID from frontend for reference
  preferences: UserPreferences;
  encryptedData?: string; // Encrypted sensitive user data
}

export interface UserPreferences {
  theme: 'ocean-calm' | 'forest-peace' | 'sunset-warmth' | 'moonlight-serenity';
  motionIntensity: number; // 0.1 - 1.0
  colorIntensity: number; // 0.1 - 1.0
  animationSpeed: number; // 0.1 - 2.0
  reducedMotion: boolean;
  highContrast: boolean;
  audioSensitivity: number; // 0.1 - 1.0
}

export interface Session {
  sessionId: string; // Primary key - UUID
  userId: string; // Foreign key to User
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  duration?: number; // Duration in seconds
  conversationSummary?: string;
  emotionalState: EmotionalState;
  wavePatterns: WavePatternData[];
  encryptedTranscript?: string; // Encrypted conversation transcript
  therapeuticMetrics: TherapeuticMetrics;
}

export interface EmotionalState {
  initialMood: number; // 1-10 scale
  finalMood?: number; // 1-10 scale
  stressLevel: number; // 1-10 scale
  anxietyLevel: number; // 1-10 scale
  calmingEffectiveness?: number; // 1-10 scale - how effective the session was
  dominantEmotions: string[]; // Array of emotion tags
}

export interface WavePatternData {
  timestamp: string;
  amplitude: number;
  frequency: number;
  waveType: 'baseline' | 'user-input' | 'bot-response' | 'transition';
  duration: number; // Duration in milliseconds
}

export interface TherapeuticMetrics {
  sessionQuality: number; // 1-10 scale
  engagementLevel: number; // 1-10 scale
  responseTime: number; // Average response time in ms
  interruptionCount: number;
  silenceDuration: number; // Total silence duration in seconds
  voiceStressIndicators: VoiceStressIndicators;
}

export interface VoiceStressIndicators {
  averagePitch: number;
  pitchVariation: number;
  speakingRate: number; // Words per minute
  pauseFrequency: number;
  volumeConsistency: number;
}



// DynamoDB-specific interfaces for table operations
export interface DynamoDBUser extends Omit<User, 'preferences' | 'isAnonymous'> {
  isAnonymous: string; // Boolean stored as string for DynamoDB GSI compatibility
  preferences: string; // JSON stringified UserPreferences
  GSI1PK?: string; // Global Secondary Index partition key
  GSI1SK?: string; // Global Secondary Index sort key
}

export interface DynamoDBSession extends Omit<Session, 'emotionalState' | 'wavePatterns' | 'therapeuticMetrics'> {
  emotionalState: string; // JSON stringified EmotionalState
  wavePatterns: string; // JSON stringified WavePatternData[]
  therapeuticMetrics: string; // JSON stringified TherapeuticMetrics
  // Optional legacy/index support keys (present in existing deployments)
  GSI1PK?: string; // Partition key for GSI (e.g., 'USER#<userId>')
  GSI1SK?: string; // Sort key for GSI (e.g., startTime)
}



// Utility types for database operations
export type CreateUserInput = Omit<User, 'userId' | 'createdAt' | 'lastActiveAt'>;
export type UpdateUserInput = Partial<Omit<User, 'userId' | 'createdAt'>>;
export type CreateSessionInput = Omit<Session, 'sessionId' | 'startTime'>;
export type UpdateSessionInput = Partial<Omit<Session, 'sessionId' | 'userId' | 'startTime'>>;
