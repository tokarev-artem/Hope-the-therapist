/**
 * Example usage of the database repositories
 * This demonstrates how to use the database layer in your application
 */

import 'dotenv/config';
import { 
  usersRepository,
  sessionsRepository,
  settingsRepository,
  progressRepository
} from './repositories';

/**
 * Example: Create a new user and session
 */
export async function createUserAndSession() {
  try {
    // Create a new anonymous user
    const user = await usersRepository.createUser({
      isAnonymous: true,
      preferences: {
        theme: 'ocean-calm',
        motionIntensity: 0.8,
        colorIntensity: 0.7,
        animationSpeed: 1.0,
        reducedMotion: false,
        highContrast: false,
        audioSensitivity: 0.6
      }
    });

    console.log('Created user:', user.userId);

    // Create settings for the user
    const settings = await settingsRepository.upsertSettings({
      userId: user.userId,
      waveSettings: {
        theme: 'ocean-calm',
        motionIntensity: 0.8,
        animationSpeed: 1.0,
        reducedMotion: false,
        waveComplexity: 'moderate'
      },
      audioSettings: {
        inputSensitivity: 0.6,
        outputVolume: 0.8,
        noiseReduction: true,
        voiceEnhancement: false,
        binauralBeats: false
      },
      privacySettings: {
        storeConversations: true,
        encryptSensitiveData: true,
        dataRetentionDays: 30,
        shareAnonymizedData: false,
        allowAnalytics: true
      },
      therapeuticSettings: {
        sessionGoals: ['reduce-anxiety', 'improve-mood'],
        triggerWords: [],
        copingStrategies: ['deep-breathing', 'mindfulness'],
        reminderFrequency: 'weekly',
        progressSharing: false
      }
    });

    console.log('Created settings for user:', settings.userId);

    // Create a therapy session
    const session = await sessionsRepository.createSession({
      userId: user.userId,
      emotionalState: {
        initialMood: 6,
        stressLevel: 7,
        anxietyLevel: 8,
        dominantEmotions: ['anxious', 'stressed']
      },
      wavePatterns: [
        {
          timestamp: new Date().toISOString(),
          amplitude: 0.5,
          frequency: 440,
          waveType: 'baseline',
          duration: 1000
        }
      ],
      therapeuticMetrics: {
        sessionQuality: 8,
        engagementLevel: 9,
        responseTime: 250,
        interruptionCount: 2,
        silenceDuration: 15,
        voiceStressIndicators: {
          averagePitch: 200,
          pitchVariation: 50,
          speakingRate: 150,
          pauseFrequency: 0.3,
          volumeConsistency: 0.8
        }
      }
    });

    console.log('Created session:', session.sessionId);

    return { user, settings, session };

  } catch (error) {
    console.error('Error in createUserAndSession:', error);
    throw error;
  }
}

/**
 * Example: Update session with end data
 */
export async function completeSession(sessionId: string) {
  try {
    const updatedSession = await sessionsRepository.updateSession(sessionId, {
      endTime: new Date().toISOString(),
      duration: 1800, // 30 minutes
      conversationSummary: 'User discussed work stress and learned breathing techniques',
      emotionalState: {
        initialMood: 6,
        finalMood: 8,
        stressLevel: 4, // Reduced from 7
        anxietyLevel: 5, // Reduced from 8
        calmingEffectiveness: 8,
        dominantEmotions: ['calm', 'hopeful']
      }
    });

    console.log('Updated session:', updatedSession?.sessionId);
    return updatedSession;

  } catch (error) {
    console.error('Error in completeSession:', error);
    throw error;
  }
}

/**
 * Example: Create weekly progress record
 */
export async function createWeeklyProgress(userId: string) {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    
    const progress = await progressRepository.createProgress({
      userId,
      weekStartDate: weekStart.toISOString().split('T')[0], // YYYY-MM-DD format
      sessionsCount: 5,
      totalDuration: 9000, // 2.5 hours total
      averageMoodImprovement: 2.4,
      averageStressReduction: 3.2,
      milestones: [
        {
          milestoneId: 'first-week',
          achievedAt: new Date().toISOString(),
          type: 'session-count',
          title: 'First Week Complete',
          description: 'Completed first week of therapy sessions',
          value: 5
        }
      ],
      trends: {
        moodTrend: 'improving',
        stressTrend: 'improving',
        engagementTrend: 'stable',
        consistencyScore: 85,
        weeklyGrowth: 15
      }
    });

    console.log('Created progress record:', progress.progressId);
    return progress;

  } catch (error) {
    console.error('Error in createWeeklyProgress:', error);
    throw error;
  }
}

/**
 * Example: Retrieve user data
 */
export async function getUserData(userId: string) {
  try {
    // Get user profile
    const user = await usersRepository.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user settings
    const settings = await settingsRepository.getSettingsByUserId(userId);

    // Get recent sessions
    const sessions = await sessionsRepository.getSessionsByUserId(userId, 10);

    // Get progress records
    const progressRecords = await progressRepository.getProgressByUserId(userId, 12);

    console.log('Retrieved user data:', {
      user: user.userId,
      settingsConfigured: !!settings,
      recentSessions: sessions.length,
      progressRecords: progressRecords.length
    });

    return {
      user,
      settings,
      sessions,
      progressRecords
    };

  } catch (error) {
    console.error('Error in getUserData:', error);
    throw error;
  }
}

/**
 * Example: Full workflow demonstration
 */
async function demonstrateWorkflow() {
  console.log('🎭 Demonstrating database workflow...\n');

  try {
    // Step 1: Create user and initial session
    console.log('1. Creating user and session...');
    const { user, session } = await createUserAndSession();

    // Step 2: Complete the session
    console.log('2. Completing session...');
    await completeSession(session.sessionId);

    // Step 3: Create progress record
    console.log('3. Creating weekly progress...');
    await createWeeklyProgress(user.userId);

    // Step 4: Retrieve all user data
    console.log('4. Retrieving user data...');
    await getUserData(user.userId);

    console.log('\n✅ Workflow demonstration completed successfully!');

  } catch (error) {
    console.error('❌ Workflow demonstration failed:', error);
  }
}

// Run demonstration if called directly
if (require.main === module) {
  demonstrateWorkflow();
}