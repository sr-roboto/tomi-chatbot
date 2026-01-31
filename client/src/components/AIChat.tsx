import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Bot, User, Loader2, Mic, MessageSquare, X, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const ThinkingRobot = ({ isActive }: { isActive: boolean }) => {
    return (
        <img
            src={isActive ? "/robot-pose-2.png" : "/robot-pose-1.png"}
            alt="Tomi Avatar"
            className="w-full h-full object-contain drop-shadow-2xl relative z-10"
        />
    );
};

const AIChat = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '¡Hola! Soy Tomi. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showChatOverlay, setShowChatOverlay] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (showChatOverlay) {
            scrollToBottom();
        }
    }, [messages, showChatOverlay]);

    const handleVoiceInput = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setShowChatOverlay(true); // Open chat to show the result
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognition.onend = () => setIsListening(false);

            recognition.start();
        } else {
            alert("Tu navegador no soporta reconocimiento de voz.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) throw new Error('Error connecting to AI');

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, tuve un problema al conectarme." }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Use Portal to break out of any Layout constraints and ensure full screen
    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-blue-500 text-white flex flex-col overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-400 rounded-full blur-[100px] opacity-40" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-600 rounded-full blur-[100px] opacity-40" />
            </div>

            {/* Header */}
            <div className="relative z-10 px-6 py-4 flex items-center justify-between shrink-0">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Tomi Chatbot</h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            {/* Main Content (Robot) */}
            <div className={`relative z-10 flex-1 flex flex-col items-center min-h-0 transition-all duration-500 ${showChatOverlay ? 'justify-start pt-4 scale-90' : 'justify-center'}`}>
                <motion.div
                    animate={{
                        y: [0, -20, 0],
                        rotate: [0, 1, 0, -1, 0]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: "easeInOut"
                    }}
                    className="relative w-auto h-[40vh] max-h-96 aspect-square"
                >
                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-75 animate-pulse" />
                    <ThinkingRobot isActive={showChatOverlay || isListening} />
                </motion.div>

                {!showChatOverlay && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mt-6 space-y-2 p-4 shrink-0"
                    >
                        <h2 className="text-3xl font-bold">¡Hola! Soy Tomi</h2>
                        <p className="text-blue-100 text-lg">¿En qué puedo ayudarte hoy?</p>
                    </motion.div>
                )}
            </div>

            {/* Actions / Chat Overlay */}
            <div className="relative z-[10000] w-full shrink-0">
                {!showChatOverlay ? (
                    <div className="p-6 space-y-4 max-w-md mx-auto mb-4 md:mb-8 pb-8 md:pb-12">
                        <button
                            onClick={handleVoiceInput}
                            className={`w-full py-4 rounded-2xl backdrop-blur-md border border-white/30 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${isListening ? 'bg-red-500/80 animate-pulse' : 'bg-white/20 hover:bg-white/30'}`}
                        >
                            <Mic size={24} />
                            {isListening ? "Escuchando..." : "Presiona para hablar"}
                        </button>

                        <button
                            onClick={() => setShowChatOverlay(true)}
                            className="w-full py-4 rounded-2xl bg-white text-blue-600 font-bold text-lg flex items-center justify-center gap-3 hover:bg-blue-50 transition-all shadow-xl active:scale-95"
                        >
                            <MessageSquare size={24} />
                            Escríbeme aquí
                        </button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] h-[60vh] flex flex-col overflow-hidden"
                    >
                        {/* Drag Handle / Close */}
                        <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setShowChatOverlay(false)}>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full" />
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-4 rounded-2xl max-w-[85%] text-sm md:text-base ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-slate-400" />
                                        <span className="text-xs text-slate-500">Tomi está escribiendo...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-slate-100 bg-white pb-6 md:pb-4">
                            <form onSubmit={handleSubmit} className="flex gap-3">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-4 rounded-2xl transition-colors shadow-lg active:scale-95 flex items-center justify-center"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default AIChat;
