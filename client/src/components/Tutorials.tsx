import React from 'react';
import { Play, Clock } from 'lucide-react';

const Tutorials = () => {
    const videos = [
        { title: "Primeros Pasos con tu Pantalla", duration: "10:00", thumb: "bg-purple-900", url: "https://www.youtube.com/embed/ovA-QsjZuDM" },
        { title: "Uso de Geogebra en Clase", duration: "15:30", thumb: "bg-blue-900", url: null },
        { title: "Herramientas de Pizarra", duration: "08:45", thumb: "bg-green-900", url: null },
        { title: "Gamificación con Kahoot", duration: "12:20", thumb: "bg-pink-900", url: null },
        { title: "Tips para Docentes Innovadores", duration: "05:15", thumb: "bg-orange-900", url: null },
        { title: "Conectando dispositivos móviles", duration: "09:00", thumb: "bg-teal-900", url: null },
    ];

    return (
        <div className="space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">Tutoriales</h1>
                <p className="text-neutral-400 max-w-2xl mx-auto">
                    Dominá tu pantalla táctil con nuestros videos paso a paso diseñados para docentes.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Featured Video */}
                <div className="lg:col-span-2 glass-panel p-2 rounded-2xl overflow-hidden">
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/ovA-QsjZuDM"
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold mb-2">Primeros Pasos: Guía Completa</h2>
                        <p className="text-neutral-400">Todo lo que necesitás saber para encender y comenzar a usar tu pantalla táctil en el aula hoy mismo.</p>
                    </div>
                </div>

                {/* Video Grid */}
                {videos.slice(1).map((video, i) => (
                    <div key={i} className="glass-panel p-4 rounded-xl flex gap-4 hover:bg-white/5 transition-colors cursor-pointer group">
                        <div className={`w-32 aspect-video rounded-lg ${video.thumb} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                            <Play className="text-white opacity-80" size={24} />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-purple-400 transition-colors">{video.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                <Clock size={14} />
                                <span>{video.duration}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Tutorials;
