import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Monitor, Users, BookOpen, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div className="space-y-24">
            {/* Hero Section */}
            <section className="relative min-h-[80vh] flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 border border-green-200 text-green-700 text-sm font-bold shadow-sm">
                            <Monitor size={16} />
                            <span>Innovación en el Aula</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-sans font-bold leading-tight text-slate-900">
                            Bienvenido a <br />
                            <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                                Tomi Digital
                            </span>
                        </h1>

                        <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
                            Diseñado específicamente para docentes. Descubrí tutoriales, aplicaciones y un asistente inteligente que te ayuda a sacar el máximo provecho de la tecnología en tu clase.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to="/tutorials" className="glass-button px-8 py-4 rounded-full font-bold flex items-center gap-2 group text-slate-700 border-slate-200 hover:border-green-300 hover:text-green-700">
                                Ver Tutoriales
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/ai-chat" className="px-8 py-4 rounded-full font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2">
                                <Sparkles size={18} className="text-green-400" />
                                Asistente IA
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative flex justify-center lg:justify-end"
                    >
                        <div className="relative z-10 w-[80%] lg:w-full max-w-[500px] aspect-square">
                            {/* Robot Avatar Image */}
                            <motion.img
                                src="/robot-avatar.png"
                                alt="Asistente Robot"
                                className="w-full h-full object-contain drop-shadow-2xl"
                                animate={{ y: [0, -15, 0] }}
                                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                            />
                        </div>

                        {/* Floating Elements */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
                            className="absolute top-10 right-0 lg:-right-10 glass-panel p-5 rounded-2xl flex items-center gap-4 z-20 shadow-lg bg-white/80"
                        >
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                                <BrainCircuit size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Asistente</p>
                                <p className="font-bold text-slate-900">Disponible 24/7</p>
                            </div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 20, 0] }}
                            transition={{ repeat: Infinity, duration: 5, delay: 0.5, ease: "easeInOut" }}
                            className="absolute bottom-10 left-0 lg:-left-10 glass-panel p-5 rounded-2xl flex items-center gap-4 z-20 shadow-lg bg-white/80"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Comunidad</p>
                                <p className="font-bold text-slate-900">Docentes Conectados</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { icon: BookOpen, title: "Tutoriales Paso a Paso", desc: "Aprendé a usar todas las funciones de tu pantalla, desde el encendido hasta herramientas avanzadas.", link: "/tutorials", color: "text-pink-500", bg: "bg-pink-50" },
                    { icon: Sparkles, title: "Apps Educativas", desc: "Descubrí y lanzá aplicaciones optimizadas para pantallas táctiles: Geogebra, Kahoot y más.", link: "/apps", color: "text-indigo-500", bg: "bg-indigo-50" },
                    { icon: Users, title: "Comunidad Docente", desc: "Compartí tus experiencias, hacé preguntas y conectá con colegas que innovan como vos.", link: "/community", color: "text-blue-500", bg: "bg-blue-50" },
                ].map((item, i) => (
                    <Link key={i} to={item.link} className="glass-panel p-8 rounded-3xl hover:bg-white transition-all duration-300 hover:shadow-xl hover:shadow-slate-200 group border border-slate-100">
                        <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                            <item.icon size={28} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-slate-900 group-hover:text-green-600 transition-colors">{item.title}</h3>
                        <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                    </Link>
                ))}
            </section>
        </div>
    );
};

export default Landing;
