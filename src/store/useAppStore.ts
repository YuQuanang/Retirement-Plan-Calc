import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FireInputs, AccumulationInputs, StressTestInputs } from '../engine/fireMath';

// ─── Scenario Snapshot ────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  fireInputs: FireInputs;
  accumulationInputs: AccumulationInputs;
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  // Active module tab
  activeModule: 'command' | 'accumulation' | 'ledger' | 'stress';

  // Dark mode
  darkMode: boolean;

  // FIRE Inputs
  fireInputs: FireInputs;

  // Accumulation Inputs
  accumulationInputs: AccumulationInputs;

  // Stress Test Inputs
  stressInputs: StressTestInputs;

  // Scenarios
  scenarios: Scenario[];
  activeScenarioId: string | null;

  // Ledger display mode
  ledgerDisplayMode: 'nominal' | 'real';

  // Withdrawal timing
  rulOfThumb: 25 | 27 | 30;

  // Toast notifications (Apple HIG capsule)
  toast: { id: number; message: string; type: 'success' | 'info' | 'error' } | null;

  // PDF Export Modal State
  pdfModalOpen: boolean;

  // Actions
  setActiveModule: (module: AppState['activeModule']) => void;
  toggleDarkMode: () => void;
  setPdfModalOpen: (open: boolean) => void;
  setFireInputs: (inputs: Partial<FireInputs>) => void;
  setAccumulationInputs: (inputs: Partial<AccumulationInputs>) => void;
  setStressInputs: (inputs: Partial<StressTestInputs>) => void;
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  resetToBaseCase: () => void;
  deleteScenario: (id: string) => void;
  exportJSON: () => void;
  importJSON: (json: string) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  hideToast: () => void;
  setLedgerDisplayMode: (mode: 'nominal' | 'real') => void;
  setRuleOfThumb: (rule: 25 | 27 | 30) => void;
}

// ─── Default Values ───────────────────────────────────────────────────────────

export const defaultFireInputs: FireInputs = {
  currentAge: 35,
  retirementAge: 65,
  lifeExpectancy: 90,
  currentMonthlySpending: 5_000,
  inflationRate: 0.025,
  postRetirementReturn: 0.04,
  targetTerminalBuffer: 200_000,
  cpfStartAge: 65,
  cpfMonthlyPayout: 1_750,
  cpfEscalatingPlan: false,
  cpfPlanType: 'standard',
  cpfTier: 'frs',
  withdrawalTiming: 'start',
};

export const defaultAccumulationInputs: AccumulationInputs = {
  currentAge: 35,
  retirementAge: 65,
  targetPortfolio: 1_500_000,
  currentLiquidPortfolio: 100_000,
  currentCPFBalance: 50_000,
  cashReserves: 30_000,
  propertyEquity: 200_000,
  propertyUnlockAge: 65,
  preRetirementReturn: 0.07,
  cpfReturn: 0.04,
  monthlySavings: 0,
};

export const defaultStressInputs: StressTestInputs = {
  crashYear: 0,
  crashMagnitude: -0.30,
  recoveryYears: 3,
  useGuardrails: true,
  guardrailReduction: 0.10,
};

// Internal toast timeout reference
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeModule: 'command',
      darkMode: false,
      fireInputs: defaultFireInputs,
      accumulationInputs: defaultAccumulationInputs,
      stressInputs: defaultStressInputs,
      scenarios: [],
      activeScenarioId: null,
      ledgerDisplayMode: 'nominal',
      rulOfThumb: 25,
      toast: null,
      pdfModalOpen: false,

      setPdfModalOpen: (open: boolean) => set({ pdfModalOpen: open }),

      showToast: (message: string, type: 'success' | 'info' | 'error' = 'info') => {
        if (toastTimeout) clearTimeout(toastTimeout);
        const id = Date.now();
        set({ toast: { id, message, type } });
        toastTimeout = setTimeout(() => {
          set((s) => (s.toast?.id === id ? { toast: null } : s));
        }, 3400);
      },

      hideToast: () => {
        if (toastTimeout) clearTimeout(toastTimeout);
        set({ toast: null });
      },

      setActiveModule: (module) => set({ activeModule: module }),

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      setFireInputs: (inputs) =>
        set((state) => ({
          fireInputs: { ...state.fireInputs, ...inputs },
        })),

      setAccumulationInputs: (inputs) =>
        set((state) => ({
          accumulationInputs: { ...state.accumulationInputs, ...inputs },
        })),

      setStressInputs: (inputs) =>
        set((state) => ({
          stressInputs: { ...state.stressInputs, ...inputs },
        })),

      saveScenario: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const state = get();
        const scenario: Scenario = {
          id: crypto.randomUUID(),
          name: trimmed,
          createdAt: new Date().toISOString(),
          fireInputs: { ...state.fireInputs },
          accumulationInputs: { ...state.accumulationInputs },
        };
        set((s) => ({ scenarios: [...s.scenarios, scenario], activeScenarioId: scenario.id }));
        get().showToast(`Saved snapshot "${trimmed}"`, 'success');
      },

      loadScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (!scenario) return;
        set({
          fireInputs: { ...defaultFireInputs, ...scenario.fireInputs },
          accumulationInputs: { ...defaultAccumulationInputs, ...scenario.accumulationInputs },
          activeScenarioId: id,
        });
        get().showToast(`Activated scenario "${scenario.name}"`, 'info');
      },

      resetToBaseCase: () => {
        set({
          fireInputs: { ...defaultFireInputs },
          accumulationInputs: { ...defaultAccumulationInputs },
          stressInputs: { ...defaultStressInputs },
          activeScenarioId: null,
        });
        get().showToast('Switched to Base Case (Default Plan)', 'info');
      },

      deleteScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
          activeScenarioId: state.activeScenarioId === id ? null : state.activeScenarioId,
        }));
        if (scenario) {
          get().showToast(`Removed scenario "${scenario.name}"`, 'info');
        }
      },

      exportJSON: () => {
        const state = get();
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `sg-fire-studio-${dateStr}.json`;
        const data = {
          app: 'SG FIRE Studio',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          fireInputs: state.fireInputs,
          accumulationInputs: state.accumulationInputs,
          stressInputs: state.stressInputs,
          scenarios: state.scenarios,
        };
        try {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          get().showToast(`Configuration exported to ${fileName}`, 'success');
        } catch (err) {
          console.error('Failed to export JSON:', err);
          get().showToast('Failed to export configuration JSON', 'error');
        }
      },

      importJSON: (json) => {
        try {
          let data: any;
          try {
            data = JSON.parse(json);
          } catch {
            throw new Error('Invalid JSON format. Please upload a valid .json file.');
          }

          if (!data || typeof data !== 'object') {
            throw new Error('Invalid JSON structure: Root must be an object.');
          }
          const hasKnownPayload =
            'fireInputs' in data ||
            'accumulationInputs' in data ||
            'stressInputs' in data ||
            'scenarios' in data;
          if (!hasKnownPayload) {
            throw new Error('File does not contain valid SG FIRE Studio configuration data.');
          }

          set({
            fireInputs: { ...defaultFireInputs, ...(data.fireInputs || {}) },
            accumulationInputs: { ...defaultAccumulationInputs, ...(data.accumulationInputs || {}) },
            stressInputs: { ...defaultStressInputs, ...(data.stressInputs || {}) },
            scenarios: Array.isArray(data.scenarios) ? data.scenarios : [],
            activeScenarioId: null,
          });

          const count = Array.isArray(data.scenarios) ? data.scenarios.length : 0;
          get().showToast(
            `Plan imported successfully${count > 0 ? ` (${count} scenario${count > 1 ? 's' : ''} restored)` : ''}`,
            'success'
          );
        } catch (err: any) {
          console.error('Failed to import JSON:', err);
          get().showToast(
            err?.message || 'Invalid JSON file. Please provide a valid SG FIRE Studio backup.',
            'error'
          );
        }
      },

      setLedgerDisplayMode: (mode) => set({ ledgerDisplayMode: mode }),

      setRuleOfThumb: (rule) => set({ rulOfThumb: rule }),
    }),
    {
      name: 'sg-fire-studio',
      merge: (persistedState: any, currentState: AppState) => ({
        ...currentState,
        ...persistedState,
        activeModule: persistedState?.activeModule || 'command',
        fireInputs: {
          ...defaultFireInputs,
          ...(persistedState?.fireInputs || {}),
        },
        accumulationInputs: {
          ...defaultAccumulationInputs,
          ...(persistedState?.accumulationInputs || {}),
        },
        stressInputs: {
          ...defaultStressInputs,
          ...(persistedState?.stressInputs || {}),
        },
      }),
      partialize: (state) => ({
        activeModule: state.activeModule,
        fireInputs: state.fireInputs,
        accumulationInputs: state.accumulationInputs,
        stressInputs: state.stressInputs,
        scenarios: state.scenarios,
        darkMode: state.darkMode,
        ledgerDisplayMode: state.ledgerDisplayMode,
        rulOfThumb: state.rulOfThumb,
      }),
    }
  )
);
