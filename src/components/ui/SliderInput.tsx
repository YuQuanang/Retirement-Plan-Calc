import React, { useId, useRef, useState, useCallback } from 'react';
import { InfoTooltip } from './InfoTooltip';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  parse: (raw: string) => number;
  hint?: string;
  accentColor?: string;
  tooltip?: string;
}

export function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  parse,
  hint,
  accentColor = '#0071E3',
  tooltip,
}: SliderInputProps) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pct = ((value - min) / (max - min)) * 100;

  const handleEditStart = () => {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleEditCommit = useCallback(() => {
    const parsed = parse(draft);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
    setEditing(false);
  }, [draft, parse, onChange, min, max]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditCommit();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {label}
          </label>
          {tooltip && <InfoTooltip content={tooltip} title={label} />}
        </div>
        {editing ? (
          <input
            ref={inputRef}
            className="w-28 rounded-lg border border-apple-blue/60 bg-white dark:bg-zinc-800 px-2 py-0.5 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleEditCommit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <button
            onClick={handleEditStart}
            className="rounded-lg px-2 py-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors cursor-text"
          >
            {format(value)}
          </button>
        )}
      </div>

      {/* Slider Track */}
      <div className="relative h-6 flex items-center">
        <div className="relative w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pct}%`, backgroundColor: accentColor }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-6"
          style={{ zIndex: 1 }}
        />
        {/* Custom thumb */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white dark:border-zinc-800 shadow-md pointer-events-none"
          style={{
            left: `calc(${pct}% - 8px)`,
            backgroundColor: accentColor,
          }}
        />
      </div>

      {hint && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{hint}</p>
      )}
    </div>
  );
}
