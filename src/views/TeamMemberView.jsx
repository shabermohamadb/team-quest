import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  UserCheck,
  Shield,
  X
} from 'lucide-react';
import socket, { getApiUrl } from '../utils/socket';
import { TEAMS } from '../utils/constants';
import TeamBadge from '../components/TeamBadge';

export default function TeamMemberView({
  onNavigate,
  playerTeam: propPlayerTeam,
  teamCount: propTeamCount = 4
}) {
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('ALL'); // 'ALL' | 'MY_TEAM' | number

  // Detect saved player session if not passed as prop
  const activePlayerTeam = useMemo(() => {
    if (propPlayerTeam) return Number(propPlayerTeam);
    try {
      const saved = localStorage.getItem('team_quest_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.team) return Number(parsed.team);
      }
    } catch (_) {}
    return null;
  }, [propPlayerTeam]);

  // Fetch rosters from REST API
  const fetchRosters = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(getApiUrl('/api/rosters'));
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data && data.rosters) {
        setRosterData(data);
        setError(null);
      }
    } catch (err) {
      console.warn('[TeamMemberView] Failed to fetch rosters:', err.message);
      setError('Unable to load latest team members. Checking live connection...');
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 400);
      }
    }
  };

  // Initial fetch and socket event listeners
  useEffect(() => {
    fetchRosters();

    // Fast socket sync
    const handleRosterUpdate = (data) => {
      if (data && data.rosters) {
        setRosterData(data);
        setLoading(false);
        setError(null);
      }
    };

    if (socket.connected) {
      socket.emit('get_rosters', {}, (res) => {
        if (res && res.rosters) {
          setRosterData(res);
          setLoading(false);
        }
      });
    }

    socket.on('rosters_updated', handleRosterUpdate);
    socket.on('game_state_update', () => fetchRosters());

    return () => {
      socket.off('rosters_updated', handleRosterUpdate);
    };
  }, []);

  const teamCount = Number(rosterData?.teamCount) || Number(propTeamCount) || 4;
  const teamIds = Array.from({ length: teamCount }, (_, i) => i + 1);

  // Filtered members calculation
  const searchNormalized = searchQuery.trim().toLowerCase();

  const filteredRosters = useMemo(() => {
    if (!rosterData?.rosters) return {};
    const result = {};

    teamIds.forEach((tid) => {
      // If filtering by specific tab
      if (selectedTab === 'MY_TEAM' && tid !== activePlayerTeam) {
        return;
      }
      if (typeof selectedTab === 'number' && tid !== selectedTab) {
        return;
      }

      const rawList = rosterData.rosters[tid] || [];
      if (!searchNormalized) {
        result[tid] = rawList;
      } else {
        result[tid] = rawList.filter((m) =>
          (m.name || '').toLowerCase().includes(searchNormalized)
        );
      }
    });

    return result;
  }, [rosterData, teamIds, selectedTab, activePlayerTeam, searchNormalized]);

  // Count total matches when searching
  const totalMatches = useMemo(() => {
    let count = 0;
    Object.values(filteredRosters).forEach((list) => {
      count += list.length;
    });
    return count;
  }, [filteredRosters]);

  const totalParticipants = rosterData?.totalParticipants || 0;

  const highlightMatch = (name, query) => {
    if (!query) return name;
    const lowerName = name.toLowerCase();
    const idx = lowerName.indexOf(query.toLowerCase());
    if (idx === -1) return name;

    const before = name.substring(0, idx);
    const match = name.substring(idx, idx + query.length);
    const after = name.substring(idx + query.length);

    return (
      <>
        {before}
        <span className="bg-amber-400 text-black font-black px-1 rounded mx-0.5">
          {match}
        </span>
        {after}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col select-none">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-[#090E18]/95 backdrop-blur border-b border-[#1A2338] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Back to Game Button */}
          <button
            onClick={() => onNavigate ? onNavigate('player') : (window.location.href = '/game')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1E293B] bg-[#0E1524] hover:bg-[#151F33] hover:border-amber-500/50 text-zinc-300 hover:text-white transition-all text-xs md:text-sm font-mono font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>BACK TO GAME</span>
          </button>

          {/* Title Branding */}
          <div className="flex items-center gap-2 text-center">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black font-mono text-xs">
              Q
            </div>
            <h1 className="font-mono font-black text-sm md:text-base tracking-wider text-slate-100 flex items-center gap-2">
              TEAM ROSTER
              <span className="hidden sm:inline text-zinc-500 font-normal text-xs">
                • AURA 7F
              </span>
            </h1>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchRosters(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E293B] bg-[#0E1524] hover:bg-[#151F33] text-zinc-300 hover:text-white transition-all text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
            title="Refresh rosters"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">REFRESH</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Banner: Current Player's Team Spotlight */}
        {activePlayerTeam && TEAMS[activePlayerTeam] && (
          <div
            className="rounded-2xl p-4 md:p-5 border relative overflow-hidden transition-all shadow-xl"
            style={{
              borderColor: `${TEAMS[activePlayerTeam].color}55`,
              background: `linear-gradient(135deg, ${TEAMS[activePlayerTeam].color}15 0%, #0A101D 100%)`
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3.5">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 animate-pulse"
                  style={{ backgroundColor: TEAMS[activePlayerTeam].color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      YOUR ASSIGNED SQUAD
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black font-mono tracking-tight text-white">
                    {TEAMS[activePlayerTeam].name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTab(selectedTab === 'MY_TEAM' ? 'ALL' : 'MY_TEAM')}
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                    selectedTab === 'MY_TEAM'
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20'
                      : 'bg-[#11192A] text-zinc-300 border-[#22314E] hover:border-amber-400/50'
                  }`}
                >
                  {selectedTab === 'MY_TEAM' ? 'Showing My Squad Only' : 'View Only My Squad'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="space-y-3 bg-[#0B101C]/80 p-4 rounded-2xl border border-[#162035]">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search participant name (e.g. Andrea, Vishal, Dharshan...)"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#080C16] border border-[#1D273D] text-sm font-mono text-slate-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-zinc-400 px-3 py-2 rounded-xl bg-[#080C16] border border-[#1D273D]">
              <Users className="w-4 h-4 text-amber-400" />
              <span>
                {searchNormalized
                  ? `${totalMatches} Match${totalMatches === 1 ? '' : 'es'}`
                  : `${totalParticipants} Tournament Players`}
              </span>
            </div>
          </div>

          {/* Team Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all shrink-0 border cursor-pointer ${
                selectedTab === 'ALL'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                  : 'bg-[#0E1524] text-zinc-400 border-[#1B253B] hover:text-zinc-200'
              }`}
            >
              ALL TEAMS ({teamCount})
            </button>

            {activePlayerTeam && (
              <button
                onClick={() => setSelectedTab('MY_TEAM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all shrink-0 border cursor-pointer flex items-center gap-1.5 ${
                  selectedTab === 'MY_TEAM'
                    ? 'bg-amber-400 text-black border-amber-400 font-black'
                    : 'bg-[#0E1524] text-amber-400 border-[#1B253B] hover:border-amber-500/40'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                MY SQUAD (T{activePlayerTeam})
              </button>
            )}

            {teamIds.map((tid) => {
              const tData = TEAMS[tid] || TEAMS[1];
              const isSelected = selectedTab === tid;
              const count = rosterData?.rosters?.[tid]?.length || 0;

              return (
                <button
                  key={tid}
                  onClick={() => setSelectedTab(tid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all shrink-0 border cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#152033] text-white shadow-md'
                      : 'bg-[#0E1524] text-zinc-400 border-[#1B253B] hover:text-zinc-200'
                  }`}
                  style={{
                    borderColor: isSelected ? tData.color : undefined
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tData.color }} />
                  <span>{tData.name}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && !rosterData && (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="font-mono text-sm text-zinc-400">Loading squad rosters...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono text-center">
            {error}
          </div>
        )}

        {/* Roster Cards Grid */}
        {rosterData && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {teamIds.map((tid) => {
              const members = filteredRosters[tid];
              // If tab filter excluded this team, return null
              if (members === undefined) return null;

              const tData = TEAMS[tid] || TEAMS[1];
              const isMyTeam = activePlayerTeam === tid;
              const totalTeamMembers = rosterData?.rosters?.[tid]?.length || 0;

              return (
                <div
                  key={tid}
                  className={`rounded-2xl border bg-[#0A0F1D]/90 flex flex-col overflow-hidden transition-all shadow-lg ${
                    isMyTeam
                      ? 'ring-1 ring-amber-500/50 border-amber-500/60'
                      : 'border-[#18233A]'
                  }`}
                  style={{
                    boxShadow: isMyTeam ? `0 0 24px -6px ${tData.color}40` : undefined
                  }}
                >
                  {/* Card Header */}
                  <div
                    className="p-4 border-b border-[#18233A] flex items-center justify-between"
                    style={{
                      background: `linear-gradient(180deg, ${tData.color}15 0%, transparent 100%)`
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: tData.color }}
                      />
                      <div>
                        <h3 className="font-mono font-black text-base text-white flex items-center gap-1.5">
                          {tData.name}
                          {isMyTeam && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-black uppercase">
                              YOU
                            </span>
                          )}
                        </h3>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {totalTeamMembers} Total Members
                        </span>
                      </div>
                    </div>

                    <TeamBadge team={tid} size="sm" />
                  </div>

                  {/* Members List */}
                  <div className="p-3 flex-1 overflow-y-auto max-h-[460px] space-y-1.5 scrollbar-thin">
                    {members.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 font-mono text-xs">
                        {searchNormalized
                          ? 'No matching members in this team.'
                          : 'No members assigned yet.'}
                      </div>
                    ) : (
                      members.map((member, idx) => {
                        const isHighlighted = searchNormalized && member.name.toLowerCase().includes(searchNormalized);

                        return (
                          <div
                            key={member.id || idx}
                            className={`px-3 py-2 rounded-xl flex items-center justify-between border transition-all ${
                              isHighlighted
                                ? 'bg-amber-500/15 border-amber-500/50 text-white'
                                : 'bg-[#0E1524]/70 border-[#152033] hover:border-[#22324F] text-zinc-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Initial Circle Avatar */}
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-xs shrink-0 text-white"
                                style={{ backgroundColor: `${tData.color}40`, border: `1px solid ${tData.color}80` }}
                              >
                                {(member.name || '?')[0].toUpperCase()}
                              </div>

                              {/* Member Name */}
                              <span className="font-mono font-bold text-sm truncate">
                                {highlightMatch(member.name, searchNormalized)}
                              </span>
                            </div>

                            {/* Position Number */}
                            <span className="text-[11px] font-mono text-zinc-500 shrink-0 ml-2">
                              #{idx + 1}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Unassigned / Reserve Players (if any) */}
        {rosterData?.unassigned && rosterData.unassigned.length > 0 && selectedTab === 'ALL' && (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#090D18]/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase font-bold text-zinc-400">
                UNASSIGNED / RESERVE PLAYERS ({rosterData.unassigned.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {rosterData.unassigned.map((p, idx) => (
                <span
                  key={p.id || idx}
                  className="px-2.5 py-1 rounded-lg bg-[#0E1524] border border-[#1A253C] text-xs font-mono text-zinc-300"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer info bar */}
      <footer className="mt-auto border-t border-[#151F33] bg-[#070B14] p-4 text-center text-xs font-mono text-zinc-500 space-y-1">
        <p>
          Team Quest Tournament • Roster allocations are balanced (&Delta; &le; 1) • 4 Teams Active
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-600 pt-1">
          <button
            onClick={() => onNavigate ? onNavigate('player') : (window.location.href = '/game')}
            className="hover:text-amber-400 transition-colors cursor-pointer"
          >
            Player Lobby
          </button>
          <span>•</span>
          <a href="/leaderboard" className="hover:text-amber-400 transition-colors">
            Live Leaderboard
          </a>
          <span>•</span>
          <a href="/admin" className="hover:text-amber-400 transition-colors">
            Admin Panel
          </a>
        </div>
      </footer>
    </div>
  );
}
