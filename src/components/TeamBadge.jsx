import React from 'react';
import { TEAMS } from '../utils/constants';

export default function TeamBadge({ team = 1, size = 'md', className = '' }) {
  const teamKey = String(team);
  const teamInfo = TEAMS[teamKey] || TEAMS[1];

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-mono font-bold',
    md: 'text-xs px-2.5 py-1 font-mono font-bold',
    lg: 'text-sm px-3.5 py-1.5 font-mono font-extrabold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border uppercase tracking-wider ${teamInfo.badge} ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: teamInfo.color }}
      />
      {teamInfo.name}
    </span>
  );
}
