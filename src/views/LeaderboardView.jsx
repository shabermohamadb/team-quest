import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Maximize2,
  Minimize2,
  Pause,
  Clock,
  Sparkles,
  Flame
} from 'lucide-react';
import socket from '../utils/socket';
import { TEAMS, GAME_STATES, ROUND_NAMES } from '../utils/constants';
import { MasterWinnerReveal } from '../components/MasterWinnerReveal';
import { useFullscreenStatus } from '../utils/fullscreen';

export default function LeaderboardView() {
  const [displayState, setDisplayState] = useState(null);
  const [liveTimer, setLiveTimer] = useState(null);
  const [animatedScores, setAnimatedScores] = useState({});
  const { isFullscreen, request: enterFullscreen, exit: exitFullscreen } = useFullscreenStatus();
  const [mouseActive, setMouseActive] = useState(true);
  const mouseTimeoutRef = useRef(null);

  // Reconnect and join display room
  useEffect(() => {
    const handleDisplayJoin = () => {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('display_join');
    };

    handleDisplayJoin();

    socket.on('connect', handleDisplayJoin);
    return () => {
      socket.off('connect', handleDisplayJoin);
    };
  }, []);

  // Listen to display updates and timer ticks
  useEffect(() => {
    const handleDisplayUpdate = (data) => {
      if (data) {
        setDisplayState(data);
        if (typeof data.timeRemaining === 'number') {
          setLiveTimer(Math.max(0, data.timeRemaining));
        }
      }
    };

    const handleTimerTick = (tick) => {
      if (typeof tick?.timeRemaining === 'number') {
        setLiveTimer(Math.max(0, tick.timeRemaining));
      }
    };

    socket.on('display_state_update', handleDisplayUpdate);
    socket.on('game_state_update', handleDisplayUpdate);
    socket.on('timer_tick', handleTimerTick);

    return () => {
      socket.off('display_state_update', handleDisplayUpdate);
      socket.off('game_state_update', handleDisplayUpdate);
      socket.off('timer_tick', handleTimerTick);
    };
  }, []);

  // Mouse inactivity hide for fullscreen controls
  useEffect(() => {
    const handleMouseMove = () => {
      setMouseActive(true);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
      mouseTimeoutRef.current = setTimeout(() => {
        setMouseActive(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
    };
  }, []);

  // Ensure body and html overflow is strictly hidden in leaderboard view
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const teamCount = Number(displayState?.teamCount) || 4;
  const rawScores = displayState?.scores || {};
  const roundScores = displayState?.roundScores || {};
  const currentGameState = displayState?.state || GAME_STATES.LOBBY;
  const isPaused = Boolean(displayState?.isPaused || currentGameState === GAME_STATES.PAUSED);
  const currentRound = displayState?.currentRoundNumber || 1;
  const questionIndex = displayState?.currentQuestionIndex ?? 0;
  const questionNumber = displayState?.questionNumber ?? (questionIndex + 1);
  const totalQuestions = displayState?.totalQuestions ?? 10;
  const resumeCountdownRemaining = displayState?.resumeCountdownRemaining ?? 0;
  const startCountdownRemaining = displayState?.startCountdownRemaining ?? 0;

  // Real-time Smooth Count-Up Animation
  const prevScoresRef = useRef({});
  useEffect(() => {
    const startValues = { ...prevScoresRef.current };
    const targetValues = {};
    for (let t = 1; t <= teamCount; t++) {
      targetValues[t] = Number(rawScores[t] ?? rawScores[String(t)] ?? 0);
      if (startValues[t] === undefined) startValues[t] = targetValues[t];
    }

    const duration = 1200; // 1.2s smooth count-up
    const startTime = performance.now();

    let animationFrameId;
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);

      const current = {};
      for (let t = 1; t <= teamCount; t++) {
        const start = startValues[t];
        const target = targetValues[t];
        current[t] = Math.round(start + (target - start) * ease);
      }
      setAnimatedScores(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setAnimatedScores(targetValues);
        prevScoresRef.current = targetValues;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [rawScores, teamCount]);

  // Build Teams List with Dynamic Ranks & Tie Handling
  const teamIds = Array.from({ length: teamCount }, (_, i) => i + 1);
  const teamsData = teamIds.map((tid) => {
    const total = animatedScores[tid] !== undefined ? animatedScores[tid] : Number(rawScores[tid] || 0);
    const r1 = roundScores[tid]?.r1 || 0;
    const r2 = roundScores[tid]?.r2 || 0;
    const r3 = roundScores[tid]?.r3 || 0;
    const tMeta = TEAMS[tid] || TEAMS[1];

    return {
      id: tid,
      name: tMeta.name,
      color: tMeta.color,
      total,
      r1,
      r2,
      r3
    };
  });

  // Sort descending by total score
  const sortedTeams = [...teamsData].sort((a, b) => b.total - a.total);

  // Compute ranks with exact tie detection
  let currentRank = 1;
  const rankedTeams = sortedTeams.map((team, idx) => {
    if (idx > 0) {
      if (team.total < sortedTeams[idx - 1].total) {
        currentRank = idx + 1;
      }
    }
    const isTied = sortedTeams.filter((t) => t.total === team.total).length > 1;
    return {
      ...team,
      rank: currentRank,
      isTied
    };
  });

  // Timer calculation
  const rawTimer = liveTimer !== null ? liveTimer : (displayState?.timeRemaining ?? 30);
  const displayTimer = Math.max(0, rawTimer);

  // FINAL RESULTS SCREEN
  if (currentGameState === GAME_STATES.FINAL_RESULT && displayState?.finalResults) {
    return (
      <div className="w-screen h-screen min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#060913] text-slate-100 flex flex-col select-none relative p-6">
        {/* Fullscreen Toggle Corner */}
        <div className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${mouseActive ? 'opacity-100' : 'opacity-20 hover:opacity-100'}`}>
          <button
            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 font-mono text-xs font-bold transition-all shadow-lg backdrop-blur-md cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN'}</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <MasterWinnerReveal
            finalResults={displayState.finalResults}
            isAdmin={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#060913] text-slate-100 flex flex-col justify-between select-none p-4 sm:p-6 md:p-8 lg:p-10 relative">
      {/* Background Ambience Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {/* TOP BAR: Tournament Title, Status & Fullscreen Toggle */}
      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-slate-800/80 pb-4 md:pb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Trophy className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-3xl font-black font-mono tracking-tight text-white uppercase">
                TEAM QUEST
              </h1>
              <span className="text-xs md:text-sm font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                LIVE SCOREBOARD
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 font-mono tracking-wider flex items-center gap-2 mt-0.5">
              <span>AURA 7F TOURNAMENT</span>
              <span>·</span>
              <span className="text-slate-300 font-bold">{teamCount} TEAMS COMPETING</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Round / Question Badge */}
          {currentGameState !== GAME_STATES.LOBBY && (
            <div className="hidden sm:flex flex-col items-end font-mono">
              <span className="text-xs uppercase font-bold text-amber-400">
                ROUND {currentRound} — {ROUND_NAMES[currentRound] || 'CLUE HUNT'}
              </span>
              <span className="text-sm font-black text-white">
                QUESTION {String(questionNumber).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-mono text-xs font-bold transition-all shadow-md backdrop-blur-md cursor-pointer ${
              mouseActive ? 'opacity-100' : 'opacity-30 hover:opacity-100'
            }`}
            title="Toggle full screen mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden md:inline">{isFullscreen ? 'EXIT FULLSCREEN' : 'ENTER FULLSCREEN'}</span>
          </button>
        </div>
      </header>

      {/* GAME STATUS BANNERS */}
      <div className="relative z-10 my-2">
        {currentGameState === GAME_STATES.LOBBY && (
          <div className="bg-[#0B132B] border border-cyan-500/30 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xl animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <h2 className="text-sm md:text-base font-black font-mono tracking-wider text-cyan-300 uppercase">
                  WAITING FOR GAME TO START
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Players are joining teams. The host will initiate Round 1 shortly.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
              LOBBY ACTIVE
            </span>
          </div>
        )}

        {isPaused && (
          <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-2xl animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                <Pause className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black font-mono tracking-wider text-amber-300 uppercase">
                  GAME PAUSED
                </h2>
                <p className="text-xs text-amber-200/80 font-mono">
                  All gameplay and timers are temporarily held by the tournament administrator.
                </p>
              </div>
            </div>
            {resumeCountdownRemaining > 0 ? (
              <span className="text-sm font-mono font-black text-amber-300 bg-amber-500/20 px-4 py-2 rounded-xl border border-amber-500/40 animate-bounce">
                RESUMING IN {resumeCountdownRemaining}s...
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
                STAND BY
              </span>
            )}
          </div>
        )}

        {currentGameState === GAME_STATES.START_COUNTDOWN && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-emerald-400 animate-bounce" />
              <h2 className="text-sm md:text-base font-black font-mono tracking-wider text-emerald-300 uppercase">
                MATCH STARTING IN {startCountdownRemaining}s...
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-300">GET READY</span>
          </div>
        )}
      </div>

      {/* MAIN SCOREBOARD LEADERBOARD CARDS */}
      <main className="relative z-10 flex-1 flex flex-col justify-center gap-3 md:gap-4 my-auto max-w-6xl w-full mx-auto">
        {rankedTeams.map((team) => {
          const isGold = team.rank === 1;
          const isSilver = team.rank === 2;
          const isBronze = team.rank === 3;

          return (
            <div
              key={team.id}
              style={{ order: team.rank }}
              className={`rounded-2xl border transition-all duration-500 p-4 md:p-6 flex items-center justify-between gap-4 shadow-2xl relative overflow-hidden ${
                isGold
                  ? 'bg-gradient-to-r from-amber-950/40 via-[#161F38] to-[#0E1528] border-amber-400/60 shadow-amber-500/10'
                  : isSilver
                  ? 'bg-gradient-to-r from-slate-800/40 via-[#141E34] to-[#0E1528] border-slate-300/50 shadow-slate-500/10'
                  : isBronze
                  ? 'bg-gradient-to-r from-amber-950/20 via-[#131B30] to-[#0E1528] border-amber-700/50'
                  : 'bg-[#0E1528]/90 border-slate-800/90'
              }`}
            >
              {/* Left Side: Rank Badge + Team Identity */}
              <div className="flex items-center gap-4 md:gap-6 min-w-0">
                {/* Visual Rank Badge */}
                <div className="shrink-0 flex items-center justify-center">
                  {isGold ? (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex flex-col items-center justify-center shadow-lg shadow-amber-500/20">
                      <span className="text-lg md:text-2xl">🥇</span>
                      <span className="text-[10px] md:text-xs font-mono font-black text-amber-300">
                        {team.isTied ? 'TIE' : '1ST'}
                      </span>
                    </div>
                  ) : isSilver ? (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-400/15 border-2 border-slate-300 flex flex-col items-center justify-center shadow-md">
                      <span className="text-lg md:text-2xl">🥈</span>
                      <span className="text-[10px] md:text-xs font-mono font-black text-slate-200">
                        {team.isTied ? 'TIE' : '2ND'}
                      </span>
                    </div>
                  ) : isBronze ? (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-amber-800/20 border-2 border-amber-600 flex flex-col items-center justify-center shadow-md">
                      <span className="text-lg md:text-2xl">🥉</span>
                      <span className="text-[10px] md:text-xs font-mono font-black text-amber-400">
                        {team.isTied ? 'TIE' : '3RD'}
                      </span>
                    </div>
                  ) : (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center">
                      <span className="text-base md:text-xl font-mono font-black text-slate-400">
                        #{team.rank}
                      </span>
                      {team.isTied && (
                        <span className="text-[9px] font-mono font-bold text-amber-400">TIE</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Team Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full shadow-md shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <h3 className="text-lg md:text-2xl lg:text-3xl font-black font-mono tracking-tight text-white truncate">
                      {team.name}
                    </h3>
                    {team.isTied && (
                      <span className="text-[10px] md:text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 uppercase">
                        TIE
                      </span>
                    )}
                  </div>

                  {/* Round-by-Round Breakdown Pills */}
                  <div className="flex items-center gap-2 mt-2 font-mono text-[10px] md:text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-[#15203A] border border-slate-700/60">
                      R1: <strong className="text-slate-200">{team.r1}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#15203A] border border-slate-700/60">
                      R2: <strong className="text-slate-200">{team.r2}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#15203A] border border-slate-700/60">
                      R3: <strong className="text-slate-200">{team.r3}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Total Points (Large & High-Contrast) */}
              <div className="text-right shrink-0">
                <div className="font-mono flex items-baseline justify-end gap-1.5 md:gap-2">
                  <span className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-amber-400 transition-all">
                    {team.total}
                  </span>
                  <span className="text-xs md:text-base font-bold text-slate-400 uppercase tracking-widest">
                    PTS
                  </span>
                </div>
                {isGold && (
                  <div className="text-[10px] md:text-xs font-mono font-black text-amber-300 flex items-center justify-end gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>CURRENT LEADER</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* FOOTER BAR: Match Info & Live Sync Status */}
      <footer className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-3 md:pt-4 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-bold">LIVE EVENT DISPLAY</span>
          <span>·</span>
          <span>CONNECTED TO SERVER</span>
        </div>

        <div className="flex items-center gap-3">
          {displayState?.timeRemaining !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>ROUND TIMER: <strong className="text-white">{displayTimer}s</strong></span>
            </div>
          )}
          <span className="text-slate-500 hidden sm:inline">
            ROOM CODE: <strong className="text-slate-300">{displayState?.gameCode || 'QUEST-2026'}</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
