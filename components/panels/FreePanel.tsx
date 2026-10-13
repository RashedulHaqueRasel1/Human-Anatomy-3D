"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { SceneApi } from "../BodyScene";
import { Check, PanelTitle, Section, Segmented, Slider } from "./ui";
import { Icon } from "../ui/icons";
import { SYSTEMS, type BodyPart, type SystemId } from "@/lib/body";
import type { CutDepth, IncisionInfo } from "@/lib/engine";
import { t, tr, type Lang } from "@/lib/i18n";
import { SLICE_RANGE, type Slice, type SliceAxis } from "@/lib/lab";

export function SliceControls({ lang, slice, setSlice }: { lang: Lang; slice: Slice; setSlice: Dispatch<SetStateAction<Slice>> }) {
  return (
    <>
      <Check label={t(lang, "enableSlice")} checked={slice.enabled} onChange={(v) => setSlice((s) => ({ ...s, enabled: v }))} />
      <div className={`mt-3 space-y-3 ${slice.enabled ? "" : "pointer-events-none opacity-40"}`}>
        <Segmented<SliceAxis>
          value={slice.axis}
          options={[
            ["z", t(lang, "coronal")],
            ["x", t(lang, "sagittal")],
            ["y", t(lang, "axial")],
          ]}
          onChange={(axis) => setSlice((s) => ({ ...s, axis, pos: axis === "y" ? 1.15 : 0 }))}
        />
        <input
          type="range"
          min={SLICE_RANGE[slice.axis][0]}
          max={SLICE_RANGE[slice.axis][1]}
          step={0.002}
          value={slice.pos}
          onChange={(e) => setSlice((s) => ({ ...s, pos: +e.target.value }))}
          className="w-full"
        />
        <Check label={t(lang, "flip")} checked={slice.flip} onChange={(v) => setSlice((s) => ({ ...s, flip: v }))} />
      </div>
    </>
  );
}

export function FreePanel(props: {
  lang: Lang;
  isFemale: boolean;
  counts: Partial<Record<SystemId, number>>;
  visibleSystems: Record<SystemId, boolean>;
  setVisibleSystems: Dispatch<SetStateAction<Record<SystemId, boolean>>>;
  skinOpacity: number;
  setSkinOpacity: (v: number) => void;
  cutDepth: CutDepth;
  setCutDepth: (d: CutDepth) => void;
  incisions: IncisionInfo[];
  api: RefObject<SceneApi | null>;
  removed: string[];
  setRemoved: Dispatch<SetStateAction<string[]>>;
  partsById: Map<string, BodyPart>;
  slice: Slice;
  setSlice: Dispatch<SetStateAction<Slice>>;
  onReset: () => void;
}) {
  const { lang } = props;
  return (
    <>
      <div className="mb-4">
        <PanelTitle
          eyebrow={lang === "bn" ? "ডিসেকশন" : "Dissection"}
          title={t(lang, "modeExplore")}
          subtitle={lang === "bn" ? "স্তর বেছে নিন, ছুরি দিয়ে কাটুন, ভেতরের অঙ্গ দেখুন।" : "Choose layers, cut with the scalpel and look at the organs underneath."}
        />
      </div>
      {props.isFemale && (
        <p className="mb-3 rounded-lg border border-pink-400/20 bg-pink-400/5 p-2 text-[11px] leading-relaxed text-pink-100/90">{t(lang, "femaleNote")}</p>
      )}
      <Section title={t(lang, "bodySystems")}>
        <div className="space-y-0.5">
          {SYSTEMS.filter((s) => props.counts[s.id]).map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5" title={tr(lang, s.about)}>
              <input
                type="checkbox"
                checked={props.visibleSystems[s.id]}
                onChange={(e) => props.setVisibleSystems((v) => ({ ...v, [s.id]: e.target.checked }))}
              />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="flex-1">{tr(lang, s.name)}</span>
              <span className="text-[11px] text-slate-500">{props.counts[s.id]}</span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Slider
            label={t(lang, "skinOpacity")}
            value={props.skinOpacity}
            display={`${Math.round(props.skinOpacity * 100)}%`}
            min={0}
            max={1}
            step={0.01}
            onChange={props.setSkinOpacity}
          />
        </div>
      </Section>

      <Section title={t(lang, "incisions")}>
        <div className="mb-3">
          <Segmented<CutDepth>
            value={props.cutDepth}
            accent="bg-rose-500/80"
            options={[
              ["layer", t(lang, "oneLayer")],
              ["wall", t(lang, "fullThickness")],
            ]}
            onChange={props.setCutDepth}
          />
        </div>
        {props.incisions.length === 0 ? (
          <p className="text-xs leading-relaxed text-slate-400">
            {lang === "bn"
              ? "নিচের ডক থেকে ছুরি নিয়ে চামড়ার উপর টেনে কাটুন, রিট্র্যাক্টর দিয়ে খুলুন, তারপর সেলাই দিয়ে বন্ধ করুন।"
              : "Pick the Scalpel in the dock below and drag across the skin, open the cut with the Retractor, then close it with the Suture."}
          </p>
        ) : (
          <ul className="space-y-2">
            {props.incisions.map((inc, i) => (
              <li key={inc.id} className="rounded-lg bg-white/5 p-2">
                <div className="flex items-center justify-between text-xs">
                  <span>
                    <b className="text-rose-300">#{i + 1}</b> {inc.layers[0]}
                    {inc.layers.length > 1 && <span className="text-slate-400"> +{inc.layers.length - 1}</span>}
                    <span className="ml-1 text-slate-500">{(inc.length * 100).toFixed(1)} cm</span>
                  </span>
                  <button onClick={() => props.api.current?.removeIncision(inc.id)} className="text-slate-400 hover:text-white" aria-label="Close incision">
                    <Icon name="close" size={14} />
                  </button>
                </div>
                <input
                  type="range"
                  min={0.0005}
                  max={0.05}
                  step={0.0005}
                  value={inc.open}
                  onChange={(e) => props.api.current?.setOpen(inc.id, +e.target.value)}
                  className="mt-1 w-full"
                />
              </li>
            ))}
          </ul>
        )}
        {(props.incisions.length > 0 || props.removed.length > 0) && (
          <button onClick={props.onReset} className="mt-2 w-full rounded-lg border border-white/10 py-1.5 text-xs hover:bg-white/5">
            {t(lang, "resetPatient")}
          </button>
        )}
      </Section>

      <Section title={t(lang, "crossSection")}>
        <SliceControls lang={lang} slice={props.slice} setSlice={props.setSlice} />
      </Section>

      {props.removed.length > 0 && (
        <Section title={t(lang, "liftedOut")}>
          <ul className="space-y-1">
            {props.removed.map((id) => (
              <li key={id} className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1 text-xs">
                <span className="truncate">{props.partsById.get(id)?.name}</span>
                <button onClick={() => props.setRemoved((r) => r.filter((x) => x !== id))} className="ml-2 shrink-0 text-teal-300 hover:underline">
                  {t(lang, "putBack")}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
