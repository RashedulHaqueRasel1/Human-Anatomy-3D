"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { SceneApi } from "./BodyScene";
import type { Practice, PracticeStep } from "@/lib/practice";
import type { IncisionInfo, PlainHit, SutureInfo } from "@/lib/engine";
import type { BodyPart } from "@/lib/body";
import { sfx } from "@/lib/sfx";
import { dist, type V3 } from "@/lib/vec";

export type ProcFeedback = { ok: boolean; text: string; bn?: string };

export type ProcState = {
  step: number;
  mistakes: number;
  startedAt: number;
  finishedAt: number | null;
  feedback: ProcFeedback | null;
  /** Ports / landmarks already clicked in a "sites" step. */
  sites: boolean[];
};

type Deps = {
  api: RefObject<SceneApi | null>;
  partsById: Map<string, BodyPart>;
  incisions: IncisionInfo[];
  setRemoved: (fn: (r: string[]) => string[]) => void;
};

const re = (src: string | undefined) => (src ? new RegExp(src, "i") : null);
const cm = (m: number) => `${(m * 100).toFixed(1)} cm`;

/** Distance from a point to a polyline. */
function distToLine(p: V3, line: V3[]) {
  let best = Infinity;
  for (let i = 0; i < line.length; i++) {
    best = Math.min(best, dist(p, line[i]));
    if (i > 0) {
      const a = line[i - 1];
      const b = line[i];
      const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ap: V3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1e-9;
      const h = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2));
      best = Math.min(best, dist(p, [a[0] + ab[0] * h, a[1] + ab[1] * h, a[2] + ab[2] * h]));
    }
  }
  return best;
}

/**
 * Drives a hands-on practice script (see lib/practice.ts): checks each action
 * against what really happens in the body — which layer the blade divided, where,
 * what was clamped, how wide the wound is open — and stages the scene for each step.
 */
export function useProcedure({ api, partsById, incisions, setRemoved }: Deps) {
  const [state, setState] = useState<ProcState | null>(null);
  const [practice, setPractice] = useState<Practice | null>(null);
  const ref = useRef<ProcState | null>(null);
  const practiceRef = useRef<Practice | null>(null);
  const incRef = useRef<IncisionInfo[]>(incisions);
  const siteWorld = useRef<V3[]>([]);
  const lastCut = useRef<{ mid: V3; normal: V3 } | null>(null);
  const advanceRef = useRef<((ok: { en: string; bn?: string }) => void) | null>(null);
  // handlers are memoised: always read the latest parts / setter through refs
  const partsRef = useRef(partsById);
  const removeRef = useRef(setRemoved);

  useEffect(() => {
    ref.current = state;
  }, [state]);
  useEffect(() => {
    incRef.current = incisions;
  }, [incisions]);
  useEffect(() => {
    partsRef.current = partsById;
    removeRef.current = setRemoved;
  }, [partsById, setRemoved]);

  const steps = practice?.steps ?? [];
  const step: PracticeStep | null = state && state.step < steps.length ? steps[state.step] : null;

  const patch = useCallback((p: Partial<ProcState>) => {
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

  const nameOf = useCallback((id: string) => partsRef.current.get(id)?.name ?? "structure", []);

  /* ---------------- staging ---------------- */

  const drawSites = useCallback(
    (st: PracticeStep, done: boolean[]) => {
      if (st.do.kind !== "sites") return;
      const plan = st.do.plan;
      api.current?.showPlan({
        ...plan,
        points: plan.points?.map((p, i) => ({ ...p, color: done[i] ? "#22c55e" : p.color })),
      });
    },
    [api],
  );

  /** Is the structure beneath the last cut one we were waiting to expose? */
  const exposed = useCallback(
    (what: string, mid: V3, normal: V3) => {
      const a = api.current;
      if (!a) return false;
      const below = a.layersBelow(mid, normal).find((l) => !l.cut);
      if (!below) return false;
      if (what === "@organ") return below.system !== "integumentary" && below.system !== "muscular";
      return !!re(what)?.test(below.name);
    },
    [api],
  );

  const stage = useCallback(
    (idx: number) => {
      const a = api.current;
      const st = practiceRef.current?.steps[idx];
      if (!a || !st) return;
      a.showMarkers([]);
      a.setSpotlight(re(st.highlight));
      if (st.do.kind === "sites") {
        siteWorld.current = a.planWorld(st.do.plan).points;
        drawSites(st, new Array(siteWorld.current.length).fill(false));
        a.focusMatch(new RegExp(st.do.plan.anchor, "i"), 0.8);
      } else {
        a.showPlan(st.plan ?? null);
        const f = st.focus;
        if (f) a.focusMatch(new RegExp(f.match, "i"), f.distance * 1.4);
        else if (st.plan) a.focusMatch(new RegExp(st.plan.anchor, "i"), 0.6);
      }
      // a closing step whose layer was already sewn earlier
      if (st.do.kind === "close") {
        const want = st.do.layer;
        window.setTimeout(() => {
          if (ref.current?.step !== idx || !incRef.current.length) return;
          const open = incRef.current.filter((i) => i.open > 0.002 && (!want || re(want)!.test(i.layers[0])));
          if (open.length === 0) advanceRef.current?.(st.ok);
        }, 300);
      }
      // a dissection that is already finished (the next structure is already in view)
      if (st.do.kind === "cut" && st.do.untilExpose && lastCut.current) {
        const { mid, normal } = lastCut.current;
        if (exposed(st.do.untilExpose, mid, normal)) {
          window.setTimeout(() => {
            if (ref.current?.step === idx) advanceRef.current?.(st.ok);
          }, 400);
        }
      }
    },
    [api, drawSites, exposed],
  );


  const advance = useCallback(
    (ok: { en: string; bn?: string }, extra: Partial<ProcState> = {}) => {
      const s = ref.current;
      if (!s) return;
      sfx.success();
      const next = s.step + 1;
      const total = practiceRef.current?.steps.length ?? 0;
      patch({
        ...extra,
        step: next,
        sites: [],
        feedback: { ok: true, text: ok.en, bn: ok.bn },
        finishedAt: next >= total ? performance.now() : null,
      });
      if (next < total) window.setTimeout(() => stage(next), 350);
      else {
        api.current?.setSpotlight(null);
        api.current?.showPlan(null);
        api.current?.showMarkers([]);
      }
    },
    [patch, stage, api],
  );

  useEffect(() => {
    advanceRef.current = (ok) => advance(ok);
  }, [advance]);

  /* ---------------- lifecycle ---------------- */

  const start = useCallback(
    (p: Practice) => {
      const a = api.current;
      if (!a || !a.matchCenter(/^skin$/i)) return false;
      a.clearIncisions();
      a.resetPositions();
      a.showGuide(null);
      a.showMarkers([]);
      practiceRef.current = p;
      setPractice(p);
      lastCut.current = null;
      const s: ProcState = { step: 0, mistakes: 0, startedAt: performance.now(), finishedAt: null, feedback: null, sites: [] };
      ref.current = s;
      setState(s);
      window.setTimeout(() => stage(0), 120);
      return true;
    },
    [api, stage],
  );

  const exit = useCallback(() => {
    const a = api.current;
    a?.showMarkers([]);
    a?.showGuide(null);
    a?.showPlan(null);
    a?.setSpotlight(null);
    ref.current = null;
    practiceRef.current = null;
    lastCut.current = null;
    setState(null);
    setPractice(null);
  }, [api]);

  const showMe = useCallback(() => {
    const s = ref.current;
    if (s) stage(s.step);
  }, [stage]);

  /* ---------------- actions ---------------- */

  const current = () => {
    const s = ref.current;
    const st = s ? practiceRef.current?.steps[s.step] : undefined;
    return s && st ? { s, st } : null;
  };

  const notNow = useCallback(
    (text = "That is not needed in this step.") => {
      const c = current();
      if (c) patch({ feedback: { ok: false, text } });
      return true;
    },
    [patch],
  );

  const touch = useCallback(
    (hit: PlainHit) => {
    const c = current();
    const a = api.current;
    if (!c || !a || c.st.do.kind !== "touch") return notNow();
    const d = c.st.do;
    const name = nameOf(hit.partId);
    if (!re(d.target)?.test(name)) {
      fail(`That is the ${name.toLowerCase()}, not what this step needs. Look for the highlighted structure.`);
      return true;
    }
    if (d.effect) a.applyEffect(d.effect, hit.partId, hit.point, hit.normal);
    if (d.remove === "self") removeRef.current((r) => (r.includes(hit.partId) ? r : [...r, hit.partId]));
    else if (d.remove) {
      const rm = re(d.remove)!;
      const ids = [...partsRef.current.values()].filter((p) => rm.test(p.name)).map((p) => p.id);
      removeRef.current((r) => [...new Set([...r, ...ids])]);
    }
    advance(c.st.ok);
    return true;
    },
    [api, fail, advance, nameOf, notNow],
  );

  const removeCut = useCallback(
    (info: IncisionInfo) => {
      const ids = info.partIds.filter((id) => partsRef.current.get(id)?.system === "skeletal");
      api.current?.removeIncision(info.id);
      if (ids.length) removeRef.current((r) => [...new Set([...r, ...ids])]);
      sfx.snip();
    },
    [api],
  );

  /** Ports and landmarks, and clicks with the plain explore tool. */
  const onPick = useCallback(
    (hit: PlainHit) => {
      const c = current();
      const a = api.current;
      if (!c || !a) return false;
      const { s, st } = c;
      if (st.do.kind === "sites") {
        const pts = siteWorld.current;
        const done = s.sites.length === pts.length ? [...s.sites] : new Array(pts.length).fill(false);
        let best = -1;
        let bestD = Infinity;
        pts.forEach((p, i) => {
          if (done[i]) return;
          const d = dist(hit.point, p);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        const radius = st.do.radius ?? 0.028;
        if (best < 0 || bestD > radius) {
          fail(`Not on a marked site (${cm(bestD)} away). Click inside one of the rings.`);
          return true;
        }
        done[best] = true;
        sfx.snip();
        drawSites(st, done);
        const left = done.filter((x) => !x).length;
        if (left > 0) {
          patch({ sites: done, feedback: { ok: true, text: `Site placed — ${left} to go.` } });
        } else {
          advance(st.ok, { sites: done });
        }
        return true;
      }
      if (st.do.kind === "touch" && st.tool === "explore") return touch(hit);
      return false;
    },
    [api, fail, patch, advance, drawSites, touch],
  );

  const onForceps = useCallback(
    (hit: PlainHit) => {
      const c = current();
      if (!c) return false;
      if (c.st.do.kind !== "touch" || c.st.tool !== "forceps") return notNow();
      return touch(hit);
    },
    [touch, notNow],
  );

  const onClamp = useCallback(
    (hit: PlainHit) => {
      const c = current();
      if (!c) return false;
      if (c.st.do.kind !== "touch" || c.st.tool !== "clamp") return notNow();
      return touch(hit);
    },
    [touch, notNow],
  );

  const onTie = useCallback(
    (hit: PlainHit) => {
      const c = current();
      if (!c) return false;
      if (c.st.do.kind !== "touch" || !c.st.tie) return notNow();
      return touch(hit);
    },
    [touch, notNow],
  );

  const onIncisionMade = useCallback(
    (info: IncisionInfo) => {
      const c = current();
      const a = api.current;
      if (!c || !a) return false;
      const { st } = c;
      const undo = (text: string) => {
        a.removeIncision(info.id);
        fail(`${text} The cut was undone — try again.`);
        return true;
      };
      if (st.do.kind !== "cut") return undo("This step does not need a cut.");
      const d = st.do;
      const layer = info.layers[0];
      const system = partsRef.current.get(info.partIds[0])?.system;
      const dissecting = !!(d.untilCut || d.untilExpose);

      if (info.length < d.minLength) return undo(`Only ${cm(info.length)} — this step needs at least ${cm(d.minLength)}.`);

      if (d.plan && st.plan) {
        const line = a.planWorld(st.plan).lines[0];
        if (line && line.length > 1) {
          const off = distToLine(info.mid, line);
          if (off > 0.04) return undo(`The cut is ${cm(off)} away from the marked line. Follow the purple line.`);
        }
      }
      if (d.layer && !re(d.layer)!.test(layer)) {
        return undo(`That cut divided the ${layer.toLowerCase()}, not the layer this step asks for.`);
      }
      if (d.avoid && re(d.avoid)!.test(layer)) return undo(`That is the ${layer.toLowerCase()} — stay clear of it.`);
      if (d.target && !info.layers.some((n) => re(d.target)!.test(n))) {
        return undo("That cut did not pass through the structure you need to divide.");
      }

      if (dissecting) {
        const isTarget = !!d.untilCut && re(d.untilCut)!.test(layer);
        // layer by layer: only the covering layers of the wall may be cut on the way down
        if (!isTarget && system && system !== "integumentary" && system !== "muscular" && system !== "skeletal") {
          return undo(`That is the ${layer.toLowerCase()} — you have gone too deep.`);
        }
        const prev = lastCut.current;
        if (prev && dist(info.mid, prev.mid) > 0.07) return undo("Keep working inside the wound you have already opened.");
        a.animateOpen(info.id, d.open ?? 0.01, 0.7);
        lastCut.current = { mid: info.mid, normal: info.normal };
        const done =
          isTarget || (d.untilExpose ? exposed(d.untilExpose, info.mid, info.normal) : false);
        if (done) {
          if (d.removeCut) removeCut(info);
          advance(st.ok);
        } else {
          const next = a.layersBelow(info.mid, info.normal).find((l) => !l.cut);
          patch({
            feedback: {
              ok: true,
              text: `${layer} divided.${next ? ` Next layer: ${next.name}.` : ""} Cut it too, inside the opening.`,
            },
          });
          sfx.success();
        }
        return true;
      }

      // a single, well-defined cut
      a.animateOpen(info.id, d.open ?? 0.01, 0.7);
      lastCut.current = { mid: info.mid, normal: info.normal };
      if (d.removeCut) removeCut(info);
      if (d.remove) {
        const rm = re(d.remove)!;
        const ids = [...partsRef.current.values()].filter((p) => rm.test(p.name)).map((p) => p.id);
        a.removeIncision(info.id);
        removeRef.current((r) => [...new Set([...r, ...ids])]);
        sfx.snip();
      }
      advance(st.ok);
      return true;
    },
    [api, fail, patch, advance, exposed, removeCut],
  );

  const onRetracted = useCallback(
    (strokes: number[]) => {
      const c = current();
      if (!c || c.st.do.kind !== "retract") return false;
      const first = strokes.map((id) => incRef.current.find((i) => i.id === id)).find(Boolean);
      if (!first) return true;
      const gap = first.open * 2 + 0.0022;
      const need = c.st.do.gap;
      if (gap < need) {
        patch({ feedback: { ok: false, text: `Wound open ${cm(gap)} — pull further, to about ${cm(need)}.` } });
        return true;
      }
      advance(c.st.ok);
      return true;
    },
    [advance, patch],
  );

  /** Wound layers (optionally of a given name) that are still open. */
  const stillOpen = (want?: string) =>
    incRef.current.filter((i) => i.open > 0.002 && (!want || re(want)!.test(i.layers[0])));

  const onSutured = useCallback(
    (info: SutureInfo) => {
      const c = current();
      if (!c || c.st.do.kind !== "close") return false;
      if (!info.complete) {
        patch({ feedback: { ok: false, text: `${Math.round(info.coverage * 100)}% closed — sew along the whole incision.` } });
        return true;
      }
      const { st, s } = c;
      const want = st.do.kind === "close" ? st.do.layer : undefined;
      // the wound layers close together; look once the engine has reported the new state
      window.setTimeout(() => {
        if (ref.current?.step !== s.step) return;
        const open = stillOpen(want);
        if (open.length === 0) advance(st.ok);
        else fail(`Closed, but the ${open[0].layers[0].toLowerCase()} is still open — point the needle at it and sew it too.`);
      }, 160);
      return true;
    },
    [advance, patch, fail],
  );

  return {
    state,
    step,
    steps,
    practice,
    active: !!state,
    start,
    exit,
    showMe,
    handlers: { onPick, onIncisionMade, onRetracted, onForceps, onClamp, onTie, onSutured },
  };
}
