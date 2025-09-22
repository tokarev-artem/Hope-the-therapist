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

export interface Progress {
  progressId: string; // Primary key - UUID
  userId: string; // Foreign key to User
  weekStartDate: string; // ISO date string (YYYY-MM-DD)
  sessionsCount: number;
  totalDuration: number; // Total duration in seconds
  averageMoodImprovement: number; // Average mood improvement across sessions
  averageStressReduction: number; // Average stress reduction across sessions
  milestones: Milestone[];
  trends: ProgressTrends;
  encryptedNotes?: string; // Encrypted personal notes or observations
}

export interface Milestone {
  milestoneId: string;
  achievedAt: string; // ISO timestamp
  type: 'session-count' | 'mood-improvement' | 'stress-reduction' | 'consistency' | 'custom';
  title: string;
  description: string;
  value: number; // Numeric value associated with the milestone
}

export interface ProgressTrends {
  moodTrend: 'improving' | 'stable' | 'declining';
  stressTrend: 'improving' | 'stable' | 'declining';
  engagementTrend: 'improving' | 'stable' | 'declining';
  consistencyScore: number; // 0-100 based on regular usage
  weeklyGrowth: number; // Percentage growth week over week
}

export interface Settings {
  settingsId: string; // Primary key - userId for user-specific settings
  userId: string; // Foreign key to User
  waveSettings: WaveSettings;
  audioSettings: AudioSettings;
  privacySettings: PrivacySettings;
  therapeuticSettings: TherapeuticSettings;
  updatedAt: string; // ISO timestamp
}

export interface WaveSettings {
  theme: string;
  customColors?: {
    baselineColor: string;
    userInputColor: string;
    botOutputColor: string;
    backgroundColor: string;
  };
  motionIntensity: number;
  animationSpeed: number;
  reducedMotion: boolean;
  waveComplexity: 'simple' | 'moderate' | 'complex';
}

export interface AudioSettings {
  inputSensitivity: number; // 0.1 - 1.0
  outputVolume: number; // 0.1 - 1.0
  noiseReduction: boolean;
  voiceEnhancement: boolean;
  binauralBeats: boolean;
  binauralFrequency?: number; // Hz for binaural beats
}

export interface PrivacySettings {
  storeConversations: boolean;
  encryptSensitiveData: boolean;
  dataRetentionDays: number; // Days to retain data (0 = indefinite)
  shareAnonymizedData: boolean; // For research purposes
  allowAnalytics: boolean;
}

export interface TherapeuticSettings {
  sessionGoals: string[]; // Array of therapeutic goals
  triggerWords: string[]; // Words that might be triggering for the user
  copingStrategies: string[]; // Preferred coping strategies
  reminderFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  progressSharing: boolean; // Share progress with healthcare provider
  emergencyContact?: string; // Encrypted emergency contact info
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
  GSI1PK: string; // userId for querying sessions by user
  GSI1SK: string; // startTime for sorting sessions chronologically
}

export interface DynamoDBProgress extends Omit<Progress, 'milestones' | 'trends'> {
  milestones: string; // JSON stringified Milestone[]
  trends: string; // JSON stringified ProgressTrends
  GSI1PK: string; // userId for querying progress by user
  GSI1SK: string; // weekStartDate for sorting progress chronologically
}

export interface DynamoDBSettings extends Omit<Settings, 'waveSettings' | 'audioSettings' | 'privacySettings' | 'therapeuticSettings'> {
  waveSettings: string; // JSON stringified WaveSettings
  audioSettings: string; // JSON stringified AudioSettings
  privacySettings: string; // JSON stringified PrivacySettings
  therapeuticSettings: string; // JSON stringified TherapeuticSettings
}

// Utility types for database operations
export type CreateUserInput = Omit<User, 'userId' | 'createdAt' | 'lastActiveAt'>;
export type UpdateUserInput = Partial<Omit<User, 'userId' | 'createdAt'>>;
export type CreateSessionInput = Omit<Session, 'sessionId' | 'startTime'>;
export type UpdateSessionInput = Partial<Omit<Session, 'sessionId' | 'userId' | 'startTime'>>;
export type CreateProgressInput = Omit<Progress, 'progressId'>;
export type UpdateProgressInput = Partial<Omit<Progress, 'progressId' | 'userId' | 'weekStartDate'>>;
export type CreateSettingsInput = Omit<Settings, 'settingsId' | 'updatedAt'>;
export type UpdateSettingsInput = Partial<Omit<Settings, 'settingsId' | 'userId'>>;