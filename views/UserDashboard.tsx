import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, Image as ImageIcon, Paperclip, Smile, MoreVertical, 
  Heart, Download, Share2, Copy, Zap, Trophy, Flame, Calendar, 
  CheckCircle, Globe, CreditCard, MessageSquare, User as UserIcon,
  Video, PenTool, Briefcase, GraduationCap, Languages, Music, 
  Camera, Sparkles, LogOut, ThumbsUp, ArrowRight, Lock, LayoutGrid,
  Trash2, X, Check, Play, Pause, MicOff, VideoOff, PhoneOff, AlertTriangle,
  Code, Calculator, FileText, Hash, Scale, ChefHat, Volume2, Loader2, Square, Headphones
} from 'lucide-react';
import { User, ChatMessage, PlanType } from '../types';
import { getChatResponse, generateImageDescription, generateProductivityContent, generateSpeech, generateVideo, LiveSession, b64Encode, floatTo16BitPCM } from '../services/geminiService';
import { Button, Card, Badge, Modal } from '../components/UI';

interface DashboardProps {
  user: User;
  activeTab: string; 
  setUser: (u: User) => void;
}

// Helper to play PCM audio
const playPCMAudio = async (base64Data: string) => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass({ sampleRate: 24000 });
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const frameCount = dataInt16.length;
        const audioBuffer = audioContext.createBuffer(1, frameCount, 24000);
        const channelData = audioBuffer.getChannelData(0);
        
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
    } catch (e) {
        console.error("Error playing audio", e);
    }
};

// --- ACTIVE SESSION INTERFACE (VOICE / VIDEO) ---
interface ActiveSessionProps {
    mode: 'voice' | 'video';
    onClose: () => void;
}

const ActiveSessionInterface: React.FC<ActiveSessionProps> = ({ mode, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [isMuted, setIsMuted] = useState(false);
    
    // Refs for cleanup
    const liveSessionRef = useRef<LiveSession | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const intervalRef = useRef<number | null>(null);
    const nextStartTimeRef = useRef<number>(0);

    useEffect(() => {
        const startSession = async () => {
            try {
                // 1. Get User Media
                const constraints = { audio: true, video: mode === 'video' };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                streamRef.current = stream;
                
                if (mode === 'video' && videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }

                // 2. Init Audio Context
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioCtx = new AudioContextClass({ sampleRate: 16000 });
                audioContextRef.current = audioCtx;
                nextStartTimeRef.current = audioCtx.currentTime;

                // 3. Connect to Gemini Live
                const session = new LiveSession(
                    // On Audio Output (From Model)
                    async (base64Audio) => {
                        try {
                            const binary = atob(base64Audio);
                            const bytes = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                            
                            const pcm16 = new Int16Array(bytes.buffer);
                            const audioBuffer = audioCtx.createBuffer(1, pcm16.length, 24000);
                            const channelData = audioBuffer.getChannelData(0);
                            for(let i=0; i<pcm16.length; i++) {
                                channelData[i] = pcm16[i] / 32768.0;
                            }
                            
                            const source = audioCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioCtx.destination);
                            
                            const now = audioCtx.currentTime;
                            const start = Math.max(now, nextStartTimeRef.current);
                            source.start(start);
                            nextStartTimeRef.current = start + audioBuffer.duration;
                            
                        } catch(e) { console.error("Audio playback error", e); }
                    },
                    onClose
                );
                liveSessionRef.current = session;
                setStatus('connected');

                // 4. Setup Audio Input Stream
                const source = audioCtx.createMediaStreamSource(stream);
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;
                
                processor.onaudioprocess = (e) => {
                    if (isMuted) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = floatTo16BitPCM(inputData);
                    const b64 = b64Encode(pcm16);
                    session.sendAudioChunk(b64);
                };
                
                const muteGain = audioCtx.createGain();
                muteGain.gain.value = 0;
                source.connect(processor);
                processor.connect(muteGain);
                muteGain.connect(audioCtx.destination);

                // 5. Setup Video Frame Loop (If Video Mode)
                if (mode === 'video') {
                    const sendFrame = () => {
                        if (videoRef.current && canvasRef.current) {
                            const ctx = canvasRef.current.getContext('2d');
                            if (ctx) {
                                canvasRef.current.width = videoRef.current.videoWidth / 4; 
                                canvasRef.current.height = videoRef.current.videoHeight / 4;
                                ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                                const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.5);
                                session.sendVideoFrame(base64Image);
                            }
                        }
                    };
                    intervalRef.current = window.setInterval(sendFrame, 500);
                }

            } catch (err) {
                console.error("Failed to start live session", err);
                setStatus('error');
            }
        };

        startSession();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            if (liveSessionRef.current) {
                liveSessionRef.current.close();
                liveSessionRef.current = null;
            }
        };
    }, [mode]);

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-fade-in">
             {/* Mode Specific Visuals */}
             {mode === 'video' ? (
                 <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                     <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover scale-x-[-1]"
                        muted 
                        playsInline
                     />
                     {/* Overlay */}
                     <div className="absolute bottom-32 left-0 right-0 text-center">
                         <p className="text-white/80 text-sm bg-black/30 inline-block px-4 py-1 rounded-full backdrop-blur-md">
                             {status === 'connecting' ? 'Connecting...' : 'BhashaGPT is watching'}
                         </p>
                     </div>
                     <canvas ref={canvasRef} className="hidden" />
                 </div>
             ) : (
                 <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950">
                     {/* Voice Visualizer */}
                     <div className={`w-48 h-48 rounded-full bg-indigo-500/20 flex items-center justify-center blur-xl transition-all duration-1000 ${status === 'connected' && !isMuted ? 'scale-110 animate-pulse' : 'scale-100'}`}></div>
                     <div className="absolute">
                         <div className={`w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50 transition-all duration-500 ${status === 'connected' && !isMuted ? 'scale-110' : 'scale-100'}`}>
                             <Headphones size={48} className="text-white" />
                         </div>
                     </div>
                     <div className="mt-20 text-center space-y-2">
                         <h2 className="text-2xl font-bold text-white tracking-tight">BhashaGPT Voice</h2>
                         <p className="text-indigo-200/60 text-sm">
                             {status === 'connecting' ? 'Connecting...' : (isMuted ? 'Microphone Muted' : 'Listening...')}
                         </p>
                     </div>
                 </div>
             )}

             {/* Controls */}
             <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
                 <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    className={`p-5 rounded-full backdrop-blur-md transition-all ${isMuted ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                 >
                     {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                 </button>
                 
                 <button 
                    onClick={onClose} 
                    className="p-6 rounded-full bg-red-500 text-white shadow-xl shadow-red-500/20 hover:bg-red-600 hover:scale-105 transition-all transform active:scale-95"
                 >
                     <PhoneOff size={32} />
                 </button>
             </div>
        </div>
    );
};

// --- TOOLS GRID COMPONENT ---
interface ToolsGridProps {
    compact?: boolean;
    onSendToChat?: (content: string, type: 'text' | 'image' | 'video' | 'audio') => void;
    initialToolLabel?: string | null;
}

const ToolsGrid: React.FC<ToolsGridProps> = ({ compact = false, onSendToChat, initialToolLabel = null }) => {
    const tools = [
        { icon: Video, label: "Veo Video Gen", color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/20" },
        { icon: ImageIcon, label: "Text to Image", color: "text-pink-500", bg: "bg-pink-100 dark:bg-pink-900/20" },
        { icon: Code, label: "Code Guru", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20" },
        { icon: Zap, label: "Gemini Pro Reasoning", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/20" },
        { icon: Music, label: "AI Voice Gen", color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900/20" },
        { icon: Calculator, label: "Math Solver", color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/20" },
        { icon: FileText, label: "Summarizer", color: "text-teal-500", bg: "bg-teal-100 dark:bg-teal-900/20" },
        { icon: Briefcase, label: "Resume Builder", color: "text-cyan-500", bg: "bg-cyan-100 dark:bg-cyan-900/20" },
        { icon: Video, label: "YouTube Script", color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20" },
        { icon: Hash, label: "Social Viral", color: "text-fuchsia-500", bg: "bg-fuchsia-100 dark:bg-fuchsia-900/20" },
        { icon: Scale, label: "Legal AI", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/20" },
        { icon: ChefHat, label: "Chef AI", color: "text-lime-600", bg: "bg-lime-100 dark:bg-lime-900/20" },
    ];

    const [activeTool, setActiveTool] = useState<any>(null);
    const [toolInput, setToolInput] = useState("");
    const [toolResult, setToolResult] = useState<any>(null); 
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialToolLabel) {
            const tool = tools.find(t => t.label === initialToolLabel);
            if (tool) setActiveTool(tool);
        }
    }, [initialToolLabel]);

    const handleToolRun = async () => {
        setLoading(true);
        setToolResult(null);
        try {
            if (activeTool.label === "Text to Image") {
                if (!toolInput.trim()) return;
                const prompt = encodeURIComponent(toolInput);
                const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;
                const img = new Image();
                img.src = imageUrl;
                img.onload = () => {
                    setToolResult({ type: 'image', content: imageUrl });
                    setLoading(false);
                };
                return;
            }

            if (activeTool.label === "Veo Video Gen") {
                const result = await generateVideo(toolInput);
                setToolResult({ type: 'video', content: result.uri });
                setLoading(false);
                return;
            }

            if (activeTool.label === "AI Voice Gen") {
                const result = await generateSpeech(toolInput);
                setToolResult({ type: 'audio', content: result.data }); 
                playPCMAudio(result.data);
                setLoading(false);
                return;
            }

            // Map tools to types
            let type = "email";
            if (activeTool.label.includes("Resume")) type = "resume";
            else if (activeTool.label.includes("Script")) type = "script";
            else if (activeTool.label.includes("Code")) type = "code";
            else if (activeTool.label.includes("Reasoning")) type = "math"; // Use math logic for reasoning
            else if (activeTool.label.includes("Math")) type = "math";
            else if (activeTool.label.includes("Summarizer")) type = "summary";
            else if (activeTool.label.includes("Social")) type = "social";
            else if (activeTool.label.includes("Legal")) type = "legal";
            else if (activeTool.label.includes("Chef")) type = "recipe";

            const res = await generateProductivityContent(type, toolInput);
            setToolResult({ type: 'text', content: res });

        } catch (e) {
            setToolResult({ type: 'error', content: "Error generating content. Please try again." });
        } finally {
            if (activeTool.label !== "Text to Image") setLoading(false);
        }
    };

    const handleInsert = () => {
        if (onSendToChat && toolResult) {
            onSendToChat(toolResult.content, toolResult.type);
            setActiveTool(null);
            setToolResult(null);
            setToolInput("");
        }
    };

    const renderToolInterface = () => (
        <div className="space-y-4 animate-fade-in h-full flex flex-col">
            {compact && (
                <div className="flex items-center justify-between mb-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                   <button onClick={() => { setActiveTool(null); setToolResult(null); setToolInput(""); }} className="flex items-center text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                      <ArrowRight className="rotate-180 mr-1" size={14} /> Back to Tools
                   </button>
                   <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{activeTool.label}</span>
                </div>
            )}
            
            {!compact && <p className="text-sm text-slate-500">Describe what you need help with.</p>}
            
            {!toolResult && (
                <div className="flex-1 flex flex-col">
                    <textarea 
                        className="w-full flex-1 min-h-[120px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-mono"
                        placeholder={`Enter details for ${activeTool.label}...`}
                        value={toolInput}
                        onChange={(e) => setToolInput(e.target.value)}
                    ></textarea>
                    <Button onClick={handleToolRun} isLoading={loading} className="w-full py-2 text-sm mt-4">
                        {loading ? (activeTool.label === "Veo Video Gen" ? 'Generating Video (Wait ~15s)...' : 'Processing...') : 'Generate'}
                    </Button>
                </div>
            )}
            
            {toolResult && (
                <div className="flex-1 flex flex-col min-h-0 animate-slide-up">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Result</span>
                        <button onClick={() => setToolResult(null)} className="text-xs text-indigo-600 hover:underline">New Prompt</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto min-h-[200px] bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center">
                        {toolResult.type === 'image' && (
                             <img src={toolResult.content} alt="Generated" className="w-full h-full object-contain rounded-lg" />
                        )}
                        {toolResult.type === 'video' && (
                             <div className="w-full text-center">
                                <video src={toolResult.content} controls className="w-full rounded-lg shadow-lg bg-black" />
                                <p className="text-xs text-slate-500 mt-2">Veo AI Generated Video</p>
                             </div>
                        )}
                        {toolResult.type === 'audio' && (
                             <div className="flex flex-col items-center gap-4 p-8">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center animate-pulse">
                                    <Music size={32} className="text-indigo-600" />
                                </div>
                                <Button onClick={() => playPCMAudio(toolResult.content)} size="sm" variant="outline">
                                    <Play size={14} className="mr-2"/> Replay Audio
                                </Button>
                             </div>
                        )}
                        {toolResult.type === 'text' && (
                             <div className="w-full h-full whitespace-pre-wrap text-sm p-2 font-mono text-left">
                                {toolResult.content}
                             </div>
                        )}
                         {toolResult.type === 'error' && (
                             <div className="text-red-500 text-sm">{toolResult.content}</div>
                        )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                         {toolResult.type === 'text' && (
                            <Button onClick={handleToolRun} variant="ghost" className="flex-1 py-2 text-sm border border-slate-200 dark:border-slate-700">
                                Regenerate
                            </Button>
                         )}
                        {onSendToChat && (
                            <Button onClick={handleInsert} className="flex-[2] py-2 text-sm shadow-lg shadow-indigo-500/20">
                                Insert to Chat
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    if (compact && activeTool) {
        return renderToolInterface();
    }

    return (
        <div className={`animate-fade-in ${compact ? 'h-full' : 'space-y-6'}`}>
             {!compact && (
                 <div className="flex justify-between items-center">
                     <h2 className="text-2xl font-bold">BhashaGPT Studio</h2>
                     <Badge>Gemini 3 + Veo</Badge>
                 </div>
             )}
             
             <div className={`grid ${compact ? 'grid-cols-3 gap-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                 {tools.map((t, i) => (
                     <Card key={i} className={`cursor-pointer hover:-translate-y-1 transition-transform hover:shadow-md ${compact ? 'p-3 border-slate-200 dark:border-slate-700' : ''}`} >
                         <div onClick={() => setActiveTool(t)} className="flex flex-col items-center text-center space-y-2">
                             <div className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} rounded-xl flex items-center justify-center ${t.bg} ${t.color}`}>
                                 <t.icon size={compact ? 18 : 24} />
                             </div>
                             <span className={`font-medium ${compact ? 'text-[10px] leading-tight' : 'text-sm'}`}>{t.label}</span>
                         </div>
                     </Card>
                 ))}
             </div>

             {!compact && (
                 <Modal isOpen={!!activeTool} onClose={() => { setActiveTool(null); setToolResult(null); setToolInput(""); }} title={activeTool?.label || "Tool"}>
                      {renderToolInterface()}
                 </Modal>
             )}
        </div>
    );
};

// --- CHAT COMPONENT ---
const ChatInterface: React.FC<{ user: User }> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Namaste ${user.name}! I am BhashaGPT 4.0. \n\nI am powered by Google's most advanced AI models (Gemini 3 Pro & Veo).\n\nI can help you with:\n• Coding & Debugging\n• Video Generation (Veo)\n• Complex Math\n\nHow can I assist you today?`, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [initialTool, setInitialTool] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [sessionMode, setSessionMode] = useState<'voice' | 'video' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
        return;
    }

    try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN'; 
        recognition.continuous = false;
        recognition.interimResults = false;
    
        recognition.onstart = () => setIsListening(true);
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev + (prev ? " " : "") + transcript);
        };
    
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
    
        recognitionRef.current = recognition;
        recognition.start();
    } catch (error) {
        setIsListening(false);
    }
  };

  const stopAudio = () => {
      if (activeSourceRef.current) {
          try { activeSourceRef.current.stop(); } catch(e){}
          activeSourceRef.current = null;
      }
      window.speechSynthesis.cancel();
      setPlayingId(null);
  };

  const handleSpeak = async (text: string, id: string) => {
      if (playingId === id) {
          stopAudio();
          return;
      }
      stopAudio();

      if (audioLoadingId) return;
      setAudioLoadingId(id);

      try {
          if (text.length > 500) {
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = 'en-IN';
              utterance.onend = () => setPlayingId(null);
              utterance.onerror = () => setPlayingId(null);
              setPlayingId(id);
              window.speechSynthesis.speak(utterance);
          } else {
              const audio = await generateSpeech(text);
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
              const binaryString = atob(audio.data);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
              
              const dataInt16 = new Int16Array(bytes.buffer);
              const frameCount = dataInt16.length;
              const audioBuffer = ctx.createBuffer(1, frameCount, 24000);
              const channelData = audioBuffer.getChannelData(0);
              for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i] / 32768.0;

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => setPlayingId(null);
              
              activeSourceRef.current = source;
              setPlayingId(id);
              source.start();
          }
      } catch (e) {
          console.error("Speak error", e);
          setPlayingId(null);
      } finally {
          setAudioLoadingId(null);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              if (e.target?.result) {
                  setAttachment(e.target.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;
    
    const userMsg: ChatMessage = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: input, 
        timestamp: Date.now(),
        isImage: !!attachment,
        imageUrl: attachment || undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setIsTyping(true);
    setShowTools(false);

    try {
        if (user.plan === PlanType.FREE && user.dailyUsageMinutes >= 30) {
            throw new Error("LIMIT_REACHED");
        }

        // 1. Build History
        const history = messages.map(m => {
            const parts: any[] = [];
            if (m.text) parts.push({ text: m.text });
            
            if (m.isImage && m.imageUrl) {
                 try {
                    const base64Data = m.imageUrl.split(',')[1];
                    const mimeType = m.imageUrl.split(';')[0].split(':')[1];
                    if (base64Data && mimeType) {
                        parts.push({ inlineData: { mimeType, data: base64Data } });
                    }
                 } catch(e) {
                    parts.push({ text: "[Image]" });
                 }
            }
            return { role: m.role, parts };
        });

        // 2. Build Current Message
        const currentParts: any[] = [];
        if (userMsg.text) currentParts.push({ text: userMsg.text });
        if (userMsg.isImage && userMsg.imageUrl) {
            const base64Data = userMsg.imageUrl.split(',')[1];
            const mimeType = userMsg.imageUrl.split(';')[0].split(':')[1];
            currentParts.push({ inlineData: { mimeType, data: base64Data } });
        }
        
        if (currentParts.length === 1 && currentParts[0].inlineData) {
             currentParts.push({ text: "Analyze this image in detail." });
        }

        let responseText = "";
        
        if (input.toLowerCase().includes('image') && (input.toLowerCase().includes('generate') || input.toLowerCase().includes('create')) && !userMsg.isImage) {
             const prompt = await generateImageDescription(input);
             responseText = `[Image Generation Request] \n\nGenerating image for: "${prompt}"... \n\nPlease use the "Text to Image" tool in the menu for better results.`;
        } else {
             responseText = await getChatResponse(history, currentParts);
        }

        const botMsg: ChatMessage = { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: responseText, 
            timestamp: Date.now() 
        };
        setMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
        if (e.message === "LIMIT_REACHED") {
             setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "⚠️ Daily free limit reached (30 mins). Please upgrade to Premium to continue chatting.", timestamp: Date.now() }]);
        } else {
             console.error(e);
             setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I couldn't process that. Please check your internet connection.", timestamp: Date.now() }]);
        }
    } finally {
        setIsTyping(false);
    }
  };

  const handleClearChat = () => {
      setMessages([
        { id: Date.now().toString(), role: 'model', text: `Namaste ${user.name}! Chat history cleared.`, timestamp: Date.now() }
      ]);
      setShowClearModal(false);
      setShowMenu(false);
  };

  const handleExportChat = () => {
    if (messages.length <= 1) return; 
    const chatContent = messages.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.role}:\n${m.text}\n`).join('\n-------------------\n\n');
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bhashagpt-chat.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleCopy = (text: string, id: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
      });
  };

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden glass border border-slate-200 dark:border-slate-800 relative">
       {sessionMode && <ActiveSessionInterface mode={sessionMode} onClose={() => setSessionMode(null)} />}

       {/* Header */}
       <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">B</div>
             <div>
                <h3 className="font-bold text-sm">BhashaGPT 4.0</h3>
                <span className="flex items-center text-xs text-green-500"><span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Online</span>
             </div>
          </div>
          <div className="flex gap-2 relative">
              {/* New Voice and Video Chat Buttons */}
              <Button size="sm" variant="secondary" onClick={() => setSessionMode('voice')} className="hidden md:flex gap-1 items-center bg-indigo-100 text-indigo-700 hover:bg-indigo-200" title="Voice Chat">
                  <Headphones size={16}/> Voice
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSessionMode('video')} className="hidden md:flex gap-1 items-center bg-indigo-100 text-indigo-700 hover:bg-indigo-200" title="Video Chat">
                  <Video size={16}/> Video
              </Button>
              
              {user.plan === PlanType.FREE && <Badge color="gold">Free Mode</Badge>}
              <Button size="sm" variant="ghost" onClick={() => setShowMenu(!showMenu)}><MoreVertical size={18}/></Button>
              {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                    <div className="absolute right-0 top-10 z-20 w-48 bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-200 dark:border-slate-700 py-1 animate-fade-in overflow-hidden">
                        <button onClick={() => { setSessionMode('voice'); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 md:hidden"><Headphones size={14} /> Voice Chat</button>
                        <button onClick={() => { setSessionMode('video'); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 md:hidden"><Video size={14} /> Video Chat</button>
                        <button onClick={handleExportChat} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"><Download size={14} /> Export Chat</button>
                        <button onClick={() => { setShowClearModal(true); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 size={14} /> Clear Chat</button>
                    </div>
                  </>
              )}
          </div>
       </div>

       {/* Messages */}
       <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50 relative">
          {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] md:max-w-[75%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none dark:bg-indigo-600' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'}`}>
                      {msg.isImage && msg.imageUrl && (
                          <div className="mb-3 rounded-lg overflow-hidden border border-white/20 shadow-sm">
                              <img src={msg.imageUrl} alt="User Content" className="max-w-full h-auto object-cover max-h-60" />
                          </div>
                      )}
                      
                      {msg.text && msg.text.includes('data:audio') ? (
                         <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-lg">
                            <Button size="sm" onClick={() => { 
                                const base64 = msg.text.split('base64,')[1] || msg.text; 
                                playPCMAudio(base64); 
                            }}><Play size={14}/> Play Audio</Button>
                            <span className="text-xs opacity-50">Voice Msg</span>
                         </div>
                      ) : msg.text && msg.text.includes('googleapis.com') && msg.text.includes('video') ? (
                          <div className="rounded-lg overflow-hidden">
                             <video src={msg.text} controls className="w-full max-h-60 bg-black" />
                          </div>
                      ) : (
                          <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">{msg.text}</p>
                      )}
                      
                      <div className={`text-[10px] mt-2 opacity-70 ${msg.role === 'user' ? 'text-slate-300' : 'text-slate-400'} flex justify-end gap-2 items-center`}>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          
                          {msg.role === 'model' && msg.text && !msg.text.includes('data:audio') && (
                              <button 
                                onClick={() => handleSpeak(msg.text, msg.id)} 
                                className={`p-1 transition-colors rounded-md ${playingId === msg.id ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                title={playingId === msg.id ? "Stop Speaking" : "Read Aloud"}
                              >
                                  {audioLoadingId === msg.id ? (
                                      <Loader2 size={12} className="animate-spin"/> 
                                  ) : playingId === msg.id ? (
                                      <Square size={12} fill="currentColor" />
                                  ) : (
                                      <Volume2 size={12} />
                                  )}
                              </button>
                          )}

                          <button onClick={() => handleCopy(msg.text, msg.id)} className="hover:text-indigo-500 p-1">{copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}</button>
                      </div>
                  </div>
              </div>
          ))}
          {isTyping && (
              <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm flex gap-2">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />

          {showTools && (
             <div className="absolute bottom-2 left-4 right-4 z-20 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 p-4 animate-slide-up h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm flex items-center gap-2"><Sparkles size={16} className="text-indigo-500"/> Select AI Tool</h3>
                    <button onClick={() => { setShowTools(false); setInitialTool(null); }} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <ToolsGrid 
                        compact={true} 
                        initialToolLabel={initialTool}
                        onSendToChat={(content, type) => {
                            if (type === 'image') {
                                setAttachment(content);
                                setShowTools(false);
                                setInitialTool(null);
                            } else if (type === 'video') {
                                setInput(prev => prev + (prev ? "\n" : "") + content); 
                                setShowTools(false);
                                setInitialTool(null);
                            } else if (type === 'audio') {
                                setInput(prev => prev + (prev ? "\n" : "") + content);
                                setShowTools(false);
                                setInitialTool(null);
                            } else {
                                setInput(prev => prev + (prev ? "\n\n" : "") + content);
                                setShowTools(false);
                                setInitialTool(null);
                            }
                        }} 
                    />
                </div>
             </div>
          )}
       </div>

       {/* Input Area */}
       <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 transition-all">
          {attachment && (
              <div className="px-4 pt-3 pb-1 animate-slide-up">
                  <div className="relative inline-block">
                      <img src={attachment} alt="Attachment" className="h-20 w-20 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" />
                      <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-red-500 transition-colors"><X size={12} /></button>
                  </div>
              </div>
          )}
          <div className="p-4">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-inner">
                  <button onClick={() => setShowTools(!showTools)} className={`p-2 transition-colors ${showTools ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg' : 'text-slate-500 hover:text-indigo-600'}`} title="AI Tools"><LayoutGrid size={20}/></button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors" title="Upload Image"><Paperclip size={20}/></button>
                  <button 
                    onClick={() => { setShowTools(true); setInitialTool("Text to Image"); }}
                    className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Generate Image"
                  >
                      <ImageIcon size={20}/>
                  </button>

                  <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isListening ? "Listening... Speak now" : (attachment ? "Add a caption..." : "Type a message...")}
                    className={`flex-1 bg-transparent border-none focus:outline-none px-2 text-sm transition-colors ${isListening ? 'text-indigo-600 font-semibold placeholder:text-indigo-400' : ''}`}
                  />
                  <button onClick={handleVoiceInput} className={`p-2 transition-all duration-300 rounded-full mr-1 ${isListening ? 'bg-red-50 text-red-600 scale-110 shadow-sm ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-900 animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`} title="Voice Input"><Mic size={20}/></button>
                  <button onClick={handleSend} disabled={(!input.trim() && !attachment) || isTyping} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"><Send size={18} /></button>
              </div>
              <p className="text-center text-[10px] text-slate-400 mt-2">Daily Limit: {user.dailyUsageMinutes}/30 mins (Free Plan)</p>
          </div>
       </div>

       <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear Chat History?">
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                    <AlertTriangle size={24} />
                </div>
                <div>
                     <p className="text-slate-600 dark:text-slate-300">Are you sure you want to delete all messages?</p>
                     <p className="text-xs text-slate-500 mt-1">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3 w-full pt-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setShowClearModal(false)}>Cancel</Button>
                    <Button variant="danger" className="flex-1" onClick={handleClearChat}>Delete All</Button>
                </div>
            </div>
       </Modal>
    </div>
  );
};

// --- DASHBOARD HOME ---
const DashboardHome: React.FC<{ user: User, onNavigate: (tab: string) => void }> = ({ user, onNavigate }) => {
    return (
        <div className="space-y-8 animate-slide-up">
            {/* Welcome Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Namaste, {user.name.split(' ')[0]} 🙏</h1>
                    <p className="text-slate-500 dark:text-slate-400">Here is your daily activity overview.</p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <Card className="py-2 px-4 flex items-center gap-2 !bg-orange-50 dark:!bg-orange-900/10 border-orange-200 dark:border-orange-800">
                         <Flame size={20} className="text-orange-500" />
                         <div>
                             <p className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase">Streak</p>
                             <p className="font-bold text-orange-700 dark:text-orange-300">{user.streak} Days</p>
                         </div>
                    </Card>
                    <Card className="py-2 px-4 flex items-center gap-2 !bg-indigo-50 dark:!bg-indigo-900/10 border-indigo-200 dark:border-indigo-800">
                         <Trophy size={20} className="text-indigo-500" />
                         <div>
                             <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase">Level</p>
                             <p className="font-bold text-indigo-700 dark:text-indigo-300">Scholar</p>
                         </div>
                    </Card>
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 shadow-lg shadow-indigo-500/20">
                     <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={120} /></div>
                     <div className="relative z-10">
                         <Badge color="gold" >Premium Feature</Badge>
                         <h3 className="text-2xl font-bold mt-2 mb-1">Unlock Unlimited Power</h3>
                         <p className="text-indigo-100 mb-6 max-w-md">Get access to Voice AI, Emotional Intelligence, and remove all daily limits for just ₹99/mo.</p>
                         <Button onClick={() => onNavigate('subscription')} variant="secondary" className="bg-white text-indigo-600 hover:bg-indigo-50">Upgrade Now</Button>
                     </div>
                 </div>
                 <Card className="flex flex-col justify-between">
                     <div>
                         <h3 className="font-bold text-lg mb-2">Daily Usage</h3>
                         <p className="text-sm text-slate-500 mb-4">You have used {user.dailyUsageMinutes} of 30 minutes today.</p>
                         <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-1">
                             <div className="bg-indigo-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${(user.dailyUsageMinutes/30)*100}%` }}></div>
                         </div>
                         <p className="text-xs text-right text-slate-400">Resets in 12 hrs</p>
                     </div>
                     <Button variant="outline" size="sm" onClick={() => onNavigate('chat')}>Continue Chatting</Button>
                 </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="ghost" onClick={() => onNavigate('chat')} className="h-auto py-4 flex-col gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md">
                        <MessageSquare size={24} className="text-indigo-500" />
                        <span>New Chat</span>
                    </Button>
                    <Button variant="ghost" onClick={() => onNavigate('tools')} className="h-auto py-4 flex-col gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md">
                        <Video size={24} className="text-red-500" />
                        <span>Veo Video</span>
                    </Button>
                    <Button variant="ghost" onClick={() => onNavigate('tools')} className="h-auto py-4 flex-col gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md">
                        <ImageIcon size={24} className="text-green-500" />
                        <span>Generate Image</span>
                    </Button>
                    <Button variant="ghost" onClick={() => onNavigate('tools')} className="h-auto py-4 flex-col gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md">
                        <Zap size={24} className="text-purple-500" />
                        <span>Reasoning</span>
                    </Button>
                </div>
            </div>

            {/* Referral Banner */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-900/30">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600">
                            <Share2 size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-green-800 dark:text-green-300">Invite Friends & Earn</h4>
                            <p className="text-sm text-green-600 dark:text-green-400">Get 1 week Premium free for every referral.</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <input readOnly value="bhashagpt.com/@rahul" className="flex-1 md:w-48 px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-green-200 dark:border-green-800 text-slate-600" />
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-none">Copy</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- FOUNDER PAGE ---
const FounderPage: React.FC = () => (
    <div className="max-w-4xl mx-auto animate-fade-in">
        <Card className="overflow-hidden border-0 shadow-xl">
            <div className="h-48 bg-gradient-to-r from-slate-900 to-slate-800"></div>
            <div className="px-8 pb-8 relative">
                <div className="absolute -top-16 left-8 border-4 border-white dark:border-slate-900 rounded-full overflow-hidden w-32 h-32 shadow-lg bg-white">
                    <img src="https://picsum.photos/id/1005/400/400" alt="RJ" className="w-full h-full object-cover" />
                </div>
                <div className="pt-20">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">RJ <Badge color="blue">Founder</Badge></h1>
                            <p className="text-slate-500">Developer & Visionary</p>
                        </div>
                        <Button>Message Founder</Button>
                    </div>
                    
                    <div className="mt-8 prose dark:prose-invert max-w-none">
                        <h3 className="font-bold text-xl mb-2">Our Mission</h3>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                            "Namaste! I built BhashaGPT with a simple dream: to make Artificial Intelligence accessible, understandable, and useful for every Indian. 
                            Technology should not have a language barrier. Whether you are a student in Bihar, a developer in Bangalore, or a business owner in Gujarat, 
                            BhashaGPT is designed to be your personal companion."
                        </p>
                        <p className="font-medium text-indigo-600">"Made with ❤️ in India, for India."</p>
                    </div>

                    <div className="mt-8 flex gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                         <a href="#" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
                             <Globe size={20} /> Website
                         </a>
                         <a href="#" className="flex items-center gap-2 text-slate-600 hover:text-pink-600 transition-colors">
                             <Camera size={20} /> Instagram
                         </a>
                         <a href="#" className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors">
                             <Video size={20} /> YouTube
                         </a>
                    </div>
                </div>
            </div>
        </Card>
    </div>
);

// --- SUBSCRIPTION PAGE ---
const SubscriptionPage: React.FC<{user: User}> = ({user}) => (
    <div className="max-w-3xl mx-auto animate-slide-up text-center">
        <h2 className="text-3xl font-bold mb-4">Upgrade to BhashaGPT Premium</h2>
        <p className="text-slate-500 mb-8">Unlock the full potential of AI for the price of a chai.</p>

        <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur-xl opacity-20"></div>
             <Card className="relative border-2 border-indigo-500 dark:border-indigo-400 overflow-hidden">
                 <div className="bg-indigo-600 text-white text-sm font-bold py-2">LIMITED TIME OFFER</div>
                 <div className="p-8">
                     <div className="flex justify-center items-baseline mb-8">
                         <span className="text-5xl font-extrabold">₹99</span>
                         <span className="text-xl text-slate-500 ml-2">/month</span>
                     </div>
                     
                     <div className="grid md:grid-cols-2 gap-4 text-left mb-8">
                         {[
                             "Unlimited AI Chatting",
                             "Voice Chat Access",
                             "Emotional AI Model",
                             "25+ Premium Tools",
                             "Priority Support",
                             "Early Access Features"
                         ].map((feat, i) => (
                             <div key={i} className="flex items-center gap-3">
                                 <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                     <CheckCircle size={14} />
                                 </div>
                                 <span className="font-medium">{feat}</span>
                             </div>
                         ))}
                     </div>

                     <Button size="lg" className="w-full py-4 text-lg shadow-xl shadow-indigo-500/30 mb-4">Pay ₹99 via UPI / Card</Button>
                     <p className="text-xs text-slate-400">Secure payment via Razorpay. Cancel anytime.</p>
                 </div>
             </Card>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
export const UserDashboard: React.FC<DashboardProps> = ({ user, activeTab, setUser }) => {
    const renderTab = () => {
        switch(activeTab) {
            case 'chat': return <ChatInterface user={user} />;
            case 'tools': return <ToolsGrid />;
            case 'founder': return <FounderPage />;
            case 'subscription': return <SubscriptionPage user={user} />;
            case 'profile': return (
                <div className="max-w-xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
                    <Card className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
                            <div>
                                <h3 className="font-bold text-lg">{user.name}</h3>
                                <p className="text-slate-500">{user.email}</p>
                            </div>
                        </div>
                        <hr className="border-slate-100 dark:border-slate-800" />
                        <div className="flex justify-between items-center">
                             <div>
                                 <p className="font-medium">Current Plan</p>
                                 <p className="text-sm text-slate-500">{user.plan} Plan</p>
                             </div>
                             <Button variant="outline" size="sm">Manage</Button>
                        </div>
                        <div className="flex justify-between items-center">
                             <div>
                                 <p className="font-medium">Language Preference</p>
                                 <p className="text-sm text-slate-500">Auto-Detect (Supports 22 Indian Languages)</p>
                             </div>
                             <Button variant="ghost" size="sm">Change</Button>
                        </div>
                        <hr className="border-slate-100 dark:border-slate-800" />
                        <Button variant="danger" className="w-full">Delete Account</Button>
                    </Card>
                </div>
            );
            default: return <DashboardHome user={user} onNavigate={(t) => { /* Navigation handled by parent usually */ }} />;
        }
    };

    return (
        <div className="h-full animate-fade-in">
            {renderTab()}
        </div>
    );
};