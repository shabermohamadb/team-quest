import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * AURA 7F WEEKLY BASH — OFFICIAL VIDEO OPENING INTRO
 *
 * Features:
 * - Uses the official cleaned video asset: /aura_intro.mp4 (10.0s, 720p, faststart moov atom)
 * - Gemini logo cleanly removed with no visual artifacts or distortions
 * - Full-screen cinematic presentation maintaining 16:9 aspect ratio without stretching
 * - Zero native browser video controls
 * - Robust autoplay handling with unmuted attempt and instant fallback to muted autoplay
 * - Clean sound toggle (Mute / Unmute)
 * - Minimal "SKIP INTRO ➔" button
 * - Subtle bottom progress bar
 * - Seamless fade-out transition into Team Selection / Login page
 * - Resilient fallback: errors or stalls will never block the player from joining
 */
export default function CinematicIntro({ onComplete }) {
  const videoRef = useRef(null);
  const completedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Safe completion handler with smooth fade-out
  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFadingOut(true);

    setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 450);
  }, [onComplete]);

  // Autoplay handler with audio resilience
  const attemptAutoplay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Try unmuted playback first
    video.muted = false;
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsMuted(false);
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((_err) => {
          // Unmuted autoplay blocked by browser policy; fallback to muted autoplay
          video.muted = true;
          setIsMuted(true);
          video
            .play()
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
            })
            .catch((playErr) => {
              console.warn('[CinematicIntro] Autoplay blocked, waiting for user click:', playErr);
              setIsLoading(false);
            });
        });
    }
  }, []);

  // Toggle audio mute / unmute
  const toggleSound = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    // If video was paused by policy, resume playback on user interaction
    if (video.paused) {
      video.play().catch(() => {});
    }
  };

  // Video time tracking for subtle bottom progress bar
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration > 0) {
      const pct = (video.currentTime / video.duration) * 100;
      setProgress(Math.min(100, Math.max(0, pct)));
    }
  };

  // Keyboard navigation: Escape or Space to skip, M to toggle sound
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish]);

  // Initial video mount & fallback safety timer
  useEffect(() => {
    attemptAutoplay();

    // Safety timeout: Ensure intro NEVER stalls or blocks the user past 12s
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 12000);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, [attemptAutoplay, handleFinish]);

  return (
    <div
      onClick={() => {
        // Clicking video anywhere unpauses or unmutes if muted
        if (isMuted && videoRef.current) {
          videoRef.current.muted = false;
          setIsMuted(false);
        }
      }}
      className={`fixed inset-0 z-[100] bg-[#070A12] flex items-center justify-center select-none overflow-hidden transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Aura 7F Weekly Bash Intro Video"
    >
      {/* Ambient background glow to blend with 16:9 letterboxes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[120px]" />
      </div>

      {/* Loading Indicator (Shown only during initial buffering to eliminate black screen) */}
      {isLoading && !hasError && (
        <div className="absolute z-20 flex flex-col items-center gap-3 pointer-events-none">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
          <span className="text-amber-400/80 font-mono text-xs tracking-widest uppercase animate-pulse">
            LOADING EXPERIENCE...
          </span>
        </div>
      )}

      {/* Error / Fallback Card (Guarantees user is never blocked if video fails) */}
      {hasError ? (
        <div className="relative z-30 flex flex-col items-center text-center p-8 max-w-md">
          <span className="text-xs font-mono font-semibold tracking-[0.3em] text-zinc-400 uppercase mb-2">
            WELCOME TO
          </span>
          <h1 className="text-4xl md:text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-400 to-amber-600 mb-2">
            AURA 7F
          </h1>
          <h2 className="text-lg md:text-xl font-bold font-mono text-slate-200 tracking-[0.2em] mb-6">
            WEEKLY BASH
          </h2>
          <button
            type="button"
            onClick={handleFinish}
            className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono tracking-wider text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            ENTER TOURNAMENT ➔
          </button>
        </div>
      ) : (
        /* Video Player (Full Viewport, 16:9 Object Contain, No Controls) */
        <video
          ref={videoRef}
          src="/aura_intro.mp4"
          playsInline
          autoPlay
          preload="auto"
          onCanPlay={() => setIsLoading(false)}
          onPlaying={() => {
            setIsLoading(false);
            setIsPlaying(true);
          }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleFinish}
          onError={(e) => {
            console.error('[CinematicIntro] Video load error:', e);
            setHasError(true);
            setTimeout(handleFinish, 1800);
          }}
          className="relative z-10 w-full h-full object-contain max-h-screen max-w-screen"
        />
      )}

      {/* Top Left: Sound Control (Mute / Unmute button) */}
      <div className="absolute top-6 left-6 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSound}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono tracking-wider backdrop-blur-md transition-all ${
            isMuted
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 animate-pulse'
              : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white hover:bg-black/60'
          }`}
          title={isMuted ? 'Click to enable audio' : 'Mute audio'}
        >
          {isMuted ? (
            <>
              <span className="text-amber-400">🔇</span>
              <span>UNMUTE SOUND</span>
            </>
          ) : (
            <>
              <span className="text-emerald-400">🔊</span>
              <span>SOUND ON</span>
            </>
          )}
        </button>
      </div>

      {/* Top Right: Skip Intro Button */}
      <div className="absolute top-6 right-6 z-30">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          className="px-4 py-1.5 rounded-full border border-white/15 bg-black/40 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-mono tracking-wider backdrop-blur-md transition-all shadow-lg hover:border-amber-400/40"
        >
          SKIP INTRO ➔
        </button>
      </div>

      {/* Bottom Progress Bar: Subtle, non-intrusive playback indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200 transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
