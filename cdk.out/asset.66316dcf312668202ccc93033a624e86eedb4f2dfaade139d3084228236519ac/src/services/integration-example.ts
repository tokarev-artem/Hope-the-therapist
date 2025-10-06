/**
 * Integration example showing how to use the transcript processing and user continuity services
 * This demonstrates the complete workflow from session start to completion
 */

import { sessionManager } from './session-manager';
import { getUserContext } from './user-continuity';
import { usersRepository } from '../database';

/**
 * Example: Complete therapeutic session workflow
 */
export class TherapeuticSessionWorkflow {
  
  /**
   * Handle new user connection
   */
  async handleUserConnection(socketId: string): Promise<{
    userId: string;
    sessionData: any;
    personalizedGreeting: string;
    systemPrompt: string;
  }> {
    try {
      // Check if user exists (from localStorage or session)
      let userId = this.getUserIdFromStorage(socketId);
      
      if (!userId) {
        // Create new anonymous user
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
        userId = user.userId;
        this.storeUserId(socketId, userId);
      }

      // Get initial emotional state (could be from UI input)
      const initialEmotionalState = {
        initialMood: 5, // Default, will be updated by user input
        stressLevel: 5,
        anxietyLevel: 5,
        dominantEmotions: []
      };

      // Initialize session with full context
      const sessionData = await sessionManager.initializeSession(userId, initialEmotionalState);

      return {
        userId,
        sessionData,
        personalizedGreeting: sessionData.userContext.personalizedGreeting,
        systemPrompt: sessionData.personalizedSystemPrompt
      };

    } catch (error) {
      console.error('Error handling user connection:', error);
      throw error;
    }
  }

  /**
   * Handle session completion with transcript processing
   */
  async handleSessionCompletion(
    sessionId: string,
    userId: string,
    conversationTranscript: string,
    finalEmotionalState: any,
    sessionMetrics: any,
    userConsentToStore: boolean = true
  ): Promise<{
    summary: any;
    recommendations: string[];
    progressInsights: any;
  }> {
    try {
      // Complete session with AI processing
      const completionData = await sessionManager.completeSession(
        sessionId,
        userId,
        conversationTranscript,
        finalEmotionalState,
        sessionMetrics,
        userConsentToStore
      );

      // Get updated progress insights
      const progressInsights = await sessionManager.getSessionInsights(userId);

      return {
        summary: completionData.summary,
        recommendations: completionData.nextSessionRecommendations,
        progressInsights
      };

    } catch (error) {
      console.error('Error handling session completion:', error);
      throw error;
    }
  }

  /**
   * Get user dashboard data
   */
  async getUserDashboard(userId: string): Promise<{
    userContext: any;
    recentSessions: any[];
    progressAnalysis: any;
    recommendations: string[];
  }> {
    try {
      const userContext = await getUserContext(userId);
      const sessionInsights = await sessionManager.getSessionInsights(userId, 10);

      return {
        userContext,
        recentSessions: sessionInsights.recentSessions,
        progressAnalysis: sessionInsights.progressAnalysis,
        recommendations: userContext.recommendations
      };

    } catch (error) {
      console.error('Error getting user dashboard:', error);
      throw error;
    }
  }

  /**
   * Example integration with your existing Socket.IO server
   */
  integrateWithSocketServer(io: any) {
    io.on('connection', async (socket: any) => {
      console.log('New client connected:', socket.id);

      try {
        // Initialize user session with context
        const connectionData = await this.handleUserConnection(socket.id);
        
        // Send personalized greeting and context to client
        socket.emit('userContext', {
          userId: connectionData.userId,
          greeting: connectionData.personalizedGreeting,
          isReturningUser: connectionData.sessionData.userContext.user.isReturningUser,
          totalSessions: connectionData.sessionData.userContext.user.totalSessions,
          recommendedTheme: connectionData.sessionData.recommendedWaveTheme,
          recommendations: connectionData.sessionData.userContext.recommendations
        });

        // Set up session with personalized system prompt
        const session = this.getBedrockSession(socket.id);
        if (session) {
          await session.setupSystemPrompt(undefined, connectionData.systemPrompt);
        }

        // Handle session completion
        socket.on('sessionComplete', async (data: {
          transcript: string;
          finalEmotionalState: any;
          sessionMetrics: any;
          userConsent: boolean;
        }) => {
          try {
            const completionData = await this.handleSessionCompletion(
              connectionData.sessionData.sessionId,
              connectionData.userId,
              data.transcript,
              data.finalEmotionalState,
              data.sessionMetrics,
              data.userConsent
            );

            // Send completion data to client
            socket.emit('sessionCompleted', {
              summary: completionData.summary.sessionSummary,
              insights: completionData.summary.emotionalInsights,
              recommendations: completionData.recommendations,
              progress: completionData.progressInsights.trends
            });

          } catch (error) {
            console.error('Error completing session:', error);
            socket.emit('error', { message: 'Failed to process session completion' });
          }
        });

        // Handle dashboard request
        socket.on('getDashboard', async () => {
          try {
            const dashboard = await this.getUserDashboard(connectionData.userId);
            socket.emit('dashboardData', dashboard);
          } catch (error) {
            console.error('Error getting dashboard:', error);
            socket.emit('error', { message: 'Failed to load dashboard' });
          }
        });

      } catch (error) {
        console.error('Error initializing user session:', error);
        socket.emit('error', { message: 'Failed to initialize session' });
      }
    });
  }

  /**
   * Store user ID for session persistence
   */
  private storeUserId(socketId: string, userId: string): void {
    // In production, you might use Redis or another session store
    // For now, we'll use a simple in-memory store
    this.userSessions.set(socketId, userId);
  }

  /**
   * Retrieve user ID from storage
   */
  private getUserIdFromStorage(socketId: string): string | null {
    return this.userSessions.get(socketId) || null;
  }

  /**
   * Get Bedrock session (placeholder - integrate with your existing session management)
   */
  private getBedrockSession(socketId: string): any {
    // Return your existing Bedrock session for this socket
    return null; // Implement based on your existing code
  }

  // Simple in-memory session store (use Redis in production)
  private userSessions = new Map<string, string>();
}

/**
 * Example usage in your main server file
 */
export function integrateTherapeuticServices(io: any) {
  const workflow = new TherapeuticSessionWorkflow();
  workflow.integrateWithSocketServer(io);
}

/**
 * Example: Manual testing of the workflow
 */
export async function testWorkflow() {
  console.log('🧪 Testing therapeutic session workflow...\n');

  const workflow = new TherapeuticSessionWorkflow();

  try {
    // 1. Simulate user connection
    console.log('1. Simulating user connection...');
    const connectionData = await workflow.handleUserConnection('test-socket-123');
    console.log('✅ User connected:', connectionData.userId);
    console.log('📝 Greeting:', connectionData.personalizedGreeting);

    // 2. Simulate session completion
    console.log('\n2. Simulating session completion...');
    const mockTranscript = `
    User: I've been feeling really stressed about work lately. The deadlines are overwhelming.
    AI: I understand that work stress can feel overwhelming. Can you tell me more about what specifically is causing the most pressure?
    User: It's the constant deadlines and feeling like I'm never caught up. I barely have time to breathe.
    AI: That sounds exhausting. Let's try some breathing exercises together and explore some strategies for managing these feelings.
    User: That actually helped. I feel a bit calmer now.
    AI: I'm glad the breathing exercise was helpful. Remember, you can use this technique whenever you feel overwhelmed.
    `;

    const completionData = await workflow.handleSessionCompletion(
      connectionData.sessionData.sessionId,
      connectionData.userId,
      mockTranscript,
      {
        initialMood: 4,
        finalMood: 6,
        stressLevel: 3, // Reduced from initial
        anxietyLevel: 4,
        calmingEffectiveness: 8
      },
      {
        duration: 1200, // 20 minutes
        sessionQuality: 8,
        engagementLevel: 9,
        responseTime: 250,
        interruptionCount: 1,
        silenceDuration: 30
      },
      true // User consents to storage
    );

    console.log('✅ Session completed');
    console.log('📊 Summary:', completionData.summary.sessionSummary);
    console.log('💡 Recommendations:', completionData.recommendations);

    // 3. Get dashboard data
    console.log('\n3. Getting user dashboard...');
    const dashboard = await workflow.getUserDashboard(connectionData.userId);
    console.log('✅ Dashboard loaded');
    console.log('📈 Progress trend:', dashboard.progressAnalysis?.overallTrend);
    console.log('🎯 Total sessions:', dashboard.userContext.user.totalSessions);

    console.log('\n🎉 Workflow test completed successfully!');

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testWorkflow();
}