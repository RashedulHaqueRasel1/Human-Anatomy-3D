"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Html, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, Vignette } from "@react-three/postprocessing";
import {
  BodyEngine,
  type CutDepth,
  type Hit,
  type IncisionInfo,
  type LayerInfo,
  type Landmarks,
  type LiveConfig,
  type Marker,
  type PlainHit,
  type PracticeEffect,
  type SkinPlan,
  type SutureInfo,
} from "@/lib/engine";
import type { InstrumentKind } from "@/lib/instruments";
import type { BodyPart, Manifest, SystemId, V3 } from "@/lib/body";
import type { Slice, Tool } from "@/lib/lab";
import { sfx } from "@/lib/sfx";

export type SceneApi = {
  focus: (id: string) => void;
  focusPoint: (point: V3, distance: number) => void;
  view: (preset: "torso" | "body") => void;
  setOpen: (stroke: number, open: number) => void;
  removeIncision: (stroke: number) => void;
  clearIncisions: () => void;
  landmarks: () => Landmarks | null;
  showMarkers: (markers: Marker[]) => void;
  showGuide: (points: V3[] | null) => void;
  placeInstrument: (kind: InstrumentKind, point: V3, normal: V3, travel: V3, attachTo?: string) => number;
  placeLigature: (point: V3, axis: V3, radius: number, attachTo?: string) => number;
  placeRetractors: (stroke: number) => void;
  deliver: (partId: string, anchor: V3, target: V3) => void;
  movedPoint: (partId: string, point: V3) => V3;
  resetPositions: () => void;
  /** Frames every visible structure whose name matches. */
  focusMatch: (re: RegExp, distance: number) => void;
  focusIds: (ids: string[]) => void;
  /** Pulsing highlight on every structure whose name matches (tutorial steps). */
  setSpotlight: (re: RegExp | null) => void;
  /** Incision lines and port sites drawn on the skin. */
  showPlan: (plan: SkinPlan | null) => void;
  /** Whether this body model has all the named particle paths (food, urine…). */
  hasPaths: (ids: string[]) => boolean;
  /** Eases a wound open over a moment. */
  animateOpen: (stroke: number, to: number, seconds?: number) => void;
  /** World centre of the structures whose name matches. */
  matchCenter: (re: RegExp) => V3 | null;
  /** What lies beneath a surface point, from the surface inwards. */
  layersBelow: (point: V3, normal: V3) => LayerInfo[];
  /** Skin plan resolved to world points and lines. */
  planWorld: (plan: SkinPlan) => { points: V3[]; lines: V3[][] };
  /** Instrument / implant / mesh left on a structure after a practice action. */
  applyEffect: (effect: PracticeEffect, partId: string, point: V3, normal: V3) => void;
};

export type Label = { id: string; text: string; sub?: string };

const VIEWS: Record<"torso" | "body", { camera: V3; target: V3 }> = {
  torso: { camera: [0.15, 1.3, 1.25], target: [0, 1.12, 0] },
  body: { camera: [0, 1.0, 3.4], target: [0, 0.88, 0] },
};

const INSTRUMENT_FOR: Record<Tool, InstrumentKind | null> = {
  explore: null,
  scalpel: "scalpel",
  retractor: "retractor",
  forceps: "forceps",
  clamp: "clamp",
  suture: "needle",
};

type Props = {
  manifest: Manifest;
  visibleSystems: Record<SystemId, boolean>;
  skinOpacity: number;
  slice: Slice;
  tool: Tool;
  /** Overrides the instrument drawn for the tool (e.g. Babcock instead of tissue forceps). */
  instrument?: InstrumentKind | null;
  cutDepth: CutDepth;
  /** "tie": the needle holder ties a ligature on click instead of sewing a wound. */
  sutureMode: "close" | "tie";
  selectedId: string | null;
  removed: string[];
  isolatedIds: string[] | null;
  live: LiveConfig | null;
  explode: { ids: string[]; amount: number } | null;
  labels: Label[];
  autoRotate: boolean;
  quality: "high" | "low";
  /** Pixels to shift the view centre to the right, so the body sits clear of the side panel. */
  viewShift: number;
  onLabelClick: (id: string) => void;
  apiRef: RefObject<SceneApi | null>;
  onHover: (id: string | null) => void;
  onPick: (hit: PlainHit) => void;
  onForceps: (hit: PlainHit) => void;
  onClamp: (hit: PlainHit) => void;
  onTie: (hit: PlainHit) => void;
  onIncisionMade: (info: IncisionInfo) => void;
  onRetracted: (strokes: number[]) => void;
  onSutured: (info: SutureInfo) => void;
  onIncisions: (list: IncisionInfo[]) => void;
  onSystemLoaded: (system: SystemId) => void;
  /** Structures under the scalpel (surface inwards), reported while the scalpel is the active tool. */
  onLayers: (layers: LayerInfo[]) => void;
};

export default function BodyScene(props: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      performance={{ min: 0.6, debounce: 250 }}
      camera={{ position: VIEWS.torso.camera, fov: 40, near: 0.01, far: 30 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}

const toV3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
const plain = (h: Hit): PlainHit => ({ partId: h.partId, point: toV3(h.point), normal: toV3(h.normal) });
const vec = (a: V3) => new THREE.Vector3(...a);

function SceneContent(props: Props) {
  const { manifest, visibleSystems, skinOpacity, slice, tool, instrument, selectedId, removed, isolatedIds, apiRef, live, explode } = props;
  const [engine] = useState(() => new BodyEngine());
  const rig = useRef<CameraRigHandle>(null);

  useEffect(() => engine.setIncisionListener(props.onIncisions), [engine, props.onIncisions]);
  useEffect(() => engine.setVisibility(visibleSystems, isolatedIds, removed), [engine, visibleSystems, isolatedIds, removed]);
  useEffect(() => engine.setLive(live), [engine, live]);
  useEffect(() => engine.setExplode(explode?.ids ?? null, explode?.amount ?? 0), [engine, explode]);
  useEffect(() => engine.setSkinOpacity(skinOpacity), [engine, skinOpacity]);
  useEffect(() => engine.setDetail(props.quality === "high"), [engine, props.quality]);
  useEffect(() => engine.setSlice(slice), [engine, slice]);
  useEffect(() => engine.setSelected(selectedId), [engine, selectedId]);
  useEffect(
    () => engine.setCursorInstrument(instrument !== undefined ? instrument : INSTRUMENT_FOR[tool]),
    [engine, tool, instrument],
  );
  useEffect(() => () => engine.dispose(), [engine]);

  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    if (props.viewShift) cam.setViewOffset(size.width, size.height, -props.viewShift, 0, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, props.viewShift]);

  useEffect(() => {
    apiRef.current = {
      focus: (id) => {
        const b = engine.partBounds(id);
        if (b) rig.current?.focus(b.center, Math.max(b.size.x, b.size.y, b.size.z));
      },
      focusPoint: (p, d) => rig.current?.focus(vec(p), d / 2.6),
      view: (preset) => rig.current?.goTo(VIEWS[preset]),
      setOpen: (id, open) => engine.setOpen(id, open),
      removeIncision: (id) => engine.removeIncision(id),
      clearIncisions: () => engine.clearIncisions(),
      landmarks: () => engine.computeLandmarks(),
      showMarkers: (m) => engine.showMarkers(m),
      showGuide: (p) => engine.showGuide(p),
      placeInstrument: (kind, p, n, t, attach) => engine.placeInstrument(kind, vec(p), vec(n), vec(t), attach),
      placeLigature: (p, axis, r, attach) => engine.placeLigature(vec(p), vec(axis), r, attach),
      placeRetractors: (s) => engine.placeRetractors(s),
      deliver: (id, a, t) => engine.deliver(id, a, t),
      movedPoint: (id, p) => engine.movedPoint(id, p),
      resetPositions: () => engine.resetPositions(),
      focusIds: (ids) => {
        const b = engine.boundsOf(ids);
        if (b) rig.current?.focus(b.center, Math.max(b.size.x, b.size.y, b.size.z) * 1.3);
      },
      focusMatch: (re, d) => {
        const b = engine.matchBounds(re);
        if (b) rig.current?.focus(b.center, d / 2.6);
      },
      setSpotlight: (re) => engine.setSpotlight(re),
      showPlan: (plan) => engine.showPlan(plan),
      hasPaths: (ids) => engine.hasPaths(ids),
      animateOpen: (stroke, to, seconds) => engine.animateOpen(stroke, to, seconds),
      matchCenter: (re) => engine.matchCenter(re),
      layersBelow: (point, normal) => engine.layersBelow(point, normal),
      planWorld: (plan) => engine.planWorld(plan),
      applyEffect: (effect, partId, point, normal) => engine.applyEffect(effect, partId, point, normal),
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, engine]);

  useFrame((state, dt) => engine.update(Math.min(dt, 0.05), state.clock.elapsedTime));

  const partsBySystem = useMemo(() => {
    const m = new Map<SystemId, BodyPart[]>();
    for (const p of manifest.parts) m.set(p.system, [...(m.get(p.system) ?? []), p]);
    return m;
  }, [manifest]);

  const handsOn = tool !== "explore" && tool !== "forceps";

  return (
    <>
      <color attach="background" args={["#0b1418"]} />
      <fog attach="fog" args={["#0b1418", 4, 12]} />

      {/* Operating-theatre lighting: big soft overhead panels + a warm surgical lamp */}
      <Environment resolution={256} frames={1}>
        {/* pale theatre walls: what polished steel reflects */}
        <color attach="background" args={["#56616b"]} />
        <Lightformer form="rect" intensity={0.6} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#2b3a40" />
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 1]} rotation-x={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-4, 2, 2]} rotation-y={Math.PI / 2} scale={[3, 3, 1]} color="#cfe8ff" />
        <Lightformer form="rect" intensity={0.8} position={[4, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[3, 3, 1]} />
        <Lightformer form="ring" intensity={3} position={[0.6, 2.5, 2.5]} scale={0.8} color="#fff4e0" />
      </Environment>
      <hemisphereLight args={["#e6f2ff", "#2a1d1d", 0.35]} />
      <directionalLight position={[1.5, 3.5, 2.5]} intensity={1.6} color="#fff6ea" />
      <spotLight position={[0.3, 2.6, 1.6]} angle={0.45} penumbra={0.6} intensity={18} color="#fffaf0" />

      <primitive object={engine.root} />

      {[...partsBySystem.entries()].map(([system, parts]) => {
        const file = manifest.systems[system]?.file;
        if (!file) return null;
        return (
          <Suspense key={system} fallback={null}>
            <SystemLoader engine={engine} system={system} file={file} parts={parts} onLoaded={props.onSystemLoaded} />
          </Suspense>
        );
      })}

      <mesh rotation-x={-Math.PI / 2} position-y={-0.001} raycast={() => null}>
        <circleGeometry args={[0.9, 64]} />
        <meshStandardMaterial color="#132027" roughness={0.9} />
      </mesh>

      {slice.enabled && <SliceIndicator slice={slice} />}

      <Interaction engine={engine} {...props} />
      {props.labels.length > 0 && <Labels engine={engine} labels={props.labels} onClick={props.onLabelClick} />}
      {props.quality === "high" && (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <N8AO halfRes aoRadius={0.06} distanceFalloff={0.6} intensity={2.2} color="#1a0606" />
          <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} radius={0.7} />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      )}
      <AdaptiveDpr pixelated={false} />
      <CameraRig ref={rig} />
      <OrbitControls
        makeDefault
        regress
        target={VIEWS.torso.target}
        enableDamping
        dampingFactor={0.12}
        minDistance={0.1}
        maxDistance={6}
        autoRotate={props.autoRotate}
        autoRotateSpeed={1.2}
        mouseButtons={{
          LEFT: handsOn ? (-1 as THREE.MOUSE) : THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: handsOn ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
        }}
      />
    </>
  );
}

function SystemLoader({
  engine,
  system,
  file,
  parts,
  onLoaded,
}: {
  engine: BodyEngine;
  system: SystemId;
  file: string;
  parts: BodyPart[];
  onLoaded: (system: SystemId) => void;
}) {
  const gltf = useGLTF(file, false, true);
  useEffect(() => {
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && !o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    });
    engine.addSystem(system, gltf.scene, parts);
    onLoaded(system);
  }, [engine, gltf, system, parts, onLoaded]);
  return null;
}

/* ------------------------------------------------------------------ */

function Interaction(props: Props & { engine: BodyEngine }) {
  const { engine } = props;
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  // Latest props for the DOM handlers, so re-renders never tear down a drag in progress.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const p0 = () => latest.current;
    const el = gl.domElement;
    const ndc = new THREE.Vector2();
    const toNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    type Down = { x: number; y: number; lx: number; ly: number; retract?: { strokes: number[]; start: number[] } };
    let down: Down | null = null;

    const hover = (id: string | null) => {
      engine.setHover(id);
      p0().onHover(id);
    };

    // Which layers lie under the blade — reported only when the picture changes.
    let layerKey = "";
    const reportLayers = (p: THREE.Vector2 | null) => {
      const list = p ? engine.layerStack(p, camera) : [];
      const key = list.map((l) => l.partId + (l.cut ? "+" : "-")).join("|");
      if (key === layerKey) return;
      layerKey = key;
      p0().onLayers(list);
    };

    // Blade positions are gathered from every pointer event (coalesced ones included) but applied
    // once per frame: one clean, evenly-sampled stroke instead of a raycast per mouse event.
    let cutQueue: THREE.Vector2[] = [];
    let cutSpeed = 0;
    let cutFrame = 0;
    const flushCut = () => {
      cutFrame = 0;
      if (!cutQueue.length) return;
      const queue = cutQueue;
      const speed = cutSpeed;
      cutQueue = [];
      cutSpeed = 0;
      if (!engine.isDrawing) return;
      for (const q of queue) engine.extendIncision(q, camera);
      sfx.cutMove(speed);
    };
    const flushCutNow = () => {
      if (cutFrame) cancelAnimationFrame(cutFrame);
      flushCut();
    };

    const move = (e: PointerEvent) => {
      const { tool } = p0();
      const p = toNdc(e);
      if (engine.isDrawing && down) {
        const events = e.getCoalescedEvents?.() ?? [];
        const list = events.length ? events : [e];
        // keep at most a handful of samples per frame, spread evenly along the movement
        const stride = Math.max(1, Math.ceil(list.length / 5));
        let lx = down.lx;
        let ly = down.ly;
        let speed = 0;
        list.forEach((ev, i) => {
          speed += Math.hypot(ev.clientX - lx, ev.clientY - ly);
          lx = ev.clientX;
          ly = ev.clientY;
          if (i % stride === stride - 1 || i === list.length - 1) cutQueue.push(toNdc(ev).clone());
        });
        down.lx = lx;
        down.ly = ly;
        cutSpeed += speed;
        if (!cutFrame) cutFrame = requestAnimationFrame(flushCut);
        return;
      }
      if (down) {
        down.lx = e.clientX;
        down.ly = e.clientY;
      }
      if (down?.retract) {
        const delta = (e.clientX - down.x + (down.y - e.clientY)) * 0.00012;
        down.retract.strokes.forEach((s, i) => engine.setOpen(s, down!.retract!.start[i] + delta));
        engine.updateCursor(engine.pick(p, camera), camera);
        return;
      }
      if (engine.isSuturing) {
        const hit = engine.pick(p, camera);
        engine.updateCursor(hit, camera);
        if (hit) engine.extendSuture(hit);
        return;
      }
      if (down && (tool === "explore" || tool === "forceps")) return; // orbiting
      const hit = engine.pick(p, camera);
      hover(hit?.partId ?? null);
      reportLayers(tool === "scalpel" && !down ? p : null);
      engine.updateCursor(tool === "explore" ? null : hit, camera);
      el.style.cursor =
        tool === "explore" ? (hit ? "pointer" : "default")
        : tool === "retractor" ? (engine.strokesNear(p, camera).length ? "ew-resize" : "default")
        : hit ? "none" : "default";
    };

    const pointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const { tool, cutDepth, sutureMode } = p0();
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY };
      const p = toNdc(e);
      engine.pressCursor(true);
      if (tool === "scalpel") {
        if (engine.beginIncision(p, camera, cutDepth)) {
          el.setPointerCapture(e.pointerId);
          sfx.cutStart();
        }
      } else if (tool === "retractor") {
        const strokes = engine.strokesNear(p, camera);
        if (strokes.length) {
          down.retract = { strokes, start: strokes.map((s) => engine.getOpen(s)) };
          engine.placeRetractors(strokes[0]);
          el.setPointerCapture(e.pointerId);
        }
      } else if (tool === "suture" && sutureMode === "close") {
        const hit = engine.pick(p, camera);
        if (hit && engine.beginSuture(hit)) el.setPointerCapture(e.pointerId);
      }
    };

    const pointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const { tool, sutureMode, onPick, onForceps, onClamp, onTie, onIncisionMade, onRetracted, onSutured } = p0();
      engine.pressCursor(false);
      const click = !!down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5;
      if (engine.isDrawing) {
        flushCutNow();
        sfx.cutEnd();
        const info = engine.endIncision();
        if (info) onIncisionMade(info);
        // the surface under the blade has changed: show what is exposed now
        const at = toNdc(e).clone();
        window.setTimeout(() => reportLayers(at), 30);
      } else if (down?.retract) {
        onRetracted(down.retract.strokes);
      } else if (engine.isSuturing) {
        const info = engine.endSuture();
        if (info) onSutured(info);
      } else if (click) {
        const hit = engine.pick(toNdc(e), camera);
        if (hit) {
          if (tool === "explore") onPick(plain(hit));
          else if (tool === "forceps") onForceps(plain(hit));
          else if (tool === "clamp") {
            sfx.ratchet();
            onClamp(plain(hit));
          } else if (tool === "suture" && sutureMode === "tie") {
            sfx.snip();
            onTie(plain(hit));
          }
        }
      }
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      down = null;
    };

    const leave = () => {
      if (engine.isDrawing || down) return;
      hover(null);
      engine.updateCursor(null, camera);
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", pointerDown);
    el.addEventListener("pointerup", pointerUp);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", pointerDown);
      el.removeEventListener("pointerup", pointerUp);
      el.removeEventListener("pointerleave", leave);
      if (cutFrame) cancelAnimationFrame(cutFrame);
      el.style.cursor = "";
      engine.updateCursor(null, camera);
      sfx.cutEnd();
    };
  }, [engine, gl, camera]);

  return null;
}

/* ------------------------------------------------------------------ */

/** Floating name tags that follow their structures (study mode). */
function Labels({ engine, labels, onClick }: { engine: BodyEngine; labels: Label[]; onClick: (id: string) => void }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    labels.forEach((l, i) => {
      const g = refs.current[i];
      if (g && engine.partCenterNow(l.id, tmp)) g.position.copy(tmp);
    });
  });
  return (
    <>
      {labels.map((l, i) => (
        <group
          key={l.id}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <Html center zIndexRange={[10, 0]} style={{ pointerEvents: "auto" }}>
            <button
              onClick={() => onClick(l.id)}
              className="whitespace-nowrap rounded-full border border-white/20 bg-slate-950/75 px-2 py-0.5 text-[10px] text-slate-100 shadow-lg backdrop-blur hover:border-teal-300/70 hover:bg-teal-500/30"
            >
              {l.text}
              {l.sub && <span className="ml-1 text-slate-400">{l.sub}</span>}
            </button>
          </Html>
        </group>
      ))}
    </>
  );
}

type CameraRigHandle = {
  focus: (center: THREE.Vector3, size: number) => void;
  goTo: (v: { camera: V3; target: V3 }) => void;
};

type Controls = {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (type: "start", fn: () => void) => void;
  removeEventListener: (type: "start", fn: () => void) => void;
};

type CameraMove = {
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromOffset: THREE.Vector3;
  toOffset: THREE.Vector3;
  start: number;
  t: number;
  dur: number;
};

/**
 * Flies the camera to a new view along a short arc: ease-in-out in time, the viewing direction
 * is rotated (not cut through the body) and the distance blended. Any drag or scroll by the
 * user cancels the flight at once, so it never fights the hand.
 */
function CameraRig({ ref }: { ref: RefObject<CameraRigHandle | null> }) {
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const camera = useThree((s) => s.camera);
  const anim = useRef<CameraMove | null>(null);
  const tmp = useMemo(
    () => ({
      full: new THREE.Quaternion(),
      part: new THREE.Quaternion(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      off: new THREE.Vector3(),
    }),
    [],
  );

  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      anim.current = null;
    };
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [controls]);

  useEffect(() => {
    const fly = (toTarget: THREE.Vector3, toCamera: THREE.Vector3) => {
      if (!controls) return;
      const fromTarget = controls.target.clone();
      const fromOffset = camera.position.clone().sub(fromTarget);
      const toOffset = toCamera.clone().sub(toTarget);
      const travel = fromTarget.distanceTo(toTarget) + Math.abs(fromOffset.length() - toOffset.length());
      anim.current = {
        fromTarget,
        toTarget,
        fromOffset,
        toOffset,
        start: performance.now(),
        t: 0,
        dur: THREE.MathUtils.clamp(0.6 + travel * 0.55, 0.6, 1.5),
      };
    };
    ref.current = {
      focus: (center, size) => {
        if (!controls) return;
        const dir = camera.position.clone().sub(controls.target).normalize();
        const dist = THREE.MathUtils.clamp(size * 2.6, 0.2, 2.6);
        fly(center.clone(), center.clone().addScaledVector(dir, dist));
      },
      goTo: (v) => fly(new THREE.Vector3(...v.target), new THREE.Vector3(...v.camera)),
    };
  }, [ref, controls, camera]);

  useFrame(() => {
    const a = anim.current;
    if (!a || !controls) return;
    // real elapsed time, so a slow frame rate shortens nothing: the flight always lasts `dur` seconds
    a.t = Math.min(a.dur, (performance.now() - a.start) / 1000);
    const k = THREE.MathUtils.smootherstep(a.t / a.dur, 0, 1);
    controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
    // rotate the offset along the great arc between the two viewing directions, blend its length
    const len = THREE.MathUtils.lerp(a.fromOffset.length(), a.toOffset.length(), k);
    tmp.full.setFromUnitVectors(tmp.from.copy(a.fromOffset).normalize(), tmp.to.copy(a.toOffset).normalize());
    tmp.part.identity().slerp(tmp.full, k);
    tmp.off.copy(tmp.from).applyQuaternion(tmp.part).multiplyScalar(len);
    camera.position.copy(controls.target).add(tmp.off);
    controls.update();
    if (a.t >= a.dur) anim.current = null;
  });
  return null;
}

function SliceIndicator({ slice }: { slice: Slice }) {
  const { position, rotation, size } = useMemo(() => {
    const p: V3 = [0, 0.88, 0];
    let r: V3 = [0, 0, 0];
    let s: [number, number] = [0.8, 1.8];
    if (slice.axis === "x") {
      p[0] = slice.pos;
      r = [0, Math.PI / 2, 0];
      s = [0.45, 1.8];
    } else if (slice.axis === "y") {
      p[1] = slice.pos;
      r = [-Math.PI / 2, 0, 0];
      s = [0.8, 0.45];
    } else {
      p[2] = slice.pos;
    }
    return { position: p, rotation: r, size: s };
  }, [slice.axis, slice.pos]);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size[0], size[1])), [size]);

  return (
    <group position={position} rotation={rotation}>
      <mesh raycast={() => null}>
        <planeGeometry args={size} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges} raycast={() => null}>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}
