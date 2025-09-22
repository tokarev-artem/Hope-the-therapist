/**
 * User continuity service for tracking therapeutic progress across sessions
 * Provides context and personalization for returning users
 */

import { 
  usersRepository, 
  sessionsRepository, 
  progressRepository, 
  settingsRepository 
} from '../database';
import { transcriptProcessor, ProgressAnalysis } from './transcript-processor';

export interface UserContext {
  user: {
    userId: string;
    isReturningUser: boolean;
    totalSessions: number;
    lastSessionDate?: string;
    daysSinceLastSession?: number;
  };
  recentProgress: {
    moodTrend: 'improving' | 'stable' | 'declining';
    stressReduction: number;
    consistencyScore: number;
    recentBreakthroughs: string[];
    ongoingChallenges: string[];
  };
  continuityNotes: string[];
  recommendations: string[];
  personalizedGreeting: string;
}

export interface SessionContext {
  previousSessionSummary?: string;
  recommendedFocus: string[];
  emotionalBaseline: {
    typicalMoodRange: [number, number];
    commonStressors: string[];
    effectiveCopingStrategies: string[];
  };
  progressGoals: string[];
}

export class UserContinuityService {
  
  /**
   * Get comprehensive user context for session initialization
   */
  async getUserContext(userId: string): Promise<UserContext> {
    try {
      // Get user profile
      const user = await usersRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get session history
      const recentSessions = await sessionsRepository.getSessionsByUserId(userId, 20);
      const totalSessions = recentSessions.length;
      const isReturningUser = totalSessions > 0;

      // Calculate days since last session
      let lastSessionDate: string | undefined;
      let daysSinceLastSession: number | undefined;
      
      if (recentSessions.length > 0) {
        lastSessionDate = recentSessions[0].startTime;
        const lastSession = new Date(lastSessionDate);
        const now = new Date();
        daysSinceLastSession = Math.floor((now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Analyze recent progress
      const progressAnalysis = await transcriptProcessor.analyzeUserProgress(userId);
      
      // Get continuity notes from recent sessions
      const continuityNotes = this.extractContinuityNotes(recentSessions);

      // Generate personalized greeting
      const personalizedGreeting = this.generatePersonalizedGreeting(
        isReturningUser, 
        totalSessions, 
        daysSinceLastSession,
        progressAnalysis
      );

      return {
        user: {
          userId,
          isReturningUser,
          totalSessions,
          lastSessionDate,
          daysSinceLastSession
        },
        recentProgress: {
          moodTrend: progressAnalysis.overallTrend,
          stressReduction: progressAnalysis.keyMetrics.stressReduction,
          consistencyScore: progressAnalysis.keyMetrics.consistencyScore,
          recentBreakthroughs: this.extractRecentBreakthroughs(recentSessions),
          ongoingChallenges: this.extractOngoingChallenges(recentSessions)
        },
        continuityNotes,
        recommendations: progressAnalysis.recommendations,
        personalizedGreeting
      };

    } catch (error) {
      console.error('Error getting user context:', error);
      return this.getDefaultUserContext(userId);
    }
  }

  /**
   * Get session-specific context for therapeutic continuity
   */
  async getSessionContext(userId: string): Promise<SessionContext> {
    try {
      const recentSessions = await sessionsRepository.getSessionsByUserId(userId, 5);
      
      if (recentSessions.length === 0) {
        return this.getDefaultSessionContext();
      }

      // Get previous session summary
      const previousSession = recentSessions[0];
      const previousSessionSummary = previousSession.conversationSummary;

      // Analyze emotional baseline from recent sessions
      const emotionalBaseline = this.calculateEmotionalBaseline(recentSessions);

      // Extract recommended focus areas
      const recommendedFocus = this.extractRecommendedFocus(recentSessions);

      // Get progress goals
      const progressGoals = await this.getProgressGoals(userId);

      return {
        previousSessionSummary,
        recommendedFocus,
        emotionalBaseline,
        progressGoals
      };

    } catch (error) {
      console.error('Error getting session context:', error);
      return this.getDefaultSessionContext();
    }
  }

  /**
   * Update user progress after session completion
   */
  async updateUserProgress(
    userId: string, 
    sessionId: string, 
    sessionSummary: any
  ): Promise<void> {
    try {
      // Update user's last active time
      await usersRepository.updateUser(userId, {
        lastActiveAt: new Date().toISOString()
      });

      // Check if we need to create/update weekly progress
      await this.updateWeeklyProgress(userId, sessionId, sessionSummary);

      console.log(`Updated progress for user ${userId}`);

    } catch (error) {
      console.error('Error updating user progress:', error);
    }
  }

  /**
   * Generate personalized system prompt for AI based on user history
   */
  async generatePersonalizedSystemPrompt(userId: string): Promise<string> {
    const userContext = await getUserContext(userId);
    const sessionContext = await this.getSessionContext(userId);

    const basePrompt = `You are a compassionate AI therapeutic assistant specializing in emotional support and stress reduction through guided conversation and wave-based visualization.`;

    if (!userContext.user.isReturningUser) {
      return `${basePrompt}

This is a new user's first session. Focus on:
- Creating a welcoming, safe environment
- Understanding their current emotional state
- Introducing the therapeutic wave interface
- Establishing initial comfort and trust`;
    }

    return `${basePrompt}

USER CONTEXT:
- Returning user with ${userContext.user.totalSessions} previous sessions
- Last session: ${userContext.user.daysSinceLastSession} days ago
- Overall progress trend: ${userContext.recentProgress.moodTrend}
- Consistency score: ${Math.round(userContext.recentProgress.consistencyScore * 100)}%

PREVIOUS SESSION SUMMARY:
${sessionContext.previousSessionSummary || 'No previous session summary available'}

CONTINUITY NOTES:
${userContext.continuityNotes.join('\n')}

RECOMMENDED FOCUS AREAS:
${sessionContext.recommendedFocus.join(', ')}

EMOTIONAL BASELINE:
- Typical mood range: ${sessionContext.emotionalBaseline.typicalMoodRange[0]}-${sessionContext.emotionalBaseline.typicalMoodRange[1]}
- Common stressors: ${sessionContext.emotionalBaseline.commonStressors.join(', ')}
- Effective strategies: ${sessionContext.emotionalBaseline.effectiveCopingStrategies.join(', ')}

Please:
- Acknowledge their return and progress
- Reference relevant previous discussions when appropriate
- Focus on the recommended areas while being responsive to current needs
- Build on previously effective coping strategies
- Maintain therapeutic continuity while adapting to their current state`;
  }

  /**
   * Extract continuity notes from recent sessions
   */
  private extractContinuityNotes(sessions: any[]): string[] {
    return sessions
      .slice(0, 3) // Last 3 sessions
      .map(session => {
        if (session.conversationSummary) {
          // Extract key points for continuity
          const summary = session.conversationSummary;
          if (summary.includes('continue') || summary.includes('follow up') || summary.includes('next session')) {
            return summary;
          }
        }
        return null;
      })
      .filter(note => note !== null) as string[];
  }

  /**
   * Generate personalized greeting based on user history
   */
  private generatePersonalizedGreeting(
    isReturningUser: boolean,
    totalSessions: number,
    daysSinceLastSession?: number,
    progressAnalysis?: ProgressAnalysis
  ): string {
    if (!isReturningUser) {
      return "Welcome to your therapeutic wave interface. I'm here to provide a safe, supportive space for you to explore your emotions and find calm.";
    }

    let greeting = `Welcome back! `;

    if (daysSinceLastSession !== undefined) {
      if (daysSinceLastSession === 0) {
        greeting += "I see you're returning today. ";
      } else if (daysSinceLastSession === 1) {
        greeting += "It's good to see you again after yesterday's session. ";
      } else if (daysSinceLastSession <= 7) {
        greeting += `It's been ${daysSinceLastSession} days since our last session. `;
      } else {
        greeting += `It's been a while since our last session (${daysSinceLastSession} days). `;
      }
    }

    if (totalSessions >= 10) {
      greeting += `You've been consistently working on your wellbeing with ${totalSessions} sessions. `;
    } else if (totalSessions >= 5) {
      greeting += `You're building a good routine with ${totalSessions} sessions so far. `;
    }

    if (progressAnalysis?.overallTrend === 'improving') {
      greeting += "I've noticed positive trends in your progress. ";
    } else if (progressAnalysis?.overallTrend === 'stable') {
      greeting += "You've been maintaining steady progress. ";
    }

    greeting += "How are you feeling today?";

    return greeting;
  }

  /**
   * Calculate emotional baseline from recent sessions
   */
  private calculateEmotionalBaseline(sessions: any[]): SessionContext['emotionalBaseline'] {
    if (sessions.length === 0) {
      return {
        typicalMoodRange: [5, 7],
        commonStressors: [],
        effectiveCopingStrategies: []
      };
    }

    const moods = sessions
      .map(s => s.emotionalState?.initialMood)
      .filter(mood => mood !== undefined);

    const minMood = Math.min(...moods);
    const maxMood = Math.max(...moods);

    // Extract common themes (simplified - in production, use NLP)
    const summaries = sessions
      .map(s => s.conversationSummary)
      .filter(summary => summary)
      .join(' ');

    const commonStressors = this.extractKeywords(summaries, ['work', 'family', 'health', 'money', 'relationship']);
    const effectiveCopingStrategies = this.extractKeywords(summaries, ['breathing', 'meditation', 'exercise', 'music', 'nature']);

    return {
      typicalMoodRange: [minMood, maxMood],
      commonStressors,
      effectiveCopingStrategies
    };
  }

  /**
   * Extract keywords from text (simplified implementation)
   */
  private extractKeywords(text: string, keywords: string[]): string[] {
    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Extract recent breakthroughs from sessions
   */
  private extractRecentBreakthroughs(sessions: any[]): string[] {
    // Simplified - look for positive indicators in summaries
    return sessions
      .slice(0, 3)
      .map(s => s.conversationSummary)
      .filter(summary => summary && (
        summary.includes('breakthrough') || 
        summary.includes('insight') || 
        summary.includes('progress')
      ))
      .slice(0, 3);
  }

  /**
   * Extract ongoing challenges from sessions
   */
  private extractOngoingChallenges(sessions: any[]): string[] {
    // Simplified - look for challenge indicators in summaries
    return sessions
      .slice(0, 3)
      .map(s => s.conversationSummary)
      .filter(summary => summary && (
        summary.includes('challenge') || 
        summary.includes('difficulty') || 
        summary.includes('struggle')
      ))
      .slice(0, 3);
  }

  /**
   * Extract recommended focus areas from recent sessions
   */
  private extractRecommendedFocus(sessions: any[]): string[] {
    // Default focus areas based on common therapeutic needs
    const defaultFocus = ['emotional-awareness', 'stress-management', 'coping-strategies'];
    
    // In production, this would analyze session content more sophisticatedly
    return defaultFocus;
  }

  /**
   * Get progress goals for user
   */
  private async getProgressGoals(userId: string): Promise<string[]> {
    try {
      const settings = await settingsRepository.getSettingsByUserId(userId);
      return settings?.therapeuticSettings.sessionGoals || ['general-wellbeing'];
    } catch (error) {
      return ['general-wellbeing'];
    }
  }

  /**
   * Update weekly progress record
   */
  private async updateWeeklyProgress(userId: string, sessionId: string, sessionSummary: any): Promise<void> {
    // Implementation for updating weekly progress aggregates
    // This would calculate and store weekly metrics
    console.log(`Updating weekly progress for user ${userId}`);
  }

  /**
   * Get default user context for new users
   */
  private getDefaultUserContext(userId: string): UserContext {
    return {
      user: {
        userId,
        isReturningUser: false,
        totalSessions: 0
      },
      recentProgress: {
        moodTrend: 'stable',
        stressReduction: 0,
        consistencyScore: 0,
        recentBreakthroughs: [],
        ongoingChallenges: []
      },
      continuityNotes: [],
      recommendations: ['Focus on establishing comfort with the interface', 'Explore initial emotional awareness'],
      personalizedGreeting: "Welcome to your therapeutic wave interface. I'm here to provide a safe, supportive space for you to explore your emotions and find calm."
    };
  }

  /**
   * Get default session context
   */
  private getDefaultSessionContext(): SessionContext {
    return {
      recommendedFocus: ['emotional-awareness', 'stress-management'],
      emotionalBaseline: {
        typicalMoodRange: [5, 7],
        commonStressors: [],
        effectiveCopingStrategies: []
      },
      progressGoals: ['general-wellbeing']
    };
  }
}

// Export singleton instance
export const userContinuityService = new UserContinuityService();

// Export the getUserContext function for easy access
export const getUserContext = (userId: string) => userContinuityService.getUserContext(userId);