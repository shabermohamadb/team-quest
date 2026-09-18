import React, { useState, useEffect, useRef } from 'react';
import { soundEffects } from '../utils/sound';

/**
 * AURA 7F WEEKLY BASH — FIRST LOAD MASTER CINEMATIC INTRO
 * Timeline:
 *   0.0s - 0.5s: Ambient dark void with subtle radial glow
 *   0.6s - 1.3s: Phase 1 — "WELCOME TO" elegant reveal
 *   1.4s - 2.7s: Phase 2 — "AURA 7F" massive dominant hero reveal
 *   2.8s - 3.8s: Phase 3 — "WEEKLY BASH" event subtitle reveal
 *   3.9s - 4.7s: Phase 4 — Impact transition & luminous sheen
 *   4.8s       : Smooth transition to Team Selection
 */
export default function CinematicIntro({ onComplete }) {
  // Phase 0: Init, 1: Welcome, 2: Aura 7F, 3: Weekly Bash, 4: Transition Out
  const [phase, setPhase] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const completedRef = useRef(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 450);
  };

  useEffect(() => {
    const timers = [];

    // Phase 1: WELCOME TO (0.6s)
    timers.push(setTimeout(() => {
      setPhase(1);
      soundEffects.playIntroSwell();
    }, 600));

    // Phase 2: AURA 7F (1.4s)
    timers.push(setTimeout(() => {
      setPhase(2);
      soundEffects.playHeroImpact();
    }, 1400));

    // Phase 3: WEEKLY BASH (2.8s)
    timers.push(setTimeout(() => {
      setPhase(3);
      soundEffects.playSubtitleReveal();
    }, 2800));

    // Phase 4: Impact transition (3.9s)
    timers.push(setTimeout(() => {
      setPhase(4);
      soundEffects.playTransitionWhoosh();
    }, 3900));

    // Completion & smooth handoff (4.8s)
    timers.push(setTimeout(() => {
      handleFinish();
    }, 4800));

    // Safety fallback: ensure intro NEVER blocks beyond 5.5s under any condition
    timers.push(setTimeout(() => {
      handleFinish();
    }, 5500));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      onClick={handleFinish}
      className={`fixed inset-0 z-[100] bg-[#070A12] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Aura 7F Weekly Bash Opening"
    >
      {/* Cinematic Ambient Background: Deep Obsidian with subtle radial amber core */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern for tournament stage feel */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #CBD5E1 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Ambient Center Glow */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] md:w-[680px] h-[340px] md:h-[680px] rounded-full bg-amber-500/10 blur-[90px] md:blur-[140px] transition-all duration-1000 ${
            phase >= 2 ? 'opacity-90 scale-110' : 'opacity-30 scale-90'
          }`}
        />

        {/* Subtle Horizontal Lens Ray on Phase 2+ */}
        {phase >= 2 && (
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent -translate-y-1/2 animate-pulse" />
        )}
      </div>

      {/* Skip Action (Top Right) */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[11px] font-mono tracking-wider transition-all"
        >
          SKIP INTRO ➔
        </button>
      </div>

      {/* Central Hero Composition */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl w-full">
        {/* PHASE 1: WELCOME TO */}
        <div
          className={`transition-all duration-700 ease-out mb-3 md:mb-5 ${
            phase >= 1
              ? 'opacity-100 translate-y-0 blur-none'
              : 'opacity-0 translate-y-4 blur-sm'
          }`}
        >
          <span className="inline-block text-xs sm:text-sm md:text-base font-mono font-semibold uppercase tracking-[0.35em] text-zinc-400">
            WELCOME TO
          </span>
        </div>

        {/* PHASE 2: AURA 7F (DOMINANT HERO) */}
        <div
          className={`transition-all duration-800 ease-out my-1 md:my-2 ${
            phase >= 2
              ? 'opacity-100 scale-100 blur-none'
              : 'opacity-0 scale-90 blur-md'
          }`}
        >
          <div className="relative inline-block">
            {/* Luminous behind hero text */}
            <div
              className={`absolute inset-0 bg-amber-500/20 blur-2xl rounded-full transition-opacity duration-700 ${
                phase >= 2 ? 'opacity-100' : 'opacity-0'
              }`}
            />

            <h1 className="relative text-5xl sm:text-7xl md:text-9xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-600 drop-shadow-[0_12px_36px_rgba(245,158,11,0.35)]">
              AURA 7F
            </h1>
          </div>
        </div>

        {/* PHASE 3: WEEKLY BASH (SUBTITLE) */}
        <div
          className={`transition-all duration-700 ease-out mt-3 md:mt-6 ${
            phase >= 3
              ? 'opacity-100 translate-y-0 blur-none'
              : 'opacity-0 translate-y-4 blur-sm'
          }`}
        >
          <div className="inline-flex items-center gap-3">
            <span className="h-[1px] w-6 sm:w-12 bg-gradient-to-r from-transparent to-amber-500/60" />
            <h2 className="text-base sm:text-2xl md:text-3xl font-extrabold font-mono uppercase tracking-[0.25em] text-slate-200">
              WEEKLY BASH
            </h2>
            <span className="h-[1px] w-6 sm:w-12 bg-gradient-to-l from-transparent to-amber-500/60" />
          </div>
        </div>

        {/* PHASE 4: IMPACT TRANSITION ACCENT */}
        <div
          className={`mt-8 md:mt-12 transition-all duration-500 ${
            phase >= 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-[11px] font-mono text-amber-400/80 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>LIVE TOURNAMENT ARENA</span>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200 transition-all duration-[4800ms] ease-linear"
          style={{ width: phase >= 1 ? '100%' : '0%' }}
        />
      </div>
    </div>
  );
}
