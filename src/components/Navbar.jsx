import React, { useState } from 'react';
import { Volume2, VolumeX, Users } from 'lucide-react';
import { sounds } from '../utils/sound';
import TeamBadge from './TeamBadge';

export default function Navbar({ playerTeam, isConnected = true, onSwitchView }) {
  const [soundOn, setSoundOn] = useState(sounds.enabled);

  const toggleSound = () => {
    const next = !soundOn;
    sounds.setEnabled(next);
    setSoundOn(next);
  };

  return (
    <header className="border-b border-[#1A2234] bg-[#0A0D15]/95 backdrop-blur sticky top-0 z-40 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black font-mono text-base shadow-sm">
            Q
          </div>
          <div>
            <h1 className="font-mono text-sm md:text-base font-black tracking-wider text-slate-100 flex items-center gap-2">
              TEAM QUEST
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-rose-500 animate-pulse'
                }`}
                title={isConnected ? 'Connected to game server' : 'Connecting to game server...'}
              />
            </h1>
          </div>
        </div>

        {/* Right Controls: Team Members shortcut, Team Indicator & Audio */}
        <div className="flex items-center gap-2.5">
          {/* Team Members Shortcut */}
          <button
            onClick={() => onSwitchView ? onSwitchView('teammember') : (window.location.href = '/teammember')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#1E2638] bg-[#0E131F] text-zinc-300 hover:text-white hover:border-amber-500/40 transition-all cursor-pointer text-xs font-mono font-bold"
            title="View Team Members (/teammember)"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">ROSTERS</span>
          </button>

          {playerTeam && (
            <div className="flex items-center gap-1.5">
              <TeamBadge team={playerTeam} size="sm" />
            </div>
          )}

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-md border border-[#1E2638] bg-[#0E131F] text-zinc-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
      </div>
    </header>
  );
}
