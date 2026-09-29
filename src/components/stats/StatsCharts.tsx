import React from 'react';

export function pct(n: number, d: number): number {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export interface Slice {
  label: string;
  value: number;
  color: string;
  hint?: string;
}

export function StackedBar({ segments, total }: { segments: Slice[]; total: number }) {
  const den = total || segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200/80">
        {segments.map((s) => {
          if (!s.value || !den) return null;
          return (
            <div
              key={s.label}
              className="h-full min-w-0"
              style={{ width: `${(s.value / den) * 100}%`, background: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              {s.label}{' '}
              <span className="font-extrabold text-slate-900">
                {s.value}
                {den ? ` (${pct(s.value, den)}%)` : ''}
              </span>
            </span>
          ))}
      </div>
    </div>
  );
}

export function Donut({
  slices,
  center,
  sub,
  size = 148,
}: {
  slices: Slice[];
  center: string;
  sub?: string;
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const usable = slices.filter((s) => s.value > 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
          {total === 0 ? null : usable.length === 0 ? null : usable.map((s) => {
            const len = (s.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle
                key={s.label}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span className="text-xl font-black text-slate-900 leading-none">{center}</span>
          {sub && <span className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">{sub}</span>}
        </div>
      </div>
      <div className="space-y-1 min-w-0">
        {slices
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.label} className="flex items-start gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: s.color }} />
              <div className="min-w-0">
                <p className="font-bold text-slate-800 leading-tight">
                  {s.label}{' '}
                  <span className="font-black text-slate-900">
                    {s.value}
                    {total ? ` · ${pct(s.value, total)}%` : ''}
                  </span>
                </p>
                {s.hint && <p className="text-slate-500 font-medium leading-tight">{s.hint}</p>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export function HBar({
  label,
  value,
  total,
  color = '#0284c7',
  suffix,
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
  suffix?: string;
}) {
  const p = pct(value, total);
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-extrabold text-slate-900 tabular-nums shrink-0">
          {value}
          {suffix ? ` ${suffix}` : ''}
          {total ? <span className="text-slate-500 font-bold"> · {p}%</span> : null}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, p)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function CountTile({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'sky' | 'rose' | 'amber' | 'emerald' | 'slate' | 'violet';
}) {
  const tones = {
    sky: 'bg-sky-50 border-sky-100 text-sky-950',
    rose: 'bg-rose-50 border-rose-100 text-rose-950',
    amber: 'bg-amber-50 border-amber-200 text-amber-950',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-950',
    slate: 'bg-slate-50 border-slate-200 text-slate-950',
    violet: 'bg-violet-50 border-violet-100 text-violet-950',
  };
  return (
    <div className={`p-3 rounded-[var(--radius-md)] border ${tones[tone]}`}>
      <span className="text-[11px] font-bold leading-tight block">{label}</span>
      <span className="text-2xl font-black leading-tight block tabular-nums">{value}</span>
      {hint && <span className="text-[11px] font-medium opacity-75 leading-tight block mt-0.5">{hint}</span>}
    </div>
  );
}

export function SectionHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-slate-500 font-medium leading-snug">{children}</p>;
}
