import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SliderInput } from '../ui/SliderInput';
import { KPICard } from '../ui/KPICard';
import {
  solveRequiredPortfolio,
  simulateStressTest,
  formatCurrency,
  formatPercentage,
} from '../../engine/fireMath';
import { AlertTriangle, Shield, Zap } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { CustomTooltip } from '../ui/CustomTooltip';
import { InfoTooltip } from '../ui/InfoTooltip';

export function StressTestView() {
  const { fireInputs, stressInputs, setStressInputs } = useAppStore();

  const safeStress = useMemo(
    () => ({
      crashYear: stressInputs?.crashYear ?? 0,
      crashMagnitude: stressInputs?.crashMagnitude ?? -0.30,
      recoveryYears: stressInputs?.recoveryYears ?? 3,
      useGuardrails: stressInputs?.useGuardrails ?? true,
      guardrailReduction: stressInputs?.guardrailReduction ?? 0.10,
    }),
    [stressInputs]
  );

  const maxCrashYear = Math.max(1, (fireInputs?.lifeExpectancy ?? 90) - (fireInputs?.retirementAge ?? 65));
  const safeCrashYear = Math.min(safeStress.crashYear, maxCrashYear);

  const safeEffectiveStress = useMemo(
    () => ({
      ...safeStress,
      crashYear: safeCrashYear,
    }),
    [safeStress, safeCrashYear]
  );

  const baseResult = useMemo(() => solveRequiredPortfolio(fireInputs), [fireInputs]);
  const startingPortfolio = baseResult?.requiredStartingPortfolio || 1_500_000;

  const stressedRows = useMemo(
    () => simulateStressTest(fireInputs, startingPortfolio, safeEffectiveStress),
    [fireInputs, startingPortfolio, safeEffectiveStress]
  );

  const chartData = useMemo(
    () =>
      (baseResult?.rows || []).map((baseRow, i) => ({
        age: baseRow.age,
        baseline: Math.max(0, Math.round(baseRow.startingPortfolio || 0)),
        stressed: Math.max(0, Math.round(stressedRows[i]?.startingPortfolio || 0)),
      })),
    [baseResult?.rows, stressedRows]
  );

  const stressedFinal = stressedRows[stressedRows.length - 1]?.endingPortfolio ?? 0;
  const baseFinal = baseResult?.rows[baseResult.rows.length - 1]?.endingPortfolio ?? 0;
  const portfolioImpact = stressedFinal - baseFinal;
  const portfolioDepleted = stressedRows.some((r) => r.endingPortfolio <= 0);
  const depletionAge = stressedRows.find((r) => r.endingPortfolio <= 0)?.age ?? null;

  return (
    <div className="space-y-4">
      {/* ── Header Notice ── */}
      <div className="p-3 sm:p-3.5 px-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/60">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle size={14} strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300">
                Stress Testing & Sequence-of-Returns Lab
              </h2>
              <InfoTooltip
                content="Sequence-of-Returns Risk (SRR) is the danger that a severe market downturn occurs in the early years of retirement when you are simultaneously withdrawing funds. Withdrawing from depressed assets permanently locks in losses and can accelerate premature portfolio depletion."
                title="Sequence of Returns Risk"
              />
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Simulate historical market shocks across retirement to test portfolio longevity and dynamic spending guardrails.
            </p>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <KPICard
          index={0}
          label="Stressed Terminal Value"
          value={portfolioDepleted ? 'DEPLETED' : formatCurrency(stressedFinal, true)}
          subValue={
            portfolioDepleted
              ? `Runs out at age ${depletionAge}!`
              : `vs ${formatCurrency(baseFinal, true)} baseline (${portfolioImpact >= 0 ? '+' : ''}${formatCurrency(portfolioImpact, true)})`
          }
          icon={<AlertTriangle size={16} strokeWidth={1.5} />}
          badge={
            portfolioDepleted
              ? { text: 'Depleted Early', color: 'danger' }
              : portfolioImpact < 0
              ? { text: 'Drawdown Impact', color: 'caution' }
              : { text: 'Resilient', color: 'safe' }
          }
          tooltip={`Final portfolio balance at life expectancy (age ${fireInputs.lifeExpectancy}) under the stressed crash scenario.`}
        />
        <KPICard
          index={1}
          label="Injected Shock"
          value={formatPercentage(safeStress.crashMagnitude)}
          subValue={`Year ${safeCrashYear + 1} (Age ${(fireInputs.retirementAge || 65) + safeCrashYear}) · ${safeStress.recoveryYears}yr linear recovery`}
          icon={<Zap size={16} strokeWidth={1.5} />}
          badge={{ text: 'Historical Shock', color: 'danger' }}
          tooltip="The magnitude and timing of the simulated market downturn. Earlier years produce the greatest sequence of returns drag."
        />
        <KPICard
          index={2}
          label="Dynamic Guardrails"
          value={safeStress.useGuardrails ? `−${formatPercentage(safeStress.guardrailReduction)} spend` : 'Disabled'}
          subValue="Temporary spending cut during negative return years"
          icon={<Shield size={16} strokeWidth={1.5} />}
          badge={safeStress.useGuardrails ? { text: 'Active Guardrails', color: 'safe' } : { text: 'Guardrails Off', color: 'caution' }}
          tooltip="Guyton-Klinger style spending rule: automatically reduces living withdrawals by the specified percentage in years where investment returns are negative, giving your portfolio room to recover."
        />
      </div>

      {/* ── Widescreen Bento Layout: Minimal Scrolling ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 lg:gap-4 items-stretch">
        <div className="xl:col-span-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">Crash Parameters</h3>
              <InfoTooltip
                content="Configure the exact timing, depth, and duration of the market shock."
                title="Crash Parameters"
              />
            </div>

            <div className="space-y-2.5">
              <SliderInput
                label="Crash Timing (Year of Retirement)"
                value={safeCrashYear}
                min={0}
                max={maxCrashYear}
                step={1}
                onChange={(v) => setStressInputs({ crashYear: v })}
                format={(v) => `Year ${v + 1} (Age ${(fireInputs.retirementAge || 65) + v})`}
                parse={(s) => {
                  const n = parseInt(s.replace(/[^0-9]/g, ''));
                  return isNaN(n) ? 0 : Math.max(0, Math.min(maxCrashYear, n - 1));
                }}
                accentColor="#FF3B30"
                hint={`Year 1 = Age ${fireInputs.retirementAge || 65} · Year ${maxCrashYear + 1} = Age ${fireInputs.lifeExpectancy || 90}`}
                tooltip={`The specific year of retirement when the market crash occurs. Allows testing shocks all the way from Year 1 (Age ${fireInputs.retirementAge || 65}) to your life expectancy Year ${maxCrashYear + 1} (Age ${fireInputs.lifeExpectancy || 90}).`}
              />
              <SliderInput
                label="Crash Magnitude"
                value={safeStress.crashMagnitude}
                min={-0.70}
                max={-0.05}
                step={0.01}
                onChange={(v) => setStressInputs({ crashMagnitude: v })}
                format={(v) => formatPercentage(v)}
                parse={(s) => parseFloat(s.replace('%', '')) / 100}
                accentColor="#FF3B30"
                tooltip="Total percentage decline of your investment portfolio during the crash year (e.g. -30% modeled after 2008 GFC or 2020 COVID shock)."
              />
              <SliderInput
                label="Recovery Period"
                value={safeStress.recoveryYears}
                min={1}
                max={10}
                step={1}
                onChange={(v) => setStressInputs({ recoveryYears: v })}
                format={(v) => `${v} yrs`}
                parse={(s) => parseInt(s)}
                accentColor="#FF9F0A"
                tooltip="Number of years it takes for portfolio return rates to recover from the bottom back to your normal expected post-retirement return."
              />
            </div>

            {/* Guardrails toggle */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Dynamic Guardrails
                </span>
                <InfoTooltip
                  content="A dynamic spending rule where you agree to temporarily trim discretionary spending during down markets. This single rule often prevents early portfolio failure during crashes."
                  title="Dynamic Guardrails"
                />
              </div>
              <button
                type="button"
                onClick={() => setStressInputs({ useGuardrails: !safeStress.useGuardrails })}
                className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  safeStress.useGuardrails
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                {safeStress.useGuardrails ? '✓ Guardrails Active' : 'Enable Guardrails'}
              </button>
            </div>

            {safeStress.useGuardrails && (
              <div className="mt-2">
                <SliderInput
                  label="Spending Reduction"
                  value={safeStress.guardrailReduction}
                  min={0.0}
                  max={0.50}
                  step={0.01}
                  onChange={(v) => setStressInputs({ guardrailReduction: v })}
                  format={(v) => formatPercentage(v)}
                  parse={(s) => {
                    const n = parseFloat(s.replace(/[^0-9.]/g, ''));
                    return isNaN(n) ? 0 : Math.max(0, Math.min(0.50, n > 1 ? n / 100 : n));
                  }}
                  accentColor="#34C759"
                  hint="0% = no cut; 50% = cut spending by half during crash"
                  tooltip="The percentage (0% to 50%) by which living expenses are trimmed during down market years to prevent selling equities at distressed valuations."
                />
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-8 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Stressed vs Baseline Trajectory
                  </h3>
                  <InfoTooltip
                    content="Direct visual overlay showing your normal planned trajectory (Blue) vs the stressed path (Red) under the injected market crash."
                    title="Stress Curve Comparison"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {safeStress.crashMagnitude >= 0 ? '+' : ''}
                  {formatPercentage(safeStress.crashMagnitude)} shock in Year {safeCrashYear + 1} (Age {(fireInputs.retirementAge || 65) + safeCrashYear}) ·{' '}
                  {safeStress.recoveryYears}-year recovery
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-medium text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-apple-blue inline-block" /> Baseline
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Stressed
                </span>
              </div>
            </div>

            <div className="w-full mt-2">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 8, right: 28, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071E3" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#0071E3" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#FF3B30" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="transparent" />
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
                  <Area
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline Plan"
                    stroke="#0071E3"
                    strokeWidth={2}
                    fill="url(#baseGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                    animationBegin={50}
                  />
                  <Area
                    type="monotone"
                    dataKey="stressed"
                    name="Stressed Crash"
                    stroke="#FF3B30"
                    strokeWidth={2}
                    strokeDasharray={portfolioDepleted ? '4 2' : undefined}
                    fill="url(#stressGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                    animationBegin={100}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scenario Result Footer */}
          <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">
              {portfolioDepleted
                ? `⚠️ Portfolio is depleted at Age ${depletionAge}. Activate Dynamic Guardrails to protect capital.`
                : `Plan survives shock with ${formatCurrency(stressedFinal, true)} terminal buffer at Age ${fireInputs.lifeExpectancy}.`}
            </span>
            <span
              className={`font-semibold whitespace-nowrap ml-2 ${
                portfolioDepleted ? 'text-red-500' : 'text-emerald-500'
              }`}
            >
              {portfolioDepleted ? 'Early Depletion' : 'Capital Preserved'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
