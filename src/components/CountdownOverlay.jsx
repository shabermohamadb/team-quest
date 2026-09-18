import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Synchronized Start Countdown Overlay
 * Flow: GET READY → 3 → 2 → 1 → GO!
 * Supports smooth scale-in, brief hold, and smooth fade-out with dark professional styling.
 */
export default function CountdownOverlay({ secondsRemaining = 3 }) {
  const [currentDisplay, setCurrentDisplay] = useState('3');
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (secondsRemaining > 0) {
      setCurrentDisplay(String(secondsRemaining));
    } else if (secondsRemaining === 0) {
      setCurrentDisplay('GO!');
    } else {
      setCurrentDisplay('');
    }
    setAnimKey((prev) => prev + 1);
  }, [secondsRemaining]);

  const isGo = currentDisplay === 'GO!';

  return (
    <div className="fixed inset-0 z-50 bg-[#070A12]/96 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 select-none">
      {/* Background radial accent */}
      <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Phase Header */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold uppercase tracking-widest mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MATCH STARTING · GET READY</span>
        </div>

        {/* Animated Number / GO */}
        <div
          key={animKey}
          className={`font-mono font-black tracking-tight my-4 transition-all duration-300 transform ${
            isGo
              ? 'text-8xl md:text-9xl text-amber-300 drop-shadow-[0_0_35px_rgba(245,158,11,0.5)] scale-110 animate-bounce'
              : 'text-7xl md:text-9xl text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-scale-in'
          }`}
        >
          {currentDisplay}
        </div>

        {/* Subtitle */}
        <p className="text-slate-400 font-mono text-xs md:text-sm mt-6 max-w-xs leading-relaxed">
          {isGo
            ? 'ROUND 1: CLUE HUNT IS COMMENCING!'
            : 'Synchronizing tournament timer across all teams...'}
        </p>
      </div>
    </div>
  );
}
