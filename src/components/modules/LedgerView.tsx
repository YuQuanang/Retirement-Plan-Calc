import { useMemo, useCallback } from "react";
import { useAppStore } from '../../store/useAppStore';
import { solveRequiredPortfolio, formatCurrency, formatPercentage } from '../../engine/fireMath';
import { Download, FileText } from 'lucide-react';
import { InfoTooltip } from '../ui/InfoTooltip';

const phaseColors: Record<string, string> = {
  'Accumulation': 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
  'Pre-CPF FIRE': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  'CPF LIFE Active': 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
};

function RateCell({ rate }: { rate: number }) {
  const pct = rate * 100;
  const color =
    pct <= 3
      ? 'text-emerald-600 dark:text-emerald-400'
      : pct <= 4
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';
  return <span className={`font-semibold tabular-nums ${color}`}>{formatPercentage(rate)}</span>;
}

const COLUMN_TOOLTIPS: Record<string, string> = {
  'Age': 'Your age in this planning year.',
  'Year': 'The calendar year corresponding to this age.',
  'Phase': 'Retirement phase: Pre-CPF FIRE (solely funded by your portfolio) vs CPF LIFE Active (co-funded by state annuity).',
  'Starting Portfolio': 'Liquid portfolio balance at the beginning of the year.',
  'Monthly Spend': 'Monthly living expenses (inflation-adjusted).',
  'Annual Spend': 'Total annual living expenses required to maintain lifestyle.',
  'CPF LIFE': 'Annual guaranteed payout received from Singapore CPF LIFE.',
  'CPF Coverage': 'Percentage of this year\'s living expenses paid by CPF LIFE.',
  'Net Withdrawal': 'Net cash drawn from your personal portfolio (Annual Spend − CPF LIFE).',
  'Rate %': 'Net withdrawal rate (Net Withdrawal / Starting Portfolio).',
  'Growth': 'Investment returns generated on the portfolio balance this year.',
  'Ending Portfolio': 'Portfolio balance at the close of the year after withdrawals and compounding.',
};

export function LedgerView() {
  const { fireInputs, ledgerDisplayMode, setLedgerDisplayMode, setPdfModalOpen } = useAppStore();
  const result = useMemo(() => solveRequiredPortfolio(fireInputs), [fireInputs]);

  const deflate = useCallback(
    (nominal: number, age: number) => {
      const years = age - fireInputs.currentAge;
      return nominal / Math.pow(1 + fireInputs.inflationRate, years);
    },
    [fireInputs]
  );

  const displayRows = (result?.rows || []).map((row) => ({
    ...row,
    displayStartingPortfolio: ledgerDisplayMode === 'real' ? deflate(row.startingPortfolio || 0, row.age) : (row.startingPortfolio || 0),
    displayMonthlySpend: ledgerDisplayMode === 'real' ? deflate(row.monthlySpendNominal || 0, row.age) : (row.monthlySpendNominal || 0),
    displayAnnualSpend: ledgerDisplayMode === 'real' ? deflate(row.annualSpendNominal || 0, row.age) : (row.annualSpendNominal || 0),
    displayCPF: ledgerDisplayMode === 'real' ? deflate(row.cpfLifePayout || 0, row.age) : (row.cpfLifePayout || 0),
    displayCumulativeCPF: ledgerDisplayMode === 'real' ? deflate(row.cumulativeCpfPayout || 0, row.age) : (row.cumulativeCpfPayout || 0),
    displayNetWithdrawal: ledgerDisplayMode === 'real' ? deflate(row.netPortfolioWithdrawal || 0, row.age) : (row.netPortfolioWithdrawal || 0),
    displayGrowth: ledgerDisplayMode === 'real' ? deflate(row.investmentGrowth || 0, row.age) : (row.investmentGrowth || 0),
    displayEndingPortfolio: ledgerDisplayMode === 'real' ? deflate(row.endingPortfolio || 0, row.age) : (row.endingPortfolio || 0),
    cpfCoverageRatio: typeof row.cpfCoverageRatio === 'number' && !isNaN(row.cpfCoverageRatio) ? row.cpfCoverageRatio : 0,
    withdrawalRate: typeof row.withdrawalRate === 'number' && !isNaN(row.withdrawalRate) ? row.withdrawalRate : 0,
  }));

  const exportCSV = () => {
    const headers = [
      'Age', 'Year', 'Phase', 'Starting Portfolio', 'Monthly Spend',
      'Annual Spend', 'CPF LIFE Payout', 'CPF Coverage %', 'Cumulative CPF',
      'Net Withdrawal', 'Withdrawal Rate %', 'Investment Growth', 'Ending Portfolio',
    ];
    const rows = displayRows.map((r) => [
      r.age,
      r.year,
      r.phase,
      r.displayStartingPortfolio.toFixed(0),
      r.displayMonthlySpend.toFixed(0),
      r.displayAnnualSpend.toFixed(0),
      r.displayCPF.toFixed(0),
      (r.cpfCoverageRatio * 100).toFixed(1) + '%',
      r.displayCumulativeCPF.toFixed(0),
      r.displayNetWithdrawal.toFixed(0),
      (r.withdrawalRate * 100).toFixed(2),
      r.displayGrowth.toFixed(0),
      r.displayEndingPortfolio.toFixed(0),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sg-fire-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    'Age', 'Year', 'Phase', 'Starting Portfolio',
    'Monthly Spend', 'Annual Spend', 'CPF LIFE', 'CPF Coverage',
    'Net Withdrawal', 'Rate %', 'Growth', 'Ending Portfolio',
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Year-by-Year Cash Flow Ledger
            </h2>
            <InfoTooltip
              content="Complete audit trail of annual portfolio flows from retirement to life expectancy. Hover over any column header to see detailed definitions."
              title="Cash Flow Ledger"
            />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            {result.rows.length} rows · Age {fireInputs.retirementAge} to {fireInputs.lifeExpectancy}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
            {(['nominal', 'real'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLedgerDisplayMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  ledgerDisplayMode === mode
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {mode === 'nominal' ? 'Nominal $' : "Real (Today's) $"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-900/30 transition-colors shadow-2xs"
          >
            <FileText size={12} className="text-rose-600 dark:text-rose-400" /> Download PDF
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table with Contained Internal Scroll (Minimal Page Scrolling) */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-215px)] min-h-[360px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">
                {columns.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>{h}</span>
                      {COLUMN_TOOLTIPS[h] && <InfoTooltip content={COLUMN_TOOLTIPS[h]} title={h} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr
                  key={row.age}
                  className={`border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors ${
                    row.endingPortfolio <= 0 ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                  } ${i === displayRows.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-3 py-2.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{row.age}</td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-500 dark:text-zinc-400">{row.year}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap ${phaseColors[row.phase] ?? ''}`}>
                      {row.phase}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(row.displayStartingPortfolio)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(row.displayMonthlySpend)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(row.displayAnnualSpend)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-medium" style={{ color: '#5856D6' }}>
                    {row.displayCPF > 0 ? formatCurrency(row.displayCPF) : '—'}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-medium text-zinc-700 dark:text-zinc-300">
                    {row.displayCPF > 0 ? `${(row.cpfCoverageRatio * 100).toFixed(0)}%` : '0%'}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(row.displayNetWithdrawal)}
                  </td>
                  <td className="px-3 py-2.5">
                    <RateCell rate={row.withdrawalRate} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-emerald-600 dark:text-emerald-400">
                    {row.displayGrowth > 0 ? `+${formatCurrency(row.displayGrowth)}` : formatCurrency(row.displayGrowth)}
                  </td>
                  <td
                    className={`px-3 py-2.5 tabular-nums font-semibold ${
                      row.displayEndingPortfolio <= 0 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {formatCurrency(row.displayEndingPortfolio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
