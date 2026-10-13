"use client";

import { Check, Chip, PanelTitle, Section, Slider } from "./ui";
import { Icon, type IconName } from "../ui/icons";
import { VitalsMonitor } from "./VitalsMonitor";
import { PROCESSES, type ProcessId } from "@/lib/physiology";
import { t, tr, type Lang } from "@/lib/i18n";

export type LiveUi = {
  process: ProcessId;
  step: number;
  playing: boolean;
  auto: boolean;
  bpm: number;
  breathRate: number;
  speed: number;
  fade: boolean;
};

const PROCESS_ICON: Record<ProcessId, IconName> = {
  circulation: "heart",
  heart: "target",
  breathing: "lungs",
  digestion: "food",
  excretion: "drop",
  nervous: "bolt",
  brain: "bulb",
  exercise: "body",
  hormones: "cross",
};

export function LivePanel({
  lang,
  ui,
  setUi,
  pathsMissing,
}: {
  lang: Lang;
  ui: LiveUi;
  setUi: (fn: (u: LiveUi) => LiveUi) => void;
  /** The current step animates a route (food, urine…) this body model does not have. */
  pathsMissing: boolean;
}) {
  const proc = PROCESSES.find((p) => p.id === ui.process)!;
  const step = proc.steps[ui.step];
  const go = (d: number) => setUi((u) => ({ ...u, step: (u.step + d + proc.steps.length) % proc.steps.length }));
  const last = ui.step === proc.steps.length - 1;

  return (
    <div>
      <PanelTitle
        tone="text-rose-300"
        eyebrow={lang === "bn" ? "লাইভ বডি" : "Live physiology"}
        title={t(lang, "liveTitle")}
        subtitle={t(lang, "liveIntro")}
      />

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {PROCESSES.map((p) => {
          const active = ui.process === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setUi((u) => ({ ...u, process: p.id, step: 0 }))}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition ${
                active
                  ? "border-rose-400/45 bg-rose-500/[0.12] text-white"
                  : "border-white/[0.07] bg-white/[0.03] text-slate-300 hover:border-white/15 hover:bg-white/[0.06]"
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-rose-500/25 text-rose-200" : "bg-white/[0.06] text-slate-400"}`}>
                <Icon name={PROCESS_ICON[p.id]} size={17} />
              </span>
              <span className="leading-tight">{tr(lang, p.name)}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[12.5px] leading-relaxed text-slate-400">{tr(lang, proc.summary)}</p>

      {/* step card */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-rose-300/20 bg-gradient-to-b from-rose-400/[0.08] to-transparent">
        <div className="flex gap-1 px-3 pt-3">
          {proc.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setUi((u) => ({ ...u, step: i }))}
              aria-label={`${t(lang, "step")} ${i + 1}`}
              className={`h-1.5 flex-1 rounded-full transition ${i === ui.step ? "bg-rose-400" : i < ui.step ? "bg-rose-400/45" : "bg-white/10 hover:bg-white/20"}`}
            />
          ))}
        </div>
        <div key={`${ui.process}-${ui.step}`} className="fade-up p-3.5 pt-3">
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-rose-200/90">
            <span>
              {t(lang, "step")} {ui.step + 1} / {proc.steps.length}
            </span>
          </div>
          <h3 className="mt-1 text-[15px] font-semibold leading-snug text-white">{tr(lang, step.title)}</h3>
          {step.organ && (
            <div className="mt-2">
              <Chip icon="target" tone="rose">
                {tr(lang, step.organ)}
              </Chip>
            </div>
          )}
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-200">{tr(lang, step.text)}</p>
          {lang === "bn" && <p className="mt-2 text-xs leading-relaxed text-slate-500">{step.text.en}</p>}
          {step.facts && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {step.facts.map((f) => (
                <Chip key={f.en} tone="slate">
                  {tr(lang, f)}
                </Chip>
              ))}
            </div>
          )}
          {pathsMissing && (
            <p className="mt-3 flex gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-2 text-[12px] leading-relaxed text-amber-100">
              <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
              {t(lang, "noPathsFemale")}
            </p>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-white/[0.06] bg-black/20 p-2.5">
          <button
            onClick={() => go(-1)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
          >
            <Icon name="chevronLeft" size={14} /> {t(lang, "prev")}
          </button>
          <button
            onClick={() => setUi((u) => ({ ...u, playing: !u.playing }))}
            aria-label={ui.playing ? t(lang, "pause") : t(lang, "play")}
            title={ui.playing ? t(lang, "pause") : t(lang, "play")}
            className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-900/40 hover:bg-rose-400"
          >
            <Icon name={ui.playing ? "pause" : "play"} size={16} />
          </button>
          <button
            onClick={() => go(1)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/90 py-2 text-xs font-semibold text-white hover:bg-rose-400"
          >
            {last ? (lang === "bn" ? "আবার শুরু" : "Restart") : t(lang, "next")} <Icon name="chevronRight" size={14} />
          </button>
        </div>
      </div>

      <Section title={lang === "bn" ? "লাইভ মনিটর" : "Live monitor"}>
        <VitalsMonitor
          bpm={ui.bpm}
          breathRate={ui.breathRate}
          speed={ui.playing ? ui.speed : 0}
          labels={{
            hr: lang === "bn" ? "হৃদস্পন্দন" : "Heart",
            rr: lang === "bn" ? "শ্বাস" : "Resp.",
            bp: lang === "bn" ? "রক্তচাপ" : "BP",
            co: lang === "bn" ? "আউটপুট" : "Output",
            perMin: t(lang, "perMin"),
          }}
        />
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          {lang === "bn"
            ? "লাল রেখা = ইসিজি (হৃৎপিণ্ডের বৈদ্যুতিক সংকেত), নীল রেখা = শ্বাস। মান আনুমানিক ও শিক্ষামূলক।"
            : "Red = ECG (the heart's electrical signal), blue = breathing. Values are approximate and for teaching."}
        </p>
      </Section>

      {/* all steps */}
      <Section title={lang === "bn" ? "সব ধাপ" : "All steps"}>
        <ol className="space-y-0.5">
          {proc.steps.map((s, i) => (
            <li key={i}>
              <button
                onClick={() => setUi((u) => ({ ...u, step: i }))}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition ${
                  i === ui.step ? "bg-rose-500/[0.12] text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                    i < ui.step ? "bg-rose-400/30 text-rose-100" : i === ui.step ? "bg-rose-500 text-white" : "bg-white/[0.07] text-slate-400"
                  }`}
                >
                  {i < ui.step ? <Icon name="check" size={11} /> : i + 1}
                </span>
                <span className="truncate">{tr(lang, s.title).replace(/^\d+\.\s*/, "")}</span>
              </button>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={lang === "bn" ? "নিয়ন্ত্রণ" : "Controls"}>
        <div className="space-y-3">
          <Check label={t(lang, "autoTour")} checked={ui.auto} onChange={(v) => setUi((u) => ({ ...u, auto: v }))} />
          <Check label={t(lang, "fadeOthers")} checked={ui.fade} onChange={(v) => setUi((u) => ({ ...u, fade: v }))} />
          <Slider
            label={t(lang, "heartRate")}
            value={ui.bpm}
            display={`${ui.bpm} ${t(lang, "perMin")}`}
            min={40}
            max={160}
            step={1}
            onChange={(v) => setUi((u) => ({ ...u, bpm: v }))}
          />
          <Slider
            label={t(lang, "breathing")}
            value={ui.breathRate}
            display={`${ui.breathRate} ${t(lang, "perMin")}`}
            min={6}
            max={30}
            step={1}
            onChange={(v) => setUi((u) => ({ ...u, breathRate: v }))}
          />
          <Slider
            label={t(lang, "speed")}
            value={ui.speed}
            display={`${ui.speed.toFixed(2)}×`}
            min={0.25}
            max={2}
            step={0.05}
            onChange={(v) => setUi((u) => ({ ...u, speed: v }))}
          />
        </div>
      </Section>
    </div>
  );
}
