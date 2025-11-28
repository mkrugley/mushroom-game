
import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [deathReason, setDeathReason] = useState('Unknown');
  const [hasShield, setHasShield] = useState(false);

  const handleStart = () => {
    setScore(0);
    setLives(3);
    setHasShield(false);
    setGameState(GameState.PLAYING);
  };

  const handleRestart = () => {
    setGameState(GameState.MENU);
    setHasShield(false);
    setTimeout(() => {
        setScore(0);
        setLives(3);
        setGameState(GameState.PLAYING);
    }, 10);
  };

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      <GameCanvas 
        gameState={gameState} 
        setGameState={setGameState}
        setScore={setScore}
        score={score}
        setDeathReason={setDeathReason}
        lives={lives}
        setLives={setLives}
        setHasShield={setHasShield}
      />
      <UIOverlay 
        gameState={gameState} 
        score={score} 
        deathReason={deathReason}
        onStart={handleStart}
        onRestart={handleRestart}
        lives={lives}
        hasShield={hasShield}
      />
    </div>
  );
};

export default App;