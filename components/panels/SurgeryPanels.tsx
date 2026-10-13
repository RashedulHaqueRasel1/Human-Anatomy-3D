"use client";

import { useMemo, useState } from "react";
import { Chip, PanelTitle, Section } from "./ui";
import { Icon, type IconName } from "../ui/icons";
import { CATEGORIES, SURGERIES, type Surgery, type SurgeryCategory } from "@/lib/surgeries";
import { hasPractice } from "@/lib/practice";
import { tr, type Lang } from "@/lib/i18n";
import type { Sex } from "@/lib/body";

const CATEGORY_ICON: Record<SurgeryCategory, IconName> = {
  abdominal: "abdomen",
  cardiothoracic: "heart",
  urology: "drop",
  gynae: "female",
  neuro: "bolt",
  ortho: "bone",
  headneck: "user",
};

function Difficulty({ level, lang }: { level: 1 | 2 | 3; lang: Lang }) {
  const label = [lang === "bn" ? "সহজ" : "Basic", lang === "bn" ? "মাঝারি" : "Intermediate", lang === "bn" ? "জটিল" : "Advanced"][level - 1];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= level ? "bg-amber-300" : "bg-white/15"}`} />
        ))}
      </span>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */

export function SurgeryLibrary({ lang, sex, onOpen }: { lang: Lang; sex: Sex; onOpen: (id: string) => void }) {
  const bn = lang === "bn";
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<SurgeryCategory | "all">("all");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SURGERIES.filter((s) => (cat === "all" || s.category === cat) && (!q || s.name.en.toLowerCase().includes(q) || s.name.bn.includes(q) || s.summary.en.toLowerCase().includes(q)));
  }, [query, cat]);

  return (
    <div>
      <PanelTitle
        tone="text-amber-300"
        eyebrow={bn ? "সার্জারি লাইব্রেরি" : "Surgery library"}
        title={bn ? "গাইডেড সার্জারি" : "Guided surgery"}
        subtitle={
          bn
            ? `${SURGERIES.length}টি অপারেশন। প্রতিটির ধাপে ধাপে টিউটোরিয়াল দেখুন — কোথায় কাটা হয়, কী যন্ত্র লাগে, কী খেয়াল রাখতে হয়।`
            : `${SURGERIES.length} procedures. Watch each as a step-by-step tutorial: where the cut goes, which instruments are used and what to watch for.`
        }
      />

      <div className="relative mt-4">
        <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={bn ? "অপারেশন খুঁজুন…" : "Search procedures…"}
          className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-500 focus:border-amber-300/50"
        />
      </div>

      <div className="scroll-thin -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {([{ id: "all", name: { en: "All", bn: "সব" } }, ...CATEGORIES] as { id: SurgeryCategory | "all"; name: { en: string; bn: string } }[]).map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition ${
              cat === c.id ? "bg-amber-400/90 text-slate-900" : "bg-white/[0.06] text-slate-300 hover:bg-white/10"
            }`}
          >
            {tr(lang, c.name)}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {list.map((s) => {
          const needsOther = (s.body === "female" && sex === "male") || (s.body === "male" && sex === "female");
          return (
            <li key={s.id}>
              <button
                onClick={() => onOpen(s.id)}
                className="group flex w-full gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-left transition hover:border-amber-300/35 hover:bg-amber-300/[0.05]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-300">
                  <Icon name={CATEGORY_ICON[s.category]} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-snug text-white">{tr(lang, s.name)}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-slate-400">{tr(lang, s.summary)}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Difficulty level={s.difficulty} lang={lang} />
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Icon name="clock" size={12} />
                      {tr(lang, s.duration)}
                    </span>
                    {hasPractice(s.id) && (
                      <Chip tone="emerald" icon="scalpel">
                        {bn ? "হাতে-কলমে" : "Practice"}
                      </Chip>
                    )}
                    {needsOther && (
                      <Chip tone="violet" icon={s.body === "female" ? "female" : "male"}>
                        {s.body === "female" ? (bn ? "নারী শরীর" : "Female body") : bn ? "পুরুষ শরীর" : "Male body"}
                      </Chip>
                    )}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} className="mt-1 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-amber-300" />
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="py-6 text-center text-[13px] text-slate-500">{bn ? "কিছু পাওয়া যায়নি" : "No procedures found"}</li>}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function SurgeryDetail({
  lang,
  surgery,
  onBack,
  onTutorial,
  onPractice,
}: {
  lang: Lang;
  surgery: Surgery;
  onBack: () => void;
  onTutorial: (step: number) => void;
  onPractice: () => void;
}) {
  const bn = lang === "bn";
  return (
    <div className="fade-up">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200">
        <Icon name="chevronLeft" size={14} /> {bn ? "সব অপারেশন" : "All procedures"}
      </button>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
        <Icon name={CATEGORY_ICON[surgery.category]} size={13} />
        {tr(lang, CATEGORIES.find((c) => c.id === surgery.category)!.name)}
      </div>
      <h2 className="mt-1 text-[19px] font-semibold leading-snug text-white">{tr(lang, surgery.name)}</h2>
      <p className="text-[12.5px] text-slate-500">{bn ? surgery.name.en : surgery.name.bn}</p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-slate-300">{tr(lang, surgery.summary)}</p>

      <div className="mt-4 grid grid-cols-3 gap-1.5 text-center">
        {[
          { k: bn ? "সময়" : "Duration", v: tr(lang, surgery.duration) },
          { k: bn ? "অচেতন" : "Anaesthesia", v: tr(lang, surgery.anaesthesia) },
          { k: bn ? "জটিলতা" : "Level", v: [bn ? "সহজ" : "Basic", bn ? "মাঝারি" : "Intermediate", bn ? "জটিল" : "Advanced"][surgery.difficulty - 1] },
        ].map((m) => (
          <div key={m.k} className="rounded-lg bg-white/[0.04] px-1.5 py-2 ring-1 ring-inset ring-white/[0.06]">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{m.k}</div>
            <div className="mt-0.5 text-[12px] font-medium leading-tight text-slate-100">{m.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        <button
          onClick={() => onTutorial(0)}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-[13.5px] font-semibold text-slate-900 shadow-lg shadow-amber-900/30 transition hover:bg-amber-300"
        >
          <Icon name="play" size={16} />
          {bn ? "টিউটোরিয়াল দেখুন" : "Watch tutorial"}
        </button>
        {hasPractice(surgery.id) ? (
          <button
            onClick={onPractice}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-400/10 py-2.5 text-[13px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
          >
            <Icon name="scalpel" size={16} />
            {bn ? "নিজে অপারেশন করুন" : "Practise it yourself"}
          </button>
        ) : (
          <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-center text-[11.5px] text-slate-500">
            {bn ? "এই অপারেশনের হাতে-কলমে অনুশীলন শীঘ্রই আসছে।" : "Hands-on practice for this procedure is coming soon."}
          </p>
        )}
      </div>

      <Section title={bn ? "কখন করা হয়" : "When it is done"}>
        <p className="text-[13px] leading-relaxed text-slate-300">{tr(lang, surgery.indications)}</p>
      </Section>

      <Section title={bn ? "ধাপসমূহ" : "Steps"} subtitle={`${surgery.steps.length}`}>
        <ol className="space-y-1">
          {surgery.steps.map((s, i) => (
            <li key={i}>
              <button
                onClick={() => onTutorial(i)}
                className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
              >
                <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[10px] font-semibold text-slate-300">{i + 1}</span>
                {tr(lang, s.title)}
              </button>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={bn ? "ঝুঁকি" : "Risks"}>
        <p className="text-[13px] leading-relaxed text-slate-400">{tr(lang, surgery.risks)}</p>
      </Section>

      <p className="mt-2 rounded-lg bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-slate-500">
        {bn
          ? "শিক্ষামূলক উদ্দেশ্যে তৈরি সংক্ষিপ্ত রূপরেখা। বাস্তব অপারেশন রোগী ও হাসপাতালভেদে ভিন্ন হয়।"
          : "A simplified outline for education. Real operations vary with the patient, the surgeon and the hospital."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function TutorialPanel({
  lang,
  surgery,
  step,
  setStep,
  playing,
  setPlaying,
  onBack,
  onPractice,
}: {
  lang: Lang;
  surgery: Surgery;
  step: number;
  setStep: (n: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  onBack: () => void;
  onPractice: () => void;
}) {
  const bn = lang === "bn";
  const s = surgery.steps[step];
  const last = step === surgery.steps.length - 1;
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200">
        <Icon name="chevronLeft" size={14} /> {tr(lang, surgery.name)}
      </button>
      <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-amber-300">{bn ? "টিউটোরিয়াল" : "Tutorial"}</div>

      <div className="mt-2 overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-b from-amber-300/[0.08] to-transparent">
        <div className="flex gap-1 px-3 pt-3">
          {surgery.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`${bn ? "ধাপ" : "Step"} ${i + 1}`}
              className={`h-1.5 flex-1 rounded-full transition ${i === step ? "bg-amber-300" : i < step ? "bg-amber-300/45" : "bg-white/10 hover:bg-white/20"}`}
            />
          ))}
        </div>
        <div key={`${surgery.id}-${step}`} className="fade-up p-3.5 pt-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-amber-200/90">
            {bn ? "ধাপ" : "Step"} {step + 1} / {surgery.steps.length}
          </div>
          <h3 className="mt-1 text-[16px] font-semibold leading-snug text-white">{tr(lang, s.title)}</h3>
          {s.instrument && (
            <div className="mt-2">
              <Chip icon="tool" tone="amber">
                {tr(lang, s.instrument)}
              </Chip>
            </div>
          )}
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-200">{tr(lang, s.text)}</p>
          {bn && <p className="mt-2 text-xs leading-relaxed text-slate-500">{s.text.en}</p>}
          {s.tip && (
            <div className="mt-3 flex gap-2 rounded-lg border border-sky-300/20 bg-sky-300/[0.06] p-2.5 text-[12.5px] leading-relaxed text-sky-100">
              <Icon name="bulb" size={15} className="mt-0.5 shrink-0 text-sky-300" />
              {tr(lang, s.tip)}
            </div>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-white/[0.06] bg-black/20 p-2.5">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] py-2 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-35"
          >
            <Icon name="chevronLeft" size={14} /> {bn ? "আগের" : "Back"}
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "Pause" : "Play"}
            title={playing ? (bn ? "অটো-প্লে থামান" : "Pause auto-play") : bn ? "অটো-প্লে" : "Auto-play"}
            className="grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-slate-900 shadow-lg shadow-amber-900/40 hover:bg-amber-300"
          >
            <Icon name={playing ? "pause" : "play"} size={16} />
          </button>
          <button
            onClick={() => (last ? setStep(0) : setStep(step + 1))}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-400/90 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-300"
          >
            {last ? (bn ? "আবার" : "Replay") : bn ? "পরের" : "Next"} <Icon name="chevronRight" size={14} />
          </button>
        </div>
      </div>

      {hasPractice(surgery.id) && (
        <button
          onClick={onPractice}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-400/10 py-2.5 text-[13px] font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
        >
          <Icon name="scalpel" size={16} />
          {bn ? "এখন নিজে করে দেখুন" : "Now try it yourself"}
        </button>
      )}

      <Section title={bn ? "সব ধাপ" : "All steps"}>
        <ol className="space-y-0.5">
          {surgery.steps.map((x, i) => (
            <li key={i}>
              <button
                onClick={() => setStep(i)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition ${
                  i === step ? "bg-amber-300/[0.12] text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                }`}
              >
                <span
                  className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                    i < step ? "bg-amber-300/30 text-amber-100" : i === step ? "bg-amber-400 text-slate-900" : "bg-white/[0.07] text-slate-400"
                  }`}
                >
                  {i < step ? <Icon name="check" size={11} /> : i + 1}
                </span>
                {tr(lang, x.title)}
              </button>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
