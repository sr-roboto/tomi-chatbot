import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Mic, Volume2, VolumeX, StopCircle, History, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ... (existing imports/interfaces)

// ... (existing imports/interfaces)

// Scroll down to render logic

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

// Speech Recognition Types
interface SpeechRecognitionEvent {
    results: {
        [index: number]: {
            [index: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
    interface Window {
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

type RobotState = 'idle' | 'listening' | 'thinking' | 'speaking';

const ThinkingRobot = ({ state }: { state: RobotState }) => {
    // Talking animation state (cycles 0, 1, 2)
    const [talkingFrame, setTalkingFrame] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (state === 'speaking') {
            interval = setInterval(() => {
                setTalkingFrame(prev => (prev + 1) % 2);
            }, 200);
        } else {
            setTalkingFrame(0);
        }
        return () => clearInterval(interval);
    }, [state]);

    const getImage = () => {
        switch (state) {
            case 'listening': return "/2.png";
            case 'thinking': return "/6.png";
            case 'speaking':
                return talkingFrame === 0 ? "/3.png" : "/4.png";
            default: return "/1.png";
        }
    };

    return (
        <div className="relative w-full h-full">
            <img
                src={getImage()}
                alt="Tomi Avatar"
                className="w-full h-full object-contain drop-shadow-2xl relative z-10 transition-all duration-300"
            />
            {/* Subtle glow effect instead of spinner */}
            {state === 'thinking' && (
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse z-0 mix-blend-screen" />
            )}
        </div>
    );
};

// Helper: Clean markdown for speech
const cleanTextForSpeech = (text: string): string => {
    // Remove bold/italic markers
    let clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '');
    // Remove headers
    clean = clean.replace(/#{1,6}\s?/g, '');
    // Remove links [text](url) -> text
    clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    // Remove code blocks
    clean = clean.replace(/```[\s\S]*?```/g, 'código');
    // Replace list dashes with pauses
    clean = clean.replace(/^\s*-\s+/gm, ', ');

    return clean;
};

const AIChat = () => {
    // navigate removed as it is the main page now
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '¡Hola! Soy Tomi. ¿Qué te gustaría saber o hacer hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    // Removed messagesEndRef as we don't have scrolling chat anymore
    const abortControllerRef = useRef<AbortController | null>(null);

    const [subtitle, setSubtitle] = useState('');

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [manualVoice, setManualVoice] = useState<SpeechSynthesisVoice | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            setVoices(available);
        };

        loadVoices();

        // Chrome loads voices asynchronously
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speakText = (text: string) => {
        if (isMuted) return;

        stopSpeaking(); // Cancel current

        try {
            setIsSpeaking(true);
            const cleanText = cleanTextForSpeech(text);
            setSubtitle(cleanText);

            const utterance = new SpeechSynthesisUtterance(cleanText);

            // Voice Selection Logic: Prefer Manual -> Spanish Male -> Spanish Google -> Spanish
            // Common male voices names: "Pablo", "David", "Male", "hombre"
            let selectedVoice: SpeechSynthesisVoice | null | undefined = manualVoice;

            if (!selectedVoice) {
                selectedVoice = voices.find(v =>
                    v.lang.toLowerCase().startsWith('es') &&
                    (v.name.toLowerCase().includes('pablo') || v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('hombre'))
                );
            }

            // Fallback 1: Google Spanish (usually female/neutral but high quality)
            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('es') && v.name.toLowerCase().includes('google'));
            }

            // Fallback 2: Any Spanish
            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('es'));
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                // If it's a male voice or we want to make it sound deeper/more masculine if generic:
                // Slightly lower pitch can sound more masculine if it's a neutral voice
                if (!selectedVoice.name.toLowerCase().includes('female')) {
                    utterance.pitch = 0.9;
                    utterance.rate = 1.0;
                }
            } else {
                // Determine if we should warn? Maybe just default.
                console.warn("No Spanish voice found.");
            }

            utterance.onend = () => {
                setIsSpeaking(false);
                setSubtitle('');
            };

            utterance.onerror = (e) => {
                console.error("Browser TTS Error:", e);
                setIsSpeaking(false);
                setSubtitle('');
            };

            window.speechSynthesis.speak(utterance);

        } catch (error) {
            console.error("TTS Error:", error);
            setIsSpeaking(false);
        }
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setSubtitle('');
    };

    const scrollToBottom = () => {
        if (showHistory) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Voice Recognition Ref
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const handleVoiceInput = () => {
        // If already listening, stop it.
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;

            recognition.lang = 'es-ES';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                // Auto-submit for better voice experience
                setTimeout(() => {
                    triggerSubmit(transcript);
                }, 500);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                // Optional: Show a toast or small alert
                if (event.error === 'not-allowed') {
                    alert("Permiso de micrófono denegado.");
                }
            };

            recognition.onend = () => {
                setIsListening(false);
                recognitionRef.current = null;
            };

            try {
                recognition.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
                setIsListening(false);
            }
        } else {
            alert("Tu navegador no soporta reconocimiento de voz.");
        }
    };

    // Wrapper to trigger submit from outside form event
    const triggerSubmit = (text: string) => {
        const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
        handleSubmit(fakeEvent, text);
    };

    const handleSubmit = async (e: React.FormEvent, overrideInput?: string) => {
        e.preventDefault();
        const textToSend = overrideInput || input;
        if (!textToSend.trim() || isLoading) return;

        // Stop any current speech
        stopSpeaking();

        const userMessage = textToSend.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        // Add placeholder for assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            abortControllerRef.current = new AbortController();

            // Dynamic URL for mobile/external access
            const protocol = window.location.protocol; // http: or https:
            const hostname = window.location.hostname; // localhost or 192.168.x.x
            const apiUrl = `${protocol}//${hostname}:8000/api/chat/stream`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error('Error connecting to AI');
            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullResponse += chunk;

                // Update the last message (assistant) with the growing response
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg.role === 'assistant') {
                        lastMsg.content = fullResponse;
                    }
                    return newMessages;
                });
            }

            // Speak the final full response
            speakText(fullResponse);

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                setMessages(prev => {
                    // Remove the empty placeholder if we failed
                    const newMessages = [...prev];
                    if (newMessages[newMessages.length - 1].content === '') {
                        newMessages.pop();
                    }
                    return [...newMessages, { role: 'assistant', content: "Lo siento, tuve un problema al conectarme." }];
                });
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    // Get the latest assistant message to display in bubble
    const latestAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content || "Hola, soy Tomi.";

    // Choose what to display: subtitle (if speaking) or full text (static)
    // When speaking, strict mode: ONLY show subtitle (or empty if initializing). NEVER show full text during speech.
    const displayText = isSpeaking ? subtitle : cleanTextForSpeech(latestAssistantMessage);

    return (
        <div className="min-h-screen font-sans flex flex-col overflow-hidden relative bg-slate-900 text-white">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900 animate-gradient-xy"></div>
                <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen" />
                <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse-slow delay-1000 mix-blend-screen" />
            </div>

            {/* History Toggle Button (Top Right) */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white shadow-lg hover:bg-white/20 transition-all border border-white/10"
                    title={showHistory ? "Ocultar historial" : "Ver historial"}
                >
                    {showHistory ? <X size={24} /> : <History size={24} />}
                </button>
            </div>

            {/* Main Content: Avatar + Bubble */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">

                {/* History Overlay */}
                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute inset-0 z-40 bg-slate-900/90 backdrop-blur-xl p-6 overflow-y-auto flex flex-col gap-4"
                        >
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'assistant' ? 'bg-white/10 text-white' : 'bg-blue-600 text-white'}`}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Robot Avatar Container */}
                <div className="relative w-full max-w-[600px] aspect-4/5 flex items-center justify-center">

                    {/* Speech Display - Adaptive: Subtitle (Mobile) vs Bubble (Desktop) */}
                    <AnimatePresence mode="wait">
                        {(displayText || isLoading) && !showHistory && (
                            <motion.div
                                key={isSpeaking ? 'subtitle' : 'fulltext'}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute z-20 w-full left-0 bottom-0 md:top-[5%] md:bottom-auto md:w-[90%] md:left-1/2 md:-translate-x-1/2"
                            >
                                {/* Mobile Subtitle Style - REMOVED as per user request */}
                                {/* The text is now hidden on mobile and only accessible via History */}

                                {/* Desktop Bubble Style */}
                                <div className="hidden md:flex bg-white/10 backdrop-blur-xl text-white p-6 rounded-[2rem] shadow-2xl border border-white/20 relative min-h-[120px] items-center justify-center text-center ring-1 ring-white/10">
                                    {/* Tail */}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white/10 backdrop-blur-xl rotate-45 border-r border-b border-white/20"></div>

                                    <div className="text-xl md:text-2xl font-light tracking-wide leading-relaxed max-h-[250px] overflow-y-auto custom-scrollbar pt-2 break-words w-full whitespace-pre-wrap">
                                        {displayText}
                                        {/* Elegant loading indicator integrated into text flow */}
                                        {isLoading && !isSpeaking && (
                                            <span className="inline-flex gap-1 ml-2 align-baseline">
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-0"></span>
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-100"></span>
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Robot Image */}
                    <div className="w-[85%] h-[85%] relative mt-0 md:mt-24 transition-all duration-300">
                        <ThinkingRobot state={isSpeaking ? 'speaking' : isLoading ? 'thinking' : isListening ? 'listening' : 'idle'} />
                    </div>
                </div>

            </div>

            {/* Bottom Controls: Input & Mic */}
            <div className="relative z-20 p-4 pb-6 md:p-6 md:pb-8 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
                <div className="max-w-xl mx-auto space-y-6">

                    {/* Floating Action Buttons */}
                    <div className="flex justify-center gap-4 items-center">
                        <button
                            onClick={() => {
                                if (isSpeaking) {
                                    stopSpeaking();
                                } else {
                                    setIsMuted(!isMuted);
                                }
                            }}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-4 rounded-full shadow-lg border border-white/10 transition-all active:scale-95 group"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isSpeaking ? <StopCircle size={24} className="text-red-400 group-hover:text-red-300" /> : (isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />)}
                        </button>

                        {/* Voice Selector */}
                        {voices.length > 0 && (
                            <div className="relative group">
                                <select
                                    onChange={(e) => {
                                        const voice = voices.find(v => v.name === e.target.value);
                                        setManualVoice(voice || null);
                                    }}
                                    className="appearance-none bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-3 pl-4 pr-10 rounded-full shadow-lg border border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer text-sm font-light max-w-[200px] truncate"
                                    value={manualVoice?.name || ""}
                                >
                                    {voices.filter(v => v.lang.toLowerCase().startsWith('es')).map(v => (
                                        <option key={v.name} value={v.name} className="bg-slate-800 text-white">
                                            {v.name.replace("Microsoft", "").replace("Google", "").trim()}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Bar - Premium Glassmorphism */}
                    <form onSubmit={handleSubmit} className="flex gap-2 relative bg-white/5 backdrop-blur-xl p-2 rounded-[30px] shadow-2xl border border-white/10 items-center ring-1 ring-white/5 transition-all focus-within:ring-blue-500/50 focus-within:bg-white/10">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Haz tu consulta aquí..."
                            className="flex-1 bg-transparent border-none px-4 py-3 text-base md:px-6 md:py-4 md:text-lg text-white placeholder-slate-400 focus:ring-0 outline-none font-light min-w-0"
                        />

                        {/* Mic Button */}
                        <button
                            type="button"
                            onClick={handleVoiceInput}
                            className={`p-3 md:p-4 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500/80 hover:bg-red-600 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400'} text-white shadow-lg border border-white/10`}
                        >
                            <Mic size={24} />
                        </button>

                        {/* Send Button */}
                        {input.trim() && (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-3 md:p-4 rounded-full transition-all shadow-lg active:scale-95 border border-white/10"
                            >
                                <Send size={24} />
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
