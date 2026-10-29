import React, { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { LayoutDashboard, TrendingUp, Table2, FlaskConical, PanelLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { TopNav } from './components/layout/TopNav';
import { SidebarContainer } from './components/layout/SidebarContainer';
import { AppleToast } from './components/ui/AppleToast';
import { PDFReportModal } from './components/pdf/PDFReportModal';
import { PrintDossierDocument } from './components/pdf/PrintDossierDocument';
import { CommandCenterView } from './components/modules/CommandCenterView';
import { AccumulationView } from './components/modules/AccumulationView';
import { LedgerView } from './components/modules/LedgerView';
import { StressTestView } from './components/modules/StressTestView';

const MODULES = [
  { id: 'command' as const, label: 'Command Center', shortLabel: 'Command', icon: LayoutDashboard },
  { id: 'accumulation' as const, label: 'Accumulation', shortLabel: 'Accumulation', icon: TrendingUp },
  { id: 'ledger' as const, label: 'Cash Flow Ledger', shortLabel: 'Ledger', icon: Table2 },
  { id: 'stress' as const, label: 'Stress Testing', shortLabel: 'Stress', icon: FlaskConical },
];

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("SG FIRE Studio Module Error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('sg-fire-studio');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900 shadow-apple-card max-w-lg mx-auto my-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Module Temporarily Unavailable
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              A state formatting error occurred while loading this view. Resetting stored inputs to default values will restore normal operation.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-apple-blue text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-sm"
          >
            <RefreshCw size={14} /> Reset Inputs to Default
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ModuleContent({ activeModule }: { activeModule: string }) {
  return (
    <ErrorBoundary>
      <motion.div
        key={activeModule}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        {activeModule === 'command' && <CommandCenterView />}
        {activeModule === 'accumulation' && <AccumulationView />}
        {activeModule === 'ledger' && <LedgerView />}
        {activeModule === 'stress' && <StressTestView />}
      </motion.div>
    </ErrorBoundary>
  );
}

export default function App() {
  const { darkMode, activeModule, setActiveModule, pdfModalOpen, setPdfModalOpen } = useAppStore();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setDesktopSidebarOpen((prev) => !prev);
    } else {
      setMobileSidebarOpen((prev) => !prev);
    }
  };

  return (
    <>
      {/* ── Regular Interactive Screen View ── */}
      <div id="app-screen-root" className="min-h-screen bg-[#F5F5F7] dark:bg-black font-sans antialiased text-zinc-900 dark:text-zinc-100">
        <AppleToast />
        <PDFReportModal isOpen={pdfModalOpen} onClose={() => setPdfModalOpen(false)} />
        <TopNav />

        <div className="flex h-screen pt-14 overflow-hidden">
          {/* Responsive Sidebar (collapsible on desktop & mobile drawer) */}
          <SidebarContainer
            desktopOpen={desktopSidebarOpen}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          {/* Main Content Cockpit */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Module Tab & Action Bar */}
            <div className="flex-shrink-0 px-3 sm:px-4 lg:px-6 py-2.5 border-b border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md z-10">
              <div className="flex items-center justify-between gap-2 max-w-[2100px] mx-auto">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Unified Sidebar Toggle Button (macOS style) */}
                  <button
                    type="button"
                    onClick={handleToggleSidebar}
                    title={desktopSidebarOpen ? 'Hide Parameters Sidebar' : 'Show Parameters Sidebar'}
                    className={`p-1.5 rounded-xl border transition-all ${
                      desktopSidebarOpen
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-apple-blue dark:text-blue-400'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <PanelLeft size={15} strokeWidth={1.5} />
                  </button>

                  {/* Module tabs with Apple sliding pill */}
                  <div className="relative flex p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 gap-0.5 overflow-x-auto no-scrollbar">
                    {MODULES.map((mod) => {
                      const Icon = mod.icon;
                      const active = activeModule === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => setActiveModule(mod.id)}
                          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            active
                              ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          {active && (
                            <motion.div
                              layoutId="active-module-pill"
                              className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-lg shadow-sm border border-black/[0.04] dark:border-white/[0.06]"
                              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <Icon size={13} strokeWidth={1.5} />
                            <span className="hidden sm:inline">{mod.label}</span>
                            <span className="sm:hidden">{mod.shortLabel}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Scalable Viewport Canvas: Minimal or zero scrolling on widescreen monitors */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#F5F5F7] dark:bg-black">
              <div className="w-full max-w-[2100px] mx-auto p-3 sm:p-4 lg:p-5 2xl:p-6 transition-all">
                <ModuleContent activeModule={activeModule} />
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* ── Print Dossier Document (rendered for browser print-to-PDF engine) ── */}
      <div id="print-dossier-root">
        <PrintDossierDocument previewMode={false} />
      </div>
    </>
  );
}
