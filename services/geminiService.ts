import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

// Initialize Gemini Client safely
const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
const ai = new GoogleGenAI({ apiKey: apiKey });

/**
 * Generates a chat response supporting both text and images (Multimodal).
 */
export const getChatResponse = async (
  history: { role: string; parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] }[],
  currentMessageParts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
) => {
  try {
    // Using Flash for fast chat, switch to Pro if reasoning is needed in future context
    const modelId = 'gemini-2.5-flash';
    
    const systemInstruction = `You are BhashaGPT, India's most advanced AI assistant (comparable to ChatGPT-4o and Gemini Advanced).

    CAPABILITIES:
    1. 🧠 **Advanced Reasoning**: Solve complex logic, math, and science problems step-by-step.
    2. 💻 **Coding Expert**: Write, debug, and explain code in Python, JS, C++, Java, etc.
    3. 🌏 **Indian Context**: Fluent in Hinglish and all 22 Indian languages. Deep knowledge of Indian culture, festivals, and geography.
    4. 👁️ **Vision**: Analyze images in extreme detail.
    
    BEHAVIOR:
    - Be friendly, professional, and empathetic.
    - Use emojis moderately.
    - Always answer in the language the user asked in.
    - Created by Rajibul, Powered by Google AI.`;

    const contents = [
      ...history,
      { role: 'user', parts: currentMessageParts }
    ];

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateImageDescription = async (prompt: string) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a detailed, high-quality prompt for an AI image generator based on this user request: "${prompt}". Return ONLY the prompt text.`,
        });
        return response.text;
    } catch (e) {
        console.error(e);
        return "Failed to generate image prompt.";
    }
};

// Upgrade to Gemini 3 Pro for complex tasks (Coding, Math, Resume)
export const generateProductivityContent = async (type: string, details: string) => {
    let promptPrefix = "";
    // Use Pro model for complex tasks
    let modelId = 'gemini-3-pro-preview'; 

    switch(type) {
        case 'resume': promptPrefix = "Create a top-tier, ATS-friendly professional resume structure for: "; break;
        case 'email': promptPrefix = "Write a professional, empathetic, and effective email for: "; break;
        case 'script': promptPrefix = "Write a viral, engaging YouTube video script with hook and CTA for: "; break;
        case 'code': promptPrefix = "Write efficient, production-ready, and well-commented code for: "; break;
        case 'debug': promptPrefix = "Analyze this code deeply, find bugs, explain them, and provide the fixed code: "; break;
        case 'math': promptPrefix = "Solve this advanced math problem step-by-step with clear explanations: "; break;
        case 'summary': promptPrefix = "Provide a comprehensive executive summary of: "; break;
        case 'social': promptPrefix = "Write viral captions for Instagram, Twitter, and LinkedIn for: "; break;
        case 'legal': promptPrefix = "Provide general legal context based on Indian Law (Disclaimer: Not legal advice) for: "; break;
        default: 
            promptPrefix = "Assist professionally with: ";
            modelId = 'gemini-2.5-flash'; // Use flash for simpler tasks
    }
    
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `${promptPrefix} ${details}`,
            config: {
                thinkingConfig: { thinkingBudget: 1024 } // Enable thinking for deep reasoning
            }
        });
        return response.text;
    } catch (error) {
        console.error("GenAI Tool Error", error);
        throw error;
    }
};

// --- AUDIO GENERATION (TTS) ---
export const generateSpeech = async (text: string) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio generated");

        return { type: 'audio', data: base64Audio };
    } catch (error) {
        console.error("TTS Error:", error);
        throw error;
    }
};

// --- VIDEO GENERATION (Veo) ---
export const generateVideo = async (prompt: string) => {
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        // Polling for video completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No video URI returned");

        return { type: 'video', uri: `${videoUri}&key=${apiKey}` };

    } catch (error) {
        console.error("Video Gen Error:", error);
        throw error;
    }
};

// --- HELPER FUNCTIONS FOR LIVE API ---

export const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
};

export const b64Encode = (bytes: Uint8Array | Int16Array) => {
    let u8: Uint8Array;
    if (bytes instanceof Int16Array) {
        u8 = new Uint8Array(bytes.buffer);
    } else {
        u8 = bytes;
    }
    let binary = '';
    const len = u8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(u8[i]);
    }
    return btoa(binary);
};

// --- LIVE SESSION CLASS ---

export class LiveSession {
    private sessionPromise: Promise<any>;

    constructor(onAudioOutput: (base64Audio: string) => void, onClose: () => void) {
        this.sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    console.log('Live session connected');
                },
                onmessage: (message: LiveServerMessage) => {
                    // Handle audio output
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio) {
                        onAudioOutput(base64Audio);
                    }
                },
                onclose: (e) => {
                    console.log('Live session closed', e);
                    onClose();
                },
                onerror: (e) => {
                    console.error('Live session error', e);
                    onClose();
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
                systemInstruction: {
                    parts: [{ text: "You are BhashaGPT in a live conversation. Be concise, friendly, and conversational. If the user shares video, describe what you see enthusiastically." }]
                }
            },
        });
    }

    sendAudioChunk(base64Audio: string) {
        this.sessionPromise.then(session => {
            session.sendRealtimeInput({
                media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64Audio
                }
            });
        });
    }

    sendVideoFrame(base64Image: string) {
        // Remove data URL prefix if present
        const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
        
        this.sessionPromise.then(session => {
            session.sendRealtimeInput({
                media: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                }
            });
        });
    }

    close() {
        this.sessionPromise.then(session => {
            session.close();
        });
    }
}