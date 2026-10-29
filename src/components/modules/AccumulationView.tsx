import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SliderInput } from '../ui/SliderInput';
import { KPICard } from '../ui/KPICard';
import {
  solveRequiredPortfolio,
  solveAccumulation,
  formatCurrency,
  formatPercentage,
} from '../../engine/fireMath';
import { TrendingUp, Zap, AlertCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CustomTooltip } from '../ui/CustomTooltip';
import { InfoTooltip } from '../ui/InfoTooltip';

export function AccumulationView() {
  const { fireInputs, accumulationInputs, setAccumulationInputs } = useAppStore();

  // Get FIRE target from Module 1
  const fireResult = useMemo(() => solveRequiredPortfolio(fireInputs), [fireInputs]);
  const fireTarget = fireResult?.requiredStartingPortfolio || 1_500_000;

  // Safe fallback values
  const currentAge = fireInputs?.currentAge ?? 35;
  const retirementAge = Math.max(currentAge, fireInputs?.retirementAge ?? 65);
  const liquid = accumulationInputs?.currentLiquidPortfolio ?? 100_000;
  const cpf = accumulationInputs?.currentCPFBalance ?? 50_000;
  const cash = accumulationInputs?.cashReserves ?? 30_000;
  const property = accumulationInputs?.propertyEquity ?? 200_000;
  const unlockAge = accumulationInputs?.propertyUnlockAge ?? 65;
  const preReturn = accumulationInputs?.preRetirementReturn ?? 0.07;
  const cpfReturn = accumulationInputs?.cpfReturn ?? 0.04;

  // Sync retirement age and ages
  const syncedAccInputs = useMemo(
    () => ({
      currentAge,
      retirementAge,
      targetPortfolio: fireTarget,
      currentLiquidPortfolio: liquid,
      currentCPFBalance: cpf,
      cashReserves: cash,
      propertyEquity: property,
      propertyUnlockAge: unlockAge,
      preRetirementReturn: preReturn,
      cpfReturn: cpfReturn,
      monthlySavings: accumulationInputs?.monthlySavings ?? 0,
    }),
    [currentAge, retirementAge, fireTarget, liquid, cpf, cash, property, unlockAge, preReturn, cpfReturn, accumulationInputs?.monthlySavings]
  );

  const accResult = useMemo(() => solveAccumulation(syncedAccInputs), [syncedAccInputs]);

  // Build accumulation projection chart
  const chartData = useMemo(() => {
    const rows: { age: number; portfolio: number; target: number }[] = [];
    let portfolio = liquid + cpf + cash;
    const monthlyContrib = isNaN(accResult.requiredMonthlySavings) ? 0 : accResult.requiredMonthlySavings;
    const monthlyRate = preReturn / 12;

    for (let age = currentAge; age <= retirementAge; age++) {
      rows.push({ age, portfolio: Math.round(portfolio), target: Math.round(fireTarget) });
      // Compound for 1 year with monthly contributions
      for (let m = 0; m < 12; m++) {
        portfolio = portfolio * (1 + monthlyRate) + monthlyContrib;
      }
      // Add property equity at unlock age
      if (age === unlockAge - 1) {
        portfolio += property;
      }
    }
    return rows;
  }, [currentAge, retirementAge, liquid, cpf, cash, property, unlockAge, preReturn, accResult.requiredMonthlySavings, fireTarget]);

  const gap = Math.max(0, fireTarget - (accResult?.projectedPortfolioAtRetirement || 0));
  const coastFIREAge = accResult?.coastFIREAge ?? null;

  return (
    <div className="space-y-4">
      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <KPICard
          index={0}
          label="FIRE Target"
          value={formatCurrency(fireTarget, true)}
          subValue={`At Age ${retirementAge} (from Command Center)`}
          icon={<TrendingUp size={16} strokeWidth={1.5} />}
          badge={{ text: 'Live Sync', color: 'info' }}
          tooltip="The required personal portfolio solved in Module 1. Automatically synchronizes whenever you alter your lifestyle spending or retirement parameters."
        />
        <KPICard
          index={1}
          label="Monthly Savings Required"
          value={formatCurrency(accResult.requiredMonthlySavings)}
          subValue={`To bridge ${formatCurrency(gap, true)} capital gap`}
          icon={<AlertCircle size={16} strokeWidth={1.5} />}
          badge={gap === 0 ? { text: 'On Track', color: 'safe' } : { text: 'Monthly Invest', color: 'caution' }}
          tooltip="The exact fixed monthly amount you must invest into your growth portfolio between now and retirement age to reach your exact FIRE number."
        />
        <KPICard
          index={2}
          label="Coast FIRE Age"
          value={coastFIREAge ? `Age ${coastFIREAge}` : '—'}
          subValue={coastFIREAge ? `Stop new contributions at age ${coastFIREAge}` : 'Assets need growth boost'}
          icon={<Zap size={16} strokeWidth={1.5} />}
          badge={coastFIREAge ? { text: 'Coast Eligible', color: 'safe' } : undefined}
          tooltip="The milestone age where your existing invested assets will compound on their own to reach your target FIRE number at retirement age, meaning you only need to earn enough to cover current living expenses without saving another dollar."
        />
      </div>

      {/* ── Widescreen Bento Layout: Minimal Scrolling ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 lg:gap-4 items-stretch">
        {/* Left Column: Asset Inventory & Growth Inputs */}
        <div className="xl:col-span-5 flex flex-col gap-3.5">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card space-y-2.5 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Asset Inventory</h2>
              <InfoTooltip
                content="Your existing balance sheet assets: liquid equities/ETFs, CPF accounts, cash reserves, and projected property equity unlock."
                title="Asset Inventory"
              />
            </div>

            <SliderInput
              label="Liquid ETF / Equity Portfolio"
              value={liquid}
              min={0}
              max={5_000_000}
              step={5000}
              onChange={(v) => setAccumulationInputs({ currentLiquidPortfolio: v })}
              format={(v) => formatCurrency(v, true)}
              parse={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))}
              accentColor="#34C759"
              tooltip="Your existing taxable or brokerage investment portfolio in global index funds or equities (e.g. Ireland-domiciled VWRA, CSPX, or local dividend stocks)."
            />
            <SliderInput
              label="CPF OA + SA Balance"
              value={cpf}
              min={0}
              max={1_500_000}
              step={1000}
              onChange={(v) => setAccumulationInputs({ currentCPFBalance: v })}
              format={(v) => formatCurrency(v, true)}
              parse={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))}
              accentColor="#5856D6"
              tooltip="Current combined balances across your Ordinary Account (2.5% p.a.) and Special Account (4.0% p.a.) compounding toward your retirement sum."
            />
            <SliderInput
              label="Cash Reserves"
              value={cash}
              min={0}
              max={500_000}
              step={1000}
              onChange={(v) => setAccumulationInputs({ cashReserves: v })}
              format={(v) => formatCurrency(v, true)}
              parse={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))}
              tooltip="Liquid high-yield cash, emergency funds, Singapore Treasury Bills (T-bills), or Fixed Deposits earmarked for retirement."
            />
            <SliderInput
              label="Property Equity / Downsizing"
              value={property}
              min={0}
              max={3_000_000}
              step={10000}
              onChange={(v) => setAccumulationInputs({ propertyEquity: v })}
              format={(v) => formatCurrency(v, true)}
              parse={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))}
              tooltip="Estimated net cash proceeds from right-sizing your residential property (e.g. condo to HDB, private to studio), Silver Housing Bonus, or CPF Lease Buyback Scheme."
            />
            <SliderInput
              label="Property Equity Unlock Age"
              value={unlockAge}
              min={50}
              max={80}
              step={1}
              onChange={(v) => setAccumulationInputs({ propertyUnlockAge: v })}
              format={(v) => `${v} yrs`}
              parse={(s) => parseInt(s)}
              tooltip="The age at which you execute your property downsizing or monetization strategy to inject capital into your investable pool."
            />
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card space-y-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Growth Assumptions & Summary</h2>
              <InfoTooltip
                content="Expected annualized growth rates during your working accumulation phase."
                title="Growth Assumptions"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <SliderInput
                label="Pre-Retirement Return"
                value={preReturn}
                min={0.01}
                max={0.15}
                step={0.001}
                onChange={(v) => setAccumulationInputs({ preRetirementReturn: v })}
                format={(v) => formatPercentage(v)}
                parse={(s) => parseFloat(s.replace('%', '')) / 100}
                accentColor="#34C759"
                tooltip="Expected compound annual growth rate (CAGR) of your investment portfolio during accumulation."
              />
              <SliderInput
                label="CPF Return Rate"
                value={cpfReturn}
                min={0.025}
                max={0.06}
                step={0.001}
                onChange={(v) => setAccumulationInputs({ cpfReturn: v })}
                format={(v) => formatPercentage(v)}
                parse={(s) => parseFloat(s.replace('%', '')) / 100}
                accentColor="#5856D6"
                tooltip="Blended annual interest rate for your CPF balances prior to retirement (OA: 2.5%, SA: 4.0%+)."
              />
            </div>

            {/* Live Totals Bar */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-500 dark:text-zinc-400">Total Investable Assets Today</span>
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(liquid + cpf + cash, true)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-500 dark:text-zinc-400">Projected at Retirement (no new savings)</span>
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(accResult.projectedPortfolioAtRetirement, true)}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-500 dark:text-zinc-400">Additional Capital Gap</span>
                <span className={`font-semibold tabular-nums ${gap > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{gap > 0 ? `+${formatCurrency(gap, true)}` : 'Covered'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Accumulation Projection Visuals */}
        <div className="xl:col-span-7 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Portfolio Accumulation Projection
                  </h2>
                  <InfoTooltip
                    content="Visualizes how your portfolio compounds from today to retirement age, including your current assets and solved monthly contributions. The horizontal blue line marks your required FIRE number."
                    title="Accumulation Projection"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Includes monthly savings of {formatCurrency(accResult.requiredMonthlySavings)}/mo on top of existing assets
                </p>
              </div>

              {coastFIREAge && (
                <div className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/25 flex-shrink-0" />
                  <span>Coast FIRE: Age {coastFIREAge}</span>
                </div>
              )}
            </div>

            <div className="w-full mt-3">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 8, right: 28, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34C759" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#34C759" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 10.5, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    padding={{ left: 8, right: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                    width={48}
                  />
                  <Tooltip
                    content={<CustomTooltip formatValue={(v) => formatCurrency(v)} />}
                    cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '4 2' }}
                  />
                  <ReferenceLine
                    y={fireTarget}
                    stroke="#0071E3"
                    strokeDasharray="5 3"
                    label={{ value: 'FIRE Target', position: 'right', fontSize: 10, fill: '#0071E3' }}
                  />
                  {coastFIREAge && (
                    <ReferenceLine
                      x={coastFIREAge}
                      stroke="#34C759"
                      strokeDasharray="5 3"
                      label={{ value: 'Coast FIRE', position: 'top', fontSize: 10, fill: '#34C759' }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="portfolio"
                    name="Portfolio"
                    stroke="#34C759"
                    strokeWidth={2}
                    fill="url(#accGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    animationBegin={100}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Insight Pill */}
          <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">
              {gap === 0
                ? 'Your existing assets and growth rate are already sufficient to hit your FIRE target.'
                : `Save ${formatCurrency(accResult.requiredMonthlySavings)}/mo until Age ${retirementAge} to fully bridge the ${formatCurrency(gap, true)} capital gap.`}
            </span>
            <span className="font-semibold text-apple-blue dark:text-blue-400 whitespace-nowrap ml-2">
              {retirementAge - currentAge} yrs compounding
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
