import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, ArrowDownToLine, X, FileText, Layers, Table2, CheckCircle2 } from 'lucide-react';
import { PrintDossierDocument } from './PrintDossierDocument';
import { useAppStore } from '../../store/useAppStore';

interface PDFReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'all' as const, label: 'Both Pages', sublabel: 'Back-to-Back', icon: Layers },
  { id: 'page1' as const, label: 'Page 1', sublabel: 'Briefing & Assets', icon: FileText },
  { id: 'page2' as const, label: 'Page 2', sublabel: 'Ledger & Risk', icon: Table2 },
];

// ── Apple spring presets ─────────────────────────────────────────────────────
const spring = { type: 'spring', stiffness: 500, damping: 38 } as const;
const softSpring = { type: 'spring', stiffness: 360, damping: 32 } as const;

export function PDFReportModal({ isOpen, onClose }: PDFReportModalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'all' | 'page1' | 'page2'>('all');
  const showToast = useAppStore((s) => s.showToast);

  const handlePrint = () => {
    showToast('Print dialog opening — choose "Save as PDF" for a pixel-perfect 2-page dossier.', 'info');
    setTimeout(() => window.print(), 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 no-print">
          {/* ── Frosted backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md"
            onClick={onClose}
          />

          {/* ── Modal shell ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16, transition: { duration: 0.18 } }}
            transition={softSpring}
            className="relative z-10 w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.09] dark:border-white/[0.09] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.35)] overflow-hidden"
          >
            {/* ── Header bar ── */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-black/[0.07] dark:border-white/[0.07] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring, delay: 0.06 }}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-md"
                >
                  <FileText size={18} strokeWidth={2} className="text-white" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...softSpring, delay: 0.08 }}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      Retirement Plan PDF Dossier
                    </h2>
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200/60 dark:border-rose-900/50">
                      2-Page A4
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Full-fidelity vector PDF · Exact A4 · Zero blank pages
                  </p>
                </motion.div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...spring, delay: 0.1 }}
                  whileHover={{ scale: 1.025, backgroundColor: '#0077ED' }}
                  whileTap={{ scale: 0.965 }}
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0071E3] text-white text-[12px] font-semibold shadow-md border border-white/15 select-none cursor-pointer transition-shadow hover:shadow-lg"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <ArrowDownToLine size={13} strokeWidth={2.5} />
                  <span>Save as PDF</span>
                </motion.button>

                {/* Close button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.12 }}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.07)' }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </motion.button>
              </div>
            </div>

            {/* ── Apple Segmented Tab Bar ── */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...softSpring, delay: 0.1 }}
              className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-b border-black/[0.05] dark:border-white/[0.05] bg-zinc-100/60 dark:bg-zinc-800/50"
            >
              {/* Hint */}
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span>Choose <strong className="text-zinc-700 dark:text-zinc-300">Save as PDF</strong> in print dialog · 2 pages, no blank overflow</span>
              </div>

              {/* Segmented pill tabs */}
              <div className="relative inline-flex p-1 rounded-[13px] bg-black/[0.06] dark:bg-white/[0.07] gap-0.5">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[11px] select-none cursor-pointer transition-colors"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {active && (
                        <motion.div
                          layoutId="pdf-tab-pill"
                          className="absolute inset-0 rounded-[10px] bg-white dark:bg-zinc-700 shadow-[0_1px_4px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)]"
                          transition={spring}
                        />
                      )}
                      <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${
                        active
                          ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                          : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-700 dark:hover:text-zinc-300'
                      }`}>
                        <Icon size={12} strokeWidth={active ? 2.2 : 1.8} />
                        <span>{tab.label}</span>
                        <span className="text-[10px] opacity-60">{tab.sublabel}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Scrollable Preview Area ── */}
            <div className="flex-1 overflow-y-auto bg-zinc-200/40 dark:bg-zinc-950/60" style={{ overscrollBehavior: 'contain' }}>
              <div className="min-h-full p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.99 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <PrintDossierDocument previewMode={true} pageView={activeTab} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* ── Footer strip ── */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-t border-black/[0.06] dark:border-white/[0.06] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
              <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Inline SVG charts render sharply at all print resolutions — no rasterization
              </span>
              <button
                type="button"
                onClick={handlePrint}
                className="text-[11px] font-semibold text-[#0071E3] hover:text-[#0077ED] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer size={12} />
                Print / Save now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
