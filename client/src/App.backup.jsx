import React, { useState } from 'react';
import WelcomeScreen from './screens/WelcomeScreen';
import GradeSelectionScreen from './screens/GradeSelectionScreen';
import SubjectSelectionScreen from './screens/SubjectSelectionScreen';
import LoadingScreen from './screens/LoadingScreen';
import ChatScreen from './screens/ChatScreen';

function App() {
  const [screen, setScreen] = useState('welcome');
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const handleStart = () => setScreen('grade');

  const handleGradeSelect = (grade) => {
    setSelectedGrade(grade);
    setScreen('subject');
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    setScreen('loading');
    setTimeout(() => {
      setScreen('chat');
    }, 2000);
  };

  const handleBackToSubject = () => {
    setScreen('subject');
  };

  return (
    <div className="w-full h-screen bg-black flex justify-center items-center overflow-hidden font-sans">
      {/* Contenedor simulando la pantalla vertical del Kiosco (9:16 aspect ratio aprox o full mobile) */}
      <div className="w-full max-w-md h-full max-h-[900px] bg-white relative shadow-2xl overflow-hidden flex flex-col">
        {screen === 'welcome' && <WelcomeScreen onStart={handleStart} />}
        {screen === 'grade' && <GradeSelectionScreen onSelect={handleGradeSelect} />}
        {screen === 'subject' && <SubjectSelectionScreen onSelect={handleSubjectSelect} />}
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'chat' && <ChatScreen subject={selectedSubject} onBack={handleBackToSubject} />}
      </div>
    </div>
  );
}

export default App;
