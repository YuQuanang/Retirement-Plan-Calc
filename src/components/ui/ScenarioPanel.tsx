import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Upload, Plus, Trash2, Check, Flame, X, FolderArchive, Layers, Clock, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ScenarioPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScenarioPanel({ isOpen, onClose }: ScenarioPanelProps): React.ReactElement {
  const {
    scenarios,
    activeScenarioId,
    saveScenario,
    loadScenario,
    resetToBaseCase,
    deleteScenario,
    exportJSON,
    importJSON,
    setPdfModalOpen,
  } = useAppStore();

  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!newName.trim()) return;
    saveScenario(newName.trim());
    setNewName('');
    setSaving(false);
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        importJSON(content);
        onClose();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible click-away interceptor: ZERO full-screen backdrop-blur or darkening to eliminate flicker */}
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Apple HIG Frosted Glass Popover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', stiffness: 480, damping: 32 }}
            className="absolute top-full right-0 mt-2 z-50 w-88 sm:w-96 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-2xl border border-black/[0.08] dark:border-white/[0.12] shadow-2xl shadow-black/15 dark:shadow-black/60 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.05] dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-apple-blue/10 dark:bg-apple-blue/20 flex items-center justify-center text-apple-blue">
                  <FolderArchive size={15} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Plan Scenarios & Backup
                  </h3>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    Switch scenarios, download PDF, or export/import JSON
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close popover"
              >
                <X size={14} />
              </button>
            </div>

            {/* Prominent Download PDF Action in the Base Case tab */}
            <div className="p-2.5 pb-1 border-b border-black/[0.04] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-zinc-800/40">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setPdfModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/10 via-red-500/10 to-amber-500/10 hover:from-rose-500/15 hover:to-amber-500/15 border border-rose-200/80 dark:border-rose-900/40 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <FileText size={13} strokeWidth={2.2} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs leading-tight">
                      Download PDF Dossier
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate mt-0.5">
                      2-page back-to-back printable retirement report
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-white/90 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-rose-200/70 dark:border-rose-900/60 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                  <Download size={11} strokeWidth={2.4} /> PDF
                </span>
              </button>
            </div>

            {/* Scrollable Scenarios List */}
            <div className="p-2.5 space-y-1.5 max-h-[310px] overflow-y-auto no-scrollbar">
              {/* Pinned Default Option: Base Case */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  resetToBaseCase();
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    resetToBaseCase();
                    onClose();
                  }
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeScenarioId === null
                    ? 'bg-apple-blue/10 dark:bg-apple-blue/20 border border-apple-blue/30 shadow-xs'
                    : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Flame size={15} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Base Case</p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 font-medium">
                        Default
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                      Age 65 · CPF FRS Standard · Default plan
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2 flex items-center gap-1.5">
                  {activeScenarioId === null ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-apple-blue bg-white/80 dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-xs">
                      <Check size={11} strokeWidth={2.5} /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Switch</span>
                  )}
                </div>
              </div>

              {/* Saved Custom Scenarios Heading */}
              {scenarios.length > 0 && (
                <div className="flex items-center justify-between px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  <span>Saved Snapshots ({scenarios.length})</span>
                </div>
              )}

              {/* Scenarios List */}
              {scenarios.map((s) => {
                const isActive = activeScenarioId === s.id;
                const formattedDate = new Date(s.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      loadScenario(s.id);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        loadScenario(s.id);
                        onClose();
                      }
                    }}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-apple-blue/10 dark:bg-apple-blue/20 border border-apple-blue/30 shadow-xs'
                        : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                        <Layers size={14} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {s.name}
                          </p>
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5 shrink-0">
                            <Clock size={9} /> {formattedDate}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                          Retire {s.fireInputs.retirementAge} · Live to {s.fireInputs.lifeExpectancy} · ${s.fireInputs.currentMonthlySpending.toLocaleString()}/mo · CPF {(s.fireInputs.cpfTier ?? 'frs').toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-apple-blue bg-white/80 dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-xs">
                          <Check size={11} strokeWidth={2.5} /> Active
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteScenario(s.id);
                        }}
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors opacity-70 group-hover:opacity-100"
                        title="Delete snapshot"
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty state when no custom scenarios */}
              {scenarios.length === 0 && (
                <div className="px-4 py-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-1">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">No custom snapshots yet</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    Adjust any inputs, then click "Save Snapshot" below to preserve your plan variation.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions Area */}
            <div className="p-3 border-t border-black/[0.05] dark:border-white/[0.08] bg-zinc-50/60 dark:bg-zinc-900/60 space-y-2">
              {saving ? (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      autoFocus
                      placeholder="Snapshot name (e.g. Early FIRE at 55)..."
                      className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-apple-blue/40"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') setSaving(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!newName.trim()}
                      className="px-3 py-1.5 rounded-xl bg-apple-blue text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaving(false)}
                      className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSaving(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-apple-blue text-white text-xs font-semibold hover:bg-blue-600 active:scale-[0.99] transition-all shadow-xs"
                >
                  <Plus size={14} strokeWidth={2.2} />
                  <span>Save Current Inputs as Snapshot</span>
                </button>
              )}

              {/* Backup & Restore Controls */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setPdfModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-900/30 transition-colors shadow-2xs"
                  title="Download complete 2-page back-to-back PDF Retirement Dossier"
                >
                  <FileText size={12} className="text-rose-600 dark:text-rose-400" />
                  <span>PDF Dossier</span>
                </button>

                <button
                  type="button"
                  onClick={exportJSON}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                  title="Download all inputs and snapshots as a .json backup file"
                >
                  <Download size={12} className="text-zinc-500 dark:text-zinc-400" />
                  <span>JSON Export</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerImport}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                  title="Upload and restore a previously saved SG FIRE Studio .json plan"
                >
                  <Upload size={12} className="text-zinc-500 dark:text-zinc-400" />
                  <span>JSON Import</span>
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
