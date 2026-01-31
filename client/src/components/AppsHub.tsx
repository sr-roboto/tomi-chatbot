import React from 'react';
import { ExternalLink, Calculator, FlaskConical, Code, Music, Gamepad2, Globe } from 'lucide-react';

const AppsHub = () => {
    const apps = [
        { name: "Geogebra", category: "Matemática", icon: Calculator, desc: "Graficadora, geometría y álgebra dinámica 3D.", url: "https://www.geogebra.org/" },
        { name: "PhET", category: "Ciencias", icon: FlaskConical, desc: "Simulaciones interactivas para física, química y más.", url: "https://phet.colorado.edu/" },
        { name: "Scratch", category: "Programación", icon: Code, desc: "Creá historias, juegos y animaciones.", url: "https://scratch.mit.edu/" },
        { name: "OctoStudio", category: "Creatividad", icon: Gamepad2, desc: "Programación creativa en móviles y tablets.", url: "https://octostudio.org/" },
        { name: "Chrome Music Lab", category: "Música", icon: Music, desc: "Experimentá con la música y el sonido.", url: "https://musiclab.chromeexperiments.com/" },
        { name: "Google Earth", category: "Geografía", icon: Globe, desc: "Explorá el mundo con imágenes satelitales 3D.", url: "https://earth.google.com/" },
        { name: "Cuánto Sabés de...", category: "Trivia / Juegos", icon: Gamepad2, desc: "Desafíos de conocimiento para todas las edades.", url: "https://es.wikipedia.org/wiki/Trivia" }, // Placeholder URL until provided
    ];

    return (
        <div className="space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">Aplicaciones Recomendadas</h1>
                <p className="text-neutral-400 max-w-2xl mx-auto">
                    Selección curada de herramientas gratuitas optimizadas para pantallas táctiles.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map((app, i) => (
                    <a
                        key={i}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-panel p-6 rounded-2xl group hover:bg-white/5 transition-all hover:-translate-y-1 block"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                <app.icon size={24} />
                            </div>
                            <ExternalLink className="text-neutral-600 group-hover:text-white transition-colors" size={20} />
                        </div>

                        <div className="mb-2">
                            <span className="text-xs font-medium text-purple-400 px-2 py-1 rounded-full bg-purple-400/10 border border-purple-400/20">
                                {app.category}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold mb-2">{app.name}</h3>
                        <p className="text-neutral-400 text-sm">{app.desc}</p>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default AppsHub;
