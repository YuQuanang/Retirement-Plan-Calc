import { useState } from "react";
import { motion } from 'framer-motion';
import { Moon, Sun, ChevronDown, Flame } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ScenarioPanel } from '../ui/ScenarioPanel';

export function TopNav() {
  const { darkMode, toggleDarkMode, scenarios, activeScenarioId } = useAppStore();
  const [scenarioPanelOpen, setScenarioPanelOpen] = useState(false);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-30 h-14 flex items-center px-4 lg:px-6 backdrop-blur-xl bg-white/75 dark:bg-zinc-900/75 border-b border-black/[0.06] dark:border-white/[0.08]">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-apple-blue to-indigo-500 flex items-center justify-center">
            <Flame size={14} className="text-white" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">SG FIRE Studio</span>
            <span className="hidden sm:inline text-[10px] text-zinc-400 dark:text-zinc-500 ml-2 uppercase tracking-wider">Singapore Retirement Toolkit</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Base Case / Scenario Pill & Popover Menu (Apple HIG anchor) */}
        <div className="relative mr-2">
          <button
            type="button"
            onClick={() => setScenarioPanelOpen((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              scenarioPanelOpen
                ? 'border-apple-blue/50 bg-apple-blue/10 text-apple-blue dark:bg-apple-blue/20 dark:border-apple-blue/50 ring-2 ring-apple-blue/20'
                : 'border-zinc-200/90 dark:border-zinc-700/90 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 shadow-2xs'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-apple-blue shrink-0 animate-pulse" />
            <span className="font-semibold tracking-tight max-w-[140px] truncate">
              {activeScenario?.name ?? 'Base Case'}
            </span>
            <ChevronDown
              size={12}
              className={`text-zinc-400 transition-transform duration-200 ${
                scenarioPanelOpen ? 'rotate-180 text-apple-blue' : ''
              }`}
            />
          </button>

          <ScenarioPanel isOpen={scenarioPanelOpen} onClose={() => setScenarioPanelOpen(false)} />
        </div>

        {/* Dark mode toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleDarkMode}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {darkMode ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
        </motion.button>
      </header>
    </>
  );
}
