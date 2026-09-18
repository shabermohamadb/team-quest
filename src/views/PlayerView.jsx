import React, { useState, useEffect } from 'react';
import {
  Send, CheckCircle, AlertTriangle, Lock, Pause,
  Sparkles, Clock, Zap, Check, HelpCircle, Key, Terminal
} from 'lucide-react';
import confetti from 'canvas-confetti';

import Timer from '../components/Timer';
import TeamBadge from '../components/TeamBadge';
import DifficultyBadge from '../components/DifficultyBadge';
import CountdownOverlay from '../components/CountdownOverlay';
import { MasterWinnerReveal } from '../components/MasterWinnerReveal';
import { TEAMS, ROUNDS } from '../utils/constants';
import { sounds } from '../utils/sound';

export default function PlayerView({
  gameState,
  playerTeam,
  onSubmitRound1,
  onSubmitRound2,
  onSubmitRound3,
  feedback,
  setFeedback
}) {
  // Round 1 Input
  const [r1Input, setR1Input] = useState('');
  const [isSubmittingR1, setIsSubmittingR1] = useState(false);

  // Round 2 Selection
  const [selectedR2Option, setSelectedR2Option] = useState(null);
  const [isSubmittingR2, setIsSubmittingR2] = useState(false);

  // Round 3 Code Cracker Input
  const [r3Input, setR3Input] = useState('');
  const [isSubmittingR3, setIsSubmittingR3] = useState(false);

  // Local cooldown state
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [shakeInput, setShakeInput] = useState(false);

  const teamId = Number(playerTeam);
  const myTeam = gameState?.myTeam || {
    id: teamId,
    isLocked: false,
    cooldownRemaining: 0,
    status: 'WAITING',
    mySubmission: null
  };

  const isTeamLocked = Boolean(myTeam.isLocked);
  const roundNumber = gameState?.currentRoundNumber || 1;
  const currentChallenge = gameState?.currentChallenge;
  const isPaused = Boolean(gameState?.isPaused);

  // States
  const isStartCountdown = gameState?.state === 'START_COUNTDOWN';
  const isRound1Intro = gameState?.state === 'ROUND_1_INTRO';
  const isRound2Intro = gameState?.state === 'ROUND_2_INTRO';
  const isRound3Intro = gameState?.state === 'ROUND_3_INTRO';
  const isFinalResult = gameState?.state === 'FINAL_RESULT' || gameState?.state === 'COMPLETED';

  // Active round checks
  const isR1Active = ['ROUND_1_CLUE_1', 'ROUND_1_CLUE_2', 'ROUND_1_CLUE_3'].includes(gameState?.state) && !isPaused;
  const isR1Reveal = ['ROUND_1_ANSWER_REVEAL', 'ROUND_1_RESULT'].includes(gameState?.state);
  const isR2Active = gameState?.state === 'ROUND_2_ACTIVE' && !isPaused;
  const isR2Result = gameState?.state === 'ROUND_2_RESULT';
  const isR3Active = gameState?.state === 'ROUND_3_ACTIVE' && !isPaused;
  const isR3Result = gameState?.state === 'ROUND_3_RESULT';

  // Sync server cooldown
  useEffect(() => {
    if (myTeam.cooldownRemaining) {
      setCooldownRemaining(myTeam.cooldownRemaining);
    }
  }, [myTeam.cooldownRemaining]);

  // Local countdown
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            setFeedback(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Reset local state on round change
  useEffect(() => {
    setR1Input('');
    setSelectedR2Option(null);
    setR3Input('');
    setFeedback(null);
  }, [gameState?.state, roundNumber]);

  // Sound triggers
  useEffect(() => {
    if (feedback) {
      if (feedback.isCorrect) {
        sounds.playCorrect();
      } else {
        sounds.playWrong();
        setShakeInput(true);
        setTimeout(() => setShakeInput(false), 450);

        const secs = feedback.cooldownSeconds || 5;
        setCooldownRemaining(secs);
      }
    }
  }, [feedback]);

  // Final ceremony celebration
  useEffect(() => {
    if (isFinalResult) {
      sounds.playWinner();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [isFinalResult]);

  // Handlers
  const handleR1Submit = (e) => {
    e.preventDefault();
    if (!r1Input.trim() || isSubmittingR1 || isTeamLocked || !isR1Active || cooldownRemaining > 0) return;

    setIsSubmittingR1(true);
    setFeedback(null);
    onSubmitRound1({
      answer: r1Input.trim(),
      questionId: currentChallenge?.id,
      clueIndex: (currentChallenge?.activeClueNumber || 1) - 1,
      teamId
    }, (res) => {
      setIsSubmittingR1(false);
      if (res?.success && res?.isCorrect) {
        setR1Input('');
        setFeedback({ isCorrect: true, points: res.points, rank: res.rank });
      } else if (res?.isCorrect === false) {
        setFeedback({ isCorrect: false, error: '✕ INCORRECT · 0 POINTS', cooldownSeconds: res.cooldownSeconds || 5 });
      } else if (res?.error) {
        setFeedback({ isCorrect: false, error: res.error, cooldownSeconds: 5 });
      }
    });
  };

  const handleR2Submit = (e) => {
    e.preventDefault();
    if (!selectedR2Option || isSubmittingR2 || isTeamLocked || !isR2Active || cooldownRemaining > 0) return;

    setIsSubmittingR2(true);
    setFeedback(null);
    onSubmitRound2({
      optionId: selectedR2Option,
      optionKey: selectedR2Option,
      questionId: currentChallenge?.id,
      teamId
    }, (res) => {
      setIsSubmittingR2(false);
      if (res?.success && res?.isCorrect) {
        setFeedback({ isCorrect: true, points: res.points, rank: res.rank });
      } else if (res?.isCorrect === false) {
        setFeedback({ isCorrect: false, error: '✕ INCORRECT · 0 POINTS', cooldownSeconds: res.cooldownSeconds || 5 });
      } else if (res?.error) {
        setFeedback({ isCorrect: false, error: res.error, cooldownSeconds: 5 });
      }
    });
  };

  const handleR3Submit = (e) => {
    e.preventDefault();
    if (!r3Input.trim() || isSubmittingR3 || isTeamLocked || !isR3Active || cooldownRemaining > 0) return;

    setIsSubmittingR3(true);
    setFeedback(null);
    onSubmitRound3({
      code: r3Input.trim(),
      challengeId: currentChallenge?.id,
      teamId
    }, (res) => {
      setIsSubmittingR3(false);
      if (res?.success && res?.isCorrect) {
        setR3Input('');
        setFeedback({ isCorrect: true, points: res.points, rank: res.rank });
      } else if (res?.isCorrect === false) {
        setFeedback({ isCorrect: false, error: '✕ WRONG CODE · 0 POINTS', cooldownSeconds: res.cooldownSeconds || 5 });
      } else if (res?.error) {
        setFeedback({ isCorrect: false, error: res.error, cooldownSeconds: 5 });
      }
    });
  };

  if (!gameState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4 animate-reveal">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
        <div>
          <span className="text-sm font-mono uppercase tracking-widest text-amber-400 font-bold block">
            TEAM QUEST
          </span>
          <p className="text-xs font-mono text-slate-400 mt-1">
            SYNCING GAME STATE...
          </p>
        </div>
      </div>
    );
  }

  const isResuming = typeof gameState?.resumeCountdownRemaining === 'number' && gameState.resumeCountdownRemaining > 0;

  return (
    <div className="max-w-4xl mx-auto py-4 px-3 md:px-4 space-y-5">
      {/* SYNCHRONIZED START COUNTDOWN (SECTION 9 & 34) */}
      {isStartCountdown && (
        <CountdownOverlay secondsRemaining={gameState?.startCountdownRemaining ?? 3} />
      )}

      {/* ROUND 1 INTRO BANNER */}
      {isRound1Intro && (
        <div className="quest-card border-amber-500/80 p-8 text-center space-y-3 animate-reveal shadow-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
            TEAM QUEST
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-mono text-slate-100">
            ROUND 1 — CLUE HUNT
          </h2>
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-sm font-semibold text-slate-300 font-mono">
              Domain: {currentChallenge?.domain || 'Technical Knowledge'}
            </span>
            <span className="text-zinc-600">·</span>
            <DifficultyBadge difficulty={currentChallenge?.difficulty || 'Medium'} size="md" />
          </div>
        </div>
      )}

      {/* ROUND 2 INTRO BANNER */}
      {isRound2Intro && (
        <div className="quest-card border-amber-500/80 p-8 text-center space-y-3 animate-reveal shadow-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
            TEAM QUEST
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-mono text-slate-100">
            ROUND 2 — PATTERN BREAK
          </h2>
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-sm font-semibold text-slate-300 font-mono">
              Category: {currentChallenge?.category || 'Logic Pattern'}
            </span>
            <span className="text-zinc-600">·</span>
            <DifficultyBadge difficulty={currentChallenge?.difficulty || 'Medium'} size="md" />
          </div>
        </div>
      )}

      {/* ROUND 3 INTRO BANNER */}
      {isRound3Intro && (
        <div className="quest-card border-amber-500/80 p-8 text-center space-y-3 animate-reveal shadow-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
            TEAM QUEST
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-mono text-slate-100">
            ROUND 3 — CODE CRACKER 🔐
          </h2>
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-sm font-semibold text-slate-300 font-mono">
              Decryption & Digital Escape Room
            </span>
            <span className="text-zinc-600">·</span>
            <DifficultyBadge difficulty={currentChallenge?.difficulty || 'Medium'} size="md" />
          </div>
        </div>
      )}

      {/* GAME PAUSED / RESUMING OVERLAY (SECTION 22) */}
      {(isPaused || isResuming) && (
        <div className="bg-amber-950/30 border-2 border-amber-500/60 rounded-xl p-5 text-center flex items-center justify-center gap-3 animate-pulse">
          <Pause className="w-6 h-6 text-amber-400" />
          <div>
            <h3 className="text-base font-bold font-mono text-amber-400 uppercase">
              {isResuming
                ? `RESUMING IN ${gameState.resumeCountdownRemaining}...`
                : 'GAME PAUSED BY HOST'}
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              {isResuming
                ? 'Get ready with your team!'
                : 'Please wait for the host to resume...'}
            </span>
          </div>
        </div>
      )}

      {/* HEADER: Round, Difficulty, Timer (NO LEADERBOARD / TROPHY) */}
      <div className="quest-card p-3 md:p-4 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <div>
            <span className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-zinc-500 block font-semibold">
              ROUND {roundNumber}
            </span>
            <span className="font-mono text-base md:text-xl font-black text-slate-100">
              {ROUNDS[roundNumber]?.name || 'GAME'}
            </span>
          </div>

          <div className="h-7 w-[1px] bg-[#1E283E] mx-1 hidden sm:block" />

          {/* Prominent Question Counter: QUESTION 01 / 10 */}
          <div className="font-mono text-xs md:text-sm font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded tracking-wider">
            {gameState?.formattedCounter || `QUESTION 01 / 10`}
          </div>

          <div className="h-7 w-[1px] bg-[#1E283E] mx-1 hidden sm:block" />

          {/* Difficulty badge */}
          {currentChallenge?.difficulty && (
            <DifficultyBadge difficulty={currentChallenge.difficulty} size="sm" />
          )}
        </div>

        {/* Right: Prominent Top Timer */}
        <div>
          <Timer
            seconds={gameState?.timeRemaining ?? 30}
            total={gameState?.clueDuration ?? (roundNumber === 3 ? 45 : 30)}
            clueStartedAt={gameState?.clueStartedAt}
            clueDuration={gameState?.clueDuration ?? (roundNumber === 3 ? 45 : 30)}
            isTimerRunning={gameState?.isTimerRunning}
            isPaused={isPaused}
            showBar={true}
            size="lg"
          />
        </div>
      </div>

      {/* ROUND COMPLETE / SKIPPED SCREEN (WAITING FOR ADMIN) */}
      {gameState?.isRoundComplete && !isFinalResult && (
        <div className="quest-card border-amber-500/60 p-8 text-center space-y-4 animate-reveal shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              {gameState?.roundSkipped ? `ROUND ${gameState.roundSkipped} SKIPPED` : `ROUND ${roundNumber} COMPLETE`}
            </span>
            <h2 className="text-3xl md:text-5xl font-black font-mono text-slate-100 mt-1">
              {gameState?.roundSkipped
                ? `${ROUNDS[roundNumber]?.name || 'ROUND'} ENDED EARLY`
                : `${ROUNDS[roundNumber]?.name || 'ROUND'} FINISHED`}
            </h2>
            <p className="text-sm font-mono text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
              {roundNumber < 3 ? `Waiting for the admin to start Round ${roundNumber + 1}...` : 'Waiting for the admin to reveal final results...'}
            </p>
          </div>
        </div>
      )}

      {/* FINAL RESULTS CEREMONY (SYNCHRONIZED 5-STEP REVEAL) */}
      {isFinalResult && (
        <MasterWinnerReveal
          finalResults={gameState?.finalResults}
          isAdmin={false}
        />
      )}

      {/* ================= ROUND 1: CLUE HUNT ================= */}
      {roundNumber === 1 && !isFinalResult && !gameState?.isRoundComplete && (
        <div className="space-y-4 animate-reveal">
          {/* Answer reveal banner */}
          {isR1Reveal && (
            <div className="quest-card border-emerald-500/60 p-6 text-center space-y-2 animate-reveal shadow-lg">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">
                THE ANSWER WAS
              </span>
              <h2 className="text-3xl md:text-5xl font-black font-mono text-emerald-400">
                {currentChallenge?.revealedAnswer}
              </h2>
            </div>
          )}

          {/* CLUES (SECTION 10, 11, 12) */}
          <div className="space-y-3">
            {/* Active Clue (Prominent) */}
            {currentChallenge?.activeClues?.length > 0 && (
              <div className="quest-card border-amber-500/70 p-5 md:p-6 space-y-2 shadow-[0_0_20px_rgba(245,158,11,0.1)] animate-reveal">
                <div className="flex items-center justify-between pb-1 border-b border-[#1E283D]">
                  <span className="font-mono text-xs uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    CLUE 0{currentChallenge.activeClueNumber}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Active Scoring Clue
                  </span>
                </div>

                <div className="text-slate-100 text-lg md:text-xl font-medium leading-relaxed my-2">
                  “{currentChallenge.activeClues.find(c => c.number === currentChallenge.activeClueNumber)?.text}”
                </div>
              </div>
            )}

            {/* Previous Clues (Collapsed) */}
            {currentChallenge?.activeClues?.filter(c => c.number < currentChallenge.activeClueNumber).length > 0 && (
              <div className="p-3.5 rounded-lg bg-[#0A0E18] border border-[#182338] space-y-2">
                <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
                  PREVIOUS CLUES
                </span>
                {currentChallenge.activeClues
                  .filter(c => c.number < currentChallenge.activeClueNumber)
                  .map(c => (
                    <div key={c.number} className="text-xs text-slate-300 font-mono">
                      <strong className="text-amber-400 mr-1.5">Clue 0{c.number}:</strong>
                      “{c.text}”
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Round 1 Answer Controls */}
          {!isR1Reveal && (
            <div className="quest-card p-4 md:p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E283D]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-400 font-semibold">YOUR TEAM:</span>
                  <TeamBadge team={teamId} size="md" />
                </div>
                <div>
                  {isTeamLocked ? (
                    <span className="px-2.5 py-1 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      🔒 LOCKED
                    </span>
                  ) : cooldownRemaining > 0 ? (
                    <span className="px-2.5 py-1 rounded bg-rose-950/40 text-rose-400 border border-rose-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      ✕ COOLDOWN ({cooldownRemaining}s)
                    </span>
                  ) : isSubmittingR1 ? (
                    <span className="px-2.5 py-1 rounded bg-amber-950/40 text-amber-400 border border-amber-600/40 text-xs font-mono font-bold">
                      VERIFYING...
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      🟢 WAITING FOR SUBMISSION
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-300 font-mono">
                DISCUSS WITH YOUR TEAM. Submit ONE final answer.
              </div>

              {isTeamLocked ? (
                <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-center space-y-2 animate-reveal">
                  <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-1" />
                  <h3 className="font-mono text-lg md:text-xl font-black text-emerald-300">
                    TEAM {teamId} · ✓ CORRECT
                  </h3>
                  <div className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-xs font-mono font-bold text-emerald-300">
                    {myTeam.mySubmission?.points ? `+${myTeam.mySubmission.points} POINTS · ` : ''}🔒 TEAM LOCKED
                  </div>
                  <p className="text-xs text-slate-400 font-mono pt-1">
                    Your team has solved this clue! Locked for this question.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleR1Submit} className="space-y-3">
                  <div className={shakeInput ? 'animate-shake' : ''}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={r1Input}
                        onChange={(e) => setR1Input(e.target.value)}
                        disabled={!isR1Active || isSubmittingR1 || cooldownRemaining > 0}
                        placeholder={cooldownRemaining > 0 ? `TRY AGAIN IN ${cooldownRemaining}s` : "Enter your answer..."}
                        className="flex-1 quest-input px-4 py-3 rounded-lg text-sm md:text-base font-semibold"
                      />
                      <button
                        type="submit"
                        disabled={!isR1Active || isSubmittingR1 || !r1Input.trim() || cooldownRemaining > 0}
                        className="quest-btn-primary px-6 py-3 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-md disabled:opacity-50"
                      >
                        {isSubmittingR1 ? (
                          <span>CHECKING...</span>
                        ) : cooldownRemaining > 0 ? (
                          <span>WAIT {cooldownRemaining}s</span>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>SUBMIT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {feedback && !feedback.isCorrect && (
                    <div className="p-3 rounded-md text-xs font-mono flex items-center gap-2 bg-rose-950/40 text-rose-300 border border-rose-600/40 animate-reveal">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        {cooldownRemaining > 0
                          ? `✕ INCORRECT · 0 POINTS · TRY AGAIN IN ${cooldownRemaining}s`
                          : (feedback.error || '✕ INCORRECT · 0 POINTS')}
                      </span>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= ROUND 2: PATTERN BREAK ================= */}
      {roundNumber === 2 && !isFinalResult && !gameState?.isRoundComplete && (
        <div className="space-y-4 animate-reveal">
          {/* Pattern Box */}
          <div className="quest-card border-amber-500/70 p-6 text-center space-y-3 shadow-md">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">
              IDENTIFY THE MISSING ELEMENT
            </span>

            <div className="p-6 rounded-xl bg-[#090D16] border border-[#222E46] text-xl md:text-3xl font-mono font-black text-slate-100 tracking-wider">
              {currentChallenge?.patternText || '2 → 4 → 8 → 16 → ?'}
            </div>

            {isR2Result && currentChallenge?.revealedOption && (
              <div className="pt-2 text-xs font-mono text-emerald-400">
                Correct Option: <strong>{currentChallenge.revealedOption}</strong> — {currentChallenge.explanation}
              </div>
            )}
          </div>

          {/* 4 Options (A, B, C, D) (SECTION 16 & 17) */}
          <div className="quest-card p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E283D]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400 font-semibold">YOUR TEAM:</span>
                <TeamBadge team={teamId} size="md" />
              </div>
              <div>
                {isTeamLocked ? (
                  <span className="px-2.5 py-1 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    🔒 LOCKED
                  </span>
                ) : cooldownRemaining > 0 ? (
                  <span className="px-2.5 py-1 rounded bg-rose-950/40 text-rose-400 border border-rose-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    ✕ COOLDOWN ({cooldownRemaining}s)
                  </span>
                ) : isSubmittingR2 ? (
                  <span className="px-2.5 py-1 rounded bg-amber-950/40 text-amber-400 border border-amber-600/40 text-xs font-mono font-bold">
                    VERIFYING...
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    🟢 SELECT AN OPTION
                  </span>
                )}
              </div>
            </div>

            {isTeamLocked ? (
              <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-center space-y-2 animate-reveal">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-1" />
                <h3 className="font-mono text-lg md:text-xl font-black text-emerald-300">
                  TEAM {teamId} · ✓ CORRECT
                </h3>
                <div className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-xs font-mono font-bold text-emerald-300">
                  {myTeam.mySubmission?.points ? `+${myTeam.mySubmission.points} POINTS · ` : ''}🔒 TEAM LOCKED
                </div>
                <p className="text-xs text-slate-400 font-mono pt-1">
                  Your team has identified the pattern! Locked for this question.
                </p>
              </div>
            ) : (
              <form onSubmit={handleR2Submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentChallenge?.options?.map((opt) => {
                    const optKey = opt.id || opt.key;
                    const isChosen = selectedR2Option === optKey;

                    return (
                      <button
                        key={optKey}
                        type="button"
                        onClick={() => setSelectedR2Option(optKey)}
                        disabled={!isR2Active || isSubmittingR2 || cooldownRemaining > 0}
                        className={`p-4 rounded-xl border text-left transition-all font-mono disabled:opacity-50 ${
                          isChosen
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/50'
                            : 'bg-[#090D16] border-[#222E46] text-slate-200 hover:border-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                            isChosen ? 'bg-amber-500 text-black font-black' : 'bg-[#151C2C] text-zinc-400'
                          }`}>
                            {optKey}
                          </span>
                          <span className="text-base font-bold">
                            {opt.text}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!isR2Active || !selectedR2Option || isSubmittingR2 || cooldownRemaining > 0}
                    className="quest-btn-primary px-8 py-3 rounded-lg text-sm font-bold uppercase tracking-wider shadow-md disabled:opacity-50"
                  >
                    {isSubmittingR2 ? 'CHECKING...' : cooldownRemaining > 0 ? `WAIT ${cooldownRemaining}s` : 'SUBMIT OPTION'}
                  </button>
                </div>

                {feedback && !feedback.isCorrect && (
                  <div className="p-3 rounded-md text-xs font-mono flex items-center gap-2 bg-rose-950/40 text-rose-300 border border-rose-600/40 animate-reveal">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {cooldownRemaining > 0
                        ? `✕ INCORRECT OPTION · 0 POINTS · TRY AGAIN IN ${cooldownRemaining}s`
                        : (feedback.error || '✕ INCORRECT OPTION · 0 POINTS')}
                    </span>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= ROUND 3: CODE CRACKER ================= */}
      {roundNumber === 3 && !isFinalResult && !gameState?.isRoundComplete && (
        <div className="space-y-4 animate-reveal">
          {/* Code Cracker Cipher Card */}
          <div className="quest-card border-amber-500/80 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E283D]">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                🔐 CRACK THE ENCRYPTED CIPHER
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {currentChallenge?.category || 'Cryptic Escape Room'}
              </span>
            </div>

            {/* Challenge Title */}
            <h3 className="text-lg md:text-xl font-bold font-mono text-slate-100">
              {currentChallenge?.title || 'Cipher Challenge'}
            </h3>

            {/* Cipher Code Block: ENCRYPTED PUZZLE */}
            <div className="p-5 md:p-6 rounded-xl bg-[#090D16] border-2 border-amber-500/50 text-center shadow-inner">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1 font-bold">
                ENCRYPTED PUZZLE
              </span>
              <div className="font-mono text-2xl md:text-4xl font-black text-amber-300 tracking-widest select-all py-1">
                {currentChallenge?.puzzle || currentChallenge?.code || 'ENCRYPTED'}
              </div>
            </div>

            {/* Hint Box (Visually secondary to puzzle) */}
            {currentChallenge?.hint && (
              <div className="p-3.5 rounded-lg bg-[#0A0E18] border border-[#182338] text-xs font-mono text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400/90 font-bold text-[11px] uppercase tracking-wider">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>HINT / PROTOCOL</span>
                </div>
                <p className="text-slate-300 text-xs md:text-sm leading-relaxed pl-5">
                  {currentChallenge.hint}
                </p>
              </div>
            )}

            {/* Revealed Solution (during results) */}
            {isR3Result && currentChallenge?.revealedCode && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-xs font-mono text-emerald-300 animate-reveal">
                <strong className="text-emerald-400 mr-2">DECRYPTED PASSCODE:</strong>
                <span className="font-bold text-sm tracking-wider text-white">{currentChallenge.revealedCode}</span>
                {currentChallenge.explanation && (
                  <p className="text-[11px] text-slate-300 mt-1">{currentChallenge.explanation}</p>
                )}
              </div>
            )}
          </div>

          {/* Answer Submission Controls */}
          <div className="quest-card p-4 md:p-6 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E283D]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400 font-semibold">YOUR TEAM:</span>
                <TeamBadge team={teamId} size="md" />
              </div>
              <div>
                {isTeamLocked ? (
                  <span className="px-2.5 py-1 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    🔒 LOCKED
                  </span>
                ) : cooldownRemaining > 0 ? (
                  <span className="px-2.5 py-1 rounded bg-rose-950/40 text-rose-400 border border-rose-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    ✕ COOLDOWN ({cooldownRemaining}s)
                  </span>
                ) : isSubmittingR3 ? (
                  <span className="px-2.5 py-1 rounded bg-amber-950/40 text-amber-400 border border-amber-600/40 text-xs font-mono font-bold">
                    CRACKING...
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-600/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    🟢 READY TO CRACK
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-300 font-mono">
              DISCUSS WITH YOUR TEAM. Decrypt the message and enter the final code.
            </div>

            {isTeamLocked ? (
              <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-center space-y-2 animate-reveal">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-1" />
                <h3 className="font-mono text-lg md:text-xl font-black text-emerald-300">
                  TEAM {teamId} · 🔓 CODE CRACKED
                </h3>
                <div className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-xs font-mono font-bold text-emerald-300">
                  {myTeam.mySubmission?.points ? `+${myTeam.mySubmission.points} POINTS · ` : ''}🔒 TEAM LOCKED
                </div>
                <p className="text-xs text-slate-400 font-mono pt-1">
                  Your team has solved this cipher! Locked for this challenge.
                </p>
              </div>
            ) : (
              <form onSubmit={handleR3Submit} className="space-y-3">
                <div className={shakeInput ? 'animate-shake' : ''}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={r3Input}
                      onChange={(e) => setR3Input(e.target.value.toUpperCase())}
                      disabled={!isR3Active || isSubmittingR3 || cooldownRemaining > 0}
                      placeholder={cooldownRemaining > 0 ? `TRY AGAIN IN ${cooldownRemaining}s` : "ENTER DECRYPTED CODE..."}
                      className="flex-1 quest-input px-4 py-3 rounded-lg text-sm md:text-base font-mono uppercase font-bold tracking-widest"
                    />
                    <button
                      type="submit"
                      disabled={!isR3Active || isSubmittingR3 || !r3Input.trim() || cooldownRemaining > 0}
                      className="quest-btn-primary px-6 py-3 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {isSubmittingR3 ? (
                        <span>VERIFYING...</span>
                      ) : cooldownRemaining > 0 ? (
                        <span>WAIT {cooldownRemaining}s</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>SUBMIT</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {feedback && !feedback.isCorrect && (
                  <div className="p-3 rounded-md text-xs font-mono flex items-center gap-2 bg-rose-950/40 text-rose-300 border border-rose-600/40 animate-reveal">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {cooldownRemaining > 0
                        ? `✕ WRONG CODE · 0 POINTS · TRY AGAIN IN ${cooldownRemaining}s`
                        : (feedback.error || '✕ WRONG CODE · 0 POINTS')}
                    </span>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
