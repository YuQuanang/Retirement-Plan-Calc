import { SliderInput } from '../ui/SliderInput';
import { useAppStore } from '../../store/useAppStore';
import {
  formatCurrency,
  formatPercentage,
  CPF_TIER_PRESETS,
  getComputedCpfMonthlyPayout,
  type CpfPlanType,
  type CpfTier,
} from '../../engine/fireMath';
import { InfoTooltip } from '../ui/InfoTooltip';

function SectionHeader({ title, tooltip }: { title: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-5 mb-3 first:mt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {title}
      </h3>
      {tooltip && <InfoTooltip content={tooltip} title={title} />}
    </div>
  );
}

export function ParamSidebar() {
  const { fireInputs, setFireInputs } = useAppStore();

  const currentTier: CpfTier = (fireInputs.cpfTier as CpfTier) || 'frs';
  const currentPlan: CpfPlanType =
    fireInputs.cpfPlanType ?? (fireInputs.cpfEscalatingPlan ? 'escalating' : 'standard');

  const handleSelectTier = (tier: CpfTier) => {
    const computedPayout = getComputedCpfMonthlyPayout(tier, fireInputs.cpfStartAge);
    setFireInputs({
      cpfTier: tier,
      cpfMonthlyPayout: computedPayout,
    });
  };

  const handlePlanChange = (plan: CpfPlanType) => {
    setFireInputs({
      cpfPlanType: plan,
      cpfEscalatingPlan: plan === 'escalating',
    });
  };

  const handleStartAgeChange = (startAge: number) => {
    const computedPayout = getComputedCpfMonthlyPayout(currentTier, startAge);
    setFireInputs({
      cpfStartAge: startAge,
      cpfMonthlyPayout: computedPayout,
    });
  };

  // Compute display values for CPF LIFE
  const effectiveMonthlyPayout = getComputedCpfMonthlyPayout(currentTier, fireInputs.cpfStartAge);
  const deferralYears = Math.max(0, fireInputs.cpfStartAge - 65);
  const deferralBonusPct = deferralYears * 7;
  const tierConfig = CPF_TIER_PRESETS[currentTier] ?? CPF_TIER_PRESETS.frs;

  return (
    <div className="space-y-1">
      {/* ── Timeline & Longevity ── */}
      <SectionHeader
        title="Timeline & Longevity"
        tooltip="Defines your accumulation runway (time until retirement) and your decumulation duration (years your portfolio must sustain your lifestyle)."
      />

      <SliderInput
        label="Current Age"
        value={fireInputs.currentAge}
        min={18}
        max={70}
        step={1}
        onChange={(v) => setFireInputs({ currentAge: v })}
        format={(v) => `${v} yrs`}
        parse={(s) => parseInt(s)}
        hint={`${fireInputs.retirementAge - fireInputs.currentAge} years to retirement`}
        tooltip="Your age today. Serves as t=0 to calculate compound growth of existing assets and inflation indexing of current living expenses."
      />
      <SliderInput
        label="Target Retirement Age"
        value={fireInputs.retirementAge}
        min={40}
        max={75}
        step={1}
        onChange={(v) => setFireInputs({ retirementAge: Math.max(v, fireInputs.currentAge + 1) })}
        format={(v) => `${v} yrs`}
        parse={(s) => parseInt(s)}
        tooltip="The age you plan to stop working. From this age onward, living expenses must be funded entirely from your investment portfolio and CPF LIFE."
      />
      <SliderInput
        label="Life Expectancy"
        value={fireInputs.lifeExpectancy}
        min={70}
        max={105}
        step={1}
        onChange={(v) => setFireInputs({ lifeExpectancy: v })}
        format={(v) => `${v} yrs`}
        parse={(s) => parseInt(s)}
        hint={`${fireInputs.lifeExpectancy - fireInputs.retirementAge} retirement years`}
        tooltip="The planning horizon for your retirement. Singapore's statutory life expectancy is ~85 (men) and ~88 (women). For safe FIRE planning, modeling to age 90–95 is strongly recommended to protect against longevity risk."
      />

      {/* ── Lifestyle & Inflation ── */}
      <SectionHeader
        title="Lifestyle & Inflation"
        tooltip="Models your living expenses and how purchasing power erodes over time due to inflation."
      />

      <SliderInput
        label="Monthly Spending (Today)"
        value={fireInputs.currentMonthlySpending}
        min={1000}
        max={25000}
        step={100}
        onChange={(v) => setFireInputs({ currentMonthlySpending: v })}
        format={(v) => formatCurrency(v)}
        parse={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))}
        accentColor="#34C759"
        tooltip="Your household living expenses in today's Singapore Dollars (SGD), excluding mortgage if paid off before retirement. This base figure is compounded by your inflation assumption to determine future cash needs."
      />
      <SliderInput
        label="Annual Inflation Rate"
        value={fireInputs.inflationRate}
        min={0.005}
        max={0.08}
        step={0.001}
        onChange={(v) => setFireInputs({ inflationRate: v })}
        format={(v) => formatPercentage(v)}
        parse={(s) => parseFloat(s.replace('%', '')) / 100}
        accentColor="#FF9F0A"
        tooltip="Expected annual inflation rate. Singapore MAS Core Inflation historically averages 2.0%–2.5%. Higher lifestyle/medical inflation often tracks 3.0%–3.5%."
      />

      {/* ── Portfolio & Safety Buffer ── */}
      <SectionHeader
        title="Portfolio & Safety Buffer"
        tooltip="Assumptions on investment return during retirement and the capital cushion you wish to leave behind."
      />

      <SliderInput
        label="Post-Retirement Return"
        value={fireInputs.postRetirementReturn}
        min={0.01}
        max={0.12}
        step={0.001}
        onChange={(v) => setFireInputs({ postRetirementReturn: v })}
        format={(v) => formatPercentage(v)}
        parse={(s) => parseFloat(s.replace('%', '')) / 100}
        tooltip="The nominal annualized return of your portfolio during retirement. Typically lower than accumulation phase due to conservative asset allocation (e.g. 3.0%–4.5% in balanced bonds/income ETFs)."
      />
      <SliderInput
        label="Terminal Buffer"
        value={fireInputs.targetTerminalBuffer}
        min={0}
        max={2_000_000}
        step={10000}
        onChange={(v) => setFireInputs({ targetTerminalBuffer: v })}
        format={(v) => formatCurrency(v, true)}
        parse={(s) => parseFloat(s.replace(/[^0-9.]/g, ''))}
        hint="Portfolio balance target at life expectancy"
        tooltip="The minimum target portfolio value remaining at your life expectancy age. Prevents portfolio depletion to zero, providing an emergency buffer and inheritance."
      />

      {/* ── Singapore CPF LIFE ── */}
      <SectionHeader
        title="Singapore CPF LIFE"
        tooltip="Singapore's national longevity insurance scheme. Payouts are backed by the Singapore Government (AAA-rated) and continue for life. Payout amounts are strictly determined by your Retirement Sum tier, plan type, and start age."
      />

      {/* CPF Benchmark Retirement Sum Tiers (strictly official 3 benchmarks) */}
      <div className="space-y-1.5 pb-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Retirement Sum Benchmark
          </span>
          <InfoTooltip
            content="The 3 official statutory CPF Retirement Sum benchmarks: BRS (~$106.5k RA, ~$900/mo, requires property pledge), FRS (~$213k RA, ~$1,750/mo, standard national benchmark), or ERS (~$426k RA, ~$3,500/mo, raised to 4× BRS from 2025)."
            title="CPF Retirement Sum Tiers"
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['brs', 'frs', 'ers'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => handleSelectTier(tier)}
              className={`py-2 px-2 rounded-xl text-center border transition-all ${
                currentTier === tier
                  ? 'bg-apple-indigo text-white border-apple-indigo shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
              style={currentTier === tier ? { backgroundColor: '#5856D6', borderColor: '#5856D6' } : {}}
            >
              <div className="text-xs font-semibold leading-tight uppercase">
                {tier === 'ers' ? 'ERS (4×)' : tier}
              </div>
              <div className="text-[10px] opacity-80 mt-0.5 tabular-nums">
                ~{formatCurrency(CPF_TIER_PRESETS[tier].monthlyPayout)}/mo
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CPF LIFE Plan Selector (3 official plans) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            CPF LIFE Plan Type
          </span>
          <InfoTooltip
            content="The 3 official Singapore CPF LIFE plans: Standard Plan (level, flat lifelong payout; default), Escalating Plan (starts ~20% lower, grows +2%/yr for life to fight inflation), and Basic Plan (lower payout, draws RA interest first, leaving the largest bequest)."
            title="CPF LIFE 3 Official Plans"
          />
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            {
              id: 'standard' as const,
              label: 'Standard',
              desc: 'Flat lifelong payouts',
            },
            {
              id: 'escalating' as const,
              label: 'Escalating',
              desc: '+2%/yr inflation hedge',
            },
            {
              id: 'basic' as const,
              label: 'Basic',
              desc: 'Lower payout, max bequest',
            },
          ].map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => handlePlanChange(plan.id)}
              className={`py-1.5 px-2 rounded-xl text-center border transition-all ${
                currentPlan === plan.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              <div className="text-xs font-semibold leading-tight">{plan.label}</div>
              <div className="text-[9px] opacity-75 mt-0.5 leading-tight">{plan.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <SliderInput
        label="CPF Payout Start Age"
        value={fireInputs.cpfStartAge}
        min={65}
        max={70}
        step={1}
        onChange={handleStartAgeChange}
        format={(v) => `${v} yrs`}
        parse={(s) => parseInt(s)}
        accentColor="#5856D6"
        hint={
          deferralYears > 0
            ? `+${deferralBonusPct}% permanent bonus (+7%/yr deferred past 65)`
            : 'Standard eligibility start age (Age 65)'
        }
        tooltip="The age you choose to commence CPF LIFE payouts (between age 65 and 70). Deferring past 65 increases your permanent monthly payout by ~7% for each year deferred (+35% at age 70)."
      />

      {/* Calculated Monthly Payout Display Card (replaces custom slider) */}
      <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Government Payout
            </span>
            <InfoTooltip
              content={`Calculated payout based on ${tierConfig.name} (~${formatCurrency(tierConfig.raBalance)} RA balance at 55), the ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan, and starting at Age ${fireInputs.cpfStartAge}${deferralYears > 0 ? ` (+${deferralBonusPct}% deferral boost)` : ''}.`}
              title="Official CPF Monthly Payout"
            />
          </div>
          <span className="text-sm font-semibold tabular-nums text-indigo-950 dark:text-indigo-100">
            {formatCurrency(effectiveMonthlyPayout)} / mo
          </span>
        </div>
        <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">
          {tierConfig.name} · {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan · Starts at Age {fireInputs.cpfStartAge}
        </p>
      </div>

      {/* Withdrawal Timing toggle */}
      <div className="mt-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Withdrawal Timing
          </p>
          <InfoTooltip
            content="Start of Year (standard FIRE convention): Living expenses are withdrawn at the beginning of each year, so remaining balance compounds. End of Year (spreadsheet parity): Investment growth applies to full starting balance before annual withdrawal."
            title="Cash Flow Timing Convention"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { label: 'Start of Year (Standard)', value: 'start' as const },
            { label: 'End of Year', value: 'end' as const },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFireInputs({ withdrawalTiming: opt.value })}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                fireInputs.withdrawalTiming === opt.value
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
