/**
 * Session manager that integrates transcript processing and user continuity
 * Main orchestrator for therapeutic sessions with AI-powered insights
 */

import { sessionsRepository } from '../database';
import { transcriptProcessor, TranscriptSummary } from './transcript-processor';
import { userContinuityService, UserContext, SessionContext } from './user-continuity';

export interface SessionInitializationData {
  sessionId: string;
  userContext: UserContext;
  sessionContext: SessionContext;
  personalizedSystemPrompt: string;
  recommendedWaveTheme: string;
}

export interface SessionCompletionData {
  sessionId: string;
  summary: TranscriptSummary;
  progressUpdated: boolean;
  nextSessionRecommendations: string[];
}

export class SessionManager {
  
  /**
   * Initialize a new therapeutic session with full context
   */
  async initializeSession(userId: string, initialEmotionalState: any): Promise<SessionInitializationData> {
    try {
      console.log(`Initializing session for user ${userId}`);

      // Get comprehensive user context
      const userContext = await userContinuityService.getUserContext(userId);
      const sessionContext = await userContinuityService.getSessionContext(userId);

      // Create new session record
      const session = await sessionsRepository.createSession({
        userId,
        emotionalState: initialEmotionalState,
        wavePatterns: [],
        therapeuticMetrics: {
          sessionQuality: 0,
          engagementLevel: 0,
          responseTime: 0,
          interruptionCount: 0,
          silenceDuration: 0,
          voiceStressIndicators: {
            averagePitch: 0,
            pitchVariation: 0,
            speakingRate: 0,
            pauseFrequency: 0,
            volumeConsistency: 0
          }
        }
      });

      // Generate personalized system prompt for AI
      const personalizedSystemPrompt = await userContinuityService.generatePersonalizedSystemPrompt(userId);

      // Recommend wave theme based on user history and current state
      const recommendedWaveTheme = this.recommendWaveTheme(userContext, initialEmotionalState);

      console.log(`Session ${session.sessionId} initialized for ${userContext.user.isReturningUser ? 'returning' : 'new'} user`);

      return {
        sessionId: session.sessionId,
        userContext,
        sessionContext,
        personalizedSystemPrompt,
        recommendedWaveTheme
      };

    } catch (error) {
      console.error('Error initializing session:', error);
      throw error;
    }
  }

  /**
   * Process session completion with transcript analysis and progress tracking
   */
  async completeSession(
    sessionId: string,
    userId: string,
    transcript: string,
    finalEmotionalState: any,
    sessionMetrics: any,
    userConsent: boolean = true
  ): Promise<SessionCompletionData> {
    try {
      console.log(`Completing session ${sessionId}`);

      // Process transcript and generate AI summary
      const summary = await transcriptProcessor.processSessionTranscript(
        sessionId, 
        transcript, 
        userConsent
      );

      // Update session with completion data
      await sessionsRepository.updateSession(sessionId, {
        endTime: new Date().toISOString(),
        duration: sessionMetrics.duration,
        emotionalState: {
          ...finalEmotionalState,
          dominantEmotions: summary?.emotionalInsights.dominantEmotions || []
        },
        therapeuticMetrics: sessionMetrics
      });

      // Update user progress tracking
      await userContinuityService.updateUserProgress(userId, sessionId, summary);

      // Generate recommendations for next session
      const nextSessionRecommendations = this.generateNextSessionRecommendations(summary, finalEmotionalState);

      console.log(`Session ${sessionId} completed successfully`);

      return {
        sessionId,
        summary: summary || this.getDefaultSummary(),
        progressUpdated: true,
        nextSessionRecommendations
      };

    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  /**
   * Get session insights for user dashboard
   */
  async getSessionInsights(userId: string, sessionCount: number = 5): Promise<any> {
    try {
      const recentSessions = await sessionsRepository.getSessionsByUserId(userId, sessionCount);
      const progressAnalysis = await transcriptProcessor.analyzeUserProgress(userId);

      return {
        recentSessions: recentSessions.map(session => ({
          sessionId: session.sessionId,
          date: session.startTime,
          duration: session.duration,
          moodChange: {
            initial: session.emotionalState.initialMood,
            final: session.emotionalState.finalMood
          },
          summary: session.conversationSummary,
          quality: session.therapeuticMetrics.sessionQuality
        })),
        progressAnalysis,
        trends: {
          moodTrend: progressAnalysis.overallTrend,
          averageImprovement: progressAnalysis.keyMetrics.moodImprovement,
          consistencyScore: progressAnalysis.keyMetrics.consistencyScore
        }
      };

    } catch (error) {
      console.error('Error getting session insights:', error);
      return { recentSessions: [], progressAnalysis: null, trends: null };
    }
  }

  /**
   * Recommend wave theme based on user context and emotional state
   */
  private recommendWaveTheme(userContext: UserContext, emotionalState: any): string {
    // High stress/anxiety - calming themes
    if (emotionalState.stressLevel > 7 || emotionalState.anxietyLevel > 7) {
      return 'ocean-calm';
    }

    // Low mood - uplifting themes
    if (emotionalState.initialMood < 4) {
      return 'sunset-warmth';
    }

    // Evening sessions - gentle themes
    const hour = new Date().getHours();
    if (hour >= 18 || hour <= 6) {
      return 'moonlight-serenity';
    }

    // Default or user preference
    return 'forest-peace';
  }

  /**
   * Generate recommendations for next session
   */
  private generateNextSessionRecommendations(summary: TranscriptSummary | null, finalEmotionalState: any): string[] {
    const recommendations: string[] = [];

    if (!summary) {
      return ['Continue regular sessions for consistent progress'];
    }

    // Based on therapeutic progress
    if (summary.therapeuticProgress.challenges.length > 0) {
      recommendations.push('Focus on addressing ongoing challenges');
    }

    if (summary.therapeuticProgress.breakthroughs.length > 0) {
      recommendations.push('Build on recent breakthroughs and insights');
    }

    // Based on emotional state
    if (finalEmotionalState.finalMood && finalEmotionalState.finalMood > finalEmotionalState.initialMood) {
      recommendations.push('Continue with current therapeutic approach');
    } else {
      recommendations.push('Explore alternative coping strategies');
    }

    // Based on continuity notes
    if (summary.continuityNotes) {
      recommendations.push('Follow up on: ' + summary.continuityNotes);
    }

    return recommendations.length > 0 ? recommendations : ['Continue regular sessions for consistent progress'];
  }

  /**
   * Get default summary when AI processing fails
   */
  private getDefaultSummary(): TranscriptSummary {
    return {
      sessionSummary: 'Therapeutic session completed successfully',
      keyTopics: ['emotional-support'],
      emotionalInsights: {
        dominantEmotions: ['supported'],
        moodProgression: 'Session provided emotional support',
        stressIndicators: []
      },
      therapeuticProgress: {
        breakthroughs: [],
        challenges: [],
        copingStrategies: [],
        recommendedFocus: ['continued-support']
      },
      continuityNotes: 'Continue therapeutic support in next session'
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();