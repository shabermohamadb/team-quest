import React, { useState, useEffect } from 'react';
import {
  Send, CheckCircle, AlertTriangle, Lock, Pause,
  Sparkles, Clock, Maximize, Volume2, VolumeX, HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

import Timer from '../components/Timer';
import TeamBadge from '../components/TeamBadge';
import DifficultyBadge from '../components/DifficultyBadge';
import CountdownOverlay from '../components/CountdownOverlay';
import { MasterWinnerReveal } from '../components/MasterWinnerReveal';
import { TEAMS, ROUNDS } from '../utils/constants';
import { sounds } from '../utils/sound';
import { requestFullscreenMode, useFullscreenStatus } from '../utils/fullscreen';

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
  const [soundOn, setSoundOn] = useState(sounds.enabled);

  const { isFullscreen, request: requestFs } = useFullscreenStatus();

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

  const toggleSound = () => {
    const next = !soundOn;
    sounds.setEnabled(next);
    setSoundOn(next);
  };

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
  }, [cooldownRemaining, setFeedback]);

  // Reset local state on round change
  useEffect(() => {
    setR1Input('');
    setSelectedR2Option(null);
    setR3Input('');
    setFeedback(null);
  }, [gameState?.state, roundNumber, setFeedback]);

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
        setFeedback({ isCorrect: false, error: '✕ INCORRECT CODE · 0 POINTS', cooldownSeconds: res.cooldownSeconds || 5 });
      } else if (res?.error) {
        setFeedback({ isCorrect: false, error: res.error, cooldownSeconds: 5 });
      }
    });
  };

  // Safe fallback if data hasn't synced
  if (!gameState && !currentChallenge) {
    return (
      <div className="w-screen h-screen min-h-[100dvh] bg-[#070A12] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        <div>
          <span className="text-sm font-mono uppercase tracking-widest text-amber-400 font-bold block">
            AURA 7F WEEKLY BASH
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
    <div
      className="w-screen h-screen min-h-[100dvh] max-h-[100dvh] bg-[#070A12] text-slate-100 flex flex-col justify-between overflow-hidden select-none safe-top safe-bottom safe-left safe-right"
    >
      {/* SYNCHRONIZED START COUNTDOWN (SECTION 9 & 34) */}
      {isStartCountdown && (
        <CountdownOverlay secondsRemaining={gameState?.startCountdownRemaining ?? 3} />
      )}

      {/* FINAL RESULTS CEREMONY (SYNCHRONIZED 5-STEP REVEAL) */}
      {isFinalResult && (
        <MasterWinnerReveal
          finalResults={gameState?.finalResults}
          isAdmin={false}
        />
      )}

      {/* TOP HEADER BAR (Section 5, 8, 10: Prominent, edge-to-edge, never hidden by notches) */}
      <header className="shrink-0 px-4 md:px-8 py-2.5 border-b border-[#1A2234] bg-[#0A0E18]/85 backdrop-blur flex items-center justify-between gap-2 md:gap-4 z-20">
        {/* Left: Round & Question Indicator */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
              ROUND {roundNumber}
            </span>
            <span className="font-mono text-sm md:text-base font-black text-slate-100 uppercase">
              {ROUNDS[roundNumber]?.name || 'TOURNAMENT'}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-[#1E283E] mx-1 hidden sm:block" />

          {/* Prominent Question Counter: QUESTION 01 / 10 */}
          <div className="font-mono text-xs md:text-sm font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md tracking-wider">
            {gameState?.formattedCounter || `QUESTION 01 / 10`}
          </div>

          {currentChallenge?.difficulty && (
            <div className="hidden md:block">
              <DifficultyBadge difficulty={currentChallenge.difficulty} size="sm" />
            </div>
          )}
        </div>

        {/* Right: Audio, Fullscreen Toggle, and Prominent Top Timer */}
        <div className="flex items-center gap-2 md:gap-4">
          {!isFullscreen && (
            <button
              type="button"
              onClick={requestFs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold tracking-wider transition-all"
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

          {/* Prominent Top Timer (Section 10: never pushed off screen) */}
          <div className="shrink-0">
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
      </header>

      {/* GAME PAUSED / RESUMING OVERLAY */}
      {(isPaused || isResuming) && (
        <div className="shrink-0 mx-4 mt-2 bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-3 text-center flex items-center justify-center gap-3 animate-pulse z-10">
          <Pause className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm md:text-base font-bold font-mono text-amber-400 uppercase">
              {isResuming ? `RESUMING IN ${gameState.resumeCountdownRemaining}...` : 'GAME PAUSED BY HOST'}
            </h3>
            <span className="text-xs font-mono text-zinc-400">
              {isResuming ? 'Get ready with your team!' : 'Please wait for the host to resume...'}
            </span>
          </div>
        </div>
      )}

      {/* MAIN CENTRAL STAGE (Edge-to-edge arena content) */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 w-full max-w-4xl mx-auto overflow-y-auto no-scrollbar py-2 md:py-4">
        {/* ROUND INTRO BANNERS */}
        {isRound1Intro && (
          <div className="quest-card border-amber-500/80 p-6 md:p-8 text-center space-y-3 animate-reveal shadow-2xl w-full">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              ROUND 1 INTRO
            </span>
            <h2 className="text-3xl md:text-5xl font-black font-mono text-slate-100">
              CLUE HUNT
            </h2>
            <div className="flex items-center justify-center gap-3 pt-2">
              <span className="text-xs md:text-sm font-semibold text-slate-300 font-mono">
                Domain: {currentChallenge?.domain || 'Technical Knowledge'}
              </span>
              <span className="text-zinc-600">·</span>
              <DifficultyBadge difficulty={currentChallenge?.difficulty || 'Medium'} size="md" />
            </div>
          </div>
        )}

        {isRound2Intro && (
          <div className="quest-card border-amber-500/80 p-6 md:p-8 text-center space-y-3 animate-reveal shadow-2xl w-full">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              ROUND 2 INTRO
            </span>
            <h2 className="text-3xl md:text-5xl font-black font-mono text-slate-100">
              PATTERN BREAK
            </h2>
            <div className="flex items-center justify-center gap-3 pt-2">
              <span className="text-xs md:text-sm font-semibold text-slate-300 font-mono">
                Category: {currentChallenge?.category || 'Logic Pattern'}
              </span>
              <span className="text-zinc-600">·</span>
              <DifficultyBadge difficulty={currentChallenge?.difficulty || 'Medium'} size="md" />
            </div>
          </div>
        )}

        {isRound3Intro && (
          <div className="quest-card border-amber-500/80 p-6 md:p-8 text-center space-y-3 animate-reveal shadow-2xl w-full">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
              ROUND 3 INTRO
            </span>
            <h2 className="text-3xl md:text-5xl font-black font-mono text-slate-100">
              CODE CRACKER 🔐
            </h2>
            <p className="text-xs md:text-sm text-slate-300 font-mono">
              Decryption & Digital Escape Room
            </p>
          </div>
        )}

        {/* ROUND COMPLETE BANNER */}
        {gameState?.isRoundComplete && !isFinalResult && (
          <div className="quest-card border-amber-500/60 p-8 text-center space-y-4 animate-reveal shadow-2xl w-full">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                {gameState?.roundSkipped ? `ROUND ${gameState.roundSkipped} SKIPPED` : `ROUND ${roundNumber} COMPLETE`}
              </span>
              <h2 className="text-2xl md:text-4xl font-black font-mono text-slate-100 mt-1">
                {gameState?.roundSkipped ? `${ROUNDS[roundNumber]?.name || 'ROUND'} ENDED EARLY` : `${ROUNDS[roundNumber]?.name || 'ROUND'} FINISHED`}
              </h2>
              <p className="text-xs md:text-sm font-mono text-slate-400 mt-2 max-w-md mx-auto">
                {roundNumber < 3 ? `Waiting for the host to start Round ${roundNumber + 1}...` : 'Waiting for the host to reveal final results...'}
              </p>
            </div>
          </div>
        )}

        {/* ================= ROUND 1: CLUE HUNT ================= */}
        {roundNumber === 1 && !isFinalResult && !gameState?.isRoundComplete && !isRound1Intro && (
          <div className="w-full space-y-3 md:space-y-4 animate-reveal">
            {/* Answer reveal banner */}
            {isR1Reveal && (
              <div className="quest-card border-emerald-500/60 p-5 md:p-6 text-center space-y-2 animate-reveal shadow-lg">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">
                  THE ANSWER WAS
                </span>
                <h2 className="text-3xl md:text-5xl font-black font-mono text-emerald-400">
                  {currentChallenge?.revealedAnswer}
                </h2>
              </div>
            )}

            {/* If this team solved the question, display dedicated SOLVED / LOCKED screen */}
            {!isR1Reveal && isTeamLocked ? (
              <div className="quest-card border-emerald-500/60 p-8 md:p-12 text-center space-y-4 md:space-y-6 animate-reveal bg-[#0A1A17] shadow-[0_0_40px_rgba(16,185,129,0.15)] rounded-2xl">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400/60 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
                  <CheckCircle className="w-10 h-10 md:w-12 md:h-12" />
                </div>

                <div className="space-y-2">
                  <span className="text-emerald-400 font-mono text-base md:text-xl font-black uppercase tracking-widest block">
                    ✓ CORRECT
                  </span>
                  <h2 className="text-3xl md:text-5xl font-black font-mono text-white tracking-tight">
                    SOLVED
                  </h2>
                  {myTeam?.mySubmission?.points && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs md:text-sm font-bold">
                      <span>+{myTeam.mySubmission.points} POINTS AWARDED</span>
                      {myTeam.solvedAtClue && <span>· CLUE {myTeam.solvedAtClue}</span>}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/30 max-w-md mx-auto space-y-2">
                  <div className="flex items-center justify-center gap-2 text-amber-400 font-mono text-xs md:text-sm font-bold uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    <span>LOCKED FOR THIS QUESTION</span>
                  </div>
                  <p className="text-slate-300 font-mono text-xs md:text-sm leading-relaxed">
                    You have already solved this question.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2 text-zinc-400 font-mono text-xs tracking-wider uppercase animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>WAIT FOR THE NEXT QUESTION...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Active Clue (Dominant Hero Card) */}
                {currentChallenge?.activeClues?.length > 0 && (
                  <div className="quest-card border-amber-500/70 p-5 md:p-7 space-y-3 shadow-[0_0_24px_rgba(245,158,11,0.1)] animate-reveal bg-[#0E1524]">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1E283D]">
                      <span className="font-mono text-xs uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        CLUE 0{currentChallenge.activeClueNumber}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Active Scoring Clue
                      </span>
                    </div>

                    <div className="text-slate-100 text-lg md:text-2xl font-medium leading-relaxed my-2 text-center md:text-left">
                      “{currentChallenge.activeClues.find(c => c.number === currentChallenge.activeClueNumber)?.text}”
                    </div>
                  </div>
                )}

                {/* Previous Clues (Compact pills) */}
                {currentChallenge?.activeClues?.filter(c => c.number < currentChallenge.activeClueNumber).length > 0 && (
                  <div className="p-3 rounded-lg bg-[#0A0E18] border border-[#182338] space-y-1.5">
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
              </>
            )}
          </div>
        )}

        {/* ================= ROUND 2: PATTERN BREAK ================= */}
        {roundNumber === 2 && !isFinalResult && !gameState?.isRoundComplete && !isRound2Intro && (
          <div className="w-full space-y-4 animate-reveal">
            {/* Pattern Display Box */}
            <div className="quest-card border-amber-500/70 p-5 md:p-6 text-center space-y-3 shadow-md bg-[#0E1524]">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block">
                IDENTIFY THE MISSING ELEMENT
              </span>

              <div className="p-5 md:p-6 rounded-xl bg-[#090D16] border border-[#222E46] text-xl md:text-3xl font-mono font-black text-slate-100 tracking-wider">
                {currentChallenge?.patternText || '2 → 4 → 8 → 16 → ?'}
              </div>

              {isR2Result && currentChallenge?.revealedOption && (
                <div className="pt-2 text-xs font-mono text-emerald-400">
                  Correct Option: <strong>{currentChallenge.revealedOption}</strong> — {currentChallenge.explanation}
                </div>
              )}
            </div>

            {/* 4 Options Grid (A, B, C, D) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentChallenge?.options?.map((opt) => {
                const optKey = opt.key || opt.id;
                const isChosen = selectedR2Option === optKey;
                const isCorrectOption = isR2Result && currentChallenge?.revealedOption === optKey;

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => {
                      if (isR2Active && !isTeamLocked && cooldownRemaining === 0) {
                        setSelectedR2Option(optKey);
                      }
                    }}
                    disabled={!isR2Active || isTeamLocked || cooldownRemaining > 0 || isSubmittingR2}
                    className={`p-3.5 md:p-4 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] ${
                      isCorrectOption
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500'
                        : isChosen
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-[#0E1524] border-[#222E46] text-slate-200 hover:border-zinc-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                        isChosen ? 'bg-amber-500 text-black font-black' : 'bg-[#151C2C] text-zinc-400'
                      }`}>
                        {optKey}
                      </span>
                      <span className="text-sm md:text-base font-bold">
                        {opt.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= ROUND 3: CODE CRACKER ================= */}
        {roundNumber === 3 && !isFinalResult && !gameState?.isRoundComplete && !isRound3Intro && (
          <div className="w-full space-y-3 md:space-y-4 animate-reveal">
            <div className="quest-card border-amber-500/80 p-5 md:p-6 space-y-3 shadow-xl bg-[#0E1524]">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E283D]">
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  🔐 CRACK THE ENCRYPTED CIPHER
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {currentChallenge?.category || 'Cryptic Escape Room'}
                </span>
              </div>

              <h3 className="text-base md:text-lg font-bold font-mono text-slate-100">
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

              {/* Hint Box */}
              {currentChallenge?.hint && (
                <div className="p-3 rounded-lg bg-[#0A0E18] border border-[#182338] text-xs font-mono text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400/90 font-bold text-[11px] uppercase tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>HINT / PROTOCOL</span>
                  </div>
                  <p className="text-slate-300 text-xs md:text-sm leading-relaxed pl-5">
                    {currentChallenge.hint}
                  </p>
                </div>
              )}

              {/* Revealed Solution */}
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
          </div>
        )}
      </main>

      {/* BOTTOM ACTION AREA (Section 11 & 12: Team Status + Input/Submit Form) */}
      {!isFinalResult && !gameState?.isRoundComplete && (
        <footer className="shrink-0 w-full max-w-4xl mx-auto px-4 pb-3 pt-2 z-20 space-y-2">
          {/* Team Status Row */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 font-semibold">YOUR TEAM:</span>
              <TeamBadge team={teamId} size="md" />
            </div>

            <div>
              {isTeamLocked ? (
                <span className="px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/50 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {myTeam.mySubmission?.points ? `+${myTeam.mySubmission.points} PTS · ` : ''}🔒 LOCKED
                </span>
              ) : cooldownRemaining > 0 ? (
                <span className="px-3 py-1 rounded-full bg-rose-950/50 text-rose-400 border border-rose-500/50 text-xs font-mono font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  ✕ COOLDOWN ({cooldownRemaining}s)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-600/30 text-xs font-mono font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              )}
            </div>
          </div>

          {/* Locked State Card */}
          {isTeamLocked ? (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-center font-mono text-xs md:text-sm font-bold flex items-center justify-center gap-2 animate-reveal">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>TEAM {teamId} SOLVED THIS QUESTION · LOCKED UNTIL NEXT QUESTION</span>
            </div>
          ) : (
            /* Submission Forms */
            <div>
              {/* Round 1 Form */}
              {roundNumber === 1 && !isR1Reveal && (
                <form onSubmit={handleR1Submit} className="space-y-2">
                  <div className={`flex gap-2 ${shakeInput ? 'animate-shake' : ''}`}>
                    <input
                      type="text"
                      value={r1Input}
                      onChange={(e) => setR1Input(e.target.value)}
                      disabled={!isR1Active || isSubmittingR1 || cooldownRemaining > 0}
                      placeholder={cooldownRemaining > 0 ? `TRY AGAIN IN ${cooldownRemaining}s` : "Enter your answer..."}
                      className="flex-1 quest-input px-4 py-3 rounded-xl text-sm md:text-base font-semibold shadow-inner min-h-[48px]"
                      autoCapitalize="off"
                      autoCorrect="off"
                    />
                    <button
                      type="submit"
                      disabled={!isR1Active || isSubmittingR1 || !r1Input.trim() || cooldownRemaining > 0}
                      className="quest-btn-primary px-6 md:px-8 py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50 min-h-[48px]"
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

                  {feedback && !feedback.isCorrect && (
                    <div className="p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 bg-rose-950/50 text-rose-300 border border-rose-600/40 animate-reveal">
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

              {/* Round 2 Form */}
              {roundNumber === 2 && !isR2Result && (
                <form onSubmit={handleR2Submit} className="space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!isR2Active || !selectedR2Option || isSubmittingR2 || cooldownRemaining > 0}
                      className="w-full sm:w-auto quest-btn-primary px-8 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider shadow-lg disabled:opacity-50 min-h-[48px]"
                    >
                      {isSubmittingR2 ? 'CHECKING...' : cooldownRemaining > 0 ? `WAIT ${cooldownRemaining}s` : selectedR2Option ? `SUBMIT OPTION ${selectedR2Option}` : 'CHOOSE AN OPTION'}
                    </button>
                  </div>

                  {feedback && !feedback.isCorrect && (
                    <div className="p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 bg-rose-950/50 text-rose-300 border border-rose-600/40 animate-reveal">
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

              {/* Round 3 Form */}
              {roundNumber === 3 && !isR3Result && (
                <form onSubmit={handleR3Submit} className="space-y-2">
                  <div className={`flex gap-2 ${shakeInput ? 'animate-shake' : ''}`}>
                    <input
                      type="text"
                      value={r3Input}
                      onChange={(e) => setR3Input(e.target.value.toUpperCase())}
                      disabled={!isR3Active || isSubmittingR3 || cooldownRemaining > 0}
                      placeholder={cooldownRemaining > 0 ? `TRY AGAIN IN ${cooldownRemaining}s` : "ENTER DECRYPTED CODE..."}
                      className="flex-1 quest-input px-4 py-3 rounded-xl text-sm md:text-base font-mono font-bold tracking-widest uppercase shadow-inner min-h-[48px]"
                      autoCapitalize="characters"
                      autoCorrect="off"
                    />
                    <button
                      type="submit"
                      disabled={!isR3Active || isSubmittingR3 || !r3Input.trim() || cooldownRemaining > 0}
                      className="quest-btn-primary px-6 md:px-8 py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50 min-h-[48px]"
                    >
                      {isSubmittingR3 ? (
                        <span>CRACKING...</span>
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

                  {feedback && !feedback.isCorrect && (
                    <div className="p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 bg-rose-950/50 text-rose-300 border border-rose-600/40 animate-reveal">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        {cooldownRemaining > 0
                          ? `✕ INCORRECT CODE · 0 POINTS · TRY AGAIN IN ${cooldownRemaining}s`
                          : (feedback.error || '✕ INCORRECT CODE · 0 POINTS')}
                      </span>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </footer>
      )}
    </div>
  );
}
