import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Monitor, Users, BookOpen, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div className="space-y-24 pb-20">
            {/* Hero Section */}
            <section className="relative min-h-[80vh] flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8"
                    >

                        <h1 className="text-5xl md:text-7xl font-sans font-bold leading-tight text-white">
                            Potencia tu Aula con <br />
                            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                                Inteligencia Artificial
                            </span>
                        </h1>

                        <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
                            Tu asistente pedagógico inteligente. Diseñado para docentes que buscan integrar tecnología, descubrir recursos y optimizar sus clases.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/ai-chat" className="px-8 py-4 rounded-full font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all shadow-lg flex items-center gap-2">
                                <Sparkles size={18} className="text-white" />
                                Hablar con la IA
                            </Link>
                            <Link to="/tutorials" className="glass-button px-8 py-4 rounded-full font-bold flex items-center gap-2 group text-slate-300 border-slate-700 hover:text-teal-300 hover:border-teal-500/50">
                                Ver Tutoriales
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative flex justify-center lg:justify-end"
                    >
                        <div className="relative z-10 w-[80%] lg:w-full max-w-[500px] aspect-square animate-float">
                            {/* New Avatar Image */}
                            <motion.img
                                src="/tablet_1.png"
                                alt="Asistente Pedagógico"
                                className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(45,212,191,0.2)]"
                            />
                        </div>

                        {/* Floating Elements */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
                            className="absolute top-10 right-0 lg:-right-10 glass-panel p-5 rounded-2xl flex items-center gap-4 z-20 shadow-lg bg-slate-900/80 backdrop-blur-xl border-slate-700"
                        >
                            <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
                                <BrainCircuit size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Asistente</p>
                                <p className="font-bold text-slate-100">Disponible 24/7</p>
                            </div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 20, 0] }}
                            transition={{ repeat: Infinity, duration: 5, delay: 0.5, ease: "easeInOut" }}
                            className="absolute bottom-10 left-0 lg:-left-10 glass-panel p-5 rounded-2xl flex items-center gap-4 z-20 shadow-lg bg-slate-900/80 backdrop-blur-xl border-slate-700"
                        >
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Comunidad</p>
                                <p className="font-bold text-slate-100">Docentes Conectados</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { icon: BookOpen, title: "Tutoriales Paso a Paso", desc: "Aprendé a usar todas las funciones de tu pantalla, desde el encendido hasta herramientas avanzadas.", link: "/tutorials", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20" },
                    { icon: Sparkles, title: "Apps Educativas", desc: "Descubrí y lanzá aplicaciones optimizadas para pantallas táctiles: Geogebra, Kahoot y más.", link: "/apps", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                    { icon: Users, title: "Comunidad Docente", desc: "Compartí tus experiencias, hacé preguntas y conectá con colegas que innovan como vos.", link: "/community", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
                ].map((item, i) => (
                    <Link key={i} to={item.link} className={`glass-panel p-8 rounded-3xl hover:bg-slate-800 transition-all duration-300 hover:shadow-2xl group border ${item.border}`}>
                        <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                            <item.icon size={28} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-slate-100 group-hover:text-teal-400 transition-colors">{item.title}</h3>
                        <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                    </Link>
                ))}
            </section>
        </div>
    );
};

export default Landing;
