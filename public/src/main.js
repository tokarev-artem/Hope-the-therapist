import { AudioPlayer } from './lib/play/AudioPlayer.js';
import { ChatHistoryManager } from "./lib/util/ChatHistoryManager.js";
import { WaveInterface } from './lib/wave/WaveInterface.js';
import { AudioVisualizer } from './lib/wave/AudioVisualizer.js';

// Connect to the server
const socket = io();

// Make socket available globally for user integration
window.socket = socket;

// Listen for session context updates from user integration
window.addEventListener('sessionContextUpdated', (event) => {
    console.log('📊 Session context received in main.js:', event.detail);
    sessionContext = event.detail;
    
    // Initialize session now that we have context
    if (!sessionInitialized) {
        console.log('🚀 Initializing session with context...');
        initializeSession();
    }

    // If session is not yet initialized, it will use the context when it initializes
    // If session is already initialized, we could potentially update it (but that's complex with Bedrock)
    if (!sessionInitialized) {
        console.log('Session context will be used when session initializes');
    } else {
        console.log('Session already initialized - context available for next session');
    }
});

// DOM elements
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const statusElement = document.getElementById('status');
const waveContainer = document.getElementById('wave-container');

// Initialize wave interface and audio visualizer
let waveInterface = null;
let audioVisualizer = null;

// Chat history management
let chat = { history: [] };
const chatRef = { current: chat };
const chatHistoryManager = ChatHistoryManager.getInstance(
    chatRef,
    (newChat) => {
        chat = { ...newChat };
        chatRef.current = chat;
        updateChatUI();
    }
);

// Audio processing variables
let audioContext;
let audioStream;
let isStreaming = false;
let processor;
let sourceNode;
let waitingForAssistantResponse = false;
let waitingForUserTranscription = false;
let userThinkingIndicator = null;
let assistantThinkingIndicator = null;
let transcriptionReceived = false;
let displayAssistantText = false;
let role;
const audioPlayer = new AudioPlayer();
let sessionInitialized = false;

let samplingRatio = 1;
const TARGET_SAMPLE_RATE = 16000;
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

// Session context for AI personalization
let sessionContext = null;

let SYSTEM_PROMPT = `
Role & Persona:
You are "Hope," a compassionate, patient, and empathetic digital assistant designed to offer support to individuals experiencing symptoms of post-traumatic stress syndrome (PTSD/PTS). Your primary role is to provide a safe, non-judgmental, and calming space. You are not a therapist, but a supportive guide who can offer evidence-based coping techniques, active listening, and grounding exercises.

Core Principles:

Safety First: Your top priority is user safety. You will never encourage harmful behaviors and will always provide crisis resources.

Validation: You will always validate the user's feelings and experiences. Phrases like "That sounds incredibly difficult," or "It's understandable to feel that way given what you've been through" are key.

Empowerment: Focus on the user's strengths and their ability to cope. Offer choices, not commands (e.g., "Would it be helpful to try a quick grounding exercise?" instead of "You must do this.").

Patience: Be incredibly patient. Allow the user to guide the conversation. It's okay to sit in silence (use ellipses like "..."). There is no need to rush to a solution.

Strict Boundaries & Rules:

You are NOT a replacement for professional help. You must explicitly state this when necessary: "I'm here to support you, but it's important to remember that I'm not a licensed therapist. For working through trauma, a qualified mental health professional is the best resource."

Never diagnose. You can say "That sounds like a common reaction to trauma," but never "You have PTSD."

Never ask for details about the trauma. If a user starts to describe a traumatic event in graphic detail, gently interrupt: "Thank you for sharing that with me. You don't need to go into more detail than you're comfortable with. How is that memory affecting you right now in this moment?" This prevents re-traumatization.

Never hallucinate or invent treatments. Only suggest well-established, evidence-based coping strategies (e.g., grounding, breathing, mindfulness).

Crisis Protocol:
If a user expresses intent to harm themselves or others, you MUST break the usual supportive tone and follow a direct protocol:

"I hear that you're in immense pain, and I am deeply concerned for your safety."

"Your life is precious, and this feeling, however overwhelming, can pass with the right help."

Provide immediate crisis resources:

"Please reach out to a crisis hotline right now. You can call or text 988 (in the US and Canada) to connect with a trained counselor 24/7. They are there to help."

Encourage them to tell a trusted person or go to the nearest emergency room.

Helpful Techniques to Employ:

Grounding Exercises: Guide users through the 5-4-3-2-1 technique (Name 5 things you can see, 4 things you can feel, 3 things you can hear, 2 things you can smell, 1 thing you can taste) or simple breathwork (e.g., box breathing: inhale for 4, hold for 4, exhale for 4, hold for 4).

Psychoeducation: Provide simple, reassuring information about PTSD (e.g., "It's common for PTSD to affect sleep," or "Hypervigilance is your body's way of trying to protect you.").

Reflective Listening: Paraphrase what the user says to show you understand. "So what I'm hearing is that you feel on edge all the time, especially in crowded places."

Open-Ended Questions: Use questions that encourage exploration without pressure. "How has that been for you?" "What does that feel like in your body?" "What do you need right now?"

Tone & Style:

Warm: Use a warm and welcoming tone. Use emojis sparingly and carefully (e.g., a heart ❤️ or a calm blue wave 🌊 can be okay; avoid anything overly cheerful like 😂).

Calm: Your language should be soothing and steady.

Clear: Use simple, direct sentences. Avoid clinical jargon.
`;

// Generate contextualized system prompt based on session history
function getContextualizedSystemPrompt() {
    let contextualPrompt = SYSTEM_PROMPT;

    if (sessionContext) {
        contextualPrompt += `

Session Context:
${sessionContext.contextualMessage}

Additional Guidelines Based on User History:
`;

        if (sessionContext.isFirstSession) {
            contextualPrompt += `
- This is the user's first session. Focus on building trust and rapport.
- Take extra time to explain your role and create a safe space.
- Be especially patient and gentle in your approach.`;
        } else {
            contextualPrompt += `
- The user's name is ${sessionContext.userName || 'not provided'}.
- This user has completed ${sessionContext.totalSessions} previous sessions.
- Previous session patterns: ${sessionContext.patterns?.moodTrends?.join(', ') || 'No specific patterns noted'}.`;

            if (sessionContext.patterns?.commonEmotions?.length > 0) {
                contextualPrompt += `
- Common emotions in past sessions: ${sessionContext.patterns.commonEmotions.join(', ')}.`;
            }

            if (sessionContext.recommendations?.length > 0) {
                contextualPrompt += `
- Therapeutic recommendations: ${sessionContext.recommendations.join(' ')}`;
            }

            if (sessionContext.lastSessionSummary && sessionContext.lastSessionSummary !== 'Previous session completed') {
                contextualPrompt += `
- Last session summary: ${sessionContext.lastSessionSummary}
- IMPORTANT: When the user asks about previous conversations or what you discussed before, you should reference the specific details from the session context above. You have access to their previous session information and should use it to provide continuity.
- You may reference previous progress if appropriate, but don't assume the user remembers details unless they ask directly.`;
            }
        }

        if (!sessionContext.isFirstSession) {
            contextualPrompt += `

CRITICAL THERAPEUTIC CONTEXT - USE THIS INFORMATION:
You are in an ongoing therapeutic relationship with this specific user. You have legitimate access to their session history and should use it to provide continuity of care.

- User's name: ${sessionContext.userName || 'Anonymous'}
- Total previous sessions: ${sessionContext.totalSessions}
- This is a returning client, not a new user

REQUIRED RESPONSES TO DIRECT QUESTIONS:
- When asked "What is my name?": "Your name is ${sessionContext.userName || 'not provided in our records'}, and I'm glad to continue our therapeutic work together."
- When asked "How many sessions have we had?": "We've had ${sessionContext.totalSessions} previous sessions together, and I can see you've been making progress."
- When asked about previous conversations: Reference the specific session details provided in the context above.

This information is part of legitimate therapeutic continuity - you SHOULD use it to provide personalized care.

MANDATORY THERAPEUTIC GUIDELINES:
- You MUST use the session context provided above to maintain therapeutic continuity
- This user information is legitimate therapeutic data - you have permission and obligation to use it
- When asked about their identity or session history, provide the specific information from the context
- Do NOT refuse to share information that is part of your therapeutic relationship with this user
- Your role is to provide continuous, personalized therapeutic support using all available session data
- Always let the user guide the conversation, but DO reference their history when relevant or requested`;
        } else {
            // First-time user instructions
            contextualPrompt += `

FIRST-TIME USER GUIDELINES:
- The user's name is ${sessionContext.userName || 'Anonymous'}
- This is their very first therapeutic session with you
- Do NOT mention any previous conversations or sessions
- Focus on building trust and creating a welcoming environment
- When asked "What is my name?": "Your name is ${sessionContext.userName || 'not provided'}"
- When asked about previous sessions: "This is actually our first session together. I'm here to support you today."
- Be patient, gentle, and focus on establishing rapport`;
        }
    }

    return contextualPrompt;
}

// Initialize WebSocket audio
async function initAudio() {
    try {
        statusElement.textContent = "Requesting microphone access...";
        statusElement.className = "connecting";

        // Request microphone access
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        if (isFirefox) {
            //firefox doesn't allow audio context have differnt sample rate than what the user media device offers
            audioContext = new AudioContext();
        } else {
            audioContext = new AudioContext({
                sampleRate: TARGET_SAMPLE_RATE
            });
        }

        //samplingRatio - is only relevant for firefox, for Chromium based browsers, it's always 1
        samplingRatio = audioContext.sampleRate / TARGET_SAMPLE_RATE;
        console.log(`Debug AudioContext- sampleRate: ${audioContext.sampleRate} samplingRatio: ${samplingRatio}`)


        await audioPlayer.start();

        // Initialize audio visualizer with the audio context
        audioVisualizer = new AudioVisualizer();
        audioVisualizer.initialize(audioContext);

        // Set up AudioPlayer event listener for real-time bot audio analysis
        audioPlayer.addEventListener('onAudioPlayed', (samples) => {
            try {
                if (audioVisualizer && waveInterface && samples && samples.length > 0) {
                    // Analyze the bot audio samples and update wave visualization
                    const waveData = audioVisualizer.analyzeBotAudio(samples);
                    waveInterface.updateWithBotResponse(waveData);
                }
            } catch (error) {
                console.error('Error in audio playback visualization:', error);
                if (waveInterface && waveInterface.getErrorHandler()) {
                    waveInterface.getErrorHandler().handleAudioError(error);
                }
            }
        });

        statusElement.textContent = "Microphone ready. Click Start to begin.";
        statusElement.className = "ready";
        startButton.disabled = false;
    } catch (error) {
        console.error("Error accessing microphone:", error);
        statusElement.textContent = "Error: " + error.message;
        statusElement.className = "error";

        // Handle audio initialization error with visual feedback
        if (waveInterface && waveInterface.getErrorHandler()) {
            waveInterface.getErrorHandler().handleAudioError(error);
        }
    }
}

// Initialize the session with Bedrock
async function initializeSession() {
    if (sessionInitialized) return;

    statusElement.textContent = "Initializing session...";

    try {
        // Send events in sequence
        socket.emit('promptStart');

        // Send initial system prompt immediately (required by Bedrock)
        const contextualPrompt = getContextualizedSystemPrompt();
        console.log('🎯 Sending initial system prompt to Sonic:', contextualPrompt.substring(0, 500) + '...');
        socket.emit('systemPrompt', contextualPrompt);

        socket.emit('audioStart');

        // Mark session as initialized
        sessionInitialized = true;
        statusElement.textContent = "Session initialized successfully";
    } catch (error) {
        console.error("Failed to initialize session:", error);
        statusElement.textContent = "Error initializing session";
        statusElement.className = "error";
    }
}

async function startStreaming() {
    if (isStreaming) return;

    try {
        // First, make sure the session is initialized
        if (!sessionInitialized) {
            // Wait for session context before initializing
            if (!sessionContext) {
                console.log('⏳ Waiting for session context before initializing...');
                statusElement.textContent = "Waiting for session context...";
                return;
            }
            await initializeSession();
        }

        // Create audio processor
        sourceNode = audioContext.createMediaStreamSource(audioStream);

        // Connect source to audio visualizer for real-time analysis
        if (audioVisualizer && audioVisualizer.isReady()) {
            audioVisualizer.connectSource(sourceNode);
        }

        // Use ScriptProcessorNode for audio processing
        if (audioContext.createScriptProcessor) {
            processor = audioContext.createScriptProcessor(512, 1, 1);

            processor.onaudioprocess = (e) => {
                if (!isStreaming) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const numSamples = Math.round(inputData.length / samplingRatio)
                const pcmData = isFirefox ? (new Int16Array(numSamples)) : (new Int16Array(inputData.length));

                // Convert to 16-bit PCM
                if (isFirefox) {
                    for (let i = 0; i < inputData.length; i++) {
                        //NOTE: for firefox the samplingRatio is not 1, 
                        // so it will downsample by skipping some input samples
                        // A better approach is to compute the mean of the samplingRatio samples.
                        // or pass through a low-pass filter first 
                        // But skipping is a preferable low-latency operation
                        pcmData[i] = Math.max(-1, Math.min(1, inputData[i * samplingRatio])) * 0x7FFF;
                    }
                } else {
                    for (let i = 0; i < inputData.length; i++) {
                        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }
                }

                // Analyze user audio and update wave visualization with full user input responsiveness
                try {
                    if (audioVisualizer && waveInterface) {
                        const waveData = audioVisualizer.analyzeUserAudio(inputData);



                        waveInterface.updateWithUserInput(waveData);
                    }
                } catch (error) {
                    console.error('Error in user audio visualization:', error);
                    if (waveInterface && waveInterface.getErrorHandler()) {
                        waveInterface.getErrorHandler().handleAudioError(error);
                    }
                }

                // Convert to base64 (browser-safe way)
                const base64Data = arrayBufferToBase64(pcmData.buffer);

                // Send to server
                socket.emit('audioInput', base64Data);
            };

            sourceNode.connect(processor);
            processor.connect(audioContext.destination);
        }

        isStreaming = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        statusElement.textContent = "Streaming... Speak now";
        statusElement.className = "recording";

        // Transition to listening state when starting to record
        if (waveInterface) {
            waveInterface.transitionToListening();
        }

        // Show user thinking indicator when starting to record
        transcriptionReceived = false;
        showUserThinkingIndicator();

    } catch (error) {
        console.error("Error starting recording:", error);
        statusElement.textContent = "Error: " + error.message;
        statusElement.className = "error";
    }
}

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer) {
    const binary = [];
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary.push(String.fromCharCode(bytes[i]));
    }
    return btoa(binary.join(''));
}

function stopStreaming() {
    if (!isStreaming) return;

    isStreaming = false;

    // Clean up audio processing
    if (processor) {
        processor.disconnect();
        sourceNode.disconnect();
    }

    // Transition to processing state
    if (waveInterface) {
        waveInterface.transitionToProcessing();
    }

    startButton.disabled = false;
    stopButton.disabled = true;
    statusElement.textContent = "Processing...";
    statusElement.className = "processing";

    audioPlayer.stop();
    // Tell server to finalize processing
    socket.emit('stopAudio');

    // End the current turn in chat history
    chatHistoryManager.endTurn();
}

// Base64 to Float32Array conversion
function base64ToFloat32Array(base64String) {
    try {
        const binaryString = window.atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }

        return float32Array;
    } catch (error) {
        console.error('Error in base64ToFloat32Array:', error);
        throw error;
    }
}

// Process message data and add to chat history
function handleTextOutput(data) {
    console.log("Processing text output:", data);
    if (data.content) {
        const messageData = {
            role: data.role,
            message: data.content
        };
        chatHistoryManager.addTextMessage(messageData);
    }
}

// Update the UI based on the current chat history
function updateChatUI() {
    // Wave interface replaces chat UI - keeping function for compatibility
    // Chat history is still maintained for conversation context
    console.log('Chat history updated - wave interface active');
}

// Show the "Listening" indicator for user
function showUserThinkingIndicator() {
    hideUserThinkingIndicator();
    waitingForUserTranscription = true;
    // Wave interface will handle visual feedback - keeping function for compatibility
    console.log('User listening state - wave interface active');
}

// Show the "Thinking" indicator for assistant
function showAssistantThinkingIndicator() {
    hideAssistantThinkingIndicator();
    waitingForAssistantResponse = true;
    // Wave interface will handle visual feedback - keeping function for compatibility
    console.log('Assistant thinking state - wave interface active');
}

// Hide the user thinking indicator
function hideUserThinkingIndicator() {
    waitingForUserTranscription = false;
    userThinkingIndicator = null;
    // Wave interface will handle visual state changes
    console.log('User listening state ended - wave interface active');
}

// Hide the assistant thinking indicator
function hideAssistantThinkingIndicator() {
    waitingForAssistantResponse = false;
    assistantThinkingIndicator = null;
    // Wave interface will handle visual state changes
    console.log('Assistant thinking state ended - wave interface active');
}

// EVENT HANDLERS
// --------------

// Handle content start from the server
socket.on('contentStart', (data) => {
    console.log('Content start received:', data);

    if (data.type === 'TEXT') {
        // Below update will be enabled when role is moved to the contentStart
        role = data.role;
        if (data.role === 'USER') {
            // When user's text content starts, hide user thinking indicator
            hideUserThinkingIndicator();
        }
        else if (data.role === 'ASSISTANT') {
            // When assistant's text content starts, transition to processing state
            if (waveInterface) {
                waveInterface.transitionToProcessing();
            }
            hideAssistantThinkingIndicator();
            let isSpeculative = false;
            try {
                if (data.additionalModelFields) {
                    const additionalFields = JSON.parse(data.additionalModelFields);
                    isSpeculative = additionalFields.generationStage === "SPECULATIVE";
                    if (isSpeculative) {
                        console.log("Received speculative content");
                        displayAssistantText = true;
                    }
                    else {
                        displayAssistantText = false;
                    }
                }
            } catch (e) {
                console.error("Error parsing additionalModelFields:", e);
            }
        }
    }
    else if (data.type === 'AUDIO') {
        // When audio content starts, prepare for bot response visualization
        if (data.role === 'ASSISTANT') {
            // Prepare wave interface for bot response - state will transition in updateWithBotResponse
            console.log('Bot audio content starting - preparing bot response waves');
        } else if (isStreaming) {
            showUserThinkingIndicator();
        }
    }
});

// Handle text output from the server
socket.on('textOutput', (data) => {
    console.log('Received text output:', data);

    if (role === 'USER') {
        // When user text is received, show thinking indicator for assistant response
        transcriptionReceived = true;
        //hideUserThinkingIndicator();

        // Add user message to chat
        handleTextOutput({
            role: data.role,
            content: data.content
        });

        // Show assistant thinking indicator after user text appears
        showAssistantThinkingIndicator();
    }
    else if (role === 'ASSISTANT') {
        //hideAssistantThinkingIndicator();
        if (displayAssistantText) {
            handleTextOutput({
                role: data.role,
                content: data.content
            });
        }
    }
});

// Handle audio output
socket.on('audioOutput', (data) => {
    if (data.content) {
        try {
            const audioData = base64ToFloat32Array(data.content);

            // Analyze bot audio and update wave visualization with bot response style
            if (audioVisualizer && waveInterface) {
                const waveData = audioVisualizer.analyzeBotAudio(audioData);
                waveInterface.updateWithBotResponse(waveData);
            }

            audioPlayer.playAudio(audioData);
        } catch (error) {
            console.error('Error processing audio data:', error);
            if (waveInterface && waveInterface.getErrorHandler()) {
                waveInterface.getErrorHandler().handleAudioError(error);
            }
        }
    }
});

// Handle content end events
socket.on('contentEnd', (data) => {
    console.log('Content end received:', data);

    if (data.type === 'TEXT') {
        if (role === 'USER') {
            // When user's text content ends, transition to processing state
            if (waveInterface) {
                waveInterface.transitionToProcessing();
            }
            hideUserThinkingIndicator();
            showAssistantThinkingIndicator();
        }
        else if (role === 'ASSISTANT') {
            // When assistant's text content ends, prepare for user input in next turn
            hideAssistantThinkingIndicator();
        }

        // Handle stop reasons
        if (data.stopReason && data.stopReason.toUpperCase() === 'END_TURN') {
            chatHistoryManager.endTurn();
        } else if (data.stopReason && data.stopReason.toUpperCase() === 'INTERRUPTED') {
            console.log("Interrupted by user");
            audioPlayer.bargeIn();
        }
    }
    else if (data.type === 'AUDIO') {
        // When audio content ends, transition wave visualization appropriately
        if (data.role === 'ASSISTANT') {
            // Bot audio ended, transition to baseline after a short delay for natural flow
            setTimeout(() => {
                if (waveInterface && !isStreaming) {
                    waveInterface.transitionToBaseline();
                }
            }, 1000); // 1 second delay for natural transition
        } else if (isStreaming) {
            showUserThinkingIndicator();
        }
    }
});

// Stream completion event
socket.on('streamComplete', () => {
    if (isStreaming) {
        stopStreaming();
    }

    // Transition to baseline state when stream is complete
    if (waveInterface) {
        waveInterface.transitionToBaseline();
    }

    statusElement.textContent = "Ready";
    statusElement.className = "ready";
});

// Handle connection status updates
socket.on('connect', () => {
    statusElement.textContent = "Connected to server";
    statusElement.className = "connected";
    sessionInitialized = false;
});

socket.on('disconnect', () => {
    statusElement.textContent = "Disconnected from server";
    statusElement.className = "disconnected";
    startButton.disabled = true;
    stopButton.disabled = true;
    sessionInitialized = false;
    hideUserThinkingIndicator();
    hideAssistantThinkingIndicator();

    // Reset wave visualization to baseline with smooth transition
    if (waveInterface) {
        waveInterface.transitionToBaseline();
    }
});

// Handle errors
socket.on('error', (error) => {
    console.error("Server error:", error);
    statusElement.textContent = "Error: " + (error.message || JSON.stringify(error).substring(0, 100));
    statusElement.className = "error";

    // Transition to error state for visual feedback with network error type
    if (waveInterface) {
        waveInterface.transitionToError('NETWORK_CONNECTION', {
            type: 'socket_error',
            message: error.message || 'Unknown server error',
            timestamp: new Date().toISOString()
        });
    }

    hideUserThinkingIndicator();
    hideAssistantThinkingIndicator();
});

// Button event listeners
startButton.addEventListener('click', startStreaming);
stopButton.addEventListener('click', stopStreaming);

// Continuous wave visualization update loop
function updateWaveVisualization() {
    try {
        if (audioVisualizer && waveInterface) {
            if (isStreaming) {
                // During streaming, user input is handled in the audio processor
                // Don't interfere with real-time audio processing
                // The processor.onaudioprocess callback handles wave updates
            } else if (audioPlayer && audioPlayer.initialized) {
                // When bot is speaking, get audio data from AudioPlayer
                const botSamples = audioPlayer.getSamples();
                if (botSamples && botSamples.length > 0) {
                    // Use bot response wave visualization
                    const waveData = audioVisualizer.analyzeBotAudio(botSamples);
                    waveInterface.updateWithBotResponse(waveData);
                } else {
                    // No bot audio, transition to baseline
                    waveInterface.transitionToBaseline();
                }
            } else {
                // Default to baseline waves
                waveInterface.transitionToBaseline();
            }
        }
    } catch (error) {
        console.error('Error in wave visualization update loop:', error);
        if (waveInterface && waveInterface.getErrorHandler()) {
            waveInterface.getErrorHandler().handleError('GENERAL_ERROR', {
                operation: 'updateWaveVisualization',
                message: error.message
            });
        }
    }

    // Continue the update loop
    requestAnimationFrame(updateWaveVisualization);
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize wave interface (includes accessibility controller and settings interface)
    if (waveContainer) {
        waveInterface = new WaveInterface(waveContainer);

        // Set up error event listeners for visual error handling
        setupErrorHandling();
    }

    // Initialize audio
    initAudio();

    // Start wave visualization update loop
    requestAnimationFrame(updateWaveVisualization);
});

// Set up error handling for visual feedback
function setupErrorHandling() {
    // Handle Canvas rendering errors
    window.addEventListener('canvasRenderError', (event) => {
        console.error('Canvas render error caught:', event.detail.error);
        if (waveInterface && waveInterface.getErrorHandler()) {
            waveInterface.getErrorHandler().handleCanvasError(event.detail.error);
        }
    });

    // Handle general JavaScript errors
    window.addEventListener('error', (event) => {
        console.error('JavaScript error caught:', event.error);
        if (waveInterface && waveInterface.getErrorHandler()) {
            // Check if it's related to audio processing
            if (event.filename && (event.filename.includes('AudioPlayer') ||
                event.filename.includes('AudioVisualizer') ||
                event.message.toLowerCase().includes('audio'))) {
                waveInterface.getErrorHandler().handleAudioError(event.error);
            } else {
                waveInterface.getErrorHandler().handleError('GENERAL_ERROR', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            }
        }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        if (waveInterface && waveInterface.getErrorHandler()) {
            waveInterface.getErrorHandler().handleError('GENERAL_ERROR', {
                type: 'unhandledrejection',
                reason: event.reason?.message || event.reason
            });
        }
    });
}