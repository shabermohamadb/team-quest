import React from 'react';
import { Trophy, Award, Medal } from 'lucide-react';
import { TEAMS } from '../utils/constants';
import TeamBadge from './TeamBadge';

export default function Leaderboard({ scores = {}, roundScores = null, highlightTeam = null, showBreakdown = true, teamCount = null }) {
  // Derive teamCount dynamically
  const count = Number(teamCount) || (roundScores ? Object.keys(roundScores).length : (scores ? Object.keys(scores).length : 4));
  const validCount = Math.min(Math.max(count, 4), 6);
  const teamIds = Array.from({ length: validCount }, (_, i) => i + 1);

  const teamsList = teamIds.map((id) => {
    const total = scores[id] ?? scores[String(id)] ?? 0;
    const r1 = roundScores?.[id]?.r1 ?? roundScores?.[String(id)]?.r1 ?? 0;
    const r2 = roundScores?.[id]?.r2 ?? roundScores?.[String(id)]?.r2 ?? 0;
    const r3 = roundScores?.[id]?.r3 ?? roundScores?.[String(id)]?.r3 ?? 0;
    const tData = TEAMS[id] || TEAMS[1];
    return {
      id,
      name: tData.name,
      color: tData.color,
      total,
      r1,
      r2,
      r3
    };
  });

  // Sort descending by total score
  const sortedTeams = [...teamsList].sort((a, b) => b.total - a.total);

  return (
    <div className="quest-card p-4 md:p-5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#1E283D]">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-slate-200">
            LIVE LEADERBOARD
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase">
          {validCount} TEAMS
        </span>
      </div>

      <div className="space-y-2">
        {sortedTeams.map((team, idx) => {
          const isSelected = highlightTeam && String(highlightTeam) === String(team.id);
          const rank = idx + 1;

          return (
            <div
              key={team.id}
              className={`p-3 rounded-lg border transition-all duration-200 ${
                isSelected
                  ? 'bg-amber-950/20 border-amber-500/50 shadow-sm'
                  : 'bg-[#0A0E18] border-[#182133] hover:border-[#22304A]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Left: Rank & Team Badge */}
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-black ${
                      rank === 1
                        ? 'bg-amber-500 text-black shadow-sm'
                        : rank === 2
                        ? 'bg-slate-300 text-black'
                        : rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    #{rank}
                  </span>

                  <TeamBadge team={team.id} size="sm" />
                </div>

                {/* Right: Total Score */}
                <div className="text-right font-mono">
                  <div className="text-base font-black text-amber-400">
                    {team.total} <span className="text-[10px] font-normal text-zinc-500 uppercase">PTS</span>
                  </div>
                </div>
              </div>

              {/* Optional R1, R2, R3 Score Breakdown */}
              {showBreakdown && (
                <div className="grid grid-cols-3 gap-1 pt-2 mt-2 border-t border-[#141B2A] text-center text-[10px] font-mono text-zinc-400">
                  <div className="bg-[#0E1422] py-1 rounded">
                    <span className="text-zinc-500 block text-[9px]">R1 CLUES</span>
                    <span className="font-bold text-slate-200">{team.r1}</span>
                  </div>
                  <div className="bg-[#0E1422] py-1 rounded">
                    <span className="text-zinc-500 block text-[9px]">R2 PATTERN</span>
                    <span className="font-bold text-slate-200">{team.r2}</span>
                  </div>
                  <div className="bg-[#0E1422] py-1 rounded">
                    <span className="text-zinc-500 block text-[9px]">R3 REACTION</span>
                    <span className="font-bold text-slate-200">{team.r3}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
