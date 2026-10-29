

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  formatValue?: (value: number, key?: string) => string;
}

export function CustomTooltip({ active, payload, label, formatValue }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] rounded-xl shadow-xl px-3.5 py-2.5 min-w-[160px]">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
        Age {label}
      </p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.name}</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatValue
              ? formatValue(item.value ?? 0, item.dataKey)
              : item.value?.toLocaleString('en-SG')}
          </span>
        </div>
      ))}
    </div>
  );
}
