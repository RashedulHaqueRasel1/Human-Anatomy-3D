"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { SceneApi } from "./BodyScene";
import { APPENDECTOMY, LAYER_FOR, type GuidedStep } from "@/lib/appendectomy";
import type { IncisionInfo, Landmarks, PlainHit, SutureInfo } from "@/lib/engine";
import type { BodyPart } from "@/lib/body";
import { sfx } from "@/lib/sfx";
import { add, cross, dist, dot, lerp, norm, scale, sub, type V3 } from "@/lib/vec";

export type Feedback = { ok: boolean; text: string };

export type GuidedState = {
  step: number;
  mistakes: number;
  startedAt: number;
  finishedAt: number | null;
  feedback: Feedback | null;
  lm: Landmarks;
  skinStroke: number | null;
  skinMid: V3 | null;
};

type Deps = {
  api: RefObject<SceneApi | null>;
  partsById: Map<string, BodyPart>;
  incisions: IncisionInfo[];
  setRemoved: (fn: (r: string[]) => string[]) => void;
};

const BLUE = "#38bdf8";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";

/**
 * Drives the guided open appendicectomy: validates each action against the
 * current step, gives feedback and stages the scene (markers, skin marking,
 * delivering the caecum, placing instruments).
 */
export function useAppendectomy({ api, partsById, incisions, setRemoved }: Deps) {
  const [state, setState] = useState<GuidedState | null>(null);
  const ref = useRef<GuidedState | null>(null);
  const incRef = useRef<IncisionInfo[]>(incisions);
  useEffect(() => {
    ref.current = state;
  }, [state]);
  useEffect(() => {
    incRef.current = incisions;
  }, [incisions]);

  const step: GuidedStep | null = state && state.step < APPENDECTOMY.length ? APPENDECTOMY[state.step] : null;

  const patch = useCallback((p: Partial<GuidedState>) => {
    const next = ref.current ? { ...ref.current, ...p } : null;
    ref.current = next;
    setState(next);
  }, []);

  const fail = useCallback(
    (text: string) => {
      const s = ref.current;
      if (!s) return;
      patch({ mistakes: s.mistakes + 1, feedback: { ok: false, text } });
    },
    [patch],
  );

  const advance = useCallback(
    (text: string, extra: Partial<GuidedState> = {}) => {
      const s = ref.current;
      if (!s) return;
      sfx.success();
      const nextStep = s.step + 1;
      patch({
        ...extra,
        step: nextStep,
        feedback: { ok: true, text },
        finishedAt: nextStep >= APPENDECTOMY.length ? performance.now() : null,
      });
    },
    [patch],
  );

  const name = useCallback((id: string) => partsById.get(id)?.name ?? "that structure", [partsById]);

  /* ---------------- lifecycle ---------------- */

  const start = useCallback(() => {
    const a = api.current;
    const lm = a?.landmarks();
    if (!a || !lm) return false;
    a.clearIncisions();
    a.resetPositions();
    a.showGuide(null);
    a.showMarkers([
      { point: lm.asis, normal: [0, 0, 1], color: BLUE, size: 0.009 },
      { point: lm.umbilicus, normal: [0, 0, 1], color: BLUE, size: 0.009 },
    ]);
    a.focusPoint(lerp(lm.asis, lm.umbilicus, 0.4), 0.55);
    const s: GuidedState = {
      step: 0,
      mistakes: 0,
      startedAt: performance.now(),
      finishedAt: null,
      feedback: null,
      lm,
      skinStroke: null,
      skinMid: null,
    };
    ref.current = s;
    setState(s);
    return true;
  }, [api]);

  const exit = useCallback(() => {
    api.current?.showMarkers([]);
    api.current?.showGuide(null);
    ref.current = null;
    setState(null);
  }, [api]);

  /** Camera to the working area of the current step, plus a visual hint. */
  const showMe = useCallback(() => {
    const s = ref.current;
    const a = api.current;
    if (!s || !a) return;
    const id = APPENDECTOMY[s.step]?.id;
    const base = a.movedPoint(s.lm.appendixId, s.lm.appendixBase);
    if (id === "landmark") {
      a.showMarkers([
        { point: s.lm.asis, normal: [0, 0, 1], color: BLUE, size: 0.009 },
        { point: s.lm.umbilicus, normal: [0, 0, 1], color: BLUE, size: 0.009 },
        { point: s.lm.mcburney, normal: s.lm.mcburneyNormal, color: AMBER, size: 0.011 },
      ]);
      a.focusPoint(s.lm.mcburney, 0.45);
    } else if (id === "clamp" || id === "ligate" || id === "identify") {
      a.showMarkers([{ point: base, normal: s.lm.mcburneyNormal, color: AMBER, size: 0.007 }]);
      a.focusPoint(base, 0.22);
    } else {
      a.focusPoint(s.skinMid ?? s.lm.mcburney, id === "skin" ? 0.35 : 0.25);
    }
  }, [api]);

  /* ---------------- event handlers (return true when consumed) ---------------- */

  const onPick = useCallback(
    (hit: PlainHit) => {
      const s = ref.current;
      const a = api.current;
      if (!s || !a) return false;
      const id = APPENDECTOMY[s.step]?.id;
      if (id === "landmark") {
        const d = dist(hit.point, s.lm.mcburney);
        if (d > 0.025) {
          fail(`That point is ${(d * 100).toFixed(1)} cm away. McBurney's point is one-third of the way from the ASIS towards the umbilicus.`);
          return true;
        }
        a.showMarkers([{ point: s.lm.mcburney, normal: s.lm.mcburneyNormal, color: GREEN, size: 0.006 }]);
        a.showGuide(s.lm.guide);
        a.focusPoint(s.lm.mcburney, 0.32);
        advance(`Correct — ${(d * 100).toFixed(1)} cm from McBurney's point. The incision has been marked on the skin.`);
        return true;
      }
      if (id === "identify") {
        if (hit.partId !== s.lm.appendixId) {
          fail(`That is the ${name(hit.partId).toLowerCase()}. Follow the taeniae coli to where they meet.`);
          return true;
        }
        const base = a.movedPoint(s.lm.appendixId, s.lm.appendixBase);
        a.showMarkers([{ point: base, normal: s.lm.mcburneyNormal, color: AMBER, size: 0.006 }]);
        advance("Appendix identified. The amber ring marks its base, where the three taeniae converge.");
        return true;
      }
      return false;
    },
    [api, advance, fail, name],
  );

  const onIncisionMade = useCallback(
    (info: IncisionInfo) => {
      const s = ref.current;
      const a = api.current;
      if (!s || !a) return false;
      const id = APPENDECTOMY[s.step]?.id;
      const undo = (text: string) => {
        a.removeIncision(info.id);
        fail(`${text} The cut was undone — try again.`);
        return true;
      };

      const expected = id ? LAYER_FOR[id] : undefined;
      if (id === "skin") {
        if (!expected!.test(info.layers[0])) return undo(`You cut the ${info.layers[0].toLowerCase()}, not the skin.`);
        const d = dist(info.mid, s.lm.mcburney);
        if (d > 0.03) return undo(`The incision is ${(d * 100).toFixed(1)} cm away from McBurney's point. Follow the purple marking.`);
        if (info.length < 0.035) return undo(`Only ${(info.length * 100).toFixed(1)} cm — a gridiron incision needs 5–6 cm.`);
        const g = s.lm.guide;
        const along = Math.abs(dot(norm(sub(info.end, info.start)), norm(sub(g[g.length - 1], g[0]))));
        if (along < 0.8) return undo("The direction is off — keep along the marking, perpendicular to the spino-umbilical line.");
        a.setOpen(info.id, 0.011);
        a.showGuide(null);
        a.showMarkers([]);
        a.focusPoint(info.mid, 0.26);
        advance(`Clean ${(info.length * 100).toFixed(1)} cm skin incision. Subcutaneous fat is exposed; bleeding points are controlled.`, {
          skinStroke: info.id,
          skinMid: info.mid,
        });
        return true;
      }
      if (id === "eo" || id === "io" || id === "ta") {
        const layer = info.layers[0];
        if (!expected!.test(layer)) {
          const hint = /rectus/i.test(layer)
            ? "That is the rectus abdominis — stay lateral to the rectus sheath."
            : /skin/i.test(layer)
              ? "That is skin — cut inside the opening, in the depth of the wound."
              : `That is the ${layer.toLowerCase()}.`;
          return undo(hint);
        }
        if (s.skinMid && dist(info.mid, s.skinMid) > 0.035) return undo("Stay within the skin opening.");
        a.setOpen(info.id, 0.009);
        const msg = {
          eo: "External oblique aponeurosis opened along its fibres. The internal oblique lies beneath.",
          io: "Internal oblique split. Now the transversus abdominis.",
          ta: "Transversus abdominis split. The peritoneum is visible in the depth.",
        }[id];
        advance(msg);
        return true;
      }
      if (id === "excise") {
        if (!info.partIds.includes(s.lm.appendixId)) {
          return undo(`That cut went through the ${info.layers[0].toLowerCase()}. Cut across the appendix itself.`);
        }
        a.removeIncision(info.id);
        setRemoved((r) => (r.includes(s.lm.appendixId) ? r : [...r, s.lm.appendixId]));
        sfx.snip();
        advance("Appendix removed with the clamp and sent for histopathology. The ligated stump stays in place.");
        return true;
      }
      // any other cut during guided mode is a mistake
      return undo("This step does not need a cut.");
    },
    [api, advance, fail, setRemoved],
  );

  const onRetracted = useCallback(
    (strokes: number[]) => {
      const s = ref.current;
      if (!s || APPENDECTOMY[s.step]?.id !== "retract" || s.skinStroke === null) return false;
      if (!strokes.includes(s.skinStroke)) return true;
      const skin = incRef.current.find((i) => i.id === s.skinStroke);
      const gap = skin ? skin.open * 2 + 0.0022 : 0;
      if (gap < 0.034) {
        patch({ feedback: { ok: false, text: `Wound open ${(gap * 100).toFixed(1)} cm — retract further to about 4 cm.` } });
        return true;
      }
      advance("Wound held open with two Langenbeck retractors. The peritoneum has been lifted and opened.");
      return true;
    },
    [advance, patch],
  );

  const onForceps = useCallback(
    (hit: PlainHit) => {
      const s = ref.current;
      const a = api.current;
      if (!s || !a) return false;
      if (APPENDECTOMY[s.step]?.id !== "deliver") return true;
      const part = partsById.get(hit.partId);
      if (!part || part.system !== "digestive") {
        fail(`That is the ${name(hit.partId).toLowerCase()}. Reach into the wound and grasp the bowel.`);
        return true;
      }
      const { lm } = s;
      const n = lm.mcburneyNormal;
      const target = add(s.skinMid ?? lm.mcburney, scale(n, -0.016));
      const anchor = lerp(lm.appendixBase, lm.appendixTip, 0.5);
      a.deliver(lm.appendixId, anchor, target);
      // the Babcock holds the appendix near its tip and travels up with it
      a.placeInstrument("babcock", lerp(lm.appendixBase, lm.appendixTip, 0.8), n, sub(lm.appendixTip, lm.appendixBase), lm.appendixId);
      a.focusPoint(target, 0.24);
      advance("Caecum and appendix delivered into the wound with Babcock forceps.");
      return true;
    },
    [api, advance, fail, name, partsById],
  );

  const onClamp = useCallback(
    (hit: PlainHit) => {
      const s = ref.current;
      const a = api.current;
      if (!s || !a) return false;
      if (APPENDECTOMY[s.step]?.id !== "clamp") return true;
      const { lm } = s;
      if (hit.partId !== lm.appendixId) {
        fail(`That is the ${name(hit.partId).toLowerCase()} — clamp the appendix.`);
        return true;
      }
      const base = a.movedPoint(lm.appendixId, lm.appendixBase);
      const tip = a.movedPoint(lm.appendixId, lm.appendixTip);
      const d = dist(hit.point, base);
      if (d > 0.03) {
        fail(`Too far from the base (${(d * 100).toFixed(1)} cm). Clamp close to the caecum.`);
        return true;
      }
      const axis = norm(sub(tip, base));
      a.placeInstrument("clamp", hit.point, hit.normal, cross(hit.normal, axis), lm.appendixId);
      advance("Base crushed with a Kelly clamp. The mesoappendix and appendicular artery have been tied.");
      return true;
    },
    [api, advance, fail, name],
  );

  const onTie = useCallback(
    (hit: PlainHit) => {
      const s = ref.current;
      const a = api.current;
      if (!s || !a) return false;
      if (APPENDECTOMY[s.step]?.id !== "ligate") return true;
      const { lm } = s;
      const base = a.movedPoint(lm.appendixId, lm.appendixBase);
      const tip = a.movedPoint(lm.appendixId, lm.appendixTip);
      if (hit.partId !== lm.appendixId || dist(hit.point, base) > 0.03) {
        fail("Tie the ligature at the base of the appendix (amber ring).");
        return true;
      }
      const axis = norm(sub(tip, base));
      a.placeLigature(add(base, scale(axis, 0.003)), axis, 0.0045);
      a.showMarkers([]);
      advance("Base ligated with Vicryl 2-0.");
      return true;
    },
    [api, advance, fail],
  );

  const onSutured = useCallback(
    (info: SutureInfo) => {
      const s = ref.current;
      if (!s || APPENDECTOMY[s.step]?.id !== "close") return false;
      if (!info.complete) {
        patch({ feedback: { ok: false, text: `${Math.round(info.coverage * 100)}% closed — sew along the whole incision.` } });
        return true;
      }
      api.current?.showMarkers([]);
      advance("Wound closed with interrupted sutures. Procedure complete!");
      return true;
    },
    [api, advance, patch],
  );

  return {
    state,
    step,
    active: !!state,
    start,
    exit,
    showMe,
    handlers: { onPick, onIncisionMade, onRetracted, onForceps, onClamp, onTie, onSutured },
  };
}
