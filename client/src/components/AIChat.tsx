import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Volume2, VolumeX, StopCircle, History, X, Home, Sparkles, Brain, GraduationCap, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';

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

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

const PedagogicalAvatar = ({ state }: { state: AvatarState }) => {
    // Animation frame state
    const [frame, setFrame] = useState(8); // Start with 8 (Greeting)
    const [isGreeting, setIsGreeting] = useState(true);

    // Handle Greeting Timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsGreeting(false);
            // After greeting, ensure we go to frame 5 if idle
            if (state !== 'speaking') setFrame(5);
        }, 3000); // Extended greeting slightly
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        // Priority 1: Speaking (Always overrides greeting)
        if (state === 'speaking') {
            // Strict Loop: 3 -> 2
            let step = 0;
            const sequence = [3, 2];

            interval = setInterval(() => {
                setFrame(sequence[step % sequence.length]);
                step++;
            }, 240); // Slower speed (was 180)

        }
        // Priority 2: Greeting (Only if not speaking)
        else if (isGreeting) {
            setFrame(8);
        }
        // Priority 3: State-based animations
        else if (state === 'thinking') {
            setFrame(6);
        } else if (state === 'listening') {
            setFrame(5);
        } else {
            // Idle / Finished Speaking -> Frame 5 (Attentive)
            setFrame(5);
        }

        return () => clearInterval(interval);
    }, [state, isGreeting]);

    return (
        <div className="relative w-full h-full flex items-center justify-center animate-float">
            {/* Removed AnimatePresence/opacity fade to prevent flickering */}
            <img
                src={`/tablet_${frame}.png`}
                alt="AI Pedagogical Avatar"
                className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(45,212,191,0.3)] relative z-10 transition-none" // transition-none important for instant frame swap
            />

            {/* Ambient Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-teal-500/10 rounded-full blur-[100px] transition-opacity duration-500 ${state === 'thinking' ? 'opacity-100 animate-pulse' : 'opacity-40'}`} />
        </div>
    );
};

// Helper: Clean markdown for speech
const cleanTextForSpeech = (text: string): string => {
    let clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '');
    clean = clean.replace(/#{1,6}\s?/g, '');
    clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    clean = clean.replace(/```[\s\S]*?```/g, 'código');
    clean = clean.replace(/^\s*-\s+/gm, ', ');
    return clean;
};

const AIChat = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '¡Hola! Soy tu Asistente Pedagógico Virtual. Estoy aquí para potenciar tus clases. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [subtitle, setSubtitle] = useState('');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [manualVoice, setManualVoice] = useState<SpeechSynthesisVoice | null>(null);

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    // PWA Install Prompt Listener
    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    // Initial Greeting Speech
    useEffect(() => {
        // Wait a brief moment for voices to load or just start
        const timer = setTimeout(() => {
            const welcomeMsg = '¡Hola! Soy tu Asistente Pedagógico Virtual. Estoy aquí para potenciar tus clases. ¿En qué puedo ayudarte hoy?';
            speakText(welcomeMsg);
        }, 1000); // 1s delay to seem natural
        return () => clearTimeout(timer);
    }, [voices]); // Re-try if voices load later

    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            setVoices(available);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    const speakText = (text: string) => {
        if (isMuted) return;
        stopSpeaking();

        try {
            setIsSpeaking(true);
            const cleanText = cleanTextForSpeech(text);
            setSubtitle(cleanText);

            const utterance = new SpeechSynthesisUtterance(cleanText);

            // Smart Voice Selection via Google Priority
            let selectedVoice: SpeechSynthesisVoice | null | undefined = manualVoice;
            if (!selectedVoice) {
                // Priority: Google Spanish
                selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('es') && v.name.toLowerCase().includes('google'));
            }
            if (!selectedVoice) {
                // Fallback: Any Spanish
                selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('es'));
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.rate = 1.05; // Slightly faster for flow
                utterance.pitch = 1.0;
            }

            utterance.onend = () => {
                setIsSpeaking(false);
                setSubtitle('');
            };

            utterance.onerror = () => {
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

    useEffect(() => { scrollToBottom(); }, [messages]);

    // Voice Recognition
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const handleVoiceInput = () => {
        // Check for HTTPS/Localhost requirement for Web Speech API
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            alert("⚠️ El micrófono requiere conexión segura (HTTPS) para funcionar. \n\nEstás conectado por HTTP inseguro (" + window.location.hostname + "), por lo que el navegador bloquea el micrófono por seguridad. \n\nPruébalo en 'localhost' o configura SSL en el servidor.");
            return;
        }

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

            recognition.onstart = () => setIsListening(true);

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                setTimeout(() => triggerSubmit(transcript), 500);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    alert("Permiso de micrófono denegado. Verifica la configuración de tu navegador.");
                } else if (event.error === 'network') {
                    alert("Error de red al intentar usar el reconocimiento de voz.");
                }
            };

            recognition.onend = () => setIsListening(false);
            recognition.start();
        } else {
            alert("Tu navegador no soporta reconocimiento de voz.");
        }
    };

    const triggerSubmit = (text: string) => {
        const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
        handleSubmit(fakeEvent, text);
    };

    const handleSubmit = async (e: React.FormEvent, overrideInput?: string) => {
        e.preventDefault();
        const textToSend = overrideInput || input;
        if (!textToSend.trim() || isLoading) return;

        stopSpeaking();
        const userMessage = textToSend.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            abortControllerRef.current = new AbortController();

            // Use relative path for production (Nginx proxy)
            const apiUrl = `/api/chat/stream`;

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

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg.role === 'assistant') {
                        lastMsg.content = fullResponse;
                    }
                    return newMessages;
                });
            }

            speakText(fullResponse);

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[newMessages.length - 1].content === '') newMessages.pop();
                    return [...newMessages, { role: 'assistant', content: "Lo siento, tuve un problema al conectarme." }];
                });
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const latestAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content || "Hola, soy tu Asistente Pedagógico.";
    const displayText = isSpeaking ? subtitle : cleanTextForSpeech(latestAssistantMessage);

    const getAvatarState = (): AvatarState => {
        if (isSpeaking) return 'speaking';
        if (isLoading) return 'thinking';
        if (isListening) return 'listening';
        return 'idle';
    };

    return (
        <div className="min-h-screen font-sans flex flex-col overflow-hidden relative bg-slate-900 text-white selection:bg-teal-500/30">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#0f766e,transparent_50%)] opaciy-50"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,#0284c7,transparent_50%)] opacity-30"></div>
                {/* Micro-grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            </div>

            {/* Navbar Items */}
            <div className="absolute top-6 left-6 z-50">
                <button onClick={() => navigate('/')} className="glass-button p-3 rounded-xl flex items-center gap-2 font-display font-medium text-sm">
                    <Home size={18} />
                    <span className="hidden md:inline">Inicio</span>
                </button>
            </div>

            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                {/* PWA Install Button (Only visible if installable) */}
                {deferredPrompt && (
                    <button
                        onClick={handleInstallClick}
                        className="glass-button p-3 rounded-xl flex items-center gap-2 font-display font-medium text-sm bg-teal-500/10 text-teal-300 border-teal-500/30 animate-pulse hover:animate-none"
                    >
                        <Download size={20} />
                        <span className="hidden md:inline">Instalar App</span>
                    </button>
                )}

                <button onClick={() => setShowHistory(!showHistory)} className={`glass-button p-3 rounded-xl transition-all ${showHistory ? 'bg-teal-500/20 border-teal-500/50' : ''}`}>
                    {showHistory ? <X size={20} /> : <History size={20} />}
                </button>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">

                {/* History Overlay */}
                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            className="absolute inset-0 z-40 bg-slate-900/60 p-4 md:p-8 overflow-y-auto flex flex-col gap-6"
                        >
                            <h2 className="text-2xl font-display font-bold text-teal-100 mb-4 flex items-center gap-2">
                                <History className="text-teal-400" /> Historial de Conversación
                            </h2>
                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={idx}
                                    className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-2xl border ${msg.role === 'assistant' ? 'bg-slate-800/80 border-slate-700 text-slate-100 rounded-tl-sm' : 'bg-teal-600/20 border-teal-500/30 text-teal-50 rounded-tr-sm'}`}>
                                        <div className="flex items-center gap-2 mb-2 opacity-50 text-xs font-bold tracking-wider uppercase">
                                            {msg.role === 'assistant' ? <><Brain size={12} /> Asistente</> : 'Tú'}
                                        </div>
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Avatar & Bubble Container */}
                <div className="relative w-full max-w-[900px] h-[60vh] md:h-[70vh] flex flex-col md:flex-row items-center justify-center gap-8">

                    {/* Speech Bubble (Desktop: Left, Mobile: Top) */}
                    <AnimatePresence mode="wait">
                        {(displayText || isLoading) && !showHistory && (
                            <motion.div
                                key="bubble"
                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="order-2 md:order-1 w-full md:w-1/2 absolute md:relative bottom-0 md:bottom-auto z-30"
                            >
                                <div className="glass-panel p-6 md:p-8 rounded-[2rem] rounded-tr-sm shadow-2xl relative min-h-[140px] flex items-center justify-center text-center backdrop-blur-xl">
                                    <div className="text-lg md:text-xl font-light leading-relaxed text-slate-100/90 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {displayText}
                                        {isLoading && !isSpeaking && (
                                            <span className="inline-flex gap-1 ml-2">
                                                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></span>
                                                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce delay-100"></span>
                                                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce delay-200"></span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Avatar (Desktop: Right, Mobile: Center) */}
                    <motion.div
                        layout
                        className={`order-1 md:order-2 relative w-[280px] h-[280px] md:w-[450px] md:h-[450px] transition-all duration-500`}
                    >
                        <PedagogicalAvatar state={getAvatarState()} />
                    </motion.div>

                </div>

            </div>

            {/* Input Area */}
            <div className="relative z-20 p-4 pb-8 md:p-8 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent">
                <div className="max-w-3xl mx-auto space-y-4">

                    {/* Controls Row */}
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => isSpeaking ? stopSpeaking() : setIsMuted(!isMuted)}
                            className="glass-button p-3 rounded-full hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                            title={isMuted ? "Activar Sonido" : "Silenciar"}
                        >
                            {isSpeaking ? <StopCircle size={20} /> : (isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />)}
                        </button>

                        {voices.length > 0 && (
                            <div className="glass-button px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium cursor-pointer">
                                <span className="opacity-50">Voz:</span>
                                <select
                                    onChange={(e) => setManualVoice(voices.find(v => v.name === e.target.value) || null)}
                                    className="bg-transparent outline-none appearance-none cursor-pointer max-w-[150px] truncate"
                                    value={manualVoice?.name || ""}
                                >
                                    {voices.filter(v => v.lang.toLowerCase().startsWith('es')).map(v => (
                                        <option key={v.name} value={v.name} className="bg-slate-800 text-white">
                                            {v.name.replace("Microsoft", "").replace("Google", "").trim()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Input Bar */}
                    <motion.form
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        onSubmit={handleSubmit}
                        className="flex gap-3 relative glass-panel p-2 rounded-[2rem] items-center transition-all focus-within:ring-2 focus-within:ring-teal-500/30"
                    >
                        <button
                            type="button"
                            onClick={handleVoiceInput}
                            className={`flex-shrink-0 p-4 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white scale-110 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-slate-800 text-teal-400 hover:bg-slate-700'}`}
                        >
                            <Mic size={24} />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe tu consulta pedagógica aquí..."
                            className="flex-1 bg-transparent border-none px-2 text-lg text-slate-100 placeholder-slate-500 focus:ring-0 outline-none font-light min-w-0"
                        />

                        <AnimatePresence>
                            {input.trim() && (
                                <motion.button
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0, rotate: 45 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-shrink-0 bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-4 rounded-full shadow-lg hover:shadow-teal-500/25 transition-all active:scale-95"
                                >
                                    <Send size={24} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </motion.form>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
