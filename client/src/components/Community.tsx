import React from 'react';
import { MessageCircle, Users, Heart } from 'lucide-react';

const Community = () => {
    return (
        <div className="space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">Comunidad de Innovadores</h1>
                <p className="text-neutral-400 max-w-2xl mx-auto">
                    Conectate con otros docentes, compartí tus experiencias y resolvé dudas.
                </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl text-center max-w-2xl mx-auto space-y-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Users size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold">¡Próximamente!</h2>
                <p className="text-neutral-400">
                    Estamos construyendo un espacio exclusivo para que puedas interactuar con colegas de todo el mundo.
                </p>
                <button className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-neutral-200 transition-colors">
                    Unirme a la lista de espera
                </button>
            </div>

            {/* Mock Feed Items just for visual */}
            <div className="opacity-50 pointer-events-none blur-[2px] select-none grid gap-4 max-w-2xl mx-auto">
                <div className="glass-panel p-6 rounded-xl flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-700" />
                    <div className="space-y-2 flex-1">
                        <div className="h-4 bg-neutral-700 rounded w-1/3" />
                        <div className="h-4 bg-neutral-800 rounded w-full" />
                        <div className="h-4 bg-neutral-800 rounded w-2/3" />
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-xl flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-700" />
                    <div className="space-y-2 flex-1">
                        <div className="h-4 bg-neutral-700 rounded w-1/4" />
                        <div className="h-4 bg-neutral-800 rounded w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Community;
