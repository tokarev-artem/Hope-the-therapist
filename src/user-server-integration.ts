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
 * Extract key topics and issues from conversation transcript
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

  // More specific issue patterns with context awareness
  const issuePatterns = {
    'work stress': ['boss', 'workplace', 'manager', 'office', 'colleague', 'job stress', 'work pressure'],
    'hobby/craft issues': ['woodworking', 'crafting', 'hobby', 'creative', 'making', 'building', 'tools', 'hammer', 'saw'],
    'sleep problems': ['sleep', 'insomnia', 'tired', 'exhausted', 'rest', 'bed', 'wake up'],
    'relationship issues': ['partner', 'spouse', 'relationship', 'marriage', 'boyfriend', 'girlfriend'],
    'anxiety': ['anxious', 'anxiety', 'worried', 'panic', 'nervous'],
    'depression': ['sad', 'depressed', 'down', 'hopeless', 'empty', 'worthless'],
    'family problems': ['family', 'parents', 'children', 'kids', 'mother', 'father', 'sibling'],
    'financial stress': ['money', 'financial', 'debt', 'bills', 'budget', 'income', 'expenses'],
    'health concerns': ['health', 'sick', 'illness', 'doctor', 'medical', 'pain', 'symptoms'],
    'eating/food issues': ['eat', 'eating', 'food', 'appetite', 'hungry', 'comfort eating']
  };

  const detectedIssues: string[] = [];
  const topics: string[] = [];
  const keyPhrases: string[] = [];

  // Extract issues with better context awareness
  for (const [issue, keywords] of Object.entries(issuePatterns)) {
    const matchCount = keywords.filter(keyword => lowerTranscript.includes(keyword)).length;
    if (matchCount >= 1) { // Lower threshold but be more specific
      detectedIssues.push(issue);
    }
  }

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

    // Look for sentences that contain important context or problems
    if (lower.includes('used to') || lower.includes('can\'t') || lower.includes('broken') ||
      lower.includes('enjoy') || lower.includes('love') || lower.includes('problem') ||
      lower.includes('difficult') || lower.includes('struggle') || lower.includes('help') ||
      lower.includes('feel') || lower.includes('want') || lower.includes('need') ||
      lower.includes('boss') || lower.includes('respect') || lower.includes('upset') ||
      lower.includes('makes me') || lower.includes('because')) {

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

  // Extract topics with better context awareness
  const topicPatterns = {
    'hobbies/crafts': ['woodworking', 'crafting', 'hobby', 'creative', 'making', 'building'],
    'work': ['job', 'boss', 'workplace', 'manager', 'office', 'colleague'],
    'family': ['family', 'parents', 'children', 'kids', 'mother', 'father'],
    'health': ['health', 'sick', 'illness', 'doctor', 'medical'],
    'relationships': ['partner', 'spouse', 'relationship', 'marriage'],
    'emotions': ['feel', 'feeling', 'mood', 'emotional', 'sad', 'happy', 'anxious'],
    'food/eating': ['eat', 'eating', 'food', 'appetite', 'hungry']
  };

  for (const [topic, keywords] of Object.entries(topicPatterns)) {
    if (keywords.some(keyword => lowerTranscript.includes(keyword))) {
      topics.push(topic);
    }
  }

  return {
    issues: detectedIssues,
    topics: [...new Set(topics)], // Remove duplicates
    keyPhrases: keyPhrases.slice(0, 5) // Increase to top 5 key phrases for better context
  };
}

/**
 * Generate personalized follow-up questions based on previous session content
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
  const lowerSummary = lastSessionSummary.toLowerCase();

  // Generate specific questions based on key phrases and content
  if (lowerSummary.includes('boss') && (lowerSummary.includes('annoying') || lowerSummary.includes('useless'))) {
    questions.push(`How have things been with your boss since our last session, ${name}? Has the situation improved at all?`);
    questions.push(`You mentioned your boss thinks you're useless, but you know you've helped the company grow. How are you feeling about that situation now?`);
  }

  // Generate questions based on identified issues
  if (issues.includes('work stress')) {
    if (!questions.some(q => q.includes('boss'))) { // Avoid duplicates
      questions.push(`How have things been with your work situation, ${name}? Did you manage to address the stress issues?`);
    }
    questions.push(`Have you been able to implement any stress management techniques at work?`);
  }

  if (issues.includes('hobby/craft issues')) {
    questions.push(`How are things going with your woodworking, ${name}? Were you able to get your tools sorted out?`);
    questions.push(`Have you been able to get back to your creative projects since we last talked?`);
  }

  if (issues.includes('eating/food issues')) {
    questions.push(`How has your relationship with food been since our last session, ${name}?`);
    questions.push(`Have you been able to find some balance with your eating habits?`);
  }

  if (issues.includes('sleep problems')) {
    questions.push(`How has your sleep been since our last session, ${name}?`);
  }

  if (issues.includes('anxiety')) {
    questions.push(`How have you been managing your anxiety since we last spoke?`);
  }

  // Generate questions based on specific topics
  if (topics.includes('hobbies/crafts')) {
    questions.push(`How are your creative projects going, ${name}?`);
  }

  if (topics.includes('work') && !questions.some(q => q.includes('work'))) {
    questions.push(`How are things going at work, ${name}?`);
  }

  // Generate questions based on session summary content
  if (lowerSummary.includes('mood improved')) {
    questions.push(`I'm glad to see your mood improved in our last session. How have you been feeling since then?`);
  }

  if (lowerSummary.includes('effectiveness')) {
    questions.push(`Last time we found some helpful strategies. Have you been able to use any of them?`);
  }

  // Use key phrases to create more specific questions
  keyPhrases.forEach(phrase => {
    const lowerPhrase = phrase.toLowerCase();
    if (lowerPhrase.includes('boss') && lowerPhrase.includes('annoying') && !questions.some(q => q.includes('boss'))) {
      questions.push(`You mentioned your boss was being annoying. How has that been going, ${name}?`);
    }
    if (lowerPhrase.includes('useless') && !questions.some(q => q.includes('useless'))) {
      questions.push(`Last time you felt your boss thought you were useless. How are you processing those feelings now?`);
    }
    if (lowerPhrase.includes('woodworking') && lowerPhrase.includes('enjoy') && !questions.some(q => q.includes('woodworking'))) {
      questions.push(`You mentioned you used to enjoy woodworking. How are you feeling about that hobby now, ${name}?`);
    }
    if (lowerPhrase.includes('broken') && lowerPhrase.includes('hammer') && !questions.some(q => q.includes('tools'))) {
      questions.push(`Last time your hammer was broken and affecting your woodworking. Have you been able to get that sorted out?`);
    }
    if (lowerPhrase.includes('eat') && lowerPhrase.includes('lot') && !questions.some(q => q.includes('eating'))) {
      questions.push(`You mentioned wanting to eat a lot. How has your relationship with food been since then?`);
    }
    if (lowerPhrase.includes('boss') && lowerPhrase.includes('respect') && !questions.some(q => q.includes('respect'))) {
      questions.push(`You mentioned your boss doesn't respect you and it makes you feel upset. How has that situation been since our last session?`);
    }
    if (lowerPhrase.includes('makes me feel') && lowerPhrase.includes('upset') && !questions.some(q => q.includes('upset'))) {
      questions.push(`Last time you were feeling upset about your work situation. How are you processing those feelings now?`);
    }
  });

  // Generic follow-up if no specific issues identified
  if (questions.length === 0) {
    questions.push(`How have you been since our last session, ${name}?`);
    questions.push(`Have you had a chance to think about what we discussed last time?`);
  }

  return questions.slice(0, 2); // Return top 2 most relevant questions
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

  // Get last session summary and analyze conversation content
  if (sessions.length > 0) {
    const lastSession = sessions[0];
    analysis.lastSessionSummary = lastSession.conversationSummary || 'Previous session completed';

    // Debug: Log the full session object to understand what data we have
    console.log('🔍 Full last session object:', JSON.stringify(lastSession, null, 2));
    console.log('🔍 Analyzing last session summary:', analysis.lastSessionSummary);

    const conversationAnalysis = extractConversationTopics(analysis.lastSessionSummary);
    analysis.lastSessionIssues = conversationAnalysis.issues;
    analysis.lastSessionTopics = conversationAnalysis.topics;
    analysis.lastSessionKeyPhrases = conversationAnalysis.keyPhrases;

    console.log('📊 Extracted conversation analysis:', {
      issues: analysis.lastSessionIssues,
      topics: analysis.lastSessionTopics,
      keyPhrases: analysis.lastSessionKeyPhrases
    });

    // Generate personalized follow-up questions based on last session
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

  // Add key conversation details for AI context
  if (analysis.lastSessionKeyPhrases.length > 0) {
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
      console.log('Completing therapy session:', data.sessionId);

      // Generate a summary from the transcript
      const summary = generateSessionSummary(data.transcript, data.finalEmotionalState);
      console.log('Generated session summary:', summary);

      // Update session in database
      console.log('Updating session in database:', data.sessionId);
      const updatedSession = await sessionsRepository.updateSession(data.sessionId, {
        endTime: new Date().toISOString(),
        duration: data.sessionMetrics.duration,
        emotionalState: {
          ...data.finalEmotionalState,
          dominantEmotions: extractEmotionsFromTranscript(data.transcript)
        },
        therapeuticMetrics: data.sessionMetrics,
        conversationSummary: summary,
        // Only store transcript if user consents
        ...(data.userConsent && data.transcript ? {
          encryptedTranscript: data.transcript // Will be encrypted by repository
        } : {})
      });
      console.log('✅ Session updated in database:', data.sessionId);

      // Clear active session
      const completedSession = activeUserSessions.get(socket.id);
      if (completedSession) {
        completedSession.sessionId = undefined;
        completedSession.startTime = undefined;
      }

      console.log('Therapy session completed:', data.sessionId);
      socket.emit('sessionCompleted', {
        sessionId: data.sessionId,
        summary: summary,
        success: true
      });

    } catch (error) {
      console.error('Error completing therapy session:', error);
      socket.emit('sessionCompleted', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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