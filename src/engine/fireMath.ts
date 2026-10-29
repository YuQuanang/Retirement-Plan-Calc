/**
 * SG FIRE Studio — Core Mathematical Engine
 * Pure TypeScript financial calculation functions with zero external dependencies.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CpfPlanType = 'standard' | 'escalating' | 'basic';
export type CpfTier = 'brs' | 'frs' | 'ers';

export const CPF_TIER_PRESETS: Record<CpfTier, {
  name: string;
  raBalance: number;
  monthlyPayout: number;
  description: string;
}> = {
  brs: {
    name: 'BRS (Basic)',
    raBalance: 106_500,
    monthlyPayout: 900,
    description: 'Basic Retirement Sum (~$106,500 RA with property pledge). Lifelong floor of ~$900/mo at 65.',
  },
  frs: {
    name: 'FRS (Full)',
    raBalance: 213_000,
    monthlyPayout: 1_750,
    description: 'Full Retirement Sum (2× BRS, ~$213,000 RA). Standard national benchmark, ~$1,750/mo at 65.',
  },
  ers: {
    name: 'ERS (Enhanced 4×)',
    raBalance: 426_000,
    monthlyPayout: 3_500,
    description: 'Enhanced Retirement Sum (4× BRS, ~$426,000 RA from 2025). Maximum state annuity, ~$3,500/mo at 65.',
  },
};

/**
 * Computes monthly CPF LIFE payout dynamically based on official rules:
 * - Selected Retirement Sum tier (BRS: $900, FRS: $1,750, ERS: $3,500)
 * - Payout start age (65–70): +7% permanent bonus per year deferred past 65 (+35% at 70)
 */
export function getComputedCpfMonthlyPayout(
  tier: CpfTier,
  startAge: number
): number {
  const base = CPF_TIER_PRESETS[tier]?.monthlyPayout ?? 1750;
  const deferralYears = Math.max(0, Math.min(5, startAge - 65));
  const deferralBonus = 1 + deferralYears * 0.07;
  return Math.round(base * deferralBonus);
}

export interface FireInputs {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentMonthlySpending: number;
  inflationRate: number;           // decimal, e.g. 0.025
  postRetirementReturn: number;    // decimal, e.g. 0.035
  targetTerminalBuffer: number;    // SGD, e.g. 500000
  cpfStartAge: number;             // default 65
  cpfMonthlyPayout: number;        // SGD, e.g. 1750 or computed
  cpfEscalatingPlan: boolean;      // false = Standard (flat), true = Escalating (2%/yr)
  cpfPlanType?: CpfPlanType;       // 'standard' | 'escalating' | 'basic'
  cpfTier?: CpfTier;               // 'brs' | 'frs' | 'ers'
  withdrawalTiming: 'start' | 'end'; // default 'start' (withdraw at start of year)
}

export interface YearlyRow {
  age: number;
  year: number;
  phase: 'Accumulation' | 'Pre-CPF FIRE' | 'CPF LIFE Active';
  startingPortfolio: number;
  monthlySpendNominal: number;
  annualSpendNominal: number;
  cpfLifePayout: number;
  cumulativeCpfPayout: number;
  cpfCoverageRatio: number;        // cpfLifePayout / annualSpendNominal (0 to 1+)
  netPortfolioWithdrawal: number;
  withdrawalRate: number;           // as a decimal
  investmentGrowth: number;
  endingPortfolio: number;
}

export interface DecumulationResult {
  requiredStartingPortfolio: number;
  initialWithdrawalRate: number;
  rows: YearlyRow[];
}

export interface AccumulationResult {
  requiredMonthlySavings: number;
  coastFIREAge: number | null;
  projectedPortfolioAtRetirement: number;
}

// ─── A. Inflation & Expense Indexing ─────────────────────────────────────────

/**
 * Annual inflation-adjusted spending at a given age.
 * Formula: (monthlySpending × 12) × (1 + i)^(age - currentAge)
 */
export function annualSpending(
  age: number,
  currentAge: number,
  currentMonthlySpending: number,
  inflationRate: number
): number {
  const t = age - currentAge;
  return currentMonthlySpending * 12 * Math.pow(1 + inflationRate, t);
}

// ─── B. CPF LIFE Offset Logic ─────────────────────────────────────────────────

/**
 * Annual CPF LIFE payout at a given age.
 * - 0 if age < cpfStartAge
 * - Standard Plan: flat cpfMonthlyPayout × 12
 * - Escalating Plan: payout grows at 2%/yr from cpfStartAge
 * - Basic Plan: starts ~10% lower, draws down RA interest first, highest bequest
 */
export function annualCPFPayout(
  age: number,
  cpfStartAge: number,
  cpfMonthlyPayout: number,
  cpfEscalatingPlan: boolean,
  cpfPlanType?: CpfPlanType
): number {
  if (age < cpfStartAge) return 0;

  // Determine plan type with backward compatibility
  const resolvedPlan: CpfPlanType = cpfPlanType
    ? cpfPlanType
    : cpfEscalatingPlan
    ? 'escalating'
    : 'standard';

  const g = resolvedPlan === 'escalating' ? 0.02 : 0;
  const baseMultiplier = resolvedPlan === 'basic' ? 0.90 : 1.0;
  const yearsActive = age - cpfStartAge;

  return (cpfMonthlyPayout * baseMultiplier) * 12 * Math.pow(1 + g, yearsActive);
}

// ─── C. Decumulation Cash Flow Recurrence ─────────────────────────────────────

/**
 * Simulate year-by-year decumulation from retirementAge to lifeExpectancy.
 * Returns array of yearly rows given a starting portfolio value.
 */
export function simulateDecumulation(
  inputs: FireInputs,
  startingPortfolio: number,
  calendarYearAtRetirement?: number
): YearlyRow[] {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentMonthlySpending,
    inflationRate,
    postRetirementReturn,
    cpfStartAge,
    cpfMonthlyPayout,
    cpfEscalatingPlan,
    cpfPlanType,
    withdrawalTiming,
  } = inputs;

  const rows: YearlyRow[] = [];
  let portfolio = startingPortfolio;
  let cumulativeCpf = 0;
  const baseYear = calendarYearAtRetirement ?? (new Date().getFullYear() + (retirementAge - currentAge));

  for (let age = retirementAge; age <= lifeExpectancy; age++) {
    const yearsSinceNow = age - retirementAge;
    const year = baseYear + yearsSinceNow;

    const phase: YearlyRow['phase'] = age < cpfStartAge
      ? 'Pre-CPF FIRE'
      : 'CPF LIFE Active';

    const annualSpend = annualSpending(age, currentAge, currentMonthlySpending, inflationRate);
    const cpfPayout = annualCPFPayout(age, cpfStartAge, cpfMonthlyPayout, cpfEscalatingPlan, cpfPlanType);
    cumulativeCpf += cpfPayout;
    const cpfCoverageRatio = annualSpend > 0 ? Math.min(1, cpfPayout / annualSpend) : 0;

    const netWithdrawal = Math.max(0, annualSpend - cpfPayout);

    const startingPortfolioForRow = portfolio;
    const withdrawalRate = portfolio > 0 ? netWithdrawal / portfolio : 0;

    let endingPortfolio: number;
    let investmentGrowth: number;

    if (withdrawalTiming === 'start') {
      // Start-of-year withdrawal: growth on (portfolio - withdrawal)
      const portfolioAfterWithdrawal = Math.max(0, portfolio - netWithdrawal);
      endingPortfolio = portfolioAfterWithdrawal * (1 + postRetirementReturn);
      investmentGrowth = portfolioAfterWithdrawal * postRetirementReturn;
    } else {
      // End-of-year withdrawal: growth on full starting portfolio
      endingPortfolio = Math.max(0, portfolio * (1 + postRetirementReturn) - netWithdrawal);
      investmentGrowth = portfolio * postRetirementReturn;
    }

    rows.push({
      age,
      year,
      phase,
      startingPortfolio: startingPortfolioForRow,
      monthlySpendNominal: annualSpend / 12,
      annualSpendNominal: annualSpend,
      cpfLifePayout: cpfPayout,
      cumulativeCpfPayout: cumulativeCpf,
      cpfCoverageRatio,
      netPortfolioWithdrawal: netWithdrawal,
      withdrawalRate,
      investmentGrowth,
      endingPortfolio,
    });

    portfolio = endingPortfolio;
  }

  return rows;
}

// ─── D. Reverse Goal-Seek Solver (FIRE Number) ────────────────────────────────

/**
 * Binary search (bisection method, 100 iterations, precision < $0.01) to find
 * the RequiredStartingPortfolio at retirementAge such that
 * EndingPortfolio(lifeExpectancy) === targetTerminalBuffer.
 */
export function solveRequiredPortfolio(inputs: FireInputs): DecumulationResult {
  const { targetTerminalBuffer } = inputs;

  let lo = 0;
  let hi = 50_000_000; // $50M upper bound

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const rows = simulateDecumulation(inputs, mid);
    const terminalPortfolio = rows[rows.length - 1].endingPortfolio;

    if (terminalPortfolio < targetTerminalBuffer) {
      lo = mid;
    } else {
      hi = mid;
    }

    if (hi - lo < 0.01) break;
  }

  const requiredPortfolio = (lo + hi) / 2;
  const rows = simulateDecumulation(inputs, requiredPortfolio);

  const firstRow = rows[0];
  const initialWithdrawalRate = firstRow.withdrawalRate;

  return {
    requiredStartingPortfolio: requiredPortfolio,
    initialWithdrawalRate,
    rows,
  };
}

// ─── E. Retirement Age Sensitivity ───────────────────────────────────────────

/**
 * Computes required FIRE portfolio across multiple retirement ages.
 */
export function retirementAgeSensitivity(
  baseInputs: FireInputs,
  retirementAges: number[]
): { retirementAge: number; requiredPortfolio: number; initialWithdrawalRate: number }[] {
  return retirementAges.map((retirementAge) => {
    const inputs = { ...baseInputs, retirementAge };
    const result = solveRequiredPortfolio(inputs);
    return {
      retirementAge,
      requiredPortfolio: result.requiredStartingPortfolio,
      initialWithdrawalRate: result.initialWithdrawalRate,
    };
  });
}

// ─── F. Accumulation & Target Gap ─────────────────────────────────────────────

export interface AccumulationInputs {
  currentAge: number;
  retirementAge: number;
  targetPortfolio: number;
  currentLiquidPortfolio: number;
  currentCPFBalance: number;           // OA + SA combined
  cashReserves: number;
  propertyEquity: number;
  propertyUnlockAge: number;
  preRetirementReturn: number;         // decimal, e.g. 0.07
  cpfReturn: number;                   // decimal, e.g. 0.04
  monthlySavings: number;              // optional: 0 means solve for it
}

/**
 * Projects the accumulation phase and solves for required monthly savings.
 */
export function solveAccumulation(inputs: AccumulationInputs): AccumulationResult {
  const {
    currentAge,
    retirementAge,
    targetPortfolio,
    currentLiquidPortfolio,
    currentCPFBalance,
    cashReserves,
    propertyEquity,
    propertyUnlockAge,
    preRetirementReturn,
    cpfReturn,
  } = inputs;

  const yearsToRetirement = retirementAge - currentAge;

  const projectedLiquid = currentLiquidPortfolio * Math.pow(1 + preRetirementReturn, yearsToRetirement);
  const projectedCPF = currentCPFBalance * Math.pow(1 + cpfReturn, yearsToRetirement);
  const projectedCash = cashReserves;

  const projectedProperty = propertyUnlockAge <= retirementAge ? propertyEquity : 0;
  const projectedWithoutSavings = projectedLiquid + projectedCPF + projectedCash + projectedProperty;
  const projectedPortfolioAtRetirement = projectedWithoutSavings;

  const monthlyRate = preRetirementReturn / 12;
  const n = yearsToRetirement * 12;
  const fvFactor = monthlyRate > 0
    ? ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate)
    : n;

  const gap = Math.max(0, targetPortfolio - projectedWithoutSavings);
  const requiredMonthlySavings = fvFactor > 0 ? gap / fvFactor : 0;

  let coastFIREAge: number | null = null;
  for (let coastAge = currentAge; coastAge <= retirementAge; coastAge++) {
    const yearsFromCoast = retirementAge - coastAge;
    const coastProjected = (currentLiquidPortfolio + currentCPFBalance + cashReserves)
      * Math.pow(1 + preRetirementReturn, yearsFromCoast);
    const coastWithProperty = coastProjected + (propertyUnlockAge <= retirementAge ? propertyEquity : 0);
    if (coastWithProperty >= targetPortfolio) {
      coastFIREAge = coastAge;
      break;
    }
  }

  return {
    requiredMonthlySavings,
    coastFIREAge,
    projectedPortfolioAtRetirement,
  };
}

// ─── G. Stress Testing ────────────────────────────────────────────────────────

export interface StressTestInputs {
  crashYear: number;          // years into retirement (0 = first year)
  crashMagnitude: number;     // decimal, e.g. -0.30 for -30%
  recoveryYears: number;      // years to recover to original return rate
  useGuardrails: boolean;     // reduce spending 10% during negative return years
  guardrailReduction: number; // fraction, default 0.10
}

/**
 * Simulates a stressed decumulation with a market crash injected at crashYear.
 */
export function simulateStressTest(
  inputs: FireInputs,
  startingPortfolio: number,
  stress: StressTestInputs
): YearlyRow[] {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentMonthlySpending,
    inflationRate,
    postRetirementReturn,
    cpfStartAge,
    cpfMonthlyPayout,
    cpfEscalatingPlan,
    cpfPlanType,
    withdrawalTiming,
  } = inputs;

  const { crashYear, crashMagnitude, recoveryYears, useGuardrails, guardrailReduction } = stress;

  const rows: YearlyRow[] = [];
  let portfolio = startingPortfolio;
  let cumulativeCpf = 0;
  const baseYear = new Date().getFullYear() + (retirementAge - currentAge);

  for (let age = retirementAge; age <= lifeExpectancy; age++) {
    const yearsSinceRetirement = age - retirementAge;
    const year = baseYear + yearsSinceRetirement;

    let effectiveReturn = postRetirementReturn;
    if (yearsSinceRetirement === crashYear) {
      effectiveReturn = crashMagnitude;
    } else if (yearsSinceRetirement > crashYear && yearsSinceRetirement <= crashYear + recoveryYears) {
      const recoveryProgress = (yearsSinceRetirement - crashYear) / recoveryYears;
      effectiveReturn = crashMagnitude + (postRetirementReturn - crashMagnitude) * recoveryProgress;
    }

    const phase: YearlyRow['phase'] = age < cpfStartAge ? 'Pre-CPF FIRE' : 'CPF LIFE Active';

    let annualSpend = annualSpending(age, currentAge, currentMonthlySpending, inflationRate);
    const isNegativeYear = effectiveReturn < 0;
    if (useGuardrails && isNegativeYear) {
      annualSpend *= (1 - guardrailReduction);
    }

    const cpfPayout = annualCPFPayout(age, cpfStartAge, cpfMonthlyPayout, cpfEscalatingPlan, cpfPlanType);
    cumulativeCpf += cpfPayout;
    const cpfCoverageRatio = annualSpend > 0 ? Math.min(1, cpfPayout / annualSpend) : 0;

    const netWithdrawal = Math.max(0, annualSpend - cpfPayout);
    const startingPortfolioForRow = portfolio;
    const withdrawalRate = portfolio > 0 ? netWithdrawal / portfolio : 0;

    let endingPortfolio: number;
    let investmentGrowth: number;

    if (withdrawalTiming === 'start') {
      const portfolioAfterWithdrawal = Math.max(0, portfolio - netWithdrawal);
      endingPortfolio = portfolioAfterWithdrawal * (1 + effectiveReturn);
      investmentGrowth = portfolioAfterWithdrawal * effectiveReturn;
    } else {
      endingPortfolio = Math.max(0, portfolio * (1 + effectiveReturn) - netWithdrawal);
      investmentGrowth = portfolio * effectiveReturn;
    }

    rows.push({
      age,
      year,
      phase,
      startingPortfolio: startingPortfolioForRow,
      monthlySpendNominal: annualSpend / 12,
      annualSpendNominal: annualSpend,
      cpfLifePayout: cpfPayout,
      cumulativeCpfPayout: cumulativeCpf,
      cpfCoverageRatio,
      netPortfolioWithdrawal: netWithdrawal,
      withdrawalRate,
      investmentGrowth,
      endingPortfolio,
    });

    portfolio = endingPortfolio;
  }

  return rows;
}

// ─── H. Utility Formatting Helpers ───────────────────────────────────────────

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function getWithdrawalRateHealth(rate: number): 'safe' | 'caution' | 'danger' {
  if (rate <= 0.03) return 'safe';
  if (rate <= 0.04) return 'caution';
  return 'danger';
}
