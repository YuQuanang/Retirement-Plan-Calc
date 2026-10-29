<div align="center">

<img src="public/favicon.svg" width="96" height="96" alt="SG FIRE Studio Logo" />

# SG FIRE Studio

### Singapore Financial Independence & Retirement Blueprint

An executive-grade retirement modeling studio engineered specifically for Singapore’s statutory framework. Designed with the precision, typographic restraint, and physics-based fluid interactions of Apple HIG.

[![Netlify](https://img.shields.io/badge/Netlify-Configured-00C7B7?logo=netlify&logoColor=white)](https://www.netlify.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)

---

</div>

## Overview

Most retirement calculators rely on standard US 4% rules that ignore Singapore's unique financial realities: sovereign CPF LIFE annuities, high home equity, and Asia-Pacific inflation realities.

**SG FIRE Studio** couples institutional-grade mathematical modeling with Singapore’s statutory social security framework (CPF LIFE BRS, FRS, ERS tiers) to give you an uncompromising, deterministic view of your path to financial freedom.

---

## Core Features

### 1. Executive Command Center

- **Bisection Capital Target Solver** — Numerically solves the exact private portfolio required on Day 1 of retirement to guarantee lifetime solvency down to your desired terminal reserve buffer.
- **SWR Safety Gauge** — Instantaneous Safe Withdrawal Rate feedback categorized by institutional risk zones (_Safe Zone_, _Caution Zone_, _Elevated Risk_).
- **Dual-Axis Trajectory Visualization** — Interactive wealth trajectory charting private liquid reserves versus the rising cumulative lifetime CPF LIFE income floor.
- **Retirement Age Sensitivity Matrix** — Comparative horizon analysis showing required capital targets across retirement ages 45 to 65 at a glance.

### 2. Accumulation & Coast FIRE Engine

- **Multi-Asset Balance Sheet** — Aggregates Liquid Portfolios, CPF Ordinary & Special Accounts (OA/SA), Emergency Cash Reserves, and future Property Equity unlock events into a unified Net Worth inventory.
- **Solved Monthly Contribution** — Exact monthly savings needed to close any projected capital deficit at your chosen pre-retirement expected rate of return.
- **Coast FIRE Threshold Solver** — Identifies the exact age when existing invested assets will compound to fully fund your retirement target without another dollar saved.

### 3. Decumulation Milestone Ledger

- **Phase-Aware Cash Flow Schedule** — Distinctly distinguishes between the **Pre-CPF Bridge Phase** (100% private portfolio drawdown) and the **CPF LIFE Phase** (statutory sovereign annuity active).
- **Nominal vs. Real Toggle** — Switch effortlessly between nominal future dollars (accounting for ongoing inflation) and constant today-dollars.
- **Key Waypoint Tracking** — Tracks portfolio start balances, living expenditures, CPF coverage percentages, net portfolio withdrawals, and year-end asset values year by year.

### 4. Sequence-of-Returns Stress Testing

- **Early Retirement Shock Simulator** — Simulates market crashes (e.g. -30% to -50%) occurring at retirement inception or within early post-retirement years, modeled across multi-year recovery curves.
- **Guyton-Klinger Spending Guardrails** — Tests dynamic spending reduction strategies (e.g. temporary 10% expenditure trimming) during market drawdowns to prevent premature portfolio exhaustion.
- **Trough & Survival Audits** — Pinpoints the historical low point (_trough_) of your portfolio and audits terminal reserve preservation against your life expectancy.

### 5. CPF LIFE Statutory Integration

- **2025/2026 CPFB Benchmarks** — Built-in statutory presets for **Basic Retirement Sum (BRS: $106,500)**, **Full Retirement Sum (FRS: $213,000)**, and **Enhanced Retirement Sum (ERS: $426,000)**.
- **Plan Architecture** — Full support for both **Standard (Level Payout)** and **Escalating (+2% per year inflation hedge)** payout schemes.
- **Deferral Benefit Modeling** — Accurately reflects statutory payout deferral increments (+7% per year deferred between Age 65 and 70).

### 6. Apple-Quality 2-Page Executive Dossier

- **Print-Perfect A4 Vector Export** — Generates a back-to-back 2-page executive summary designed to strictly fit standard A4 sheets with zero trailing blank pages.
- **DOM-Independent SVG Sparklines** — Built with pure mathematical SVG charts that render identically in on-screen modal previews and high-resolution print outputs.
- **Fluid Spring Transitions** — Interactive inspection dialog driven by Framer Motion spring physics with glassmorphic backdrops.

### 7. Scenario Snapshots & Zero-Server Privacy

- **Scenario Management** — Save, rename, switch, and compare multiple financial scenarios (e.g. _Base Case_, _Fat FIRE_, _Coast FIRE_).
- **100% Local Execution** — Zero telemetry and zero cloud databases. All calculations run strictly on your device's CPU.
- **JSON Backup & Portability** — Export your entire configuration as an encrypted `.json` file and restore it on any device.

---

## Technical Stack

| Layer                | Technology                 | Purpose                                                              |
| -------------------- | -------------------------- | -------------------------------------------------------------------- |
| **Framework**        | React 19 + TypeScript      | Type-safe, component-driven UI architecture                          |
| **Build Tool**       | Vite 5                     | Sub-millisecond HMR and optimized production bundling                |
| **Styling**          | Tailwind CSS 3.4           | Utility-first styling with Apple Human Interface Guidelines tokens   |
| **State & Storage**  | Zustand 5 with `persist`   | Reactive global state synchronized with browser `localStorage`       |
| **Physics & Motion** | Framer Motion 11           | Fluid Apple spring physics (`stiffness: 500, damping: 38`)           |
| **Charts**           | Recharts 2.12 + Native SVG | Interactive analytical charts & print-calibrated SVG vector graphics |
| **Testing**          | Vitest 2.1                 | Unit test suite verifying financial math engine and store state      |

---

## Architecture & Math Engine

All financial calculations are isolated in [`src/engine/fireMath.ts`](src/engine/fireMath.ts) with zero external dependencies:

```
src/
├── engine/
│   ├── fireMath.ts         # Deterministic numerical solvers & CPF equations
│   └── fireMath.test.ts    # Mathematical unit tests
├── store/
│   ├── useAppStore.ts      # Zustand state, snapshots, and JSON import/export
│   └── useAppStore.test.ts # State lifecycle and persistence tests
├── components/
│   ├── layout/             # Responsive header, app shell & navigation tabs
│   ├── modules/            # CommandCenter, Accumulation, Ledger, StressTest
│   ├── pdf/                # PrintDossierDocument & PDFReportModal
│   ├── sidebar/            # Dynamic parameter drawer with slider controls
│   └── ui/                 # AppleToast, KPICard, SliderInput, SegmentedControl
└── App.tsx                 # Root application composition
```

### Mathematical Foundations

1. **Capital Target Solver**:
   $$\min P_0 \quad \text{s.t.} \quad P_{\text{lifeExpectancy}} \ge B_{\text{terminal}}$$
   Solved via numerical bisection over the retirement horizon, where annual withdrawals execute at the start of each year:
   $$P_{t+1} = \left(P_t - \max(0, S_t - C_t)\right) \times (1 + r_{\text{post}})$$
   Where $S_t$ is inflation-indexed living expenditure, $C_t$ is CPF LIFE annuity income, and $r_{\text{post}}$ is the nominal post-retirement return.

2. **Coast FIRE Equation**:
   $$\text{Coast Target} = \frac{P_{\text{target}}}{(1 + r_{\text{pre}})^{(\text{Retirement Age} - \text{Current Age})}}$$

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- npm (version 9 or later)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-username>/sg-fire-studio.git
   cd sg-fire-studio
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Launch local development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

### Verification & Testing

Run unit tests across financial algorithms and state management:

```bash
npm test
```

Create production build:

```bash
npm run build
```

---

## Deployment to Netlify

### Automated Continuous Deployment (Recommended)

1. Push your repository to GitHub.
2. Sign in to [Netlify](https://app.netlify.com) and click **"Add new site" → "Import an existing project"**.
3. Select your GitHub repository.
4. Netlify will auto-detect [`netlify.toml`](netlify.toml) (`npm run build` targeting `dist`).
5. Click **Deploy**. Any future commits pushed to `main` will automatically build and publish.

### Netlify CLI Deployment

```bash
npx netlify deploy --build --prod
```

> [!TIP]
> Once deployed, you can also copy your live deployment status badge from your Netlify dashboard (**Site configuration → General → Status badges**) to display your live build status in this README.

---

## Privacy & Security

- **Zero-Server Guarantee** — Your financial numbers belong to you. No personal financial information, asset valuations, or spending figures are ever uploaded to an external server or API.
- **Client-Side Persistence** — Data is saved exclusively to your browser's private `localStorage`.
- **Clean Codebase** — Zero tracking analytics, zero telemetry SDKs, and zero third-party ads.

---

## License

Released under the [MIT License](LICENSE). Built for the Singapore personal finance and FIRE community.
