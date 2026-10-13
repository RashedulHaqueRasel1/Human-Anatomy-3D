"use client";

import type { Lang } from "@/lib/i18n";
import { Icon } from "../ui/icons";

type Bi = { en: string; bn: string };

export const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export type PracticeView = {
  title: Bi;
  subtitle?: Bi;
  steps: { title: Bi }[];
  stepIndex: number;
  current: { title: Bi; text: Bi; note?: Bi } | null;
  mistakes: number;
  elapsed: number;
  feedback: { ok: boolean; text: string; bn?: string } | null;
  finished: boolean;
  score: number;
};

/** Hands-on practice: the current step, feedback from the body and the score card. */
export function PracticePanel({
  lang,
  view,
  onShowMe,
  onRestart,
  onExit,
  onTutorial,
}: {
  lang: Lang;
  view: PracticeView;
  onShowMe: () => void;
  onRestart: () => void;
  onExit: () => void;
  onTutorial: () => void;
}) {
  const bn = lang === "bn";
  const { steps, stepIndex, current, mistakes, elapsed, feedback, finished, score } = view;
  const t = (b: Bi) => (bn ? b.bn : b.en);
  const other = (b: Bi) => (bn ? b.en : b.bn);
  return (
    <div>
      <button onClick={onExit} className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200">
        <Icon name="chevronLeft" size={14} /> {bn ? "লাইব্রেরিতে ফিরুন" : "Back to library"}
      </button>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{bn ? "হাতে-কলমে অনুশীলন" : "Hands-on practice"}</div>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-white">{t(view.title)}</h2>
          {view.subtitle && <p className="mt-0.5 text-xs text-slate-400">{t(view.subtitle)}</p>}
        </div>
        <div className="shrink-0 rounded-xl bg-black/30 px-3 py-1.5 text-right ring-1 ring-inset ring-white/[0.06]">
          <div className="font-mono text-[15px] text-white">{fmtTime(elapsed)}</div>
          <div className="text-[11px] text-slate-400">
            {mistakes} {bn ? "ভুল" : mistakes === 1 ? "mistake" : "mistakes"}
          </div>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all"
          style={{ width: `${(Math.min(stepIndex, steps.length) / Math.max(1, steps.length)) * 100}%` }}
        />
      </div>

      {finished ? (
        <div className="fade-up mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.08] p-4 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-400/20 text-emerald-200">
            <Icon name="check" size={22} />
          </div>
          <div className="mt-2 text-[15px] font-semibold text-white">{bn ? "অপারেশন সফলভাবে শেষ হয়েছে" : "Procedure complete"}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
            {[
              { v: score, k: bn ? "স্কোর" : "score" },
              { v: fmtTime(elapsed), k: bn ? "সময়" : "time" },
              { v: mistakes, k: bn ? "ভুল" : "mistakes" },
            ].map((m) => (
              <div key={m.k} className="rounded-lg bg-black/30 p-2">
                <div className="text-lg font-semibold text-white">{m.v}</div>
                {m.k}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={onRestart} className="rounded-lg bg-emerald-400 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-300">
              {bn ? "আবার করুন" : "Operate again"}
            </button>
            <button onClick={onExit} className="rounded-lg border border-white/10 py-2 text-xs text-slate-200 hover:bg-white/5">
              {bn ? "বের হন" : "Exit"}
            </button>
          </div>
        </div>
      ) : (
        current && (
          <div key={stepIndex} className="fade-up mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-3.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-300">
              {bn ? "ধাপ" : "Step"} {stepIndex + 1} / {steps.length}
            </div>
            <h3 className="mt-1 text-[15px] font-semibold text-white">{t(current.title)}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-100">{t(current.text)}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{other(current.text)}</p>
            {current.note && (
              <p className="mt-3 flex gap-2 text-xs italic leading-relaxed text-slate-400">
                <Icon name="bulb" size={14} className="mt-0.5 shrink-0 text-sky-300" />
                {t(current.note)}
              </p>
            )}
            <button
              onClick={onShowMe}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-300/30 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-400/10"
            >
              <Icon name="focus" size={14} />
              {bn ? "কোথায় দেখান" : "Show me where"}
            </button>
          </div>
        )
      )}

      {feedback && !finished && (
        <div
          className={`fade-up mt-3 flex gap-2 rounded-xl border p-3 text-[12.5px] leading-relaxed ${
            feedback.ok ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-rose-300/25 bg-rose-400/10 text-rose-100"
          }`}
        >
          <Icon name={feedback.ok ? "check" : "alert"} size={15} className="mt-0.5 shrink-0" />
          {bn && feedback.bn ? feedback.bn : feedback.text}
        </div>
      )}

      <ol className="mt-4 space-y-1">
        {steps.map((s, i) => (
          <li key={i} className={`flex items-center gap-2.5 text-[12.5px] ${i === stepIndex ? "text-white" : i < stepIndex ? "text-slate-400" : "text-slate-600"}`}>
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                i < stepIndex ? "bg-emerald-500 text-white" : i === stepIndex ? "bg-emerald-300 text-slate-900" : "bg-white/10"
              }`}
            >
              {i < stepIndex ? <Icon name="check" size={11} /> : i + 1}
            </span>
            {t(s.title)}
          </li>
        ))}
      </ol>

      {!finished && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onTutorial} className="rounded-lg border border-white/10 py-2 text-xs text-slate-300 hover:bg-white/5">
            {bn ? "টিউটোরিয়াল দেখুন" : "Watch tutorial"}
          </button>
          <button onClick={onExit} className="rounded-lg border border-white/10 py-2 text-xs text-slate-300 hover:bg-white/5">
            {bn ? "বের হন" : "Exit practice"}
          </button>
        </div>
      )}
    </div>
  );
}
