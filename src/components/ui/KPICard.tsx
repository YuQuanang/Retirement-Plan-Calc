import React from 'react';
import { motion } from 'framer-motion';
import { InfoTooltip } from './InfoTooltip';
import { AppleMarquee } from './AppleMarquee';

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  badge?: { text: string; color: 'safe' | 'caution' | 'danger' | 'info' };
  icon?: React.ReactNode;
  index?: number;
  tooltip?: string;
}

const badgeStyles = {
  safe: 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.15] text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  caution: 'bg-amber-500/[0.08] dark:bg-amber-500/[0.15] text-amber-700 dark:text-amber-300 border-amber-500/20',
  danger: 'bg-red-500/[0.08] dark:bg-red-500/[0.15] text-red-700 dark:text-red-300 border-red-500/20',
  info: 'bg-apple-blue/[0.08] dark:bg-apple-blue/[0.15] text-apple-blue dark:text-blue-300 border-apple-blue/20',
};

const dotStyles = {
  safe: 'bg-emerald-500 ring-2 ring-emerald-500/25',
  caution: 'bg-amber-500 ring-2 ring-amber-500/25',
  danger: 'bg-red-500 ring-2 ring-red-500/25',
  info: 'bg-apple-blue ring-2 ring-apple-blue/25',
};

export function KPICard({ label, value, subValue, badge, icon, index = 0, tooltip }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col justify-between p-3.5 sm:p-4 2xl:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-apple-card relative min-h-[122px] sm:min-h-[132px] 2xl:min-h-[140px] transition-all hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] group"
    >
      {/* ── Top Meta Bar: Icon on Left, Status Badge on Right ── */}
      <div className="flex items-center justify-between gap-1.5 min-h-[22px]">
        <div className="flex items-center text-zinc-400 dark:text-zinc-500">
          {icon ? (
            <span className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              {icon}
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          )}
        </div>

        {badge && (
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-medium tracking-tight px-2 sm:px-2.5 py-0.5 rounded-full border flex-shrink-0 transition-colors ${badgeStyles[badge.color]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyles[badge.color]}`} />
            <span className="whitespace-nowrap">{badge.text}</span>
          </span>
        )}
      </div>

      {/* ── Title Row: Full Width with Apple Marquee & Info Tooltip ── */}
      <div className="flex items-center justify-between gap-1.5 mt-2 mb-0.5 min-w-0">
        <div className="flex-1 min-w-0">
          <AppleMarquee
            text={label}
            className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
          />
        </div>
        {tooltip && <InfoTooltip content={tooltip} title={label} />}
      </div>

      {/* ── Metric Value Display ── */}
      <div className="my-0.5 sm:my-1">
        <span className="text-xl sm:text-2xl 2xl:text-3xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50 leading-tight">
          {value}
        </span>
      </div>

      {/* ── Subtitle Row: Full Width with Apple Marquee ── */}
      {subValue ? (
        <div className="min-w-0 mt-0.5">
          <AppleMarquee
            text={subValue}
            className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 tabular-nums leading-snug"
          />
        </div>
      ) : (
        <div className="h-3" />
      )}
    </motion.div>
  );
}
