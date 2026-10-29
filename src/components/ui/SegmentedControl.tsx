
import { motion } from 'framer-motion';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);

  return (
    <div className="relative flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 gap-0.5">
      {/* Sliding pill background */}
      {activeIndex >= 0 && (
        <motion.div
          className="absolute inset-y-1 rounded-lg bg-white dark:bg-zinc-700 shadow-sm border border-black/[0.06] dark:border-white/[0.08]"
          layoutId="segmented-pill"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          style={{
            left: `calc(${(activeIndex / options.length) * 100}% + 4px)`,
            width: `calc(${(1 / options.length) * 100}% - 8px / ${options.length})`,
          }}
        />
      )}

      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`relative z-10 flex-1 text-xs font-medium py-1.5 px-2 rounded-lg transition-colors duration-150 ${
            value === option.value
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
