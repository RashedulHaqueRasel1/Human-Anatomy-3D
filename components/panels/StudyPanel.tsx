"use client";

import type { Dispatch, SetStateAction } from "react";
import { Check, PanelTitle, Section, Segmented, Slider } from "./ui";
import { SliceControls } from "./FreePanel";
import { Icon } from "../ui/icons";
import { bnLabel, describe, GROUP_INFO, groupLabel, SYSTEMS_BY_ID, type BodyPart, type OrganGroup } from "@/lib/body";
import { t, type Lang } from "@/lib/i18n";
import type { Slice, Tool } from "@/lib/lab";

export type StudySubject = { kind: "group"; key: string } | { kind: "part"; id: string };

export type StudyUi = { explode: number; labels: boolean; turntable: boolean };

const SECTIONS: { title: { en: string; bn: string }; keys: string[]; color: string }[] = [
  {
    title: { en: "Organs", bn: "অঙ্গ" },
    keys: ["heart", "brain", "lungs", "liver", "stomach", "kidneys", "spleen", "small-intestine", "large-intestine", "eye", "uterus", "ovaries", "breast", "genital", "teeth", "spinal-cord"],
    color: "#fb7185",
  },
  {
    title: { en: "Systems", bn: "তন্ত্র" },
    keys: ["digestive", "respiratory", "urinary", "airways", "vessels", "aorta", "cerebral-hemisphere", "right-lung", "left-lung"],
    color: "#38bdf8",
  },
  {
    title: { en: "Skeleton", bn: "কঙ্কাল" },
    keys: ["skull", "face", "vertebral-column", "rib-cage", "bony-pelvis", "upper-limb-skeleton", "lower-limb-skeleton", "hand", "foot"],
    color: "#e8dfc8",
  },
  {
    title: { en: "Muscles", bn: "পেশী" },
    keys: ["head-muscles", "neck-muscles", "thorax-muscles", "abdomen-muscles", "back-muscles", "upper-limb-muscles", "lower-limb-muscles"],
    color: "#f87171",
  },
];

export function StudyPanel(props: {
  lang: Lang;
  groups: OrganGroup[];
  partsById: Map<string, BodyPart>;
  subject: StudySubject | null;
  setSubject: (s: StudySubject | null) => void;
  members: string[];
  ui: StudyUi;
  setUi: Dispatch<SetStateAction<StudyUi>>;
  tool: Tool;
  setTool: (t: Tool) => void;
  slice: Slice;
  setSlice: Dispatch<SetStateAction<Slice>>;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const { lang, subject } = props;
  const bn = lang === "bn";

  if (!subject) {
    const byKey = new Map(props.groups.map((g) => [g.key, g]));
    const listed = new Set(SECTIONS.flatMap((s) => s.keys));
    const rest = props.groups.filter((g) => !listed.has(g.key));
    return (
      <div>
        <PanelTitle tone="text-sky-300" eyebrow={bn ? "অঙ্গ অধ্যয়ন" : "Organ study"} title={t(lang, "studyTitle")} subtitle={t(lang, "studyIntro")} />
        <div className="mt-4 space-y-5">
          {[...SECTIONS.map((s) => ({ ...s, groups: s.keys.map((k) => byKey.get(k)).filter(Boolean) as OrganGroup[] })), { title: { en: "Other", bn: "অন্যান্য" }, color: "#94a3b8", keys: [], groups: rest }]
            .filter((s) => s.groups.length)
            .map((s) => (
              <div key={s.title.en}>
                <h3 className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {bn ? s.title.bn : s.title.en}
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {s.groups.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => props.setSubject({ kind: "group", key: g.key })}
                      className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-sky-300/40 hover:bg-sky-400/[0.07]"
                    >
                      <span className="absolute inset-y-0 left-0 w-0.5" style={{ background: s.color, opacity: 0.7 }} />
                      <div className="text-[13px] font-medium leading-tight text-slate-100">{groupLabel(g.key, lang)}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {g.members.length} {t(lang, "parts")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  const title = subject.kind === "group" ? groupLabel(subject.key, lang) : props.partsById.get(subject.id)?.name ?? subject.id;
  const about = subject.kind === "group" ? GROUP_INFO[subject.key]?.about : null;
  const members = props.members
    .map((id) => props.partsById.get(id))
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name)) as BodyPart[];

  return (
    <div>
      <button onClick={() => props.setSubject(null)} className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">
        <Icon name="chevronLeft" size={14} /> {t(lang, "backToList")}
      </button>
      <h2 className="mt-2 text-[19px] font-semibold leading-snug text-white">{title}</h2>
      {about && <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{describe(lang, about)}</p>}

      <Section title={bn ? "দেখার উপায়" : "View"}>
        <div className="space-y-3.5">
          <Segmented<Tool>
            value={props.tool === "scalpel" || props.tool === "forceps" ? props.tool : "explore"}
            accent="bg-sky-500/90"
            options={[
              ["explore", t(lang, "tool_explore")],
              ["scalpel", t(lang, "tool_scalpel")],
              ["forceps", t(lang, "tool_forceps")],
            ]}
            onChange={props.setTool}
          />
          {members.length > 1 && (
            <Slider
              label={t(lang, "explode")}
              value={props.ui.explode}
              display={`${Math.round(props.ui.explode * 100)}%`}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => props.setUi((u) => ({ ...u, explode: v }))}
            />
          )}
          <div className="flex gap-5">
            <Check label={t(lang, "labels")} checked={props.ui.labels} onChange={(v) => props.setUi((u) => ({ ...u, labels: v }))} />
            <Check label={t(lang, "turntable")} checked={props.ui.turntable} onChange={(v) => props.setUi((u) => ({ ...u, turntable: v }))} />
          </div>
        </div>
      </Section>

      <Section title={t(lang, "sliceIt")}>
        <SliceControls lang={lang} slice={props.slice} setSlice={props.setSlice} />
      </Section>

      {members.length > 1 && (
        <Section title={`${members.length} ${t(lang, "parts")}`}>
          <ul className="scroll-thin max-h-64 space-y-0.5 overflow-y-auto pr-1">
            {members.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => props.onSelect(p.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition hover:bg-white/[0.05] ${
                    props.selectedId === p.id ? "bg-sky-500/20 text-white" : "text-slate-300"
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SYSTEMS_BY_ID[p.system].color }} />
                  <span className="flex-1 truncate">{p.name}</span>
                  {lang === "bn" && <span className="shrink-0 text-[10px] text-slate-500">{bnLabel(p)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
