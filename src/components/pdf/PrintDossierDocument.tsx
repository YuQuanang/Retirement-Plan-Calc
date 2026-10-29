import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  solveRequiredPortfolio,
  solveAccumulation,
  simulateStressTest,
  formatCurrency,
  formatPercentage,
  getWithdrawalRateHealth,
  CPF_TIER_PRESETS,
  type CpfTier,
  type YearlyRow,
} from '../../engine/fireMath';

interface PrintDossierDocumentProps {
  previewMode?: boolean;
  pageView?: 'all' | 'page1' | 'page2';
}

// ─── Pure SVG Sparkline (no Recharts — renders perfectly in print) ─────────
function SparklineChart({
  data,
  width = 640,
  height = 135,
  lines,
  referenceY,
}: {
  data: Record<string, number>[];
  width?: number;
  height?: number;
  lines: { key: string; color: string; dashed?: boolean; fill?: boolean }[];
  referenceY?: { value: number; color: string; label: string };
}) {
  const padT = 10, padB = 18, padL = 48, padR = 58;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const allValues = lines.flatMap((l) => data.map((d) => d[l.key] ?? 0));
  const rawMax = Math.max(...allValues, referenceY?.value ?? 0) * 1.06;
  const rawMin = 0;
  const range = rawMax - rawMin || 1;

  const px = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * innerW;
  const py = (v: number) => padT + innerH - ((v - rawMin) / range) * innerH;

  const makePath = (key: string) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d[key] ?? 0).toFixed(1)}`).join(' ');

  const makeArea = (key: string) => {
    const last = data.length - 1;
    return `${makePath(key)} L${px(last).toFixed(1)},${(padT + innerH).toFixed(1)} L${padL},${(padT + innerH).toFixed(1)}Z`;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => rawMin + range * t);
  const xTicks = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (i, idx, arr) => arr.indexOf(i) === idx && i < data.length
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        {lines.filter((l) => l.fill).map((l) => (
          <linearGradient key={l.key} id={`g-${l.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={l.color} stopOpacity={0.20} />
            <stop offset="100%" stopColor={l.color} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>

      {/* Subtle grid */}
      {yTicks.slice(1).map((v, i) => (
        <line key={i} x1={padL} y1={py(v).toFixed(1)} x2={padL + innerW} y2={py(v).toFixed(1)} stroke="#e4e4e7" strokeWidth="0.6" />
      ))}

      {/* Y labels */}
      {yTicks.filter((_, i) => i % 2 === 0 || i === 4).map((v, i) => (
        <text key={i} x={padL - 6} y={py(v) + 3.5} textAnchor="end" fontSize={8.5} fill="#a1a1aa" fontFamily="ui-sans-serif,sans-serif">
          {v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`}
        </text>
      ))}

      {/* X labels */}
      {xTicks.map((i) => (
        <text key={i} x={px(i)} y={height - 3} textAnchor="middle" fontSize={8.5} fill="#a1a1aa" fontFamily="ui-sans-serif,sans-serif">
          {data[i]?.age ?? ''}
        </text>
      ))}

      {/* Reference line */}
      {referenceY && (() => {
        const y = py(referenceY.value);
        return (
          <>
            <line x1={padL} y1={y.toFixed(1)} x2={padL + innerW} y2={y.toFixed(1)} stroke={referenceY.color} strokeWidth="1.2" strokeDasharray="5,3" />
            <text x={padL + innerW + 4} y={y + 3.5} fontSize={8} fill={referenceY.color} fontFamily="ui-sans-serif,sans-serif">{referenceY.label}</text>
          </>
        );
      })()}

      {/* Filled areas */}
      {lines.filter((l) => l.fill).map((l) => (
        <path key={`a-${l.key}`} d={makeArea(l.key)} fill={`url(#g-${l.key})`} />
      ))}

      {/* Lines */}
      {lines.map((l) => (
        <path key={l.key} d={makePath(l.key)} fill="none" stroke={l.color} strokeWidth={l.dashed ? 1.5 : 2} strokeDasharray={l.dashed ? '5,3' : undefined} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

// ─── Stacked bar ────────────────────────────────────────────────────────────
function StackedBar({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-[8px] gap-px mb-1">
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, minWidth: 3 }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
        {segments.map((s, i) => (
          <span key={i} className="flex items-center gap-1 text-[9px] text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.label} {((s.value / total) * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-[3.5px] border-b border-zinc-100 last:border-0">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <span className={`text-[10px] font-semibold tabular-nums ${accent ?? 'text-zinc-900'}`}>{value}</span>
    </div>
  );
}

function SecHead({ n, title, badge }: { n: string; title: string; badge?: { text: string; cls: string } }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[9.5px] font-black text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded font-mono">{n}</span>
        <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-zinc-700">{title}</h3>
      </div>
      {badge && <span className={`text-[9.5px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>}
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="p-3 rounded-xl border border-zinc-200 bg-white dossier-card">
      <p className="text-[9.5px] font-semibold text-zinc-400 uppercase tracking-wider leading-none mb-1.5">{label}</p>
      <p className={`text-[18px] font-black tracking-tight tabular-nums leading-none ${accent ?? 'text-zinc-900'}`}>{value}</p>
      {sub && <p className="text-[9px] text-zinc-400 mt-1 leading-snug">{sub}</p>}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function PrintDossierDocument({ previewMode = false, pageView = 'all' }: PrintDossierDocumentProps): React.ReactElement {
  const { fireInputs, accumulationInputs, stressInputs, scenarios, activeScenarioId } = useAppStore();

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);
  const scenarioTitle = activeScenario?.name ?? 'Base Case';
  const dateStr = new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });

  // Solvers
  const fireResult = useMemo(() => solveRequiredPortfolio(fireInputs), [fireInputs]);
  const reqPortfolio = fireResult?.requiredStartingPortfolio ?? 1_500_000;
  const iwr = fireResult?.initialWithdrawalRate ?? 0.03;
  const trajectory: YearlyRow[] = fireResult?.rows ?? [];

  const ytr = Math.max(0, fireInputs.retirementAge - fireInputs.currentAge);
  const retYrs = fireInputs.lifeExpectancy - fireInputs.retirementAge;
  const todayDollar = reqPortfolio / Math.pow(1 + fireInputs.inflationRate, ytr);
  const swrH = getWithdrawalRateHealth(iwr);

  const cAge = fireInputs.currentAge;
  const rAge = Math.max(cAge, fireInputs.retirementAge);

  const accIn = useMemo(() => ({
    currentAge: cAge, retirementAge: rAge, targetPortfolio: reqPortfolio,
    currentLiquidPortfolio: accumulationInputs?.currentLiquidPortfolio ?? 100_000,
    currentCPFBalance: accumulationInputs?.currentCPFBalance ?? 50_000,
    cashReserves: accumulationInputs?.cashReserves ?? 30_000,
    propertyEquity: accumulationInputs?.propertyEquity ?? 200_000,
    propertyUnlockAge: accumulationInputs?.propertyUnlockAge ?? 65,
    preRetirementReturn: accumulationInputs?.preRetirementReturn ?? 0.07,
    cpfReturn: accumulationInputs?.cpfReturn ?? 0.04,
    monthlySavings: accumulationInputs?.monthlySavings ?? 0,
  }), [cAge, rAge, reqPortfolio, accumulationInputs]);
  const accResult = useMemo(() => solveAccumulation(accIn), [accIn]);
  const gap = reqPortfolio - accResult.projectedPortfolioAtRetirement;
  const nw = accIn.currentLiquidPortfolio + accIn.currentCPFBalance + accIn.cashReserves + accIn.propertyEquity;

  const ss = useMemo(() => ({
    crashYear: stressInputs?.crashYear ?? 0,
    crashMagnitude: stressInputs?.crashMagnitude ?? -0.3,
    recoveryYears: stressInputs?.recoveryYears ?? 3,
    useGuardrails: stressInputs?.useGuardrails ?? true,
    guardrailReduction: stressInputs?.guardrailReduction ?? 0.1,
  }), [stressInputs]);
  const stressRows: YearlyRow[] = useMemo(() => simulateStressTest(fireInputs, reqPortfolio, ss), [fireInputs, reqPortfolio, ss]);
  const sa = useMemo(() => {
    if (!stressRows.length) return { ok: true, low: reqPortfolio, lowAge: rAge, term: reqPortfolio };
    let low = reqPortfolio, lowAge = rAge;
    for (const r of stressRows) if (r.endingPortfolio < low) { low = r.endingPortfolio; lowAge = r.age; }
    return { ok: stressRows.every((r) => r.endingPortfolio > 0), low, lowAge, term: stressRows[stressRows.length - 1].endingPortfolio };
  }, [stressRows, reqPortfolio, rAge]);

  const tierKey: CpfTier = fireInputs.cpfTier ?? 'frs';
  const tier = CPF_TIER_PRESETS[tierKey] ?? CPF_TIER_PRESETS.frs;
  const annCpf = (fireInputs.cpfMonthlyPayout ?? tier.monthlyPayout) * 12;
  const cpfBridge = Math.max(0, fireInputs.cpfStartAge - rAge);

  // Accumulation chart
  const accChart = useMemo(() => {
    const rows: { age: number; portfolio: number }[] = [];
    let p = accIn.currentLiquidPortfolio + accIn.currentCPFBalance + accIn.cashReserves;
    const m = isNaN(accResult.requiredMonthlySavings) ? 0 : Math.max(0, accResult.requiredMonthlySavings);
    const r = accIn.preRetirementReturn / 12;
    for (let age = cAge; age <= rAge; age++) {
      rows.push({ age, portfolio: Math.round(p) });
      for (let i = 0; i < 12; i++) p = p * (1 + r) + m;
      if (age === accIn.propertyUnlockAge - 1) p += accIn.propertyEquity;
    }
    return rows;
  }, [cAge, rAge, accIn, accResult.requiredMonthlySavings]);

  // Decumulation chart
  const decChart = useMemo(() =>
    trajectory.map((r) => ({
      age: r.age,
      portfolio: Math.max(0, Math.round(r.endingPortfolio)),
      cpfCum: Math.round(r.cumulativeCpfPayout),
    })),
    [trajectory]
  );

  // Stress chart
  const stressChart = useMemo(() =>
    trajectory.map((r, i) => ({
      age: r.age,
      baseline: Math.max(0, Math.round(r.endingPortfolio)),
      stressed: Math.max(0, Math.round(stressRows[i]?.endingPortfolio ?? r.endingPortfolio)),
    })),
    [trajectory, stressRows]
  );

  // Milestone rows
  const miles = useMemo(() => {
    if (!trajectory.length) return [];
    const s = trajectory[0].age, e = trajectory[trajectory.length - 1].age;
    const t = new Set<number>([s]);
    if (fireInputs.cpfStartAge >= s && fireInputs.cpfStartAge <= e) {
      if (fireInputs.cpfStartAge - 1 > s) t.add(fireInputs.cpfStartAge - 1);
      t.add(fireInputs.cpfStartAge);
    }
    for (let a = Math.ceil((s + 2) / 5) * 5; a < e; a += 5) t.add(a);
    t.add(e);
    let ages = Array.from(t).sort((a, b) => a - b);
    if (ages.length > 10) {
      const ess = new Set([s, fireInputs.cpfStartAge, e]);
      const opt = ages.filter((a) => !ess.has(a));
      const step = opt.length / Math.max(1, 10 - ess.size);
      ages = Array.from(new Set([...ess, ...Array.from({ length: 10 - ess.size }, (_, i) => opt[Math.floor(i * step)])])).sort((a, b) => a - b);
    }
    return ages.map((age) => trajectory.find((r) => r.age === age)).filter(Boolean) as YearlyRow[];
  }, [trajectory, fireInputs.cpfStartAge]);

  const tLive = trajectory.reduce((s, r) => s + r.annualSpendNominal, 0);
  const tCpf = trajectory.reduce((s, r) => s + r.cpfLifePayout, 0);
  const tNet = trajectory.reduce((s, r) => s + r.netPortfolioWithdrawal, 0);
  const lastRow = trajectory[trajectory.length - 1];

  const p1Show = pageView === 'all' || pageView === 'page1';
  const p2Show = pageView === 'all' || pageView === 'page2';

  const pageClass = (extra: string) =>
    previewMode
      ? `w-full max-w-[760px] mx-auto bg-white rounded-2xl border border-zinc-200/80 shadow-2xl p-6 sm:p-7 text-zinc-900 font-sans flex flex-col justify-between ${extra}`
      : `${extra} w-full bg-white p-[16px] text-zinc-900 font-sans flex flex-col justify-between`;

  const C = 'rounded-xl border border-zinc-200 bg-zinc-50/60 dossier-card p-3';

  return (
    <div className={previewMode ? 'space-y-8' : ''}>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1 — EXECUTIVE BRIEFING & ACCUMULATION
          ══════════════════════════════════════════════════════════════════ */}
      {p1Show && (
        <section className={pageClass('print-page-1')} id="print-dossier-page-1">
          <div className="space-y-2.5">

            {/* ── Header ── */}
            <div className="flex items-start justify-between pb-2.5 border-b-[2.5px] border-zinc-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#5856D6] flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-[#0071E3] bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                      Confidential · SG FIRE Studio
                    </span>
                    <span className="text-[9.5px] text-zinc-400">Scenario: <strong className="text-zinc-700">{scenarioTitle}</strong></span>
                  </div>
                  <h1 className="text-[17px] font-black tracking-tight text-zinc-900 leading-none">Singapore Retirement Strategy Blueprint</h1>
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[10.5px] font-bold text-zinc-800">{dateStr}</p>
                <p className="text-[9.5px] text-zinc-500">
                  Age <strong className="text-zinc-800">{cAge}</strong> → Retire <strong className="text-zinc-800">{rAge}</strong> · {ytr}yr accumulation
                </p>
                <p className="text-[9.5px] text-zinc-500">
                  Life Expectancy <strong className="text-zinc-800">{fireInputs.lifeExpectancy}</strong> · {retYrs}yr retirement horizon
                </p>
                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${
                  swrH === 'safe' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : swrH === 'caution' ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  SWR {formatPercentage(iwr)} — {swrH === 'safe' ? 'Safe Zone ✓' : swrH === 'caution' ? 'Caution Zone' : 'Elevated Risk'}
                </span>
              </div>
            </div>

            {/* ── 01 · KPI Tiles ── */}
            <div>
              <SecHead n="01" title="Core Retirement Capital Targets & Solvency Benchmarks" />
              <div className="grid grid-cols-4 gap-2.5">
                <Tile
                  label="FIRE Nest Egg"
                  value={formatCurrency(reqPortfolio, true)}
                  sub={`≈ ${formatCurrency(todayDollar, true)} in today's dollars`}
                  accent="text-[#0071E3]"
                />
                <Tile
                  label="Year 1 Annual Spending"
                  value={formatCurrency(trajectory[0]?.annualSpendNominal ?? 0, true)}
                  sub={`${formatCurrency(fireInputs.currentMonthlySpending)}/mo inflating at ${(fireInputs.inflationRate * 100).toFixed(1)}% p.a.`}
                />
                <Tile
                  label="CPF LIFE Guaranteed Floor"
                  value={formatCurrency(annCpf, true) + '/yr'}
                  sub={`${formatCurrency(fireInputs.cpfMonthlyPayout ?? tier.monthlyPayout)}/mo · Age ${fireInputs.cpfStartAge} · ${tierKey.toUpperCase()}`}
                  accent="text-[#5856D6]"
                />
                <Tile
                  label={`Terminal Reserve (Age ${fireInputs.lifeExpectancy})`}
                  value={formatCurrency(lastRow?.endingPortfolio ?? 0, true)}
                  sub={`Buffer locked: ${formatCurrency(fireInputs.targetTerminalBuffer, true)}`}
                  accent={(lastRow?.endingPortfolio ?? 0) >= fireInputs.targetTerminalBuffer ? 'text-emerald-600' : 'text-rose-600'}
                />
              </div>
            </div>

            {/* ── 02 · CPF LIFE Architecture ── */}
            <div className={C}>
              <SecHead n="02" title="CPF LIFE Statutory Annuity Architecture" badge={{ text: 'AAA Sovereign · Guaranteed for Life', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' }} />
              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-wide mb-0.5">Tier & RA Benchmark</p>
                  <p className="text-[11.5px] font-bold text-zinc-900">{tier.name}</p>
                  <p className="text-[9.5px] text-zinc-500 leading-snug mt-0.5">{formatCurrency(tier.raBalance)} RA · {tier.description}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-wide mb-0.5">Payout Plan & Escalation</p>
                  <p className="text-[11.5px] font-bold text-zinc-900 capitalize">
                    {fireInputs.cpfPlanType ?? 'Standard'} · {fireInputs.cpfEscalatingPlan ? '+2%/yr Escalating' : 'Level Payout'}
                  </p>
                  <p className="text-[9.5px] text-zinc-500 leading-snug mt-0.5">
                    Starts Age {fireInputs.cpfStartAge}
                    {fireInputs.cpfStartAge > 65 ? ` (+${(fireInputs.cpfStartAge - 65) * 7}% deferral bonus)` : ' (statutory eligibility)'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-wide mb-0.5">Bridge Period & Coverage</p>
                  <p className="text-[11.5px] font-bold text-zinc-900">{cpfBridge}yr Self-Funded Bridge</p>
                  <p className="text-[9.5px] text-zinc-500 leading-snug mt-0.5">
                    From Age {fireInputs.cpfStartAge}, CPF covers ~{((annCpf / (trajectory[0]?.annualSpendNominal || 1)) * 100).toFixed(0)}% of annual spend
                  </p>
                </div>
              </div>
            </div>

            {/* ── 03 · Asset Inventory ── */}
            <div className={C}>
              <SecHead
                n="03"
                title="Pre-Retirement Asset Inventory & Capital Gap Analysis"
                badge={gap <= 0
                  ? { text: '✓ On Track — Surplus', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                  : { text: '⚠ Funding Gap Detected', cls: 'bg-amber-50 text-amber-700 border-amber-200' }}
              />
              <div className="grid grid-cols-2 gap-3.5">
                {/* Asset table */}
                <div>
                  <table className="w-full text-[9.5px] border-collapse">
                    <thead>
                      <tr className="text-[8.5px] text-zinc-400 uppercase border-b border-zinc-200">
                        <th className="py-1 text-left font-medium">Asset</th>
                        <th className="py-1 text-right font-medium">Value</th>
                        <th className="py-1 text-right font-medium pl-2">Wt.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { l: `Liquid Portfolio (${(accIn.preRetirementReturn * 100).toFixed(1)}% p.a.)`, v: accIn.currentLiquidPortfolio, c: '#0071E3' },
                        { l: `CPF OA & SA (${(accIn.cpfReturn * 100).toFixed(1)}% p.a.)`, v: accIn.currentCPFBalance, c: '#5856D6' },
                        { l: 'Emergency Cash Reserves', v: accIn.cashReserves, c: '#34C759' },
                        { l: `Property Equity (Age ${accIn.propertyUnlockAge})`, v: accIn.propertyEquity, c: '#FF9F0A' },
                      ].map(({ l, v, c }) => (
                        <tr key={l} className="border-b border-zinc-100 last:border-0">
                          <td className="py-1 text-zinc-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />{l}
                          </td>
                          <td className="py-1 text-right tabular-nums font-semibold text-zinc-900">{formatCurrency(v)}</td>
                          <td className="py-1 text-right tabular-nums text-zinc-400 pl-2">{((v / nw) * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-zinc-100/60">
                        <td className="py-1 px-0.5 text-zinc-900">Total Net Worth</td>
                        <td className="py-1 text-right tabular-nums">{formatCurrency(nw)}</td>
                        <td className="py-1 text-right tabular-nums text-zinc-400 pl-2">100%</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-1.5">
                    <StackedBar segments={[
                      { value: accIn.currentLiquidPortfolio, color: '#0071E3', label: 'Liquid' },
                      { value: accIn.currentCPFBalance, color: '#5856D6', label: 'CPF' },
                      { value: accIn.cashReserves, color: '#34C759', label: 'Cash' },
                      { value: accIn.propertyEquity, color: '#FF9F0A', label: 'Property' },
                    ]} />
                  </div>
                </div>
                {/* Projection summary */}
                <div className="bg-white rounded-lg border border-zinc-200 p-2.5 flex flex-col justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Projection at Age {rAge}</p>
                    <Row label="Projected Portfolio (compounded)" value={formatCurrency(accResult.projectedPortfolioAtRetirement)} />
                    <Row label="FIRE Target Required" value={formatCurrency(reqPortfolio)} />
                    <Row
                      label="Solvency Margin"
                      value={gap <= 0 ? `+${formatCurrency(Math.abs(gap))} surplus` : `-${formatCurrency(gap)} deficit`}
                      accent={gap <= 0 ? 'text-emerald-600' : 'text-amber-600'}
                    />
                    <Row label="Post-Ret. Return" value={`${(fireInputs.postRetirementReturn * 100).toFixed(1)}% p.a.`} />
                    <Row label="Inflation Rate" value={`${(fireInputs.inflationRate * 100).toFixed(1)}% p.a.`} />
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-zinc-100">
                    <p className="text-[9px] text-zinc-400 mb-0.5">Solved Monthly Contribution</p>
                    <p className="text-[14px] font-black text-[#0071E3] tabular-nums leading-none">
                      {gap <= 0 ? '$0 / mo — Fully Funded' : `${formatCurrency(accResult.requiredMonthlySavings)} / mo`}
                    </p>
                    {accResult.coastFIREAge && (
                      <p className="text-[9px] text-emerald-600 mt-0.5 font-medium">
                        ⊙ Coast FIRE at Age {accResult.coastFIREAge}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 04 · Accumulation Chart ── */}
            <div className={C}>
              <SecHead n="04" title="Portfolio Accumulation & Compounding Trajectory" />
              <SparklineChart
                data={accChart}
                width={680}
                height={135}
                lines={[{ key: 'portfolio', color: '#34C759', fill: true }]}
                referenceY={{ value: reqPortfolio, color: '#0071E3', label: `FIRE ${formatCurrency(reqPortfolio, true)}` }}
              />
              <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-500">
                <div className="flex items-center gap-3.5">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded bg-[#34C759] inline-block" /> Compounded Portfolio</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 border-b border-dashed border-[#0071E3] inline-block" /> FIRE Nest Egg ({formatCurrency(reqPortfolio, true)})</span>
                  {accResult.coastFIREAge && <span className="text-emerald-600 font-semibold">⊙ Coast FIRE Age {accResult.coastFIREAge}</span>}
                </div>
                <span className="font-medium">{(accIn.preRetirementReturn * 100).toFixed(1)}% p.a. · {rAge - cAge}yr horizon</span>
              </div>
            </div>

          </div>

          {/* ── Page 1 Footer ── */}
          <div className="pt-2 border-t border-zinc-200 flex justify-between items-center mt-2.5">
            <span className="text-[9.5px] text-zinc-400">SG FIRE Studio · Comprehensive Retirement Dossier</span>
            <span className="text-[9.5px] font-semibold text-zinc-500">Page 1 of 2 — Executive Briefing & Accumulation</span>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2 — DECUMULATION, LEDGER & STRESS AUDIT
          ══════════════════════════════════════════════════════════════════ */}
      {p2Show && (
        <section className={pageClass('print-page-2')} id="print-dossier-page-2">
          <div className="space-y-2.5">

            {/* ── Running Header ── */}
            <div className="flex items-start justify-between pb-2.5 border-b-[2.5px] border-zinc-900">
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-[#0071E3] mb-0.5">Decumulation Ledger & Risk Audit</p>
                <h2 className="text-[17px] font-black tracking-tight text-zinc-900 leading-none">Lifetime Cash Flow & Stress Testing</h2>
              </div>
              <div className="text-right text-[9.5px] text-zinc-500 space-y-0.5">
                <p>Plan: <strong className="text-zinc-800">{scenarioTitle}</strong></p>
                <p>Retire Age {rAge} → {fireInputs.lifeExpectancy} · Post-ret. return {(fireInputs.postRetirementReturn * 100).toFixed(1)}%</p>
                <p>{dateStr}</p>
              </div>
            </div>

            {/* ── 05 · Decumulation Chart ── */}
            <div className={C}>
              <SecHead n="05" title="Lifetime Portfolio Drawdown & CPF LIFE Guaranteed Income Floor" />
              <SparklineChart
                data={decChart}
                width={680}
                height={125}
                lines={[
                  { key: 'portfolio', color: '#0071E3', fill: true },
                  { key: 'cpfCum', color: '#5856D6', fill: true },
                ]}
                referenceY={{ value: fireInputs.targetTerminalBuffer, color: '#34C759', label: `Buffer ${formatCurrency(fireInputs.targetTerminalBuffer, true)}` }}
              />
              <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-500">
                <div className="flex items-center gap-3.5">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded bg-[#0071E3] inline-block" /> Liquid Portfolio</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded bg-[#5856D6] inline-block" /> Cumulative CPF LIFE</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 border-b border-dashed border-[#34C759] inline-block" /> Terminal Buffer</span>
                </div>
                <span className="text-indigo-600 font-semibold">CPF covers {((tCpf / (tLive || 1)) * 100).toFixed(0)}% of lifetime costs</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 mt-1.5 pt-1.5 border-t border-zinc-100">
                <div>
                  <p className="text-[9px] text-zinc-400">Total Lifetime Spending</p>
                  <p className="text-[12.5px] font-black text-zinc-900 tabular-nums">{formatCurrency(tLive, true)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400">Lifetime CPF Annuity Received</p>
                  <p className="text-[12.5px] font-black text-[#5856D6] tabular-nums">{formatCurrency(tCpf, true)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-400">Net Private Portfolio Drawn</p>
                  <p className="text-[12.5px] font-black text-zinc-900 tabular-nums">{formatCurrency(tNet, true)}</p>
                </div>
              </div>
            </div>

            {/* ── 06 · Milestone Ledger ── */}
            <div>
              <SecHead n="06" title="Decumulation Milestone Cash Flow Schedule" badge={{ text: `${miles.length} waypoints · withdrawals at start-of-year`, cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' }} />
              <table className="w-full text-[9px] border-collapse border border-zinc-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-zinc-100 text-[8.5px] text-zinc-500 font-bold uppercase tracking-wide border-b border-zinc-200">
                    <th className="py-1 px-2 text-left">Age</th>
                    <th className="py-1 px-2 text-left">Phase</th>
                    <th className="py-1 px-2 text-right">Start Portfolio</th>
                    <th className="py-1 px-2 text-right">Annual Spend</th>
                    <th className="py-1 px-2 text-right">CPF Payout</th>
                    <th className="py-1 px-2 text-center">Coverage</th>
                    <th className="py-1 px-2 text-right">Net Drawdown</th>
                    <th className="py-1 px-2 text-center">SWR</th>
                    <th className="py-1 px-2 text-right">End Portfolio</th>
                  </tr>
                </thead>
                <tbody>
                  {miles.map((row) => {
                    const isR = row.age === rAge, isCpf = row.age === fireInputs.cpfStartAge, isE = row.age === fireInputs.lifeExpectancy;
                    return (
                      <tr key={row.age} className={`border-b border-zinc-100 last:border-0 ${isR ? 'bg-blue-50/60 font-semibold' : isCpf ? 'bg-amber-50/50 font-medium' : isE ? 'bg-emerald-50/50 font-semibold' : ''}`}>
                        <td className="py-1 px-2 tabular-nums font-bold">{row.age}</td>
                        <td className="py-1 px-2">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${row.phase === 'Pre-CPF FIRE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            {row.phase === 'Pre-CPF FIRE' ? 'Bridge' : 'CPF LIFE'}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right tabular-nums">{formatCurrency(row.startingPortfolio)}</td>
                        <td className="py-1 px-2 text-right tabular-nums">{formatCurrency(row.annualSpendNominal)}</td>
                        <td className="py-1 px-2 text-right tabular-nums text-[#5856D6] font-medium">{row.cpfLifePayout > 0 ? formatCurrency(row.cpfLifePayout) : '—'}</td>
                        <td className="py-1 px-2 text-center tabular-nums text-zinc-500">{row.cpfCoverageRatio > 0 ? `${(row.cpfCoverageRatio * 100).toFixed(0)}%` : '0%'}</td>
                        <td className="py-1 px-2 text-right tabular-nums font-medium">{formatCurrency(row.netPortfolioWithdrawal)}</td>
                        <td className="py-1 px-2 text-center tabular-nums text-zinc-500">{formatPercentage(row.withdrawalRate)}</td>
                        <td className="py-1 px-2 text-right tabular-nums font-bold">{formatCurrency(row.endingPortfolio)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── 07 + 08 · Stress + Statutory side by side ── */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Stress */}
              <div className={C}>
                <SecHead
                  n="07"
                  title="Sequence-of-Returns Stress Test"
                  badge={sa.ok
                    ? { text: '✓ Survived', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                    : { text: '✕ Depletion Risk', cls: 'bg-rose-50 text-rose-700 border-rose-200' }}
                />
                <SparklineChart
                  data={stressChart}
                  width={330}
                  height={80}
                  lines={[
                    { key: 'baseline', color: '#0071E3', fill: true },
                    { key: 'stressed', color: '#FF453A', fill: false },
                  ]}
                />
                <div className="flex items-center gap-3 mt-0.5 mb-1 text-[8.5px] text-zinc-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#0071E3] rounded inline-block" /> Baseline</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#FF453A] rounded inline-block" /> Stress Scenario</span>
                </div>
                <div className="space-y-0.5 text-[9.5px]">
                  <Row label="Crash Timing" value={ss.crashYear === 0 ? 'Retirement Year 1' : `Retirement Year ${ss.crashYear}`} />
                  <Row label="Crash Magnitude" value={`${(ss.crashMagnitude * 100).toFixed(0)}% over ${ss.recoveryYears}yr recovery`} accent="text-rose-600" />
                  <Row label="Guardrail Spending Cut" value={ss.useGuardrails ? `${(ss.guardrailReduction * 100).toFixed(0)}% reduction applied` : 'No guardrails'} />
                  <Row label="Trough Portfolio" value={`${formatCurrency(sa.low)} (Age ${sa.lowAge})`} />
                  <Row label={`Terminal at Age ${fireInputs.lifeExpectancy}`} value={formatCurrency(sa.term)} accent={sa.term >= fireInputs.targetTerminalBuffer ? 'text-emerald-600' : 'text-rose-600'} />
                </div>
              </div>

              {/* Statutory */}
              <div className={C}>
                <SecHead n="08" title="Statutory Governance & Assumptions" />
                <div className="space-y-1.5 text-[9.5px] text-zinc-500 leading-snug">
                  {[
                    {
                      n: '①',
                      c: 'text-emerald-500',
                      t: 'CPF LIFE Baseline',
                      b: `2025/2026 CPFB benchmarks — BRS: $106.5k, FRS: $213k, ERS: $426k. Payouts guaranteed monthly for life, market-insulated.`,
                    },
                    {
                      n: '②',
                      c: 'text-emerald-500',
                      t: 'Decumulation Convention',
                      b: `Withdrawals at start of year. Portfolio compounds at ${(fireInputs.postRetirementReturn * 100).toFixed(1)}% p.a. net of fees throughout the year.`,
                    },
                    {
                      n: '③',
                      c: 'text-emerald-500',
                      t: 'Inflation Indexing',
                      b: `Annual spend inflates at ${(fireInputs.inflationRate * 100).toFixed(1)}% p.a. from Age ${cAge}. All figures reflect future nominal purchasing requirements.`,
                    },
                    {
                      n: '⚠',
                      c: 'text-amber-500',
                      t: 'Disclaimer',
                      b: `Deterministic scenario model for planning purposes only. Not financial advice. CPF payouts subject to CPFB policy updates.`,
                    },
                  ].map(({ n, c, t, b }) => (
                    <div key={t} className="flex gap-1.5">
                      <span className={`${c} font-bold mt-0.5 shrink-0`}>{n}</span>
                      <p><strong className="text-zinc-700">{t}:</strong> {b}</p>
                    </div>
                  ))}

                  <div className="mt-1.5 pt-1.5 border-t border-zinc-100 grid grid-cols-2 gap-x-2.5">
                    <Row label="Inflation Rate" value={`${(fireInputs.inflationRate * 100).toFixed(1)}% p.a.`} />
                    <Row label="Post-Ret. Return" value={`${(fireInputs.postRetirementReturn * 100).toFixed(1)}% p.a.`} />
                    <Row label="CPF Tier" value={tier.name} />
                    <Row label="Withdrawal Timing" value="Start of Year" />
                    <Row label="CPF Payout Start" value={`Age ${fireInputs.cpfStartAge}`} />
                    <Row label="Terminal Buffer" value={formatCurrency(fireInputs.targetTerminalBuffer)} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── Page 2 Footer ── */}
          <div className="pt-2 border-t border-zinc-200 flex justify-between items-center mt-2.5">
            <span className="text-[9.5px] text-zinc-400">SG FIRE Studio · Generated {dateStr}</span>
            <span className="text-[9.5px] font-semibold text-zinc-500">Page 2 of 2 — Decumulation Schedule & Risk Audit</span>
          </div>
        </section>
      )}
    </div>
  );
}
