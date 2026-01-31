import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Landing from './components/Landing';
import Tutorials from './components/Tutorials';
import AppsHub from './components/AppsHub';
import Community from './components/Community';
import AIChat from './components/AIChat';

// Placeholder components to prevent build errors until they are fully implemented
const Placeholder = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            {title}
        </h1>
        <p className="text-neutral-400 text-lg max-w-md">
            Estamos construyendo esta sección para ofrecerte la mejor experiencia.
        </p>
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Landing />} />
                    <Route path="tutorials" element={<Tutorials />} />
                    <Route path="apps" element={<AppsHub />} />
                    <Route path="community" element={<Community />} />
                    <Route path="ai-chat" element={<AIChat />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
