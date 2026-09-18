import React, { useState } from 'react';
import { X, Check, Eye, AlertCircle, Save, Plus, Trash2 } from 'lucide-react';
import DifficultyBadge from './DifficultyBadge';

export function QuestionPreviewModal({ question, onClose }) {
  if (!question) return null;

  const isR1 = question.round === 1 || question.clue1;
  const isR2 = question.round === 2 || question.options;
  const isR3 = question.round === 3 || question.code;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-slate-700 max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {question.id}
            </span>
            <span className="text-xs font-mono font-bold text-amber-400 uppercase">
              ROUND {question.round || (isR1 ? 1 : isR2 ? 2 : 3)}
            </span>
            <DifficultyBadge difficulty={question.difficulty} />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 font-mono text-xs text-slate-200">
          <div>
            <span className="text-slate-400 text-[10px] uppercase block">Title / Domain</span>
            <span className="text-sm font-bold text-white">
              {question.title || question.website || question.domain || question.id}
            </span>
          </div>

          {/* ROUND 1 PREVIEW */}
          {isR1 && (
            <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-cyan-400 font-bold block text-[11px]">CLUES PROGRESSION</span>
              <div className="space-y-1.5">
                <p><strong className="text-cyan-300">Clue 1 (30s):</strong> {question.clue1 || question.clues?.[0]}</p>
                <p><strong className="text-cyan-300">Clue 2 (30s):</strong> {question.clue2 || question.clues?.[1]}</p>
                <p><strong className="text-cyan-300">Clue 3 (30s):</strong> {question.clue3 || question.clues?.[2]}</p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                Target Answer: {question.correctAnswer}
              </div>
              {question.acceptedAnswers?.length > 0 && (
                <div className="text-slate-400 text-[11px]">
                  Accepted Alternates: {question.acceptedAnswers.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* ROUND 2 PREVIEW */}
          {isR2 && (
            <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-amber-400 font-bold block text-[11px]">PATTERN SEQUENCE</span>
              <div className="text-base font-bold text-amber-300 py-1">
                {question.patternText}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {question.options?.map((opt, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded border font-mono ${
                      (opt.id || opt.key) === question.correctOptionId || (opt.id || opt.key) === question.correctOption
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-bold mr-1.5">[{opt.id || opt.key}]</span>
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                Correct: [{question.correctOptionId || question.correctOption}]
              </div>
              {question.explanation && (
                <div className="text-slate-400 text-[11px]">
                  Explanation: {question.explanation}
                </div>
              )}
            </div>
          )}

          {/* ROUND 3 PREVIEW */}
          {isR3 && (
            <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-rose-400 font-bold block text-[11px]">CIPHER CHALLENGE</span>
              <div className="text-base font-bold text-amber-300 tracking-wider py-1">
                {question.code}
              </div>
              {question.hint && (
                <p><strong className="text-cyan-400">Hint:</strong> {question.hint}</p>
              )}
              <div className="pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                Decoded Code: {question.correctCode}
              </div>
              {question.alternateCodes?.length > 0 && (
                <div className="text-slate-400 text-[11px]">
                  Accepted Codes: {question.alternateCodes.join(', ')}
                </div>
              )}
              {question.explanation && (
                <div className="text-slate-400 text-[11px]">
                  Explanation: {question.explanation}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
          >
            CLOSE PREVIEW
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuestionEditModal({ question, round = 1, onSave, onClose }) {
  const isEditing = Boolean(question?.id);
  const targetRound = question?.round || round || 1;

  const [formData, setFormData] = useState(() => {
    if (question) {
      return {
        id: question.id,
        round: targetRound,
        domain: question.domain || '',
        difficulty: question.difficulty || 'Medium',
        title: question.title || question.website || '',
        category: question.category || question.domain || '',
        website: question.website || '',
        correctAnswer: question.correctAnswer || '',
        acceptedAnswersText: Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers.join(', ') : '',
        clue1: question.clue1 || question.clues?.[0] || '',
        clue2: question.clue2 || question.clues?.[1] || '',
        clue3: question.clue3 || question.clues?.[2] || '',
        patternText: question.patternText || '',
        optionA: question.options?.find(o => (o.id || o.key) === 'A')?.text || '',
        optionB: question.options?.find(o => (o.id || o.key) === 'B')?.text || '',
        optionC: question.options?.find(o => (o.id || o.key) === 'C')?.text || '',
        optionD: question.options?.find(o => (o.id || o.key) === 'D')?.text || '',
        correctOptionId: question.correctOptionId || question.correctOption || 'A',
        code: question.code || '',
        hint: question.hint || '',
        correctCode: question.correctCode || '',
        alternateCodesText: Array.isArray(question.alternateCodes) ? question.alternateCodes.join(', ') : '',
        explanation: question.explanation || '',
        isActive: question.isActive !== false
      };
    }
    return {
      round: targetRound,
      domain: targetRound === 1 ? 'Programming' : '',
      difficulty: 'Medium',
      title: '',
      category: '',
      website: '',
      correctAnswer: '',
      acceptedAnswersText: '',
      clue1: '',
      clue2: '',
      clue3: '',
      patternText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOptionId: 'A',
      code: '',
      hint: '',
      correctCode: '',
      alternateCodesText: '',
      explanation: '',
      isActive: true
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const result = {
      ...formData,
      round: targetRound
    };

    if (targetRound === 1) {
      result.website = result.website || result.title;
      result.clues = [result.clue1, result.clue2, result.clue3].filter(Boolean);
      result.acceptedAnswers = result.acceptedAnswersText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    } else if (targetRound === 2) {
      result.options = [
        { id: 'A', key: 'A', text: result.optionA },
        { id: 'B', key: 'B', text: result.optionB },
        { id: 'C', key: 'C', text: result.optionC },
        { id: 'D', key: 'D', text: result.optionD }
      ];
      result.correctOption = result.correctOptionId;
    } else if (targetRound === 3) {
      result.alternateCodes = result.alternateCodesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      result.acceptedCodes = result.alternateCodes;
      result.timeLimit = 45;
    }

    onSave(result);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-slate-700 max-w-2xl w-full rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-mono">
              {isEditing ? `EDIT CHALLENGE (${formData.id})` : `ADD ROUND ${targetRound} CHALLENGE`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Status</label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              >
                <option value="active">Active (Available for games)</option>
                <option value="inactive">Disabled (Excluded from games)</option>
              </select>
            </div>
          </div>

          {/* ROUND 1 FIELDS */}
          {targetRound === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Domain</label>
                  <input
                    type="text"
                    required
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. Programming, Database"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Platform / Subject Name</label>
                  <input
                    type="text"
                    required
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. GitHub"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Primary Correct Answer</label>
                <input
                  type="text"
                  required
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-bold"
                  placeholder="e.g. GitHub"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Accepted Alternates (Comma-separated)</label>
                <input
                  type="text"
                  value={formData.acceptedAnswersText}
                  onChange={(e) => setFormData({ ...formData, acceptedAnswersText: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g. github, github.com, git hub"
                />
              </div>

              <div>
                <label className="text-cyan-400 block mb-1">Clue 1 (Hardest / Most General)</label>
                <textarea
                  required
                  rows={2}
                  value={formData.clue1}
                  onChange={(e) => setFormData({ ...formData, clue1: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="First 30s clue..."
                />
              </div>

              <div>
                <label className="text-cyan-400 block mb-1">Clue 2 (Moderate)</label>
                <textarea
                  required
                  rows={2}
                  value={formData.clue2}
                  onChange={(e) => setFormData({ ...formData, clue2: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Second 30s clue..."
                />
              </div>

              <div>
                <label className="text-cyan-400 block mb-1">Clue 3 (Easiest / Direct)</label>
                <textarea
                  required
                  rows={2}
                  value={formData.clue3}
                  onChange={(e) => setFormData({ ...formData, clue3: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Final 30s clue..."
                />
              </div>
            </div>
          )}

          {/* ROUND 2 FIELDS */}
          {targetRound === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Title / Name</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. Geometric Binary Sequence"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. Number Pattern, Logic Pattern"
                  />
                </div>
              </div>

              <div>
                <label className="text-amber-400 block mb-1">Pattern Sequence Text</label>
                <input
                  type="text"
                  required
                  value={formData.patternText}
                  onChange={(e) => setFormData({ ...formData, patternText: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-bold"
                  placeholder="2  →  4  →  8  →  16  →  32  →  ?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Option A</label>
                  <input
                    type="text"
                    required
                    value={formData.optionA}
                    onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option B</label>
                  <input
                    type="text"
                    required
                    value={formData.optionB}
                    onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option C</label>
                  <input
                    type="text"
                    required
                    value={formData.optionC}
                    onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option D</label>
                  <input
                    type="text"
                    required
                    value={formData.optionD}
                    onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-emerald-400 block mb-1">Correct Option</label>
                  <select
                    value={formData.correctOptionId}
                    onChange={(e) => setFormData({ ...formData, correctOptionId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-bold font-mono"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Explanation</label>
                  <input
                    type="text"
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Explanation for players"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ROUND 3 FIELDS */}
          {targetRound === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. A1Z26 Cipher"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. Numerical Cipher"
                  />
                </div>
              </div>

              <div>
                <label className="text-amber-400 block mb-1">Encrypted Cipher Text / Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-bold"
                  placeholder="e.g. 19 - 5 - 3 - 21 - 18 - 5"
                />
              </div>

              <div>
                <label className="text-cyan-400 block mb-1">Hint for Teams</label>
                <input
                  type="text"
                  value={formData.hint}
                  onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g. A = 1, B = 2, C = 3 ... Z = 26"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-emerald-400 block mb-1">Correct Passcode</label>
                  <input
                    type="text"
                    required
                    value={formData.correctCode}
                    onChange={(e) => setFormData({ ...formData, correctCode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-bold"
                    placeholder="e.g. SECURE"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Alternate Codes (Comma-separated)</label>
                  <input
                    type="text"
                    value={formData.alternateCodesText}
                    onChange={(e) => setFormData({ ...formData, alternateCodesText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. secure, SECURE"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Explanation</label>
                <input
                  type="text"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="How the cipher resolves"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-mono text-xs font-black transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>SAVE CHALLENGE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SelectedQuestionsModal({ summary, selectedIds, round1All, round2All, round3All, onClose }) {
  const r1List = summary?.round1 || [];
  const r2List = summary?.round2 || [];
  const r3List = summary?.round3 || [];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-slate-700 max-w-3xl w-full rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white font-mono">SELECTED TOURNAMENT QUESTIONS (30)</h3>
            <p className="text-xs text-slate-400 font-mono">
              The authoritative set of 10 challenges selected per round for this tournament session.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 font-mono text-xs">
          {/* ROUND 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-cyan-900/40 pb-1">
              <span>ROUND 1: CLUE HUNT ({r1List.length} SELECTED)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {r1List.map((item, idx) => (
                <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold text-[10px]">Q{idx + 1}.</span>
                    <span className="text-white font-semibold">{item.title}</span>
                  </div>
                  <DifficultyBadge difficulty={item.difficulty} />
                </div>
              ))}
            </div>
          </div>

          {/* ROUND 2 */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-amber-400 font-bold border-b border-amber-900/40 pb-1">
              <span>ROUND 2: PATTERN BREAK ({r2List.length} SELECTED)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {r2List.map((item, idx) => (
                <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold text-[10px]">C{idx + 1}.</span>
                    <span className="text-white font-semibold">{item.title}</span>
                  </div>
                  <DifficultyBadge difficulty={item.difficulty} />
                </div>
              ))}
            </div>
          </div>

          {/* ROUND 3 */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-rose-400 font-bold border-b border-rose-900/40 pb-1">
              <span>ROUND 3: CODE CRACKER ({r3List.length} SELECTED)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {r3List.map((item, idx) => (
                <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400 font-bold text-[10px]">P{idx + 1}.</span>
                    <span className="text-white font-semibold">{item.title}</span>
                  </div>
                  <DifficultyBadge difficulty={item.difficulty} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
