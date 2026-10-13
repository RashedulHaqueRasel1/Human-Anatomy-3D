"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BodyScene, { type Label, type SceneApi } from "./BodyScene";
import { useAppendectomy } from "./useAppendectomy";
import { useProcedure } from "./useProcedure";
import { FreePanel } from "./panels/FreePanel";
import { LivePanel, type LiveUi } from "./panels/LivePanel";
import { StudyPanel, type StudySubject, type StudyUi } from "./panels/StudyPanel";
import { PracticePanel, type PracticeView } from "./panels/GuidedPanel";
import { SurgeryDetail, SurgeryLibrary, TutorialPanel } from "./panels/SurgeryPanels";
import { InfoPanel } from "./panels/InfoPanel";
import { Icon, type IconName } from "./ui/icons";
import { bnLabel, MANIFEST_URL, SYSTEMS_BY_ID, type BodyPart, type Manifest, type Sex, type SystemId } from "@/lib/body";
import type { Slice, Tool } from "@/lib/lab";
import type { CutDepth, IncisionInfo, LayerInfo, LiveConfig, PlainHit, SutureInfo } from "@/lib/engine";
import { APPENDECTOMY } from "@/lib/appendectomy";
import { hasPractice, PRACTICE } from "@/lib/practice";
import { PROCESSES } from "@/lib/physiology";
import { SURGERY_BY_ID } from "@/lib/surgeries";
import { t, tr, type Lang, type StringKey } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";
import { cross, norm, type V3 } from "@/lib/vec";

const ALL_SYSTEMS: Record<SystemId, boolean> = {
  integumentary: true,
  muscular: true,
  skeletal: true,
  nervous: true,
  cardiovascular: true,
  respiratory: true,
  digestive: true,
  urinary: true,
  reproductive: true,
  other: true,
};
const NO_SYSTEMS = Object.fromEntries(Object.keys(ALL_SYSTEMS).map((k) => [k, false])) as Record<SystemId, boolean>;

type Mode = "explore" | "live" | "study" | "guided";
type GuidedView = "library" | "detail" | "tutorial" | "practice";
type Action = { type: "incision"; id: number } | { type: "remove"; partId: string };

const TOOLS: { id: Tool; icon: IconName }[] = [
  { id: "explore", icon: "explore" },
  { id: "scalpel", icon: "scalpel" },
  { id: "retractor", icon: "retractor" },
  { id: "forceps", icon: "forceps" },
  { id: "clamp", icon: "clamp" },
  { id: "suture", icon: "suture" },
];

const MODES: { id: Mode; icon: IconName; key: StringKey; active: string; dot: string }[] = [
  { id: "explore", icon: "explore", key: "modeExplore", active: "bg-teal-400/15 text-teal-100 ring-teal-300/30", dot: "bg-teal-400" },
  { id: "live", icon: "live", key: "modeLive", active: "bg-rose-400/15 text-rose-100 ring-rose-300/30", dot: "bg-rose-400" },
  { id: "study", icon: "study", key: "modeStudy", active: "bg-sky-400/15 text-sky-100 ring-sky-300/30", dot: "bg-sky-400" },
  { id: "guided", icon: "surgery", key: "modeGuided", active: "bg-amber-400/15 text-amber-100 ring-amber-300/30", dot: "bg-amber-400" },
];

const readPref = <T extends string>(key: string, fallback: T, allowed: T[]): T => {
  try {
    const v = window.localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const writePref = (key: string, v: string) => {
  try {
    window.localStorage.setItem(key, v);
  } catch {
    /* storage unavailable */
  }
};

const re = (src: string | undefined) => (src ? new RegExp(src, "i") : null);

export default function SurgeryLab() {
  const [lang, setLangState] = useState<Lang>(() => readPref<Lang>("lab.lang", "bn", ["en", "bn"]));
  const [quality, setQualityState] = useState<"high" | "low">(() => readPref("lab.quality", "high", ["high", "low"]));
  const [sex, setSex] = useState<Sex>("male");
  const [mode, setMode] = useState<Mode>("explore");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleSystems, setVisibleSystems] = useState(ALL_SYSTEMS);
  const [skinOpacity, setSkinOpacity] = useState(1);
  const [slice, setSlice] = useState<Slice>({ enabled: false, axis: "z", pos: 0.02, flip: false });
  const [tool, setTool] = useState<Tool>("explore");
  const [studyTool, setStudyTool] = useState<Tool>("explore");
  const [cutDepth, setCutDepth] = useState<CutDepth>("layer");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const [incisions, setIncisions] = useState<IncisionInfo[]>([]);
  const [history, setHistory] = useState<Action[]>([]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState(0);
  const [liveUi, setLiveUi] = useState<LiveUi>({
    process: "digestion",
    step: 0,
    playing: true,
    auto: false,
    bpm: 72,
    breathRate: 14,
    speed: 1,
    fade: true,
  });
  const [subject, setSubject] = useState<StudySubject | null>(null);
  const [studyUi, setStudyUi] = useState<StudyUi>({ explode: 0, labels: false, turntable: false });
  const [guidedView, setGuidedView] = useState<GuidedView>("library");
  const [surgeryId, setSurgeryId] = useState<string | null>(null);
  const [tutStep, setTutStep] = useState(0);
  const [tutPlaying, setTutPlaying] = useState(false);
  const api = useRef<SceneApi | null>(null);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 768);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const [loadedSystems, setLoadedSystems] = useState<SystemId[]>([]);
  const onSystemLoaded = useCallback((s: SystemId) => setLoadedSystems((l) => (l.includes(s) ? l : [...l, s])), []);

  const setLang = (l: Lang) => {
    setLangState(l);
    writePref("lab.lang", l);
  };
  const setQuality = (q: "high" | "low") => {
    setQualityState(q);
    writePref("lab.quality", q);
  };

  useEffect(() => {
    let alive = true;
    fetch(MANIFEST_URL[sex])
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m) => alive && setManifest(m))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [sex]);

  useEffect(() => sfx.setMuted(muted), [muted]);

  const partsById = useMemo(
    () => new Map((manifest?.parts ?? []).map((p) => [p.id, p] as [string, BodyPart])),
    [manifest],
  );
  const counts = useMemo(() => {
    const c: Partial<Record<SystemId, number>> = {};
    for (const p of manifest?.parts ?? []) c[p.system] = (c[p.system] ?? 0) + 1;
    return c;
  }, [manifest]);
  const groups = useMemo(() => manifest?.groups ?? [], [manifest]);

  const appendectomy = useAppendectomy({ api, partsById, incisions, setRemoved });
  const procedure = useProcedure({ api, partsById, incisions, setRemoved });
  const openAppendix = surgeryId === "appendicectomy-open";
  // the open appendicectomy has its own staged script; every other procedure runs from lib/practice.ts
  const guided = openAppendix ? appendectomy : procedure;
  const practicing = mode === "guided" && guidedView === "practice";
  const step = practicing ? guided.step : null;

  useEffect(() => {
    if (!practicing || !guided.active || guided.state?.finishedAt) return;
    const id = window.setInterval(() => setNow(performance.now()), 500);
    return () => window.clearInterval(id);
  }, [practicing, guided.active, guided.state?.finishedAt]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((x) => (x === msg ? null : x)), 2800);
  }, []);

  const totalSystems = manifest ? Object.keys(manifest.systems).length : 1;
  const progress = Math.round((loadedSystems.length / totalSystems) * 100);
  const loading = !manifest || loadedSystems.length < totalSystems;

  /* ---------------- live mode ---------------- */

  const liveProcess = PROCESSES.find((p) => p.id === liveUi.process)!;
  const liveStep = liveProcess.steps[liveUi.step] ?? null;
  const liveConfig: LiveConfig | null = useMemo(
    () =>
      mode === "live"
        ? {
            process: liveProcess,
            step: liveStep,
            bpm: liveUi.bpm,
            breathRate: liveUi.breathRate,
            speed: liveUi.playing ? liveUi.speed : 0,
            fade: liveUi.fade,
          }
        : null,
    [mode, liveProcess, liveStep, liveUi.bpm, liveUi.breathRate, liveUi.playing, liveUi.speed, liveUi.fade],
  );

  // move the camera to what the current step talks about
  useEffect(() => {
    if (mode !== "live" || !liveStep?.focus) return;
    const id = window.setTimeout(() => api.current?.focusMatch(liveStep.focus!.match, liveStep.focus!.distance), 150);
    return () => window.clearTimeout(id);
  }, [mode, liveStep, loadedSystems.length]);

  // steps that demonstrate a heart / breathing rate (exercise, adrenaline…) set it; leaving them restores rest
  const ratedBefore = useRef(false);
  useEffect(() => {
    if (mode !== "live") return;
    const rates = liveStep?.rates;
    if (!rates && !ratedBefore.current) return;
    const id = window.setTimeout(() => {
      if (rates) {
        ratedBefore.current = true;
        setLiveUi((u) => ({ ...u, bpm: rates.bpm ?? u.bpm, breathRate: rates.breathRate ?? u.breathRate }));
      } else {
        ratedBefore.current = false;
        setLiveUi((u) => ({ ...u, bpm: 72, breathRate: 14 }));
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [mode, liveStep]);

  // automatic narrated tour
  useEffect(() => {
    if (mode !== "live" || !liveUi.auto || !liveUi.playing) return;
    const id = window.setInterval(
      () => setLiveUi((u) => ({ ...u, step: (u.step + 1) % (PROCESSES.find((p) => p.id === u.process)?.steps.length ?? 1) })),
      12000,
    );
    return () => window.clearInterval(id);
  }, [mode, liveUi.auto, liveUi.playing, liveUi.process]);

  // does this body model have the routes the current step animates?
  const [pathsMissing, setPathsMissing] = useState(false);
  useEffect(() => {
    if (mode !== "live" || loading || !liveStep?.trains?.length) {
      const id = window.setTimeout(() => setPathsMissing(false), 0);
      return () => window.clearTimeout(id);
    }
    const ids = [...new Set(liveStep.trains.map((x) => x.path))];
    const id = window.setTimeout(() => setPathsMissing(!(api.current?.hasPaths(ids) ?? true)), 350);
    return () => window.clearTimeout(id);
  }, [mode, loading, liveStep, sex]);

  /* ---------------- study mode ---------------- */

  const studyMembers = useMemo(() => {
    if (!subject) return [] as string[];
    if (subject.kind === "part") return [subject.id];
    return groups.find((g) => g.key === subject.key)?.members ?? [];
  }, [subject, groups]);

  useEffect(() => {
    if (mode !== "study" || !studyMembers.length) return;
    const id = window.setTimeout(() => api.current?.focusIds(studyMembers), 150);
    return () => window.clearTimeout(id);
  }, [mode, studyMembers]);

  const labels: Label[] = useMemo(() => {
    if (mode !== "study" || !studyUi.labels || studyMembers.length < 2) return [];
    return studyMembers
      .map((id) => partsById.get(id))
      .filter(Boolean)
      .sort((a, b) => Math.max(...b!.size) - Math.max(...a!.size))
      .slice(0, 14)
      .map((p) => ({ id: p!.id, text: p!.name, sub: lang === "bn" ? bnLabel(p!) : undefined }));
  }, [mode, studyUi.labels, studyMembers, partsById, lang]);

  /* ---------------- guided: tutorial ---------------- */

  const surgery = surgeryId ? SURGERY_BY_ID[surgeryId] ?? null : null;
  const inTutorial = mode === "guided" && guidedView === "tutorial" && !!surgery;
  const tutorialStep = inTutorial ? surgery.steps[Math.min(tutStep, surgery.steps.length - 1)] : null;

  useEffect(() => {
    const a = api.current;
    if (!inTutorial || !surgery || !tutorialStep || loading) {
      a?.setSpotlight(null);
      a?.showPlan(null);
      return;
    }
    const focus = tutorialStep.focus ?? surgery.focus;
    const id = window.setTimeout(() => {
      const api2 = api.current;
      if (!api2) return;
      api2.setSpotlight(re(tutorialStep.highlight));
      api2.showPlan(tutorialStep.plan ?? null);
      api2.focusMatch(new RegExp(focus.match, "i"), focus.distance * 1.55);
    }, 160);
    return () => window.clearTimeout(id);
  }, [inTutorial, surgery, tutorialStep, loading]);

  // clear markings when leaving the tutorial
  useEffect(
    () => () => {
      api.current?.setSpotlight(null);
      api.current?.showPlan(null);
    },
    [],
  );

  useEffect(() => {
    if (!inTutorial || !tutPlaying || !surgery) return;
    const id = window.setInterval(() => {
      setTutStep((s) => {
        if (s >= surgery.steps.length - 1) {
          setTutPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 14000);
    return () => window.clearInterval(id);
  }, [inTutorial, tutPlaying, surgery]);

  const tutorialSystems = useMemo(() => {
    if (!surgery) return ALL_SYSTEMS;
    const v = { ...NO_SYSTEMS, integumentary: true };
    for (const s of tutorialStep?.show ?? surgery.show) v[s] = true;
    return v;
  }, [surgery, tutorialStep]);

  /* ---------------- selection & free-mode actions ---------------- */

  const select = useCallback(
    (id: string) => {
      const part = partsById.get(id);
      if (!part) return;
      setSelectedId(id);
      if (mode === "explore") {
        setVisibleSystems((v) => (v[part.system] ? v : { ...v, [part.system]: true }));
        api.current?.focus(id);
      }
    },
    [partsById, mode],
  );

  const removePart = useCallback(
    (id: string) => {
      setRemoved((r) => (r.includes(id) ? r : [...r, id]));
      setHistory((h) => [...h, { type: "remove", partId: id }]);
      setSelectedId((s) => (s === id ? null : s));
      flash(partsById.get(id)?.name ?? id);
    },
    [flash, partsById],
  );

  const { handlers: gh } = guided;
  const guidedOn = practicing && guided.active;

  const onPick = useCallback(
    (hit: PlainHit) => {
      if (guidedOn && gh.onPick(hit)) return;
      select(hit.partId);
    },
    [guidedOn, gh, select],
  );
  const onIncisionMade = useCallback(
    (info: IncisionInfo) => {
      if (guidedOn && gh.onIncisionMade(info)) return;
      api.current?.animateOpen(info.id, 0.008, 0.7);
      setHistory((h) => [...h, { type: "incision", id: info.id }]);
      flash(`${info.layers[0]} · ${(info.length * 100).toFixed(1)} cm${info.layers.length > 1 ? ` (+${info.layers.length - 1})` : ""}`);
    },
    [guidedOn, gh, flash],
  );
  const onForceps = useCallback(
    (hit: PlainHit) => {
      if (guidedOn && gh.onForceps(hit)) return;
      removePart(hit.partId);
    },
    [guidedOn, gh, removePart],
  );
  const onClamp = useCallback(
    (hit: PlainHit) => {
      if (guidedOn && gh.onClamp(hit)) return;
      const travel: V3 = norm(cross(hit.normal, [0, 1, 0]));
      api.current?.placeInstrument("clamp", hit.point, hit.normal, travel, hit.partId);
      flash(partsById.get(hit.partId)?.name ?? "");
    },
    [guidedOn, gh, flash, partsById],
  );
  const onTie = useCallback((hit: PlainHit) => void (guidedOn && gh.onTie(hit)), [guidedOn, gh]);
  const onRetracted = useCallback((strokes: number[]) => void (guidedOn && gh.onRetracted(strokes)), [guidedOn, gh]);
  const onSutured = useCallback(
    (info: SutureInfo) => {
      if (guidedOn && gh.onSutured(info)) return;
      flash(info.complete ? "✓" : `${Math.round(info.coverage * 100)}%`);
    },
    [guidedOn, gh, flash],
  );

  const undo = useCallback(() => {
    if (mode !== "explore") return;
    setHistory((h) => {
      const last = h[h.length - 1];
      if (!last) return h;
      if (last.type === "incision") api.current?.removeIncision(last.id);
      else setRemoved((r) => r.filter((x) => x !== last.partId));
      return h.slice(0, -1);
    });
  }, [mode]);

  const resetAll = useCallback(() => {
    api.current?.clearIncisions();
    api.current?.resetPositions();
    setRemoved([]);
    setHistory([]);
    setIsolatedId(null);
  }, []);

  /* ---------------- mode, body and surgery navigation ---------------- */

  const stopPractice = useCallback(() => {
    appendectomy.exit();
    procedure.exit();
    resetAll();
  }, [appendectomy, procedure, resetAll]);

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    if (practicing) stopPractice();
    setSelectedId(null);
    setSlice((s) => ({ ...s, enabled: false }));
    setMode(m);
    if (m === "guided") {
      setSkinOpacity(1);
      if (guidedView === "practice") setGuidedView("detail");
      if (guidedView === "library") api.current?.view("torso");
    }
    if (m === "explore") {
      api.current?.view("torso");
    }
    if (m === "live") setPanelOpen(true);
  };

  const switchSex = (s: Sex) => {
    if (s === sex) return;
    if (practicing) {
      appendectomy.exit();
      procedure.exit();
      setGuidedView("detail");
    }
    setManifest(null);
    setError(null);
    setLoadedSystems([]);
    setSelectedId(null);
    setHoveredId(null);
    setRemoved([]);
    setHistory([]);
    setIncisions([]);
    setIsolatedId(null);
    setSubject(null);
    setSex(s);
  };

  const openSurgery = (id: string) => {
    setSurgeryId(id);
    setGuidedView("detail");
    setSelectedId(null);
  };

  /** Make sure the body model fits the procedure (some are female- or male-only). */
  const ensureBody = (need: "any" | "male" | "female") => {
    if (need === "any" || need === sex) return false;
    flash(t(lang, need === "female" ? "needFemaleBody" : "needMaleBody"));
    switchSex(need);
    return true;
  };

  const startTutorial = (stepIndex: number) => {
    if (!surgery) return;
    ensureBody(surgery.body);
    if (practicing) stopPractice();
    setTutStep(stepIndex);
    setTutPlaying(false);
    setGuidedView("tutorial");
    setSelectedId(null);
  };

  const beginScript = () => {
    if (!surgery) return false;
    return surgery.id === "appendicectomy-open" ? appendectomy.start() : procedure.start(PRACTICE[surgery.id]);
  };

  const startPractice = () => {
    if (!surgery || !hasPractice(surgery.id)) return;
    ensureBody(PRACTICE[surgery.id]?.body ?? surgery.body);
    setGuidedView("practice");
    setSelectedId(null);
    setSkinOpacity(1);
    resetAll();
    // wait for the body to be (re)loaded, then stage the procedure
    let tries = 0;
    const tryStart = () => {
      if (beginScript()) return;
      if (++tries < 40) window.setTimeout(tryStart, 250);
      else {
        flash(t(lang, "loading"));
        setGuidedView("detail");
      }
    };
    window.setTimeout(tryStart, 80);
  };

  const leavePractice = () => {
    stopPractice();
    setGuidedView(surgery ? "detail" : "library");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setIsolatedId(null);
        setSettingsOpen(false);
      } else if (!e.ctrlKey && !e.metaKey && mode === "explore") {
        const tl = TOOLS[Number(e.key) - 1]?.id;
        if (tl) setTool(tl);
      } else if (!e.ctrlKey && !e.metaKey && inTutorial && surgery) {
        if (e.key === "ArrowRight") setTutStep((s) => Math.min(surgery.steps.length - 1, s + 1));
        if (e.key === "ArrowLeft") setTutStep((s) => Math.max(0, s - 1));
      } else if (!e.ctrlKey && !e.metaKey && mode === "live") {
        const n = PROCESSES.find((p) => p.id === liveUi.process)!.steps.length;
        if (e.key === "ArrowRight") setLiveUi((u) => ({ ...u, step: (u.step + 1) % n }));
        if (e.key === "ArrowLeft") setLiveUi((u) => ({ ...u, step: (u.step - 1 + n) % n }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, mode, inTutorial, surgery, liveUi.process]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = manifest?.parts ?? [];
    const list = q ? all.filter((p) => p.name.toLowerCase().includes(q) || bnLabel(p).includes(q)) : all;
    return list.slice(0, 80);
  }, [manifest, query]);

  /* ---------------- derived scene props ---------------- */

  const selected = selectedId ? partsById.get(selectedId) ?? null : null;
  const hovered = hoveredId ? partsById.get(hoveredId) ?? null : null;
  const gs = guided.state;
  const finished = practicing && !!gs?.finishedAt;
  const score = gs ? Math.max(0, 100 - gs.mistakes * 6) : 0;
  const stepInside = !!(step && "inside" in step && step.inside);
  const tieMode = !!step && (("tie" in step && !!step.tie) || step.id === "ligate");

  const practiceView: PracticeView | null = (() => {
    if (!gs) return null;
    const common = {
      stepIndex: gs.step,
      mistakes: gs.mistakes,
      elapsed: (gs.finishedAt ?? (now || gs.startedAt)) - gs.startedAt,
      feedback: gs.feedback,
      finished,
      score,
    };
    if (openAppendix) {
      const s = APPENDECTOMY[gs.step];
      return {
        ...common,
        title: { en: "Open appendicectomy", bn: "ওপেন অ্যাপেন্ডেক্টমি" },
        subtitle: { en: "Gridiron incision", bn: "গ্রিডআয়রন ইনসিশন" },
        steps: APPENDECTOMY.map((x) => ({ title: { en: x.title, bn: x.bn } })),
        current: s
          ? {
              title: { en: s.title, bn: s.bn },
              text: { en: s.instruction, bn: s.bnInstruction },
              note: s.note ? { en: s.note, bn: s.note } : undefined,
            }
          : null,
      };
    }
    const cur = procedure.step;
    return {
      ...common,
      title: surgery?.name ?? { en: "", bn: "" },
      subtitle: surgery?.summary,
      steps: procedure.steps.map((x) => ({ title: x.title })),
      current: cur ? { title: cur.title, text: cur.text, note: cur.note } : null,
    };
  })();

  const insideSystems = useMemo(() => {
    const v = { ...NO_SYSTEMS, integumentary: true };
    for (const s of surgery?.show ?? []) v[s] = true;
    return v;
  }, [surgery]);

  const activeTool: Tool = mode === "explore" ? tool : mode === "study" ? studyTool : practicing && step ? step.tool : "explore";
  const isolatedIds = mode === "study" && studyMembers.length ? studyMembers : mode === "explore" && isolatedId ? [isolatedId] : null;
  const sceneSystems =
    mode === "study" ? ALL_SYSTEMS : inTutorial ? tutorialSystems : practicing ? (stepInside ? insideSystems : ALL_SYSTEMS) : visibleSystems;
  const sceneSkin =
    mode === "study" ? 1 : inTutorial ? (tutorialStep?.plan ? 0.92 : 0.05) : practicing ? (stepInside ? 0.06 : 1) : skinOpacity;
  const layerList = activeTool === "scalpel" ? layers : [];
  const explode = useMemo(
    () => (mode === "study" && studyMembers.length > 1 ? { ids: studyMembers, amount: studyUi.explode } : null),
    [mode, studyMembers, studyUi.explode],
  );
  const hint = t(lang, `hint_${activeTool}` as StringKey);
  const showTools = mode === "explore" || practicing;
  const showRight = !!selected || listOpen;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#070b10] text-slate-100">
      <div className="absolute inset-0">
        {manifest && (
          <BodyScene
            key={sex}
            manifest={manifest}
            visibleSystems={sceneSystems}
            skinOpacity={sceneSkin}
            slice={slice}
            tool={activeTool}
            instrument={step ? step.instrument : undefined}
            cutDepth={practicing ? "layer" : mode === "study" ? "layer" : cutDepth}
            sutureMode={tieMode ? "tie" : "close"}
            selectedId={selectedId}
            removed={removed}
            isolatedIds={isolatedIds}
            live={liveConfig}
            explode={explode}
            labels={labels}
            autoRotate={mode === "study" && studyUi.turntable}
            quality={quality}
            viewShift={panelOpen && wide ? 190 : 0}
            onLabelClick={select}
            apiRef={api}
            onHover={setHoveredId}
            onPick={onPick}
            onForceps={onForceps}
            onClamp={onClamp}
            onTie={onTie}
            onIncisionMade={onIncisionMade}
            onRetracted={onRetracted}
            onSutured={onSutured}
            onIncisions={setIncisions}
            onSystemLoaded={onSystemLoaded}
            onLayers={setLayers}
          />
        )}
      </div>

      {/* soft vignette so the floating UI always has contrast */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(3,6,10,0.55)_100%)]" />

      {loading && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-[#070b10]/88 backdrop-blur-md">
          <div className="w-72 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-lg shadow-teal-500/25">
              <Icon name="cross" size={24} />
            </div>
            <div className="mt-4 text-sm font-medium text-slate-200">{error ? `Error: ${error}` : t(lang, "loading")}</div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 transition-all" style={{ width: `${Math.max(6, progress)}%` }} />
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {sex === "female" ? "Human Reference Atlas · Visible Human Female" : "BodyParts3D"}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- top bar ---------------- */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="pointer-events-auto glass flex h-12 items-center gap-3 rounded-2xl pl-2 pr-4">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow shadow-teal-500/30">
              <Icon name="cross" size={17} />
            </div>
            <div className="hidden leading-tight sm:block">
              <h1 className="text-[13.5px] font-semibold text-white">{t(lang, "appTitle")}</h1>
              <p className="text-[10.5px] text-slate-400">{t(lang, "brandSub")}</p>
            </div>
          </div>

          <nav className="pointer-events-auto glass flex h-12 items-center gap-1 rounded-2xl p-1.5">
            {MODES.map((m) => {
              const on = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => switchMode(m.id)}
                  aria-current={on ? "page" : undefined}
                  className={`flex h-9 items-center gap-2 rounded-xl px-3 text-[12.5px] font-medium ring-1 ring-inset transition ${
                    on ? m.active : "text-slate-400 ring-transparent hover:bg-white/[0.06] hover:text-slate-100"
                  }`}
                >
                  <Icon name={m.icon} size={16} />
                  <span className="hidden whitespace-nowrap lg:inline">{t(lang, m.key)}</span>
                </button>
              );
            })}
          </nav>

          <div className="pointer-events-auto relative flex items-center gap-2">
            <div className="glass hidden h-12 items-center gap-0.5 rounded-2xl p-1.5 sm:flex">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => switchSex(s)}
                  title={t(lang, s)}
                  className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition ${
                    sex === s ? (s === "male" ? "bg-sky-400/20 text-sky-100" : "bg-pink-400/20 text-pink-100") : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  <Icon name={s} size={15} />
                  <span className="hidden lg:inline">{t(lang, s)}</span>
                </button>
              ))}
            </div>
            <div className="glass flex h-12 items-center gap-0.5 rounded-2xl p-1.5">
              {(["en", "bn"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`h-9 rounded-xl px-2.5 text-xs font-semibold transition ${lang === l ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-100"}`}
                >
                  {l === "en" ? "EN" : "বাংলা"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              aria-label={t(lang, "settings")}
              title={t(lang, "settings")}
              className={`glass grid h-12 w-12 place-items-center rounded-2xl transition ${settingsOpen ? "text-white" : "text-slate-300 hover:text-white"}`}
            >
              <Icon name="settings" size={18} />
            </button>

            {settingsOpen && (
              <div className="glass fade-up absolute right-0 top-14 w-72 rounded-2xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{t(lang, "quality")}</div>
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-black/35 p-0.5 text-xs">
                  {(["high", "low"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`rounded-md py-1.5 font-medium transition ${quality === q ? "bg-teal-500/90 text-white" : "text-slate-300 hover:bg-white/5"}`}
                    >
                      {t(lang, q)}
                    </button>
                  ))}
                </div>
                <label className="mt-4 flex cursor-pointer items-center justify-between text-[13px] text-slate-200">
                  {t(lang, "sound")}
                  <input type="checkbox" checked={!muted} onChange={(e) => setMuted(!e.target.checked)} />
                </label>
                <div className="mt-4 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-slate-500">
                  <div className="mb-1 font-semibold uppercase tracking-wider text-slate-400">{t(lang, "sources")}</div>
                  {sex === "female"
                    ? "Human Reference Atlas (HuBMAP), Visible Human Female — CC BY 4.0"
                    : "BodyParts3D © The Database Center for Life Science — CC BY 4.0"}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- left panel ---------------- */}
      {panelOpen ? (
        <aside className="glass fade-up absolute inset-x-2 bottom-[5.25rem] z-20 flex max-h-[46%] flex-col rounded-2xl md:inset-x-auto md:bottom-[5.25rem] md:left-3 md:top-[4.75rem] md:max-h-none md:w-[23.5rem]">
          <div className="flex shrink-0 items-center justify-between px-4 pt-3">
            <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${MODES.find((m) => m.id === mode)!.dot} ${mode === "live" ? "live-dot" : ""}`} />
              {t(lang, MODES.find((m) => m.id === mode)!.key)}
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              title={t(lang, "hidePanel")}
              aria-label={t(lang, "hidePanel")}
              className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-white"
            >
              <Icon name="chevronLeft" size={16} />
            </button>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
            {mode === "guided" ? (
              guidedView === "practice" && gs && practiceView ? (
                <PracticePanel
                  lang={lang}
                  view={practiceView}
                  onShowMe={guided.showMe}
                  onRestart={() => {
                    resetAll();
                    beginScript();
                  }}
                  onExit={leavePractice}
                  onTutorial={() => {
                    stopPractice();
                    startTutorial(0);
                  }}
                />
              ) : guidedView === "tutorial" && surgery ? (
                <TutorialPanel
                  lang={lang}
                  surgery={surgery}
                  step={Math.min(tutStep, surgery.steps.length - 1)}
                  setStep={setTutStep}
                  playing={tutPlaying}
                  setPlaying={setTutPlaying}
                  onBack={() => {
                    setTutPlaying(false);
                    setGuidedView("detail");
                  }}
                  onPractice={startPractice}
                />
              ) : guidedView === "detail" && surgery ? (
                <SurgeryDetail lang={lang} surgery={surgery} onBack={() => setGuidedView("library")} onTutorial={startTutorial} onPractice={startPractice} />
              ) : guidedView === "practice" ? (
                <div className="py-10 text-center text-sm text-slate-400">{t(lang, "loading")}</div>
              ) : (
                <SurgeryLibrary lang={lang} sex={sex} onOpen={openSurgery} />
              )
            ) : mode === "live" ? (
              <LivePanel lang={lang} ui={liveUi} setUi={setLiveUi} pathsMissing={pathsMissing} />
            ) : mode === "study" ? (
              <StudyPanel
                lang={lang}
                groups={groups}
                partsById={partsById}
                subject={subject}
                setSubject={(s) => {
                  setSubject(s);
                  setSelectedId(null);
                  setStudyUi((u) => ({ ...u, explode: 0 }));
                  if (!s) api.current?.view("body");
                }}
                members={studyMembers}
                ui={studyUi}
                setUi={setStudyUi}
                tool={studyTool}
                setTool={setStudyTool}
                slice={slice}
                setSlice={setSlice}
                onSelect={select}
                selectedId={selectedId}
              />
            ) : (
              <FreePanel
                lang={lang}
                isFemale={sex === "female"}
                counts={counts}
                visibleSystems={visibleSystems}
                setVisibleSystems={setVisibleSystems}
                skinOpacity={skinOpacity}
                setSkinOpacity={setSkinOpacity}
                cutDepth={cutDepth}
                setCutDepth={setCutDepth}
                incisions={incisions}
                api={api}
                removed={removed}
                setRemoved={setRemoved}
                partsById={partsById}
                slice={slice}
                setSlice={setSlice}
                onReset={resetAll}
              />
            )}
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setPanelOpen(true)}
          className="glass fade-up absolute left-3 top-[4.75rem] z-20 flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium text-slate-200 hover:text-white"
        >
          <Icon name="layers" size={16} />
          {t(lang, "showPanel")}
        </button>
      )}

      {/* ---------------- right: structure details or list ---------------- */}
      {showRight && (
        <aside className="glass fade-up scroll-thin absolute right-3 top-[4.75rem] z-20 max-h-[calc(100%-10.5rem)] w-[min(21.5rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl p-4">
          {selected ? (
            <InfoPanel
              lang={lang}
              part={selected}
              onClose={() => setSelectedId(null)}
              actions={
                practicing || inTutorial ? null : (
                  <>
                    <button
                      onClick={() => api.current?.focus(selected.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] py-2 hover:bg-white/10"
                    >
                      <Icon name="focus" size={14} /> {t(lang, "focus")}
                    </button>
                    <button
                      onClick={() => {
                        const g = groups.find((gr) => gr.members.includes(selected.id) && gr.members.length < 130);
                        setMode("study");
                        setSubject(g ? { kind: "group", key: g.key } : { kind: "part", id: selected.id });
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500/20 py-2 text-sky-100 hover:bg-sky-500/30"
                    >
                      <Icon name="study" size={14} /> {t(lang, "study")}
                    </button>
                    {mode === "explore" ? (
                      <button
                        onClick={() => removePart(selected.id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/15 py-2 text-rose-200 hover:bg-rose-500/25"
                      >
                        <Icon name="forceps" size={14} /> {t(lang, "liftOut")}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setMode("study");
                          setSubject({ kind: "part", id: selected.id });
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] py-2 hover:bg-white/10"
                      >
                        {t(lang, "isolate")}
                      </button>
                    )}
                  </>
                )
              }
            />
          ) : (
            <div className="fade-up">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-white">{t(lang, "structures")}</h2>
                  <p className="text-xs text-slate-400">
                    {manifest?.parts.length ?? 0} {t(lang, "realStructures")}
                  </p>
                </div>
                <button onClick={() => setListOpen(false)} aria-label="Close" className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className="relative mt-3">
                <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(lang, "search")}
                  className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-[13px] outline-none placeholder:text-slate-500 focus:border-teal-400/60"
                />
              </div>
              <ul className="mt-2 space-y-0.5">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => select(p.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-white/[0.05] ${removed.includes(p.id) ? "line-through opacity-40" : ""}`}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SYSTEMS_BY_ID[p.system].color }} />
                      <span className="flex-1 truncate">{p.name}</span>
                      {lang === "bn" && <span className="shrink-0 text-[10px] text-slate-500">{bnLabel(p)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}

      {/* structures button (when nothing else is on the right) */}
      {!showRight && (
        <button
          onClick={() => setListOpen(true)}
          className="glass absolute right-3 top-[4.75rem] z-20 flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium text-slate-200 hover:text-white"
        >
          <Icon name="list" size={16} />
          <span className="hidden sm:inline">{t(lang, "structuresBtn")}</span>
        </button>
      )}

      {/* ---------------- layers under the blade ---------------- */}
      {layerList.length > 0 && (
        <div className="glass fade-up pointer-events-none absolute bottom-[6.2rem] right-3 z-20 w-[min(17.5rem,calc(100%-1.5rem))] rounded-2xl p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-rose-300">
            <Icon name="layers" size={13} />
            {t(lang, "layersTitle")}
          </div>
          <ol className="mt-2 space-y-1">
            {layerList.map((l, i) => {
              const firstUncut = layerList.findIndex((x) => !x.cut);
              const now = i === firstUncut;
              const part = partsById.get(l.partId);
              return (
                <li
                  key={l.partId}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] ${
                    now ? "bg-rose-500/20 text-white ring-1 ring-inset ring-rose-300/40" : l.cut ? "text-slate-500" : "text-slate-300"
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                      l.cut ? "bg-emerald-500/80 text-white" : now ? "bg-rose-500 text-white" : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {l.cut ? <Icon name="check" size={10} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {l.name}
                    {lang === "bn" && part && <span className="ml-1 text-[10px] text-slate-500">{bnLabel(part)}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider">
                    {l.cut ? t(lang, "layerCut") : now ? t(lang, "layerNow") : t(lang, "layerNext")}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ---------------- bottom: hint + dock ---------------- */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-col items-center gap-2">
        <div className="glass max-w-full rounded-full px-4 py-1.5 text-center text-[12px] text-slate-300">
          {hovered ? (
            <>
              <b className="font-semibold text-white">{hovered.name}</b>
              <span className="ml-1.5 text-slate-400">{bnLabel(hovered)}</span>
              <span className="ml-2 text-slate-500">· {tr(lang, SYSTEMS_BY_ID[hovered.system].name)}</span>
            </>
          ) : mode === "live" && liveStep ? (
            <span className="text-rose-200">{tr(lang, liveStep.title)}</span>
          ) : inTutorial && surgery && tutorialStep ? (
            <span className="text-amber-200">
              {tutStep + 1}/{surgery.steps.length} · {tr(lang, tutorialStep.title)}
            </span>
          ) : practiceView?.current ? (
            <span className="text-emerald-200">{tr(lang, practiceView.current.title)}</span>
          ) : (
            hint
          )}
        </div>

        <div className="pointer-events-auto glass flex items-center gap-1 rounded-2xl p-1.5">
          {showTools &&
            TOOLS.map((tl, i) => {
              const isActive = activeTool === tl.id;
              const locked = practicing && !isActive;
              return (
                <button
                  key={tl.id}
                  onClick={() => setTool(tl.id)}
                  disabled={practicing}
                  title={`${t(lang, `tool_${tl.id}` as StringKey)} (${i + 1})`}
                  className={`relative flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition ${
                    isActive
                      ? tl.id === "scalpel"
                        ? "bg-rose-500/90 text-white shadow shadow-rose-900/40"
                        : "bg-teal-500/90 text-white shadow shadow-teal-900/40"
                      : "text-slate-300 hover:bg-white/[0.08]"
                  } ${locked ? "opacity-30" : ""}`}
                >
                  <Icon name={tl.icon} size={17} />
                  <span className="hidden text-[9.5px] font-medium leading-none sm:block">{t(lang, `tool_${tl.id}` as StringKey)}</span>
                </button>
              );
            })}
          {showTools && <span className="mx-1 h-7 w-px bg-white/10" />}
          <button
            onClick={() => api.current?.view("torso")}
            className="flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-slate-300 hover:bg-white/[0.08]"
          >
            <Icon name="torso" size={17} />
            <span className="hidden text-[9.5px] font-medium leading-none sm:block">{t(lang, "torso")}</span>
          </button>
          <button
            onClick={() => api.current?.view("body")}
            className="flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-slate-300 hover:bg-white/[0.08]"
          >
            <Icon name="body" size={17} />
            <span className="hidden text-[9.5px] font-medium leading-none sm:block">{t(lang, "body")}</span>
          </button>
          {mode === "explore" && (
            <button
              onClick={undo}
              disabled={!history.length}
              className="flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-slate-300 hover:bg-white/[0.08] disabled:opacity-30"
            >
              <Icon name="undo" size={17} />
              <span className="hidden text-[9.5px] font-medium leading-none sm:block">{t(lang, "undo")}</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2">
          <div className="glass fade-up pointer-events-auto flex items-center gap-3 rounded-full px-4 py-2 text-[13px] text-slate-100">
            {toast}
            {mode === "explore" && history.length > 0 && (
              <button onClick={undo} className="text-xs font-semibold text-teal-300 hover:underline">
                {t(lang, "undo")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
