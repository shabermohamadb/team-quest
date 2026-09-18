import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, ArrowRight, Loader2, Maximize, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import TeamBadge from '../components/TeamBadge';
import { TEAMS } from '../utils/constants';
import { requestFullscreenMode, useFullscreenStatus } from '../utils/fullscreen';
import { sounds } from '../utils/sound';

export default function LoginLobbyView({
  gameState,
  playerTeam,
  onJoinTeam
}) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [soundOn, setSoundOn] = useState(sounds.enabled);

  // Transition stage: null | 'TRANSITIONING'
  const [transitionStage, setTransitionStage] = useState(null);
  const [transitionTeam, setTransitionTeam] = useState(null);

  const { isFullscreen, request: requestFs } = useFullscreenStatus();

  const teamCount = Number(gameState?.teamCount) || (gameState?.teamsStatus ? Object.keys(gameState.teamsStatus).length : 4);
  const teamIds = Array.from({ length: Math.min(Math.max(teamCount, 4), 6) }, (_, i) => i + 1);

  // Auto-reset selected team if Admin changes team count below current selection
  useEffect(() => {
    if (selectedTeam && selectedTeam > teamCount) {
      setSelectedTeam(null);
    }
  }, [teamCount, selectedTeam]);

  const defaultStatus = {};
  teamIds.forEach(id => {
    defaultStatus[id] = { id, name: `TEAM ${id}`, connected: false, claimed: false, available: true };
  });
  const teamsStatus = gameState?.teamsStatus || defaultStatus;

  const toggleSound = () => {
    const next = !soundOn;
    sounds.setEnabled(next);
    setSoundOn(next);
  };

  const handleJoin = (tidToJoin = selectedTeam) => {
    if (!tidToJoin) {
      setError('Please choose a team first.');
      return;
    }

    const tInfo = teamsStatus[tidToJoin];
    if (tInfo?.claimed && playerTeam !== tidToJoin) {
      setError(`TEAM ${tidToJoin} ALREADY JOINED`);
      return;
    }

    // 1. Trigger Fullscreen API immediately inside user gesture click handler
    requestFullscreenMode();

    setError('');
    setIsJoining(true);

    // 2. Submit join request to server
    onJoinTeam({ team: tidToJoin }, (res) => {
      setIsJoining(false);
      if (res?.success) {
        setTransitionTeam(tidToJoin);
        setTransitionStage('TRANSITIONING');

        // Smooth transition animation: 500ms duration per Section 13
        setTimeout(() => {
          setTransitionStage(null);
        }, 550);
      } else {
        setError(res?.error || `TEAM ${tidToJoin} ALREADY JOINED`);
      }
    });
  };

  // 1. FULLSCREEN TRANSITION ANIMATION (Section 13: 300–700ms smooth fade / scale)
  if (transitionStage === 'TRANSITIONING') {
    const tData = TEAMS[transitionTeam] || TEAMS[1];

    return (
      <div className="fixed inset-0 z-50 bg-[#070A12] flex flex-col items-center justify-center text-center p-6 select-none animate-cinematic-reveal">
        <div className="relative flex flex-col items-center max-w-md w-full">
          {/* Luminous Glow behind transition */}
          <div
            className="absolute -inset-10 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: tData.color }}
          />

          <span className="text-xs md:text-sm font-mono uppercase tracking-[0.3em] text-zinc-400 font-bold mb-2">
            ENTERING ARENA
          </span>
          <h1 className="text-4xl md:text-6xl font-black font-mono text-slate-100 tracking-tight mb-6">
            JOINED
          </h1>

          <div className="p-6 rounded-2xl border border-white/10 bg-[#0C111D]/90 backdrop-blur-xl w-full shadow-2xl space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
              YOU ARE PLAYING AS
            </span>
            <div className="text-3xl md:text-5xl font-black font-mono" style={{ color: tData.color }}>
              {tData.name}
            </div>
            <p className="text-xs font-mono text-amber-400/80 pt-2 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              FULL-SCREEN GAME MODE ACTIVE
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. FULL-SCREEN LOBBY SCREEN (Section 1, 2, 5: Edge-to-edge full-viewport pre-game arena)
  if (playerTeam) {
    const myTeamData = TEAMS[playerTeam] || TEAMS[1];

    return (
      <div
        className="w-screen h-screen min-h-[100dvh] max-h-[100dvh] bg-[#070A12] text-slate-100 flex flex-col justify-between overflow-hidden select-none safe-top safe-bottom safe-left safe-right"
      >
        {/* Top Header Bar */}
        <header className="shrink-0 px-4 md:px-8 py-3 border-b border-[#1A2234] bg-[#0A0E18]/80 backdrop-blur flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black font-mono text-sm shadow-sm">
              Q
            </div>
            <span className="font-mono text-xs md:text-sm font-black tracking-wider text-slate-100 uppercase hidden sm:inline">
              AURA 7F WEEKLY BASH
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold tracking-wider">
              GAME LOBBY
            </span>
          </div>

          {/* Right: Audio & Fullscreen Toggle */}
          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <button
                type="button"
                onClick={requestFs}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono font-bold tracking-wider transition-all"
                title="Enter Full Screen"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">FULLSCREEN</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleSound}
              className="p-1.5 rounded-full border border-white/10 bg-black/40 text-zinc-400 hover:text-white transition-colors"
              title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>
          </div>
        </header>

        {/* Central Arena: Dominant Team Card + Live Teams Grid */}
        <main className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 w-full max-w-4xl mx-auto overflow-y-auto no-scrollbar py-4 space-y-6">
          {/* Dominant Hero Card */}
          <div className="relative w-full text-center space-y-3 p-6 md:p-8 rounded-2xl border border-[#1E293B] bg-[#0E1524]/90 backdrop-blur shadow-2xl">
            {/* Ambient Team Glow */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: myTeamData.color }}
            />

            <span className="text-xs md:text-sm font-mono uppercase tracking-[0.25em] text-zinc-400 font-bold block">
              YOU ARE PLAYING AS
            </span>
            <div
              className="text-4xl sm:text-6xl md:text-7xl font-black font-mono tracking-tight drop-shadow-md"
              style={{ color: myTeamData.color }}
            >
              {myTeamData.name}
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>ONE ACTIVE DEVICE CONFIRMED</span>
            </div>
          </div>

          {/* Dynamic Teams Roster (4, 5, or 6 Teams) */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                TOURNAMENT TEAMS ({teamCount} ACTIVE)
              </span>
              <span className="text-xs font-mono text-zinc-500">
                Live Status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {teamIds.map((tid) => {
                const status = teamsStatus[tid];
                const isConnected = Boolean(status?.connected);
                const isMe = Number(playerTeam) === tid;
                const tData = TEAMS[tid];

                return (
                  <div
                    key={tid}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isMe
                        ? 'bg-[#131C2E] border-amber-500/60 shadow-lg ring-1 ring-amber-500/40'
                        : isConnected
                        ? 'bg-[#0E1524] border-[#1E293B]'
                        : 'bg-[#090D16]/60 border-[#141C2B]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: tData.color }} />
                      <span className="font-mono font-bold text-base text-slate-100">
                        {tData.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                          YOU
                        </span>
                      )}
                    </div>

                    <div>
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-600/30 text-xs font-mono font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          CONNECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/60 text-zinc-500 border border-zinc-800 text-xs font-mono font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                          WAITING
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Bottom Status & Waiting Bar */}
        <footer className="shrink-0 p-4 md:p-6 border-t border-[#1A2234] bg-[#0A0E18]/90 text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>STATUS: WAITING FOR ADMIN TO START TOURNAMENT</span>
          </div>
          <p className="text-xs font-mono text-zinc-500 pt-1">
            When the host starts the game, your screen will automatically advance into Round 1.
          </p>
        </footer>
      </div>
    );
  }

  // 3. PLAYER LOGIN / TEAM SELECTION SCREEN (Before Joining)
  return (
    <div className="min-h-screen bg-[#070A12] flex flex-col justify-center items-center py-10 px-4 select-none">
      <div className="max-w-md w-full space-y-6 animate-reveal">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-zinc-400 font-bold block">
            AURA 7F WEEKLY BASH
          </span>
          <h1 className="text-3xl md:text-5xl font-black font-mono text-slate-100 tracking-tight">
            TEAM QUEST
          </h1>
          <h2 className="text-lg md:text-xl font-bold font-mono text-amber-400 tracking-wide">
            CHOOSE YOUR TEAM
          </h2>
          <p className="text-xs font-mono text-zinc-400">
            Exactly 1 active player device per team.
          </p>
        </div>

        <div className="quest-card p-6 md:p-8 space-y-5 shadow-2xl border-[#1E293B] bg-[#0E1524]">
          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs font-mono flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Dynamic Teams Options: [ TEAM 1 ] .. [ TEAM N ] */}
          <div className="space-y-3">
            {teamIds.map((tid) => {
              const status = teamsStatus[tid];
              const isAlreadyJoined = Boolean(status?.claimed);
              const isSelected = selectedTeam === tid;
              const tData = TEAMS[tid];

              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => {
                    if (!isAlreadyJoined) {
                      setSelectedTeam(tid);
                      setError('');
                    }
                  }}
                  disabled={isAlreadyJoined || isJoining}
                  className={`w-full p-4 rounded-xl border text-left transition-all relative ${
                    isAlreadyJoined
                      ? 'bg-[#090D16]/80 border-[#141C2B] text-zinc-600 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'bg-[#131C2E] border-amber-400 text-slate-100 shadow-md ring-1 ring-amber-400'
                      : 'bg-[#090D16] border-[#1E293B] text-slate-100 hover:border-amber-500/50 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tData.color }}
                      />
                      <span className="font-mono font-black text-lg">
                        {tData.name}
                      </span>
                    </div>

                    {isAlreadyJoined ? (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                        ALREADY JOINED
                      </span>
                    ) : isSelected ? (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        SELECTED
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-600/30 font-bold uppercase tracking-wider">
                        AVAILABLE
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* [ JOIN GAME ] Button */}
          <button
            type="button"
            onClick={() => handleJoin()}
            disabled={!selectedTeam || isJoining}
            className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black font-mono text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed mt-2"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>JOINING...</span>
              </>
            ) : (
              <>
                <span>JOIN GAME</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
