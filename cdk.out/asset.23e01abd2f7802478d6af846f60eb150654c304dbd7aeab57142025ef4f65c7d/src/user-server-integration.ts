/**
 * User server integration for DynamoDB
 * Add this to your existing server.ts
 */

import 'dotenv/config';
import { usersRepository, sessionsRepository } from './database';

/**
 * Generate a detailed session summary from transcript with conversation topics
 */
function generateSessionSummary(transcript: string, finalEmotionalState: any): string {
  if (!transcript || transcript.trim().length === 0) {
    return 'Session completed with no recorded conversation.';
  }

  const wordCount = transcript.split(' ').length;
  const duration = Math.ceil(wordCount / 150); // Approximate speaking duration

  // Extract conversation topics for summary
  const conversationAnalysis = extractConversationTopics(transcript);

  let summary = `Session completed (${duration} min, ${wordCount} words). `;

  // Add mood information
  if (finalEmotionalState.finalMood && finalEmotionalState.initialMood) {
    const moodChange = finalEmotionalState.finalMood - finalEmotionalState.initialMood;
    if (moodChange > 0) {
      summary += `Mood improved from ${finalEmotionalState.initialMood} to ${finalEmotionalState.finalMood}. `;
    } else if (moodChange < 0) {
      summary += `Mood decreased from ${finalEmotionalState.initialMood} to ${finalEmotionalState.finalMood}. `;
    } else {
      summary += `Mood remained stable at ${finalEmotionalState.finalMood}. `;
    }
  }

  // Add topics discussed
  if (conversationAnalysis.issues.length > 0) {
    summary += `Issues discussed: ${conversationAnalysis.issues.join(', ')}. `;
  }

  if (conversationAnalysis.topics.length > 0) {
    summary += `Topics covered: ${conversationAnalysis.topics.join(', ')}. `;
  }

  // Add key insights from the most relevant phrases
  if (conversationAnalysis.keyPhrases.length > 0) {
    // Filter out any remaining generic phrases and prioritize user content
    const relevantPhrases = conversationAnalysis.keyPhrases
      .filter(phrase => {
        const lower = phrase.toLowerCase();
        return !lower.includes('first session') &&
          !lower.includes('safe space') &&
          !lower.includes('here to listen') &&
          phrase.length > 10; // Ensure meaningful content
      })
      .slice(0, 2);

    if (relevantPhrases.length > 0) {
      summary += `Key details from session: ${relevantPhrases.join('. ')}. `;
    }
  }

  if (finalEmotionalState.calmingEffectiveness) {
    summary += `Session effectiveness: ${finalEmotionalState.calmingEffectiveness}/10.`;
  }

  return summary;
}

/**
 * Extract emotions from transcript (simple keyword-based approach)
 */
function extractEmotionsFromTranscript(transcript: string): string[] {
  const emotions: string[] = [];
  const lowerTranscript = transcript.toLowerCase();

  const emotionKeywords = {
    'anxious': ['anxious', 'anxiety', 'worried', 'nervous', 'stressed'],
    'sad': ['sad', 'depressed', 'down', 'upset', 'crying'],
    'angry': ['angry', 'mad', 'frustrated', 'irritated', 'annoyed'],
    'happy': ['happy', 'joy', 'excited', 'glad', 'cheerful'],
    'calm': ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil'],
    'hopeful': ['hopeful', 'optimistic', 'positive', 'confident', 'better']
  };

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some(keyword => lowerTranscript.includes(keyword))) {
      emotions.push(emotion);
    }
  }

  return emotions.length > 0 ? emotions : ['neutral'];
}

/**
 * Extract key topics and issues from conversation transcript using actual content
 */
function extractConversationTopics(transcript: string): {
  issues: string[];
  topics: string[];
  keyPhrases: string[];
} {
  if (!transcript) {
    return { issues: [], topics: [], keyPhrases: [] };
  }

  const lowerTranscript = transcript.toLowerCase();
  const topics: string[] = [];
  const keyPhrases: string[] = [];

  // Extract topics from all meaningful words - completely dynamic
  const words = lowerTranscript.split(/\s+/);
  const meaningfulWords = words.filter(word =>
    word.length > 3 &&
    !['the', 'and', 'but', 'for', 'you', 'are', 'was', 'not', 'can', 'had', 'her', 'his', 'she', 'him'].includes(word)
  );

  // Count word frequency
  const wordCounts = meaningfulWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Extract topics from words that appear multiple times or are substantial
  Object.entries(wordCounts).forEach(([word, count]) => {
    if (count > 1 || word.length > 5) {
      topics.push(word);
    }
  });

  // Extract key phrases - focus on meaningful user content
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const userPhrases: string[] = [];
  const assistantPhrases: string[] = [];

  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    const lower = trimmed.toLowerCase();

    // Skip generic assistant responses and boilerplate
    if (lower.includes('first session') || lower.includes('safe space') ||
      lower.includes('non-judgmental') || lower.includes('here to listen') ||
      lower.includes('here to help') || lower.includes('want you to know')) {
      return; // Skip generic assistant responses
    }

    // Separate user and assistant content
    const isUserContent = trimmed.startsWith('User:');
    const isAssistantContent = trimmed.startsWith('Assistant:');

    // Include all meaningful sentences - let length and content determine importance
    if (trimmed.length > 20) { // Only sentences with substantial content
      if (isUserContent) {
        userPhrases.push(trimmed.replace('User: ', ''));
      } else if (isAssistantContent && !lower.includes('i\'m') && !lower.includes('you\'re')) {
        // Only include assistant content that's not generic supportive statements
        assistantPhrases.push(trimmed.replace('Assistant: ', ''));
      } else if (!isUserContent && !isAssistantContent) {
        // Content without speaker prefix - treat as important
        userPhrases.push(trimmed);
      }
    }
  });

  // Prioritize user content, then meaningful assistant content
  keyPhrases.push(...userPhrases.slice(0, 4)); // Up to 4 user phrases
  if (keyPhrases.length < 3) {
    keyPhrases.push(...assistantPhrases.slice(0, 2)); // Add up to 2 assistant phrases if needed
  }

  // Debug logging
  console.log('🔍 Conversation analysis debug:');
  console.log('📝 User phrases found:', userPhrases);
  console.log('🤖 Assistant phrases found:', assistantPhrases);
  console.log('✅ Final key phrases:', keyPhrases);

  return {
    issues: [], // Remove hardcoded issue detection - let AI interpret from key phrases
    topics: [...new Set(topics)].slice(0, 10), // Remove duplicates, limit to top 10
    keyPhrases: keyPhrases.slice(0, 5) // Top 5 key phrases for context
  };
}

/**
 * Generate personalized follow-up questions based on actual session data
 */
function generateFollowUpQuestions(
  lastSessionSummary: string,
  issues: string[],
  topics: string[],
  keyPhrases: string[],
  userName?: string
): string[] {
  const questions: string[] = [];
  const name = userName ? userName : 'you';

  // Generate questions directly from key phrases - completely dynamic
  keyPhrases.forEach((phrase, index) => {
    if (phrase && phrase.length > 10) {
      // Create generic follow-up questions that reference the actual content
      if (index === 0) {
        // First key phrase gets a direct reference
        questions.push(`How has that situation been since our last session, ${name}?`);
      } else if (index === 1) {
        // Second key phrase gets a feeling-based follow-up
        questions.push(`Have you been able to work through what we discussed about that last time?`);
      }
    }
  });

  // Generate questions based on session summary patterns
  const lowerSummary = lastSessionSummary.toLowerCase();
  if (lowerSummary.includes('mood improved')) {
    questions.push(`I'm glad to see your mood improved in our last session. How have you been feeling since then?`);
  }

  // Fallback to generic but personalized questions
  if (questions.length === 0) {
    questions.push(`How have you been since our last session, ${name}?`);
    questions.push(`Have you had a chance to think about what we discussed last time?`);
  }

  // Remove duplicates and return top 2
  const uniqueQuestions = [...new Set(questions)];
  return uniqueQuestions.slice(0, 2);
}

/**
 * Analyze session history to provide personalized context for the AI assistant
 */
function analyzeSessionHistory(sessions: any[], userName?: string): any {
  if (!sessions || sessions.length === 0) {
    return {
      isFirstSession: true,
      userName: userName,
      message: `This is ${userName ? userName + "'s" : "the user's"} first session. Focus on building rapport and understanding their needs.`
    };
  }

  const analysis = {
    isFirstSession: false,
    userName: userName,
    totalSessions: sessions.length,
    patterns: {
      moodTrends: [] as string[],
      commonEmotions: [] as string[],
      averageSessionLength: 0,
      effectivenessScores: [] as number[]
    },
    recommendations: [] as string[],
    lastSessionSummary: '',
    lastSessionIssues: [] as string[],
    lastSessionTopics: [] as string[],
    lastSessionKeyPhrases: [] as string[],
    followUpQuestions: [] as string[],
    contextualMessage: ''
  };

  // Analyze mood trends
  const moodChanges: number[] = [];
  const allEmotions: string[] = [];
  const durations: number[] = [];
  const effectiveness: number[] = [];

  sessions.forEach(session => {
    // Parse emotional state
    let emotionalState;
    try {
      emotionalState = typeof session.emotionalState === 'string'
        ? JSON.parse(session.emotionalState)
        : session.emotionalState;
    } catch (e) {
      emotionalState = session.emotionalState || {};
    }

    // Track mood changes
    if (emotionalState.initialMood && emotionalState.finalMood) {
      const moodChange = emotionalState.finalMood - emotionalState.initialMood;
      moodChanges.push(moodChange);
    }

    // Collect emotions
    if (emotionalState.dominantEmotions) {
      allEmotions.push(...emotionalState.dominantEmotions);
    }

    // Track session duration
    if (session.duration) {
      durations.push(session.duration);
    }

    // Track effectiveness
    if (emotionalState.calmingEffectiveness) {
      effectiveness.push(emotionalState.calmingEffectiveness);
    }
  });

  // Calculate averages and trends
  if (moodChanges.length > 0) {
    const avgMoodChange = moodChanges.reduce((a, b) => a + b, 0) / moodChanges.length;
    if (avgMoodChange > 0.5) {
      analysis.patterns.moodTrends.push('Generally improving mood in sessions');
    } else if (avgMoodChange < -0.5) {
      analysis.patterns.moodTrends.push('Mood challenges during sessions - needs extra support');
    } else {
      analysis.patterns.moodTrends.push('Stable mood patterns');
    }
  }

  if (durations.length > 0) {
    analysis.patterns.averageSessionLength = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }

  if (effectiveness.length > 0) {
    analysis.patterns.effectivenessScores = effectiveness;
    const avgEffectiveness = effectiveness.reduce((a, b) => a + b, 0) / effectiveness.length;

    if (avgEffectiveness >= 8) {
      analysis.recommendations.push('Sessions have been highly effective - continue current approach');
    } else if (avgEffectiveness >= 6) {
      analysis.recommendations.push('Sessions show good progress - consider exploring new techniques');
    } else {
      analysis.recommendations.push('Sessions need adjustment - focus on what works best for this user');
    }
  }

  // Find most common emotions
  const emotionCounts: Record<string, number> = {};
  allEmotions.forEach(emotion => {
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });

  analysis.patterns.commonEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([emotion]) => emotion);

  // Get last session data and analyze conversation content
  if (sessions.length > 0) {
    const lastSession = sessions[0];
    analysis.lastSessionSummary = lastSession.conversationSummary || 'Previous session completed';

    // Debug: Log the session data we have
    console.log('🔍 Last session data available:', {
      hasConversationSummary: !!lastSession.conversationSummary,
      hasKeyTopics: !!lastSession.keyTopics,
      hasContinuityNotes: !!lastSession.continuityNotes,
      hasEncryptedTranscript: !!lastSession.encryptedTranscript
    });

    // Use AI-generated insights if available, otherwise analyze the summary
    if (lastSession.keyTopics && Array.isArray(lastSession.keyTopics)) {
      analysis.lastSessionTopics = lastSession.keyTopics;
      console.log('✅ Using AI-generated key topics:', analysis.lastSessionTopics);
    }

    if (lastSession.continuityNotes) {
      // Use AI-generated continuity notes for better context
      analysis.lastSessionKeyPhrases = [lastSession.continuityNotes];
      console.log('✅ Using AI-generated continuity notes:', lastSession.continuityNotes);
    }

    // If we don't have AI insights, fall back to analyzing the summary
    if (!lastSession.keyTopics && !lastSession.continuityNotes) {
      console.log('⚠️ No AI insights available, analyzing summary text...');
      const conversationAnalysis = extractConversationTopics(analysis.lastSessionSummary);
      analysis.lastSessionIssues = conversationAnalysis.issues;
      analysis.lastSessionTopics = conversationAnalysis.topics;
      analysis.lastSessionKeyPhrases = conversationAnalysis.keyPhrases;
    }

    // Generate personalized follow-up questions based on available data
    analysis.followUpQuestions = generateFollowUpQuestions(
      analysis.lastSessionSummary,
      analysis.lastSessionIssues,
      analysis.lastSessionTopics,
      analysis.lastSessionKeyPhrases,
      userName
    );

    console.log('💬 Generated follow-up questions:', analysis.followUpQuestions);
  }

  // Generate contextual message for AI
  const daysSinceLastSession = sessions.length > 0
    ? Math.floor((new Date().getTime() - new Date(sessions[0].startTime).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  let contextMessage = `${userName ? userName : 'User'} has completed ${analysis.totalSessions} previous session(s). `;

  if (daysSinceLastSession === 0) {
    contextMessage += 'Last session was today. ';
  } else if (daysSinceLastSession === 1) {
    contextMessage += 'Last session was yesterday. ';
  } else if (daysSinceLastSession > 1) {
    contextMessage += `Last session was ${daysSinceLastSession} days ago. `;
  }

  if (analysis.patterns.commonEmotions.length > 0) {
    contextMessage += `Common emotions: ${analysis.patterns.commonEmotions.join(', ')}. `;
  }

  if (analysis.patterns.moodTrends.length > 0) {
    contextMessage += analysis.patterns.moodTrends[0] + '. ';
  }

  if (analysis.lastSessionSummary) {
    contextMessage += `Last session: ${analysis.lastSessionSummary} `;
  }

  // Add identified issues from last session
  if (analysis.lastSessionIssues.length > 0) {
    contextMessage += `Previous issues discussed: ${analysis.lastSessionIssues.join(', ')}. `;
  }

  // Add key conversation details for AI context (prioritize AI-generated continuity notes)
  if (sessions.length > 0 && sessions[0].continuityNotes) {
    contextMessage += `AI Continuity Notes: ${sessions[0].continuityNotes} `;
  } else if (analysis.lastSessionKeyPhrases.length > 0) {
    contextMessage += `Key details from last session: ${analysis.lastSessionKeyPhrases.join('; ')}. `;
  }

  // Add personalized follow-up guidance
  if (analysis.followUpQuestions.length > 0) {
    contextMessage += `IMPORTANT: Start the conversation by asking one of these personalized follow-up questions: "${analysis.followUpQuestions[0]}" or "${analysis.followUpQuestions[1] || analysis.followUpQuestions[0]}". This shows continuity and that you remember their specific situation. You can reference the specific details mentioned above when appropriate.`;
  }

  analysis.contextualMessage = contextMessage;

  return analysis;
}

// Store active user sessions
const activeUserSessions = new Map<string, {
  userId: string;
  userName?: string;
  frontendUserId?: string;
  sessionId?: string;
  startTime?: string;
}>();

// Track session creation to prevent duplicates
const sessionCreationLocks = new Map<string, boolean>();

/**
 * Add user management to socket connection
 */
export function addUserManagement(socket: any) {
  console.log('Setting up user management for socket:', socket.id);

  // Handle user creation or recognition
  socket.on('createUser', async (data: {
    userId: string;
    userName?: string;
    isAnonymous: boolean;
  }) => {
    try {
      console.log('Processing user:', data);

      // Always use frontend UUID as canonical userId in Users table
      const canonicalUserId = data.userId;

      // Check if user already exists
      let user = await usersRepository.getUserById(canonicalUserId);
      let isReturning = false;

      if (user) {
        console.log('✅ Existing user found in users table:', canonicalUserId);
        isReturning = true;
      } else {
        // Create user with conditional put to avoid duplicates
        console.log('Creating new user in database with frontend ID:', canonicalUserId);
        try {
          user = await usersRepository.createUserWithId(canonicalUserId, {
            isAnonymous: data.isAnonymous,
            userName: data.userName,
            frontendUserId: data.userId,
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
          console.log('✅ New user created in database:', user.userId);
        } catch (err: any) {
          // If another request created the user concurrently
          if (err?.name === 'ConditionalCheckFailedException') {
            console.log('⚠️ User already existed due to race; fetching existing:', canonicalUserId);
            user = await usersRepository.getUserById(canonicalUserId);
            isReturning = true;
          } else {
            throw err;
          }
        }
      }

      console.log('✅ User name:', data.userName || 'Anonymous');
      console.log('✅ Frontend UUID:', data.userId);

      // Ensure we have a user record
      if (!user) {
        throw new Error('Failed to create or retrieve user');
      }

      // Store user session info with both IDs
      activeUserSessions.set(socket.id, {
        userId: user.userId, // Use consistent user ID (frontend UUID)
        userName: data.userName,
        frontendUserId: data.userId
      });

      console.log('✅ User session created:', user.userId);
      socket.emit('userCreated', {
        userId: user.userId, // Return the user ID
        frontendUserId: data.userId, // Also return the frontend UUID
        userName: data.userName,
        isReturning,
        success: true,
        databaseConnected: true
      });

    } catch (error) {
      console.error('Error in user creation flow:', error);
      socket.emit('userCreated', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle therapy session start
  socket.on('startTherapySession', async (data: {
    userId: string;
    initialEmotionalState: any;
  }) => {
    try {
      console.log('🚀 startTherapySession called for user:', data.userId);
      console.log('🚀 Socket ID:', socket.id);
      console.log('🚀 Timestamp:', new Date().toISOString());

      // Check if session creation is already in progress for this user
      if (sessionCreationLocks.get(data.userId)) {
        console.log('⚠️ Session creation already in progress for user:', data.userId);
        return;
      }

      // Check if user already has an active session
      const existingSession = activeUserSessions.get(socket.id);
      if (existingSession?.sessionId) {
        console.log('⚠️ User already has active session:', existingSession.sessionId);
        socket.emit('therapySessionStarted', {
          sessionId: existingSession.sessionId,
          success: true,
          message: 'Session already active'
        });
        return;
      }

      // Set lock to prevent duplicate session creation
      sessionCreationLocks.set(data.userId, true);

      // Get user info from active session
      const activeSession = activeUserSessions.get(socket.id);
      const userName = activeSession?.userName;

      // Fetch user's previous sessions for context
      console.log('Fetching previous sessions for user:', data.userId);
      console.log('Active session info:', activeSession);

      let previousSessions: any[] = [];
      try {
        console.log('🔍 Searching for sessions with userId:', data.userId);
        console.log('🔍 Query details: table=therapeutic-wave-sessions, index=userId-startTime-index');

        previousSessions = await sessionsRepository.getSessionsByUserId(data.userId, 5); // Get last 5 sessions
        console.log(`📊 Found ${previousSessions.length} previous sessions for user ${data.userId}`);

        if (previousSessions.length > 0) {
          console.log('📋 Sample session data:', {
            sessionId: previousSessions[0].sessionId,
            userId: previousSessions[0].userId,
            startTime: previousSessions[0].startTime,
            summary: previousSessions[0].conversationSummary
          });
          console.log('📋 All session IDs found:', previousSessions.map(s => s.sessionId));
        } else {
          console.log('❌ No previous sessions found - this will be treated as first session');
        }
      } catch (error) {
        console.error('💥 Error fetching previous sessions:', error);
        console.error('💥 Error details:', error instanceof Error ? error.message : String(error));
        previousSessions = []; // Fallback to empty array
      }

      // Analyze session history to provide personalized context
      const sessionContext = analyzeSessionHistory(previousSessions, userName);
      console.log('Session context analysis:', sessionContext);

      // Create session in database
      console.log('Creating session in database for user:', data.userId);
      const session = await sessionsRepository.createSession({
        userId: data.userId,
        emotionalState: data.initialEmotionalState,
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
      console.log('✅ Session created in database:', session.sessionId);

      // Update active session
      const currentSession = activeUserSessions.get(socket.id);
      if (currentSession) {
        currentSession.sessionId = session.sessionId;
        currentSession.startTime = session.startTime;
      }

      console.log('✅ Therapy session started:', session.sessionId);
      socket.emit('sessionStarted', {
        sessionId: session.sessionId,
        startTime: session.startTime,
        sessionContext: sessionContext, // Include context for the AI
        success: true
      });

    } catch (error) {
      console.error('Error starting therapy session:', error);
      socket.emit('sessionStarted', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      // Always clear the lock
      sessionCreationLocks.delete(data.userId);
    }
  });

  // Handle therapy session completion
  socket.on('completeTherapySession', async (data: {
    sessionId: string;
    userId: string;
    transcript: string;
    finalEmotionalState: any;
    sessionMetrics: any;
    userConsent: boolean;
  }) => {
    try {
      console.log('🔄 Completing therapy session:', data.sessionId);
      console.log('📝 Processing transcript with AI summarization...');

      // Import the transcript processor
      const { transcriptProcessor } = await import('./services/transcript-processor');

      // Process transcript with AI-powered summarization using Amazon Nova Micro
      const aiSummary = await transcriptProcessor.processSessionTranscript(
        data.sessionId,
        data.transcript,
        data.userConsent
      );

      // Use AI summary if available, fallback to basic summary
      const summary = aiSummary ? aiSummary.sessionSummary : generateSessionSummary(data.transcript, data.finalEmotionalState);
      console.log('✅ Generated AI-powered session summary:', summary);

      // Update session in database with comprehensive data
      console.log('💾 Updating session in database:', data.sessionId);
      const updatedSession = await sessionsRepository.updateSession(data.sessionId, {
        endTime: new Date().toISOString(),
        duration: data.sessionMetrics.duration,
        emotionalState: {
          ...data.finalEmotionalState,
          dominantEmotions: aiSummary ? aiSummary.emotionalInsights.dominantEmotions : extractEmotionsFromTranscript(data.transcript)
        },
        therapeuticMetrics: data.sessionMetrics,
        conversationSummary: summary,
        // Store additional AI insights if available
        ...(aiSummary && {
          keyTopics: aiSummary.keyTopics,
          therapeuticProgress: aiSummary.therapeuticProgress,
          continuityNotes: aiSummary.continuityNotes
        }),
        // Only store transcript if user consents (will be encrypted by repository)
        ...(data.userConsent && data.transcript ? {
          encryptedTranscript: data.transcript
        } : {})
      });
      console.log('✅ Session updated in database with AI insights:', data.sessionId);

      // Clear active session
      const completedSession = activeUserSessions.get(socket.id);
      if (completedSession) {
        completedSession.sessionId = undefined;
        completedSession.startTime = undefined;
      }

      console.log('🎉 Therapy session completed successfully:', data.sessionId);
      socket.emit('sessionCompleted', {
        sessionId: data.sessionId,
        summary: summary,
        aiInsights: aiSummary,
        success: true
      });

    } catch (error) {
      console.error('❌ Error completing therapy session:', error);
      
      // Fallback to basic summary if AI processing fails
      try {
        const basicSummary = generateSessionSummary(data.transcript, data.finalEmotionalState);
        await sessionsRepository.updateSession(data.sessionId, {
          endTime: new Date().toISOString(),
          duration: data.sessionMetrics.duration,
          emotionalState: {
            ...data.finalEmotionalState,
            dominantEmotions: extractEmotionsFromTranscript(data.transcript)
          },
          therapeuticMetrics: data.sessionMetrics,
          conversationSummary: basicSummary,
          ...(data.userConsent && data.transcript ? {
            encryptedTranscript: data.transcript
          } : {})
        });
        
        socket.emit('sessionCompleted', {
          sessionId: data.sessionId,
          summary: basicSummary,
          success: true,
          fallback: true
        });
      } catch (fallbackError) {
        console.error('❌ Fallback session completion also failed:', fallbackError);
        socket.emit('sessionCompleted', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Handle disconnect - cleanup active session
  socket.on('disconnect', () => {
    console.log('User disconnected, cleaning up session:', socket.id);
    activeUserSessions.delete(socket.id);
  });
}

/**
 * Get active user sessions (for monitoring)
 */
export function getActiveUserSessions() {
  return Array.from(activeUserSessions.entries()).map(([socketId, session]) => ({
    socketId,
    ...session
  }));
}