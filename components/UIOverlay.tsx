
import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { generateGoombaWisdom } from '../services/geminiService';
import { audio } from './RetroAudio';

interface UIProps {
  gameState: GameState;
  score: number;
  deathReason: string;
  onStart: () => void;
  onRestart: () => void;
  lives: number;
}

const UIOverlay: React.FC<UIProps> = ({ gameState, score, deathReason, onStart, onRestart, lives }) => {
  const [aiMessage, setAiMessage] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (gameState === GameState.GAME_OVER) {
      setLoadingAi(true);
      setAiMessage('');
      generateGoombaWisdom(score, deathReason).then(msg => {
        setAiMessage(msg);
        setLoadingAi(false);
      });
    }
  }, [gameState, score, deathReason]);

  const handleStart = () => {
    audio.init();
    onStart();
  };

  const handleRestart = () => {
    onRestart();
  };

  if (gameState === GameState.PLAYING || gameState === GameState.VICTORY) {
    return (
      <>
        <div className="absolute top-4 left-4 font-bold text-white text-xl drop-shadow-md z-10 select-none pointer-events-none flex gap-6">
            <span>SCORE: {score}</span>
            <span className="text-red-500">
                LIVES: {'❤️'.repeat(lives)}
            </span>
        </div>
        {gameState === GameState.VICTORY && (
            <div className="absolute top-20 w-full text-center pointer-events-none animate-pulse">
                <h1 className="text-4xl text-yellow-400 font-bold drop-shadow-lg">VICTORY!</h1>
                <p className="text-white mt-2">The Cycle is Broken...</p>
            </div>
        )}
      </>
    );
  }

  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-20 text-center p-4">
        <h1 className="text-4xl md:text-6xl text-yellow-400 mb-4 animate-pulse uppercase tracking-wider font-outline">
          Revenge of the Goomba
        </h1>
        <p className="mb-8 text-gray-300 text-sm md:text-base max-w-md leading-relaxed">
          Tired of being stomped? Now YOU are the Goomba. 
          <br/><br/>
          Jump on Mario's head. Collect Stars for invincibility and Wings for flight!
        </p>
        
        <div className="mb-8 p-4 bg-gray-800 rounded border border-gray-600">
           <p className="text-xs text-gray-400 mb-2">CONTROLS</p>
           <div className="flex gap-4 justify-center text-sm">
              <span>← / → Move</span>
              <span>SPACE Jump / Fly</span>
           </div>
        </div>

        <button 
          onClick={handleStart}
          className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold border-b-4 border-red-800 active:border-b-0 active:mt-1 transition-all"
        >
          START GAME
        </button>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-20 text-center p-6">
        <h2 className="text-5xl text-red-500 mb-2">GAME OVER</h2>
        <p className="text-xl mb-6">Final Score: {score}</p>

        {/* AI Section */}
        <div className="bg-gray-800 p-6 rounded-lg border-2 border-white max-w-lg mb-8 relative min-h-[100px] flex items-center justify-center">
            {loadingAi ? (
                <span className="animate-pulse text-yellow-500">Consulting Mushroom Ancestors...</span>
            ) : (
                <div className="flex flex-col items-center">
                    <p className="text-yellow-400 italic mb-2">"{aiMessage}"</p>
                    <span className="text-xs text-gray-500">- Ancestral Goomba Spirit</span>
                </div>
            )}
        </div>

        <button 
          onClick={handleRestart}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold border-b-4 border-green-800 active:border-b-0 active:mt-1 transition-all"
        >
          TRY AGAIN
        </button>
      </div>
    );
  }

  return null;
};

export default UIOverlay;
