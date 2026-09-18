import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Sparkles, AlertCircle, RotateCcw, Swords } from 'lucide-react';
import { TEAMS } from '../utils/constants.js';
import { sounds } from '../utils/sound.js';

export function MasterWinnerReveal({ finalResults, onReset, onStartTiebreaker, isAdmin = false }) {
  const [step, setStep] = useState(1);
  const standings = finalResults?.standings || [
    { team: 1, total: 0, r1: 0, r2: 0, r3: 0 },
    { team: 2, total: 0, r1: 0, r2: 0, r3: 0 },
    { team: 3, total: 0, r1: 0, r2: 0, r3: 0 },
    { team: 4, total: 0, r1: 0, r2: 0, r3: 0 }
  ];
  const [displayScores, setDisplayScores] = useState({});

  const isTie = Boolean(finalResults?.isTie);
  const tiedTeams = finalResults?.tiedTeams || [];
  const winnerTeamId = finalResults?.winner;
  const winnerData = winnerTeamId ? standings.find(s => s.team === winnerTeamId) : null;
  const winnerMeta = winnerTeamId ? (TEAMS[winnerTeamId] || TEAMS[1]) : null;

  // Step Timeline Progression:
  // Step 1: 0 - 2.5s (Transition & Calculating)
  // Step 2: 2.5s - 5.5s (Round Totals Count-up)
  // Step 3: 5.5s - 7.5s (Suspense)
  // Step 4: 7.5s - 10.5s (Winner Reveal or Tie Detected)
  // Step 5: 10.5s+ (Final Summary)
  useEffect(() => {
    const t2 = setTimeout(() => setStep(2), 2400);
    const t3 = setTimeout(() => setStep(3), 5600);
    const t4 = setTimeout(() => {
      setStep(4);
      if (!isTie) {
        try {
          sounds.playWinner();
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#10B981', '#06B6D4', '#F43F5E']
          });
        } catch (e) {}
      }
    }, 7600);
    const t5 = setTimeout(() => setStep(5), 11000);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [isTie]);

  // Smooth number count-up animation for Step 2
  useEffect(() => {
    if (step < 2) return;

    const durationMs = 1800;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      const next = {};
      for (const item of standings) {
        next[item.team] = Math.round(item.total * ease);
      }
      setDisplayScores(next);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const finalTotals = {};
        for (const item of standings) {
          finalTotals[item.team] = item.total;
        }
        setDisplayScores(finalTotals);
      }
    };

    const handle = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(handle);
  }, [step]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 animate-reveal">
      {/* STEP 1: FINAL TRANSITION */}
      {step === 1 && (
        <div className="quest-card border-amber-500/60 p-10 text-center space-y-4 animate-reveal shadow-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">
            TEAM QUEST TOURNAMENT
          </span>
          <h1 className="text-4xl md:text-6xl font-black font-mono text-slate-100 tracking-tight">
            FINAL RESULTS
          </h1>
          <div className="pt-6 pb-2">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-sm font-bold animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>CALCULATING FINAL SCORES...</span>
            </div>
          </div>
          <p className="text-xs font-mono text-zinc-500 max-w-sm mx-auto">
            Aggregating authoritative scores across Round 1 (Clue Hunt), Round 2 (Pattern Break), and Round 3 (Code Cracker).
          </p>
        </div>
      )}

      {/* STEP 2: SHOW ROUND TOTALS */}
      {step === 2 && (
        <div className="quest-card border-amber-500/60 p-6 md:p-8 space-y-6 animate-reveal shadow-2xl">
          <div className="text-center space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
              AGGREGATING 3-ROUND TOTALS
            </span>
            <h2 className="text-2xl md:text-4xl font-black font-mono text-slate-100">
              COMBINED TEAM SCORES
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {standings.map((item) => {
              const tid = item.team;
              const teamMeta = TEAMS[tid] || TEAMS[1];
              const score = displayScores[tid] ?? 0;

              return (
                <div
                  key={tid}
                  className="p-5 rounded-xl border border-[#1E293B] bg-[#0E1524] flex items-center justify-between shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: teamMeta.color }} />
                    <span className="font-mono font-black text-lg text-slate-100">{teamMeta.name}</span>
                  </div>
                  <div className="font-mono font-black text-2xl text-amber-400">
                    {score} <span className="text-xs text-zinc-500 font-semibold">PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: SUSPENSE */}
      {step === 3 && (
        <div className="quest-card border-amber-500/80 p-10 text-center space-y-4 animate-reveal shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl md:text-5xl font-black font-mono text-slate-100 tracking-tight">
              FINAL SCORE CALCULATED
            </h2>
            <p className="text-xs font-mono text-amber-400/90 pt-3 tracking-widest uppercase">
              REVEALING STANDINGS...
            </p>
          </div>
        </div>
      )}

      {/* STEP 4: WINNER REVEAL OR TIE DETECTED */}
      {step === 4 && (
        <div className="quest-card border-amber-500 p-8 md:p-12 text-center space-y-6 animate-reveal shadow-[0_0_40px_rgba(245,158,11,0.2)]">
          {isTie ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-6xl font-black font-mono text-rose-400 tracking-tight">
                # TIE DETECTED
              </h1>
              <p className="text-sm md:text-base font-mono font-bold text-slate-200">
                TEAMS TIED FOR 1ST PLACE ({finalResults?.topScore || 0} POINTS):
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
                {tiedTeams.map(tid => (
                  <span
                    key={tid}
                    className="px-4 py-2 rounded-xl border text-base font-mono font-black"
                    style={{ borderColor: TEAMS[tid]?.color, color: TEAMS[tid]?.color }}
                  >
                    {TEAMS[tid]?.name}
                  </span>
                ))}
              </div>
              <p className="text-xs font-mono text-zinc-400 pt-2">
                No single winner declared. A tiebreaker match is required to determine the final champion.
              </p>
              {isAdmin && onStartTiebreaker && (
                <div className="pt-4">
                  <button
                    onClick={onStartTiebreaker}
                    className="quest-btn-primary px-6 py-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2 mx-auto"
                  >
                    <Swords className="w-4 h-4" />
                    START TIEBREAKER
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-scale-in">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <span className="text-sm font-mono uppercase tracking-widest text-amber-400 font-bold block mb-2">
                  🏆 TOURNAMENT WINNER
                </span>
                <h1
                  className="text-5xl md:text-7xl font-black font-mono tracking-tight"
                  style={{ color: winnerMeta?.color || '#F59E0B' }}
                >
                  {winnerMeta?.name}
                </h1>
              </div>

              <div className="inline-block px-6 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 font-mono">
                <span className="text-xs uppercase text-zinc-400 block">TOTAL SCORE</span>
                <span className="text-3xl md:text-4xl font-black text-amber-300">
                  {winnerData?.total ?? finalResults?.winnerScore ?? 0} POINTS
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: FINAL SUMMARY TABLE */}
      {step >= 5 && (
        <div className="quest-card border-[#1E293B] p-6 md:p-8 space-y-6 animate-reveal shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold block">
                TOURNAMENT CONCLUDED
              </span>
              <h2 className="text-xl md:text-3xl font-black font-mono text-slate-100">
                FINAL SCOREBOARD
              </h2>
            </div>
            {isAdmin && onReset && (
              <button
                onClick={onReset}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET GAME</span>
              </button>
            )}
          </div>

          {/* Standings Table */}
          <div className="space-y-3">
            {standings.map((item, idx) => {
              const teamMeta = TEAMS[item.team];
              const isFirst = idx === 0 && !isTie;
              const isTiedFirst = isTie && tiedTeams.includes(item.team);

              return (
                <div
                  key={item.team}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                    isFirst
                      ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400'
                      : isTiedFirst
                      ? 'bg-rose-950/30 border-rose-500/70 ring-1 ring-rose-400'
                      : 'bg-[#0E1524] border-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                      isFirst ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300'
                    }`}>
                      #{idx + 1}
                    </span>
                    <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: teamMeta.color }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base text-slate-100">{teamMeta.name}</span>
                        {isFirst && (
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-amber-400 text-black uppercase">
                            🏆 WINNER
                          </span>
                        )}
                        {isTiedFirst && (
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-rose-500 text-white uppercase">
                            TIED 1ST
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 pt-0.5">
                        <span>R1: {item.r1 || 0}</span>
                        <span>·</span>
                        <span>R2: {item.r2 || 0}</span>
                        <span>·</span>
                        <span>R3: {item.r3 || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="font-mono font-black text-xl md:text-2xl text-amber-400">
                    {item.total} <span className="text-xs text-zinc-500 font-semibold">PTS</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tiebreaker Action Banner for Admin */}
          {isTie && isAdmin && onStartTiebreaker && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/40 text-center space-y-2">
              <span className="text-xs font-mono text-rose-300 font-bold block">
                TIE DETECTED BETWEEN TEAMS: {tiedTeams.map(t => TEAMS[t]?.name).join(' & ')}
              </span>
              <button
                onClick={onStartTiebreaker}
                className="quest-btn-primary px-6 py-2.5 rounded-lg text-xs font-mono font-bold inline-flex items-center gap-2"
              >
                <Swords className="w-4 h-4" />
                START SUDDEN-DEATH TIEBREAKER
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
