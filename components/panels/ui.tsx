"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "../ui/icons";

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="border-b border-white/[0.06] py-4 first:pt-0 last:border-0 last:pb-0">
      {(title || subtitle) && (
        <div className="mb-2.5 flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</h2>
          {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display?: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-0.5 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-200">{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" />
    </label>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-200">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded" />
      {label}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  accent = "bg-teal-500/90",
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  accent?: string;
}) {
  return (
    <div className="grid gap-0.5 rounded-lg bg-black/35 p-0.5 text-xs ring-1 ring-white/[0.06]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-md px-2 py-1.5 font-medium transition ${value === v ? `${accent} text-white shadow` : "text-slate-300 hover:bg-white/5"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Small rounded label with an optional icon. */
export function Chip({ icon, children, tone = "slate" }: { icon?: IconName; children: ReactNode; tone?: "slate" | "amber" | "rose" | "sky" | "teal" | "emerald" | "violet" }) {
  const tones: Record<string, string> = {
    slate: "bg-white/[0.06] text-slate-300 ring-white/10",
    amber: "bg-amber-400/10 text-amber-200 ring-amber-300/20",
    rose: "bg-rose-400/10 text-rose-200 ring-rose-300/20",
    sky: "bg-sky-400/10 text-sky-200 ring-sky-300/20",
    teal: "bg-teal-400/10 text-teal-200 ring-teal-300/20",
    emerald: "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20",
    violet: "bg-violet-400/10 text-violet-200 ring-violet-300/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone]}`}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/** Heading block shared by every left-hand panel. */
export function PanelTitle({ eyebrow, title, subtitle, tone = "text-teal-300" }: { eyebrow: string; title: string; subtitle?: string; tone?: string }) {
  return (
    <header>
      <div className={`text-[10.5px] font-semibold uppercase tracking-[0.16em] ${tone}`}>{eyebrow}</div>
      <h2 className="mt-1 text-[17px] font-semibold leading-tight text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">{subtitle}</p>}
    </header>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  className = "",
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-30 ${
        active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}
