import React, { useState } from 'react';
import {
  Users, UserPlus, Shuffle, Trash2, Edit3, Check, X,
  AlertTriangle, Lock, FileText, ArrowRightLeft, UserCheck
} from 'lucide-react';
import { TEAMS } from '../utils/constants';
import TeamBadge from './TeamBadge';

export default function ParticipantTeamSetup({
  teamCount = 4,
  participants = [],
  rosters = {},
  isLocked = false,
  onSetTeamCount,
  onAddParticipant,
  onAddBulk,
  onUpdateParticipant,
  onRemoveParticipant,
  onClearParticipants,
  onAutoAssign,
  onShuffle,
  onMoveParticipant
}) {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirmShuffleModal, setConfirmShuffleModal] = useState(false);
  const [confirmClearModal, setConfirmClearModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentCount = Number(teamCount) || 4;
  const teamIds = Array.from({ length: currentCount }, (_, i) => i + 1);

  // Helper to add single participant
  const handleAddSingle = (e) => {
    e.preventDefault();
    const name = newParticipantName.trim();
    if (!name) return;
    setErrorMsg('');
    onAddParticipant(name, (res) => {
      if (res?.success) {
        setNewParticipantName('');
      } else {
        setErrorMsg(res?.error || 'Failed to add participant');
      }
    });
  };

  // Helper to add bulk participants
  const handleAddBulkSubmit = () => {
    const lines = bulkText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (lines.length === 0) return;
    setErrorMsg('');
    onAddBulk(lines, (res) => {
      if (res?.success) {
        setBulkText('');
        setShowBulkModal(false);
      } else {
        setErrorMsg(res?.error || 'Failed to import participants');
      }
    });
  };

  // Start editing participant
  const startEdit = (p) => {
    if (isLocked) return;
    setEditingId(p.id);
    setEditName(p.name);
  };

  // Save edit
  const saveEdit = (id) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    onUpdateParticipant(id, { name: trimmed }, () => {
      setEditingId(null);
      setEditName('');
    });
  };

  // Auto assign trigger
  const handleAutoAssign = () => {
    if (isLocked) return;
    setErrorMsg('');
    onAutoAssign((res) => {
      if (!res?.success) {
        setErrorMsg(res?.error || 'Auto-assign failed');
      }
    });
  };

  // Shuffle confirm
  const handleConfirmShuffle = () => {
    if (isLocked) return;
    setConfirmShuffleModal(false);
    onShuffle((res) => {
      if (!res?.success) {
        setErrorMsg(res?.error || 'Shuffle failed');
      }
    });
  };

  // Calculate team size balance indicator
  const totalCount = participants.length;
  const baseSize = totalCount > 0 ? Math.floor(totalCount / currentCount) : 0;
  const remainder = totalCount % currentCount;

  return (
    <div className="space-y-6">
      {/* HEADER WITH STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              PARTICIPANT & TEAM SETUP
            </h2>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-950/60 border border-rose-600/40 text-rose-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                <Lock className="w-3 h-3" />
                MEMBERSHIP LOCKED (MATCH LIVE)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                EDITING ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Configure dynamic team counts, input participant rosters, and automatically balance teams with server randomness.
            <span className="text-amber-400/90 font-semibold ml-1">
              (Admin-only: player devices never see names or rosters)
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            disabled={isLocked}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-mono text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            BULK IMPORT
          </button>
          {participants.length > 0 && !isLocked && (
            <button
              type="button"
              onClick={() => setConfirmClearModal(true)}
              className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-mono text-xs font-bold border border-rose-800/40 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              CLEAR ROSTER
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-950/50 border border-rose-600/50 rounded-xl text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP-BY-STEP WORKFLOW CONTAINER */}
      <div className="space-y-6">
        {/* STEP 1: CHOOSE NUMBER OF TEAMS */}
        <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center font-mono">
                1
              </span>
              <h3 className="font-mono text-xs uppercase tracking-wider text-slate-200 font-black">
                CHOOSE NUMBER OF TEAMS
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              CONFIGURED FOR CURRENT MATCH: <strong className="text-amber-400 font-bold">{currentCount} TEAMS</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {[4, 5, 6].map((count) => {
              const isSelected = currentCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  disabled={isLocked}
                  onClick={() => onSetTeamCount(count)}
                  className={`p-4 rounded-xl border font-mono transition-all flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg ring-1 ring-amber-400 shadow-amber-500/10'
                      : isLocked
                      ? 'bg-[#090D16] border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-[#161F34] border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-white cursor-pointer'
                  }`}
                >
                  <span className="text-xl font-black">{count} TEAMS</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    TEAM 1 – TEAM {count}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-black mt-1">
                      ACTIVE SELECTION
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: PARTICIPANT SETUP */}
        <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center font-mono">
                2
              </span>
              <h3 className="font-mono text-xs uppercase tracking-wider text-slate-200 font-black">
                ENTER PARTICIPANT NAMES
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-amber-300 font-mono text-xs font-bold border border-slate-700">
                {totalCount} PARTICIPANTS
              </span>
            </div>
          </div>

          {/* Add Participant Input Form */}
          <form onSubmit={handleAddSingle} className="flex gap-2">
            <input
              type="text"
              disabled={isLocked}
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              placeholder="e.g. Shaber, Arun, Priya, Rahul..."
              className="flex-1 bg-[#161F34] border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLocked || !newParticipantName.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-mono text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              <span>ADD PARTICIPANT</span>
            </button>
          </form>

          {/* Participant badges / list */}
          {participants.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-[#090D16]">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-mono text-slate-400">No participants entered yet.</p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Type names above or click <button onClick={() => setShowBulkModal(true)} className="text-amber-400 underline">Bulk Import</button> to paste a list from Excel/Slack.
              </p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => {
                  const isEditing = editingId === p.id;
                  const assignedTeam = p.teamId;

                  return (
                    <div
                      key={p.id}
                      className={`inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                        assignedTeam
                          ? 'bg-[#161F34] border-slate-700 text-slate-200'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id)}
                            className="bg-black/60 border border-amber-400 rounded px-1.5 py-0.5 text-xs text-white outline-none w-28"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveEdit(p.id)}
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-rose-400 hover:text-rose-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-bold text-slate-200">{p.name}</span>
                          {assignedTeam ? (
                            <span
                              className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded"
                              style={{
                                backgroundColor: `${TEAMS[assignedTeam]?.color || '#888'}22`,
                                color: TEAMS[assignedTeam]?.color || '#ccc'
                              }}
                            >
                              T{assignedTeam}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-600 italic">Unassigned</span>
                          )}

                          {!isLocked && (
                            <div className="flex items-center gap-0.5 ml-1">
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                className="p-0.5 text-slate-500 hover:text-slate-300"
                                title="Edit Name"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveParticipant(p.id)}
                                className="p-0.5 text-slate-500 hover:text-rose-400"
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* STEP 3 & 4: AUTOMATIC BALANCED ASSIGNMENT & ROSTER REVIEW */}
        <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center font-mono">
                3
              </span>
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider text-slate-200 font-black">
                  ASSIGN & REVIEW TEAM ROSTERS
                </h3>
                <span className="text-[10px] font-mono text-slate-400 block">
                  Target Balance: {baseSize} or {baseSize + (remainder > 0 ? 1 : 0)} participants per team (Max diff &le; 1)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLocked || participants.length === 0}
                onClick={handleAutoAssign}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-mono text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed"
              >
                <UserCheck className="w-4 h-4" />
                <span>AUTO ASSIGN TEAMS</span>
              </button>

              <button
                type="button"
                disabled={isLocked || participants.length === 0}
                onClick={() => setConfirmShuffleModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-indigo-300 font-mono text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                <span>SHUFFLE TEAMS</span>
              </button>
            </div>
          </div>

          {/* TEAM ROSTER CARDS (COLUMNS) */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(currentCount, 3)} gap-4 pt-1`}>
            {teamIds.map((tid) => {
              const teamData = TEAMS[tid] || TEAMS[1];
              const members = rosters?.[tid] || [];

              return (
                <div
                  key={tid}
                  className="bg-[#141C2E] border border-slate-700 rounded-xl p-4 flex flex-col justify-between shadow-md"
                >
                  <div>
                    {/* Team Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: teamData.color }} />
                        <span className="font-mono font-black text-sm text-slate-100">{teamData.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        {members.length} {members.length === 1 ? 'MEMBER' : 'MEMBERS'}
                      </span>
                    </div>

                    {/* Member List */}
                    {members.length === 0 ? (
                      <div className="py-6 text-center text-[11px] font-mono text-slate-500 italic">
                        No members assigned yet
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="p-2 rounded-lg bg-[#0D1321] border border-slate-800 flex items-center justify-between text-xs font-mono"
                          >
                            <span className="text-slate-200 font-bold truncate">{member.name}</span>

                            {/* Manual Move Dropdown */}
                            {!isLocked && (
                              <div className="flex items-center gap-1">
                                <select
                                  value={tid}
                                  onChange={(e) => onMoveParticipant(member.id, Number(e.target.value))}
                                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 outline-none cursor-pointer hover:border-amber-400"
                                  title="Move to another team"
                                >
                                  <option value={tid} disabled>Move →</option>
                                  {teamIds.map((targetId) => (
                                    <option key={targetId} value={targetId}>
                                      TEAM {targetId}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Team Footer */}
                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>1 Active Representative Device</span>
                    <span className="text-emerald-400 font-semibold">Official Roster</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BULK IMPORT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                BULK IMPORT PARTICIPANT NAMES
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Paste participant names separated by line breaks or commas. Names will be added to the pool.
            </p>

            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Shaber&#10;Arun&#10;Rahul&#10;Kavin&#10;Priya&#10;Manoj..."
              className="w-full bg-[#161F34] border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleAddBulkSubmit}
                disabled={!bulkText.trim()}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-mono text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20"
              >
                IMPORT PARTICIPANTS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SHUFFLE MODAL */}
      {confirmShuffleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-indigo-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Shuffle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  RESHUFFLE ALL TEAMS?
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  This generates a new random, balanced team distribution.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmShuffleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmShuffle}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-500/20"
              >
                SHUFFLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR MODAL */}
      {confirmClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  CLEAR ALL PARTICIPANTS?
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  This will remove all participant names and reset team rosters.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClearModal(false);
                  onClearParticipants();
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-black rounded-xl transition-all shadow-md shadow-rose-500/20"
              >
                CLEAR ALL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
