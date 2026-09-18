import React, { useState } from 'react';
import { AlertCircle, Check, ArrowRight, Loader2, Users } from 'lucide-react';
import TeamBadge from '../components/TeamBadge';
import { TEAMS } from '../utils/constants';

export default function LoginLobbyView({
  gameState,
  playerTeam,
  onJoinTeam
}) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showWelcomeAnim, setShowWelcomeAnim] = useState(false);
  const [welcomeTeam, setWelcomeTeam] = useState(null);

  const teamCount = Number(gameState?.teamCount) || (gameState?.teamsStatus ? Object.keys(gameState.teamsStatus).length : 4);
  const teamIds = Array.from({ length: Math.min(Math.max(teamCount, 4), 6) }, (_, i) => i + 1);

  // Auto-reset selected team if Admin changes team count below current selection
  React.useEffect(() => {
    if (selectedTeam && selectedTeam > teamCount) {
      setSelectedTeam(null);
    }
  }, [teamCount, selectedTeam]);

  const defaultStatus = {};
  teamIds.forEach(id => {
    defaultStatus[id] = { id, name: `TEAM ${id}`, connected: false, claimed: false, available: true };
  });
  const teamsStatus = gameState?.teamsStatus || defaultStatus;

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

    setError('');
    setIsJoining(true);

    onJoinTeam({ team: tidToJoin }, (res) => {
      setIsJoining(false);
      if (res?.success) {
        setWelcomeTeam(tidToJoin);
        setShowWelcomeAnim(true);
        setTimeout(() => {
          setShowWelcomeAnim(false);
        }, 2000);
      } else {
        setError(res?.error || `TEAM ${tidToJoin} ALREADY JOINED`);
      }
    });
  };

  // 1. WELCOME ANIMATION (SECTION 5: short professional animation 1–3s)
  if (showWelcomeAnim) {
    const tData = TEAMS[welcomeTeam] || TEAMS[1];

    return (
      <div className="fixed inset-0 z-50 bg-[#070A12] flex flex-col items-center justify-center text-center p-6 animate-reveal">
        <span className="text-xs md:text-sm font-mono uppercase tracking-widest text-zinc-400 font-bold mb-3">
          WELCOME TO
        </span>
        <h1 className="text-4xl md:text-6xl font-black font-mono text-slate-100 tracking-tight">
          TEAM QUEST
        </h1>

        <div className="mt-8 p-6 rounded-xl border border-[#1E293B] bg-[#0E1524] max-w-sm w-full space-y-3 animate-reveal shadow-2xl">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
            YOU ARE PLAYING AS
          </span>
          <div className="text-3xl md:text-4xl font-black font-mono" style={{ color: tData.color }}>
            {tData.name}
          </div>
          <p className="text-xs font-mono text-zinc-500 pt-1">
            One active device per team
          </p>
        </div>
      </div>
    );
  }

  // 2. LOBBY SCREEN (SECTION 6: WAITING AREA BEFORE GAME / BETWEEN ROUNDS)
  if (playerTeam) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4 space-y-6 animate-reveal">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-5xl font-black font-mono text-slate-100 tracking-tight">
            TEAM QUEST
          </h1>
          <h2 className="text-xl md:text-2xl font-extrabold font-mono text-amber-400 tracking-wide">
            GAME LOBBY
          </h2>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#0F172A] border border-[#1E293B] text-xs font-mono text-zinc-300 mt-2">
            <span>YOUR TEAM:</span>
            <TeamBadge team={playerTeam} size="sm" />
          </div>
        </div>

        <div className="quest-card p-6 space-y-4 border-[#1E293B] shadow-2xl">
          <div className="space-y-3">
            {teamIds.map((tid) => {
              const status = teamsStatus[tid];
              const isConnected = Boolean(status?.connected);
              const isMe = Number(playerTeam) === tid;
              const tData = TEAMS[tid];

              return (
                <div
                  key={tid}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    isMe
                      ? 'bg-[#131C2E] border-amber-500/50 shadow-sm'
                      : isConnected
                      ? 'bg-[#0E1524] border-[#1E293B]'
                      : 'bg-[#090D16] border-[#141C2B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: tData.color }} />
                    <span className="font-mono font-bold text-base text-slate-100">
                      {tData.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                        YOU
                      </span>
                    )}
                  </div>

                  <div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-600/30 text-xs font-mono font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        CONNECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-900/60 text-zinc-500 border border-zinc-800 text-xs font-mono font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        WAITING
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#1E293B] text-center space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block">
              STATUS
            </span>
            <span className="text-sm md:text-base font-mono font-bold text-amber-400 tracking-wider block">
              WAITING FOR ADMIN
            </span>
            <p className="text-xs font-mono text-zinc-500 pt-1">
              When the host starts the game, your screen will automatically advance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. PLAYER LOGIN SCREEN (SECTION 3 & 4)
  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6 animate-reveal">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-5xl font-black font-mono text-slate-100 tracking-tight">
          TEAM QUEST
        </h1>
        <h2 className="text-xl md:text-2xl font-extrabold font-mono text-amber-400 tracking-wide">
          CHOOSE YOUR TEAM
        </h2>
        <p className="text-xs font-mono text-zinc-400">
          Exactly 1 active player device per team.
        </p>
      </div>

      <div className="quest-card p-6 md:p-8 space-y-5 shadow-2xl border-[#1E293B]">
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
                    : 'bg-[#0E1524] border-[#1E293B] text-slate-100 hover:border-amber-500/50 cursor-pointer active:scale-[0.99]'
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
  );
}
