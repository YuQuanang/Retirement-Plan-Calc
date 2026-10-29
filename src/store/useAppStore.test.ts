import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, defaultFireInputs, defaultAccumulationInputs } from './useAppStore';

describe('useAppStore Scenario Snapshots & JSON Import/Export', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      fireInputs: { ...defaultFireInputs },
      accumulationInputs: { ...defaultAccumulationInputs },
      scenarios: [],
      activeScenarioId: null,
      toast: null,
    });
  });

  it('saves a scenario snapshot and activates it', () => {
    const store = useAppStore.getState();
    store.setFireInputs({ retirementAge: 55, currentMonthlySpending: 8000 });
    store.saveScenario('Early FIRE 55');

    const updated = useAppStore.getState();
    expect(updated.scenarios).toHaveLength(1);
    expect(updated.scenarios[0].name).toBe('Early FIRE 55');
    expect(updated.scenarios[0].fireInputs.retirementAge).toBe(55);
    expect(updated.scenarios[0].fireInputs.currentMonthlySpending).toBe(8000);
    expect(updated.activeScenarioId).toBe(updated.scenarios[0].id);
    expect(updated.toast?.message).toContain('Saved snapshot');
  });

  it('switches between custom scenario and Base Case', () => {
    const store = useAppStore.getState();
    store.setFireInputs({ retirementAge: 50 });
    store.saveScenario('Coast 50');

    expect(useAppStore.getState().activeScenarioId).not.toBeNull();
    expect(useAppStore.getState().fireInputs.retirementAge).toBe(50);

    // Switch back to Base Case
    useAppStore.getState().resetToBaseCase();
    const baseCaseState = useAppStore.getState();
    expect(baseCaseState.activeScenarioId).toBeNull();
    expect(baseCaseState.fireInputs.retirementAge).toBe(65);
    expect(baseCaseState.toast?.message).toContain('Base Case');

    // Switch back to Coast 50
    const scenarioId = baseCaseState.scenarios[0].id;
    useAppStore.getState().loadScenario(scenarioId);
    expect(useAppStore.getState().activeScenarioId).toBe(scenarioId);
    expect(useAppStore.getState().fireInputs.retirementAge).toBe(50);
  });

  it('deletes a scenario snapshot and clears active state if active was deleted', () => {
    const store = useAppStore.getState();
    store.saveScenario('To Delete');
    const id = useAppStore.getState().scenarios[0].id;

    expect(useAppStore.getState().activeScenarioId).toBe(id);
    useAppStore.getState().deleteScenario(id);

    expect(useAppStore.getState().scenarios).toHaveLength(0);
    expect(useAppStore.getState().activeScenarioId).toBeNull();
    expect(useAppStore.getState().toast?.message).toContain('Removed scenario');
  });

  it('imports valid JSON configuration and restores scenarios and parameters', () => {
    const validJsonPayload = JSON.stringify({
      app: 'SG FIRE Studio',
      fireInputs: {
        ...defaultFireInputs,
        retirementAge: 58,
        cpfTier: 'ers',
      },
      accumulationInputs: {
        ...defaultAccumulationInputs,
        currentLiquidPortfolio: 500000,
      },
      scenarios: [
        {
          id: 'test-123',
          name: 'Restored Plan',
          createdAt: '2026-10-29T10:00:00.000Z',
          fireInputs: { ...defaultFireInputs, retirementAge: 62 },
          accumulationInputs: { ...defaultAccumulationInputs },
        },
      ],
    });

    useAppStore.getState().importJSON(validJsonPayload);
    const state = useAppStore.getState();
    expect(state.fireInputs.retirementAge).toBe(58);
    expect(state.fireInputs.cpfTier).toBe('ers');
    expect(state.accumulationInputs.currentLiquidPortfolio).toBe(500000);
    expect(state.scenarios).toHaveLength(1);
    expect(state.scenarios[0].name).toBe('Restored Plan');
    expect(state.toast?.type).toBe('success');
    expect(state.toast?.message).toContain('Plan imported successfully');
  });

  it('handles malformed or invalid JSON gracefully without crashing', () => {
    const invalidJson = 'NOT A VALID JSON STRING';
    useAppStore.getState().importJSON(invalidJson);

    const state = useAppStore.getState();
    expect(state.toast?.type).toBe('error');
    expect(state.toast?.message).toContain('Invalid JSON');
  });

  it('rejects JSON without expected configuration properties', () => {
    const randomObjectJson = JSON.stringify({ randomField: 123 });
    useAppStore.getState().importJSON(randomObjectJson);

    const state = useAppStore.getState();
    expect(state.toast?.type).toBe('error');
    expect(state.toast?.message).toContain('File does not contain valid SG FIRE Studio configuration');
  });

  it('manages pdf modal open state correctly', () => {
    expect(useAppStore.getState().pdfModalOpen).toBe(false);
    useAppStore.getState().setPdfModalOpen(true);
    expect(useAppStore.getState().pdfModalOpen).toBe(true);
    useAppStore.getState().setPdfModalOpen(false);
    expect(useAppStore.getState().pdfModalOpen).toBe(false);
  });
});
