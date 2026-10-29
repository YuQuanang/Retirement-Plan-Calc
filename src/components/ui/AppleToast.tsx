import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function AppleToast(): React.ReactElement {
  const toast = useAppStore((s) => s.toast);
  const hideToast = useAppStore((s) => s.hideToast);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[92vw] sm:max-w-md pointer-events-auto"
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-zinc-900/90 dark:bg-zinc-100/95 text-white dark:text-zinc-900 backdrop-blur-2xl shadow-2xl border border-white/10 dark:border-black/10 text-xs font-medium tracking-tight">
            {toast.type === 'success' && (
              <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertCircle size={16} className="text-rose-400 dark:text-rose-600 shrink-0" />
            )}
            {toast.type === 'info' && (
              <Info size={16} className="text-sky-400 dark:text-sky-600 shrink-0" />
            )}
            <span className="truncate">{toast.message}</span>
            <button
              onClick={hideToast}
              className="ml-1 p-0.5 rounded-full text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors shrink-0"
              aria-label="Dismiss toast"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

