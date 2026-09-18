import React from 'react';
import { DIFFICULTIES } from '../utils/constants';

export default function DifficultyBadge({ difficulty = 'Medium', size = 'sm' }) {
  const norm = (difficulty || 'Medium').trim();
  const key = norm.charAt(0).toUpperCase() + norm.slice(1).toLowerCase();
  const diff = DIFFICULTIES[key] || DIFFICULTIES.Medium;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-mono font-bold',
    md: 'text-xs px-2.5 py-1 font-mono font-bold',
    lg: 'text-sm px-3.5 py-1.5 font-mono font-bold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded border uppercase tracking-wider ${diff.badge} ${sizeClasses[size] || sizeClasses.sm}`}>
      <span>{diff.icon}</span>
      <span>{diff.label}</span>
    </span>
  );
}
