import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ParamSidebar } from '../sidebar/ParamSidebar';

interface SidebarContainerProps {
  desktopOpen: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarContainer({ desktopOpen, mobileOpen, onCloseMobile }: SidebarContainerProps) {
  return (
    <>
      {/* Desktop: Collapsible sidebar with smooth spring slide */}
      <AnimatePresence initial={false}>
        {desktopOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex flex-col flex-shrink-0 border-r border-zinc-200/70 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md overflow-hidden h-full z-20"
          >
            <div className="w-80 h-full overflow-y-auto p-4 custom-scrollbar">
              <ParamSidebar />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile: Drawer sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto pt-4 pb-8 shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Parameters</h2>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-4">
                <ParamSidebar />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
