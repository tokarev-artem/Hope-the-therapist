/**
 * Transcript processing service for therapeutic sessions
 * Handles transcript storage, AI summarization, and progress analysis
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-providers';
import {
  sessionsRepository,
  encryptSensitiveData,
  decryptSensitiveData,
  sanitizeBeforeEncryption
} from '../database';

export interface TranscriptSummary {
  sessionSummary: string;
  keyTopics: string[];
  emotionalInsights: {
    dominantEmotions: string[];
    moodProgression: string;
    stressIndicators: string[];
  };
  therapeuticProgress: {
    breakthroughs: string[];
    challenges: string[];
    copingStrategies: string[];
    recommendedFocus: string[];
  };
  continuityNotes: string; // For next session
}

export interface ProgressAnalysis {
  overallTrend: 'improving' | 'stable' | 'declining';
  keyMetrics: {
    moodImprovement: number;
    stressReduction: number;
    engagementLevel: number;
    consistencyScore: number;
  };
  recommendations: string[];
  milestones: Array<{
    type: string;
    description: string;
    achieved: boolean;
  }>;
}

export class TranscriptProcessor {
  private bedrockClient: BedrockRuntimeClient;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: fromIni()
    });
  }

  /**
   * Process and store session transcript with AI summarization
   */
  async processSessionTranscript(
    sessionId: string,
    transcript: string,
    userConsent: boolean = true
  ): Promise<TranscriptSummary | null> {
    try {
      if (!userConsent) {
        console.log('User did not consent to transcript storage');
        return null;
      }

      // Sanitize and encrypt the full transcript
      const sanitizedTranscript = sanitizeBeforeEncryption(transcript);
      const encryptedTranscript = encryptSensitiveData(sanitizedTranscript);

      // Generate AI summary using Bedrock
      const summary = await this.generateTranscriptSummary(transcript);

      // Update session with encrypted transcript and summary
      await sessionsRepository.updateSession(sessionId, {
        encryptedTranscript,
        conversationSummary: summary.sessionSummary,
        emotionalState: {
          ...await this.getCurrentEmotionalState(sessionId),
          dominantEmotions: summary.emotionalInsights.dominantEmotions
        }
      });

      console.log(`Processed transcript for session ${sessionId}`);
      return summary;

    } catch (error) {
      console.error('Error processing transcript:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered transcript summary using Bedrock
   */
  private async generateTranscriptSummary(transcript: string): Promise<TranscriptSummary> {
    const prompt = this.buildSummarizationPrompt(transcript);

    try {
      const command = new InvokeModelCommand({
        modelId: 'amazon.nova-micro-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: prompt,
          textGenerationConfig: {
            maxTokenCount: 1000,
            temperature: 0.5,
            topP: 0.9,
            stopSequences: []
          }
        })
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const outputText = responseBody?.results?.[0]?.outputText || '';
      if (!outputText) {
        throw new Error('Empty response from Nova Micro');
      }
      return this.parseAISummary(outputText);

    } catch (error) {
      console.error('Error generating AI summary:', error);
      // Fallback to basic summary if AI fails
      return this.generateFallbackSummary(transcript);
    }
  }

  /**
   * Build therapeutic summarization prompt
   */
  private buildSummarizationPrompt(transcript: string): string {
    return `
You are a therapeutic AI assistant analyzing a therapy session transcript. Please provide a structured analysis in JSON format.

Transcript:
${transcript}

Please analyze this therapeutic session and provide a JSON response with the following structure:

{
  "sessionSummary": "Brief 2-3 sentence summary of the session",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "emotionalInsights": {
    "dominantEmotions": ["emotion1", "emotion2"],
    "moodProgression": "Description of how mood changed during session",
    "stressIndicators": ["indicator1", "indicator2"]
  },
  "therapeuticProgress": {
    "breakthroughs": ["breakthrough1", "breakthrough2"],
    "challenges": ["challenge1", "challenge2"],
    "copingStrategies": ["strategy1", "strategy2"],
    "recommendedFocus": ["focus1", "focus2"]
  },
  "continuityNotes": "Important points to remember for next session"
}

Focus on:
- Therapeutic insights and emotional patterns
- Progress indicators and setbacks
- Coping strategies discussed or discovered
- Areas that need continued attention
- Maintain patient confidentiality and therapeutic perspective
`;
  }

  /**
   * Parse AI response into structured summary
   */
  private parseAISummary(aiResponse: string): TranscriptSummary {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in AI response');
    } catch (error) {
      console.error('Error parsing AI summary:', error);
      return this.generateFallbackSummary(aiResponse);
    }
  }

  /**
   * Generate fallback summary if AI processing fails
   */
  private generateFallbackSummary(transcript: string): TranscriptSummary {
    const wordCount = transcript.split(' ').length;
    const duration = Math.ceil(wordCount / 150); // Approximate speaking rate

    return {
      sessionSummary: `Therapeutic session completed (${duration} minutes, ${wordCount} words). Session data processed and stored securely.`,
      keyTopics: ['general-discussion', 'emotional-support'],
      emotionalInsights: {
        dominantEmotions: ['mixed'],
        moodProgression: 'Session completed with user engagement',
        stressIndicators: ['session-participation']
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

  /**
   * Analyze user's progress across multiple sessions
   */
  async analyzeUserProgress(userId: string, sessionCount: number = 10): Promise<ProgressAnalysis> {
    try {
      // Get recent sessions
      const recentSessions = await sessionsRepository.getSessionsByUserId(userId, sessionCount);

      if (recentSessions.length === 0) {
        return this.getDefaultProgressAnalysis();
      }

      // Analyze trends using AI
      const progressPrompt = this.buildProgressAnalysisPrompt(recentSessions);

      const command = new InvokeModelCommand({
        modelId: 'amazon.nova-micro-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: progressPrompt,
          textGenerationConfig: {
            maxTokenCount: 800,
            temperature: 0.5,
            topP: 0.9,
            stopSequences: []
          }
        })
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const outputText = responseBody?.results?.[0]?.outputText || '';
      if (!outputText) {
        throw new Error('Empty response from Nova Micro');
      }

      return this.parseProgressAnalysis(outputText);

    } catch (error) {
      console.error('Error analyzing user progress:', error);
      return this.getDefaultProgressAnalysis();
    }
  }

  /**
   * Build progress analysis prompt
   */
  private buildProgressAnalysisPrompt(sessions: any[]): string {
    const sessionSummaries = sessions.map(s => ({
      date: s.startTime,
      duration: s.duration,
      initialMood: s.emotionalState.initialMood,
      finalMood: s.emotionalState.finalMood,
      stressLevel: s.emotionalState.stressLevel,
      summary: s.conversationSummary
    }));

    return `
Analyze this user's therapeutic progress based on their session history and provide recommendations.

Recent Sessions:
${JSON.stringify(sessionSummaries, null, 2)}

Please provide a JSON response with this structure:

{
  "overallTrend": "improving|stable|declining",
  "keyMetrics": {
    "moodImprovement": 0.0,
    "stressReduction": 0.0,
    "engagementLevel": 0.0,
    "consistencyScore": 0.0
  },
  "recommendations": ["recommendation1", "recommendation2"],
  "milestones": [
    {
      "type": "mood-improvement",
      "description": "Consistent mood improvement over 2 weeks",
      "achieved": true
    }
  ]
}

Focus on:
- Trends in mood and stress levels
- Session consistency and engagement
- Areas of improvement and concern
- Specific recommendations for continued progress
`;
  }

  /**
   * Parse progress analysis from AI response
   */
  private parseProgressAnalysis(aiResponse: string): ProgressAnalysis {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in progress analysis');
    } catch (error) {
      console.error('Error parsing progress analysis:', error);
      return this.getDefaultProgressAnalysis();
    }
  }

  /**
   * Get default progress analysis
   */
  private getDefaultProgressAnalysis(): ProgressAnalysis {
    return {
      overallTrend: 'stable',
      keyMetrics: {
        moodImprovement: 0.0,
        stressReduction: 0.0,
        engagementLevel: 0.5,
        consistencyScore: 0.5
      },
      recommendations: ['Continue regular sessions', 'Focus on consistency'],
      milestones: []
    };
  }

  /**
   * Get current emotional state for a session
   */
  private async getCurrentEmotionalState(sessionId: string) {
    const session = await sessionsRepository.getSessionById(sessionId);
    return session?.emotionalState || {
      initialMood: 5,
      stressLevel: 5,
      anxietyLevel: 5,
      dominantEmotions: []
    };
  }

  /**
   * Retrieve and decrypt transcript for analysis (with proper authorization)
   */
  async getDecryptedTranscript(sessionId: string, authorized: boolean = false): Promise<string | null> {
    if (!authorized) {
      throw new Error('Unauthorized access to transcript data');
    }

    try {
      const session = await sessionsRepository.getSessionById(sessionId);
      if (!session?.encryptedTranscript) {
        return null;
      }

      return decryptSensitiveData(session.encryptedTranscript);
    } catch (error) {
      console.error('Error retrieving transcript:', error);
      return null;
    }
  }
}

// Export singleton instance
export const transcriptProcessor = new TranscriptProcessor();