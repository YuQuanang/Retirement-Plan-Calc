import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Target, Calendar, Landmark, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  solveRequiredPortfolio,
  retirementAgeSensitivity,
  formatCurrency,
  formatPercentage,
  getWithdrawalRateHealth,
} from '../../engine/fireMath';
import { KPICard } from '../ui/KPICard';
import { CustomTooltip } from '../ui/CustomTooltip';
import { InfoTooltip } from '../ui/InfoTooltip';
import { AppleMarquee } from '../ui/AppleMarquee';

// Helper to compute granular sensitivity ages with a focus from Target Retirement Age up through Singapore's statutory benchmarks
function getSensitivityAges(currentAge: number, targetRetirementAge: number): number[] {
  const ages = new Set<number>();

  // Always include Target Retirement Age
  ages.add(targetRetirementAge);

  // Singapore Statutory Anchors
  ages.add(63); // Singapore Statutory Retirement Age
  ages.add(65); // Singapore CPF LIFE Payout Eligibility Age

  if (targetRetirementAge < 63) {
    // 1. Show an earlier reference point if feasible
    if (targetRetirementAge - 3 >= Math.max(currentAge, 45)) {
      ages.add(targetRetirementAge - 3);
    } else if (targetRetirementAge - 2 >= currentAge) {
      ages.add(targetRetirementAge - 2);
    }

    // 2. Granular steps between Target and 63
    const gap = 63 - targetRetirementAge;
    if (gap <= 4) {
      // 1-year increments: e.g., 60, 61, 62, 63
      for (let a = targetRetirementAge + 1; a < 63; a++) {
        ages.add(a);
      }
    } else if (gap <= 8) {
      // 2-year increments: e.g., 55, 57, 59, 61, 62, 63
      for (let a = targetRetirementAge + 2; a < 63; a += 2) {
        ages.add(a);
      }
      ages.add(62);
    } else {
      // Gap > 8 (e.g. 50 -> 63)
      ages.add(55); // CPF RA formation
      if (targetRetirementAge < 53) ages.add(53);
      ages.add(58);
      ages.add(60);
      ages.add(62);
    }
  } else if (targetRetirementAge === 63) {
    ages.add(58);
    ages.add(60);
    ages.add(62);
    ages.add(64);
    ages.add(67);
  } else if (targetRetirementAge < 65) {
    ages.add(60);
    ages.add(62);
    ages.add(64);
    ages.add(67);
  } else {
    // targetRetirementAge >= 65
    ages.add(58);
    ages.add(60);
    ages.add(62);
    ages.add(64);
    if (targetRetirementAge < 68) ages.add(67);
    if (targetRetirementAge < 70) ages.add(70);
  }

  return Array.from(ages)
    .filter((a) => a >= currentAge && a <= 75)
    .sort((a, b) => a - b);
}

export function CommandCenterView() {
  const { fireInputs, setPdfModalOpen } = useAppStore();
  const [chartMode, setChartMode] = useState<'wealth' | 'cashflow'>('wealth');

  // Main FIRE computation
  const result = useMemo(() => solveRequiredPortfolio(fireInputs), [fireInputs]);
  const requiredStartingPortfolio = result?.requiredStartingPortfolio || 0;

  // Granular sensitivity data across retirement ages emphasizing Target → SG Statutory benchmarks
  const sensitivityData = useMemo(() => {
    const ages = getSensitivityAges(fireInputs.currentAge, fireInputs.retirementAge);
    const raw = retirementAgeSensitivity(fireInputs, ages);
    return raw.map((d) => {
      const isTarget = d.retirementAge === fireInputs.retirementAge;
      const isSgStatutory = d.retirementAge === 63;
      const isCpfLife = d.retirementAge === 65;
      const bridgeYears = Math.max(0, fireInputs.cpfStartAge - d.retirementAge);
      const delta = d.requiredPortfolio - requiredStartingPortfolio;
      const deltaPct = requiredStartingPortfolio > 0 ? (delta / requiredStartingPortfolio) * 100 : 0;

      let tag = '';
      if (isTarget) {
        tag = 'Target Plan';
      } else if (isSgStatutory) {
        tag = 'SG Statutory (63)';
      } else if (isCpfLife) {
        tag = 'CPF LIFE (65)';
      }

      return {
        retirementAge: d.retirementAge,
        required: Math.round(d.requiredPortfolio),
        iwr: d.initialWithdrawalRate,
        label: `${d.retirementAge}`,
        tag,
        isTarget,
        isSgStatutory,
        isCpfLife,
        bridgeYears,
        delta,
        deltaPct,
      };
    });
  }, [fireInputs, requiredStartingPortfolio]);

  const statutoryEntry = useMemo(
    () => sensitivityData.find((d) => d.isSgStatutory),
    [sensitivityData]
  );
  const cpfLifeEntry = useMemo(
    () => sensitivityData.find((d) => d.isCpfLife),
    [sensitivityData]
  );

  // Chart data for portfolio trajectory
  const chartData = useMemo(
    () =>
      (result?.rows || []).map((row) => ({
        age: row.age,
        portfolio: Math.round(row.startingPortfolio || 0),
        cumulativeCpf: Math.round(row.cumulativeCpfPayout || 0),
        cpfPayout: Math.round(row.cpfLifePayout || 0),
        annualSpend: Math.round(row.annualSpendNominal || 0),
        netWithdrawal: Math.round(row.netPortfolioWithdrawal || 0),
        coveragePct: ((row.cpfCoverageRatio || 0) * 100).toFixed(1) + '%',
      })),
    [result?.rows]
  );

  const initialWithdrawalRate = result?.initialWithdrawalRate || 0;
  const firstRow = result?.rows?.[0] || { monthlySpendNominal: 0 };
  const lastRow = result?.rows?.[result.rows.length - 1] || { endingPortfolio: 0, cumulativeCpfPayout: 0 };
  const withdrawalHealth = getWithdrawalRateHealth(initialWithdrawalRate);

  const healthBadges = {
    safe: { text: 'Sustainable Drawdown', color: 'safe' as const },
    caution: { text: 'Moderate Drawdown', color: 'caution' as const },
    danger: { text: 'Elevated Drawdown', color: 'danger' as const },
  };

  const inflationRate = fireInputs?.inflationRate || 0.025;
  const years = (fireInputs?.lifeExpectancy || 90) - (fireInputs?.currentAge || 35);
  const todaysDollarEquivalent = lastRow.endingPortfolio / Math.pow(1 + inflationRate, years);
  const totalLifetimeCpf = lastRow.cumulativeCpfPayout || 0;

  return (
    <div className="space-y-5">
      {/* ── KPI Summary Row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KPICard
          index={0}
          label="Required FIRE Portfolio"
          value={formatCurrency(requiredStartingPortfolio, true)}
          subValue={`Target at Age ${fireInputs.retirementAge} to retire`}
          icon={<Target size={16} strokeWidth={1.5} />}
          badge={{ text: 'Optimal Plan', color: 'info' }}
          tooltip="The exact personal investment portfolio needed at retirement age so that, when combined with portfolio compounding and CPF LIFE payouts, your wealth lasts until your life expectancy and hits your terminal buffer."
        />
        <KPICard
          index={1}
          label={`Monthly Spend at Age ${fireInputs.retirementAge}`}
          value={formatCurrency(firstRow.monthlySpendNominal)}
          subValue={`Today's spend: ${formatCurrency(fireInputs.currentMonthlySpending)}/mo`}
          icon={<Calendar size={16} strokeWidth={1.5} />}
          badge={{ text: 'Inflation-Indexed', color: 'info' }}
          tooltip={`Your living spending indexed for inflation from age ${fireInputs.currentAge} to age ${fireInputs.retirementAge} (${fireInputs.retirementAge - fireInputs.currentAge} years). Reflects the nominal cash required in year 1 of retirement.`}
        />
        <KPICard
          index={2}
          label="Initial Withdrawal Rate"
          value={formatPercentage(initialWithdrawalRate)}
          subValue="Net of CPF LIFE lifelong annuity"
          badge={healthBadges[withdrawalHealth]}
          icon={<TrendingUp size={16} strokeWidth={1.5} />}
          tooltip="Year 1 net portfolio withdrawal divided by starting portfolio. Because Singapore CPF LIFE covers a major slice of your living costs, your net withdrawal rate is significantly lower than standard US 4% models, drastically improving portfolio longevity."
        />
        <KPICard
          index={3}
          label={`Terminal Portfolio at Age ${fireInputs.lifeExpectancy}`}
          value={formatCurrency(lastRow.endingPortfolio, true)}
          subValue={`≈ ${formatCurrency(todaysDollarEquivalent, true)} in today's $`}
          icon={<Shield size={16} strokeWidth={1.5} />}
          badge={{ text: 'Capital Preserved', color: 'info' }}
          tooltip={`The target minimum capital remaining at age ${fireInputs.lifeExpectancy}. Protects against longevity risk (living past ${fireInputs.lifeExpectancy}) and provides an emergency/legacy safety cushion.`}
        />
      </div>

      {/* ── Lifetime CPF Guaranteed Inflow Banner ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-3.5 px-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-apple-indigo/10 dark:bg-apple-indigo/20 flex items-center justify-center flex-shrink-0" style={{ color: '#5856D6' }}>
            <Landmark size={15} strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Lifetime CPF LIFE Payout: {formatCurrency(totalLifetimeCpf, true)}
              </span>
              <InfoTooltip
                content={`The total cumulative guaranteed income the Singapore Government pays you from age ${fireInputs.cpfStartAge} to ${fireInputs.lifeExpectancy} (${fireInputs.lifeExpectancy - fireInputs.cpfStartAge + 1} years). This government annuity drastically reduces the personal portfolio you need to accumulate.`}
                title="Lifetime CPF Inflow"
              />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Starts at age {fireInputs.cpfStartAge} ({formatCurrency(fireInputs.cpfMonthlyPayout)}/mo) · Backed by the AAA-rated Singapore Government
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-white/80 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900 shadow-xs whitespace-nowrap">
            {totalLifetimeCpf > 0 ? `${((totalLifetimeCpf / (totalLifetimeCpf + requiredStartingPortfolio)) * 100).toFixed(0)}% Funded by CPF` : 'CPF inactive'}
          </div>
          <button
            type="button"
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-zinc-800 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shadow-2xs whitespace-nowrap"
            title="Download Complete 2-Page Back-to-Back PDF Retirement Dossier"
          >
            <FileText size={12} className="text-rose-500" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* ── Widescreen Bento Cockpit: Zero Scrolling on Desktop ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 lg:gap-4 items-stretch">
        {/* ── Panel A: Portfolio & CPF Trajectory Chart ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {chartMode === 'wealth' ? 'Wealth Trajectory & Lifetime CPF Inflow' : 'Annual Cash Flow & CPF Coverage'}
                  </h2>
                  <InfoTooltip
                    content={
                      chartMode === 'wealth'
                        ? "Compares your personal liquid portfolio against the total cumulative cash received from CPF LIFE over time. Both variables operate on the full wealth scale ($0 to $2M+), clearly displaying how CPF LIFE acts as an ever-rising guaranteed asset base."
                        : "Shows annual cash flows on an annual scale ($0 to $200k/yr): Total Living Expenses, the CPF LIFE Annual Payout, and the Net Portfolio Withdrawal. Reveals exactly what percentage of your annual lifestyle CPF pays for without drawing down your portfolio."
                    }
                    title={chartMode === 'wealth' ? 'Wealth & Lifetime CPF' : 'Annual Cash Flow & Coverage'}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Age {fireInputs.retirementAge} → {fireInputs.lifeExpectancy} · Start-of-year withdrawal convention
                </p>
              </div>

              {/* Mode Switcher with Apple Sliding Pill */}
              <div className="relative flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 self-start sm:self-auto flex-shrink-0">
                {(['wealth', 'cashflow'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                    className={`relative z-10 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      chartMode === mode
                        ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {chartMode === mode && (
                      <motion.div
                        layoutId="chart-mode-pill"
                        className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-lg shadow-sm"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">
                      {mode === 'wealth' ? 'Wealth & CPF' : 'Cash Flow'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[10px] uppercase tracking-wider font-medium mb-2.5">
              {chartMode === 'wealth' ? (
                <>
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
                    <span className="w-3 h-0.5 rounded-full bg-apple-blue inline-block" /> Portfolio Balance
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
                    <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#5856D6' }} /> Cumulative CPF Received
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
                    <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#FF9F0A' }} /> Total Living Expenses
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
                    <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#5856D6' }} /> CPF LIFE Annual Payout
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
                    <span className="w-3 h-0.5 rounded-full bg-apple-blue inline-block" /> Net Portfolio Withdrawal
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Area Chart: Fluid responsive height */}
          <div className="w-full mt-1">
            <ResponsiveContainer width="100%" height={290}>
              {chartMode === 'wealth' ? (
                <AreaChart
                  key="wealth-chart"
                  data={chartData}
                  margin={{ top: 16, right: 32, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071E3" stopOpacity={0.20} />
                      <stop offset="100%" stopColor="#0071E3" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="cpfCumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5856D6" stopOpacity={0.20} />
                      <stop offset="100%" stopColor="#5856D6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="transparent" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 10.5, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    padding={{ left: 10, right: 18 }}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.12)]}
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
                  <Area
                    type="monotone"
                    dataKey="portfolio"
                    name="Portfolio Balance"
                    stroke="#0071E3"
                    strokeWidth={2}
                    fill="url(#portfolioGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    animationBegin={100}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeCpf"
                    name="Cumulative CPF Received"
                    stroke="#5856D6"
                    strokeWidth={2}
                    fill="url(#cpfCumGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    animationBegin={100}
                  />
                </AreaChart>
              ) : (
                <AreaChart
                  key="cashflow-chart"
                  data={chartData}
                  margin={{ top: 16, right: 32, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="cpfAnnualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5856D6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#5856D6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="netWithdrawalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071E3" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#0071E3" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="transparent" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 10.5, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    padding={{ left: 10, right: 18 }}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
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
                  {/* Filled Areas are rendered first so they stay in the background */}
                  <Area
                    type="monotone"
                    dataKey="cpfPayout"
                    name="CPF Annual Payout"
                    stroke="#5856D6"
                    strokeWidth={2}
                    fill="url(#cpfAnnualGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    animationBegin={100}
                  />
                  <Area
                    type="monotone"
                    dataKey="netWithdrawal"
                    name="Net Portfolio Withdrawal"
                    stroke="#0071E3"
                    strokeWidth={2}
                    fill="url(#netWithdrawalGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    animationBegin={100}
                  />
                  {/* Total Living Expenses is rendered LAST so its crisp amber line is painted ON TOP of all areas and never obscured */}
                  <Area
                    type="monotone"
                    dataKey="annualSpend"
                    name="Total Living Expenses"
                    stroke="#FF9F0A"
                    strokeWidth={2.25}
                    strokeDasharray="5 3"
                    fill="none"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#FF9F0A' }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    animationBegin={100}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Panel B: Retirement Age Sensitivity & Singapore Statutory Milestones ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Retirement Age Sensitivity & Singapore Milestones
                  </h2>
                  <InfoTooltip
                    content={`Visualizes capital requirements starting from your target retirement age (Age ${fireInputs.retirementAge}) through Singapore's statutory retirement age (Age 63) and CPF LIFE commencement age (Age 65). Every extra year of work closes self-funded bridge years and moves you closer to guaranteed government annuity payouts.`}
                    title="Singapore Retirement Milestones"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Compare your plan against Singapore statutory retirement (63) and CPF LIFE (65)
                </p>
              </div>

              {/* Visual Legend */}
              <div className="flex flex-wrap items-center gap-2.5 text-[9.5px] uppercase tracking-wider font-medium text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-apple-blue inline-block" /> Age {fireInputs.retirementAge} (Plan)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-[#5856D6] inline-block" /> Age 63 (SG Law)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-[#34C759] inline-block" /> Age 65 (CPF LIFE)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-zinc-300 dark:bg-zinc-700 inline-block" /> Others
                </span>
                <span className="flex items-center gap-1 text-apple-blue dark:text-blue-400 font-semibold">
                  <span className="w-2.5 border-b-2 border-dashed border-apple-blue inline-block" /> Baseline
                </span>
              </div>
            </div>

            {/* ── Apple-Grade Singapore Milestone Comparison Bento ── */}
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {/* Target Plan Card */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/50 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                  <div className="flex-1 min-w-0">
                    <AppleMarquee
                      text="Your Target Plan"
                      className="text-[10px] font-semibold uppercase tracking-wider text-apple-blue dark:text-blue-400"
                    />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-apple-blue flex-shrink-0 ring-2 ring-apple-blue/30" />
                </div>
                <div className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {formatCurrency(requiredStartingPortfolio, true)}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  Age {fireInputs.retirementAge} · {Math.max(0, fireInputs.cpfStartAge - fireInputs.retirementAge)}yr bridge
                </p>
              </div>

              {/* SG Statutory Age 63 Card */}
              <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/50 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                  <div className="flex-1 min-w-0">
                    <AppleMarquee
                      text="SG Statutory (63)"
                      className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400"
                    />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5856D6] flex-shrink-0 ring-2 ring-indigo-500/30" />
                </div>
                <div className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {formatCurrency(statutoryEntry?.required ?? 0, true)}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {statutoryEntry && fireInputs.retirementAge < 63
                    ? `Saves ${formatCurrency(requiredStartingPortfolio - statutoryEntry.required, true)} (−${(((requiredStartingPortfolio - statutoryEntry.required) / requiredStartingPortfolio) * 100).toFixed(0)}%)`
                    : 'Target matches SG Statutory'}
                </p>
              </div>

              {/* CPF LIFE Age 65 Card */}
              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                  <div className="flex-1 min-w-0">
                    <AppleMarquee
                      text="CPF LIFE (65)"
                      className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400"
                    />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 ring-2 ring-emerald-500/30" />
                </div>
                <div className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {formatCurrency(cpfLifeEntry?.required ?? 0, true)}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {cpfLifeEntry && fireInputs.retirementAge < 65
                    ? `Saves ${formatCurrency(requiredStartingPortfolio - cpfLifeEntry.required, true)} · 0 bridge`
                    : 'Zero self-funded bridge'}
                </p>
              </div>
            </div>
          </div>

          {/* Sensitivity Bar Chart: Fluid responsive height */}
          <div className="w-full mt-1">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={sensitivityData}
                layout="vertical"
                margin={{ top: 16, right: 28, left: 0, bottom: 4 }}
                barCategoryGap="20%"
              >
                <XAxis
                  type="number"
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  tickLine={false}
                  axisLine={false}
                  width={96}
                  tickFormatter={(v) => {
                    const item = sensitivityData.find((d) => d.label === v);
                    if (!item) return `Age ${v}`;
                    if (item.isTarget) return `Age ${v} · Plan`;
                    if (item.isSgStatutory) return `Age 63 · SG`;
                    if (item.isCpfLife) return `Age 65 · CPF`;
                    return `Age ${v}`;
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    const isTarget = data.isTarget;
                    const delta = data.delta;
                    return (
                      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] rounded-xl shadow-xl px-3 py-2 text-xs min-w-[200px]">
                        <div className="flex items-center justify-between mb-1 pb-1 border-b border-black/[0.06] dark:border-white/[0.08]">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Retire at Age {data.retirementAge}
                          </span>
                          {data.tag && (
                            <span
                              className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md ${
                                isTarget
                                  ? 'bg-blue-500/10 text-apple-blue dark:text-blue-400'
                                  : data.isSgStatutory
                                  ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {data.tag}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="flex justify-between text-zinc-500 dark:text-zinc-400">
                            <span>Required:</span>
                            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(data.required)}
                            </span>
                          </p>
                          <p className="flex justify-between text-zinc-500 dark:text-zinc-400">
                            <span>Delta vs Plan:</span>
                            <span
                              className={`font-semibold tabular-nums ${
                                delta > 0
                                  ? 'text-red-500'
                                  : delta < 0
                                  ? 'text-emerald-500'
                                  : 'text-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              {delta > 0 ? `+${formatCurrency(delta, true)}` : delta < 0 ? `−${formatCurrency(Math.abs(delta), true)}` : 'Baseline'}
                            </span>
                          </p>
                          <p className="flex justify-between text-zinc-500 dark:text-zinc-400">
                            <span>Bridge Years:</span>
                            <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                              {data.bridgeYears > 0 ? `${data.bridgeYears} yrs` : '0 yrs (Immediate)'}
                            </span>
                          </p>
                          <p className="flex justify-between text-zinc-500 dark:text-zinc-400">
                            <span>Withdrawal:</span>
                            <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                              {formatPercentage(data.iwr)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }}
                  cursor={{ fill: 'transparent' }}
                />
                <ReferenceLine
                  x={requiredStartingPortfolio}
                  stroke="#0071E3"
                  strokeDasharray="4 2"
                  strokeWidth={1.5}
                  label={{
                    value: `Baseline: ${formatCurrency(requiredStartingPortfolio, true)}`,
                    position: 'top',
                    fill: '#0071E3',
                    fontSize: 9.5,
                    fontWeight: 600,
                    dy: -4,
                  }}
                />
                <Bar
                  dataKey="required"
                  name="Required Portfolio"
                  radius={[0, 5, 5, 0]}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {sensitivityData.map((item) => (
                    <Cell
                      key={item.retirementAge}
                      fill={
                        item.isTarget
                          ? '#0071E3'
                          : item.isSgStatutory
                          ? '#5856D6'
                          : item.isCpfLife
                          ? '#34C759'
                          : '#e4e4e7'
                      }
                      className={
                        item.isTarget
                          ? 'fill-[#0071E3]'
                          : item.isSgStatutory
                          ? 'fill-[#5856D6]'
                          : item.isCpfLife
                          ? 'fill-[#34C759]'
                          : 'dark:fill-zinc-700'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
