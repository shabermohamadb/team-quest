import React, { useState, useEffect } from 'react';
import { Clock, Pause, Loader2 } from 'lucide-react';

export default function Timer({
  seconds,
  total = 30,
  clueStartedAt = null,
  clueDuration = 30,
  isTimerRunning = false,
  isPaused = false,
  showBar = false,
  size = 'md'
}) {
  const [currentRemaining, setCurrentRemaining] = useState(() => {
    if (typeof seconds === 'number' && !isNaN(seconds)) return seconds;
    return clueDuration || total || 30;
  });

  useEffect(() => {
    // If paused or not running, lock to provided seconds
    if (isPaused || !isTimerRunning || !clueStartedAt) {
      if (typeof seconds === 'number' && !isNaN(seconds)) {
        setCurrentRemaining(Math.max(0, seconds));
      } else if (!isTimerRunning) {
        setCurrentRemaining(clueDuration || total || 30);
      }
      return;
    }

    // High precision tick every 100ms calculated from server-authoritative clueStartedAt
    const updateTime = () => {
      const elapsedSec = (Date.now() - clueStartedAt) / 1000;
      const rem = Math.max(0, Math.ceil(clueDuration - elapsedSec));
      setCurrentRemaining(rem);
    };

    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, [clueStartedAt, clueDuration, isTimerRunning, isPaused, seconds, total]);

  // Handle syncing state if running without timestamp or valid seconds
  const isSyncing = isTimerRunning && currentRemaining === null && !clueStartedAt;

  const displaySeconds = currentRemaining !== null && !isNaN(currentRemaining)
    ? Math.max(0, currentRemaining)
    : (typeof seconds === 'number' && !isNaN(seconds) ? Math.max(0, seconds) : 30);

  const safeTotal = Math.max(clueDuration || total || 30, 1);
  const fraction = Math.min(1, displaySeconds / safeTotal);
  const isUrgent = displaySeconds <= 5 && displaySeconds > 0;
  const isWarning = displaySeconds <= 10 && displaySeconds > 5;

  const colorClass = isPaused
    ? 'text-amber-400'
    : isUrgent
    ? 'text-rose-400 animate-pulse'
    : isWarning
    ? 'text-amber-400'
    : 'text-emerald-400';

  const bgClass = isPaused
    ? 'bg-amber-500/10 border-amber-500/30'
    : isUrgent
    ? 'bg-rose-500/10 border-rose-500/40'
    : isWarning
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-emerald-500/10 border-emerald-500/30';

  const barColor = isPaused
    ? 'bg-amber-400'
    : isUrgent
    ? 'bg-rose-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  // Format string: display '00s' when reaches 0, otherwise '30s', '29s', etc.
  const timeText = isSyncing
    ? 'SYNCING...'
    : displaySeconds === 0
    ? '00s'
    : `${displaySeconds}s`;

  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center gap-1 font-mono">
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 shadow-lg ${bgClass}`}>
          {isPaused ? (
            <Pause className="w-5 h-5 text-amber-400 animate-pulse flex-shrink-0" />
          ) : isSyncing ? (
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
          ) : (
            <Clock className={`w-5 h-5 ${colorClass} flex-shrink-0`} />
          )}
          <span className={`text-2xl md:text-3xl font-black tracking-wider ${colorClass}`}>
            {timeText}
          </span>
          {isPaused && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded uppercase">
              PAUSED
            </span>
          )}
        </div>
        {showBar && (
          <div className="w-full max-w-[140px] h-1.5 bg-[#141C2C] rounded-full overflow-hidden border border-[#222E46] mt-1">
            <div
              className={`h-full transition-all duration-200 ease-linear ${barColor}`}
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono ${bgClass}`}>
      {isPaused ? (
        <Pause className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
      ) : isSyncing ? (
        <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
      ) : (
        <Clock className={`w-4 h-4 ${colorClass} flex-shrink-0`} />
      )}
      <span className={`text-base md:text-lg font-black tracking-wider ${colorClass}`}>
        {timeText}
      </span>
      {isPaused && (
        <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded uppercase">
          PAUSED
        </span>
      )}
    </div>
  );
}
