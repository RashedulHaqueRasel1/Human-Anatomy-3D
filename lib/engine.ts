import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { lookFor, type BodyPart, type SystemId } from "./body";
import { buildClothing } from "./clothing";
import { createInstrument, orientInstrument, type Instrument, type InstrumentKind } from "./instruments";
import {
  createTissueMaterial,
  enableCutting,
  insideIncision,
  MAX_CUT_SEGMENTS,
  openingHalfWidth,
  segmentCount,
  sharedDetail,
  sharedTime,
  writeIncisions,
  flowUniforms,
  type FlowRole,
  type Incision,
  type TissueMaterial,
} from "./tissue";
import type { LiveProcess, LiveStep } from "./physiology";
import type { Slice } from "./lab";

// three-mesh-bvh ships the BufferGeometry type augmentation; only the runtime patch is needed
THREE.BufferGeometry.prototype.computeBoundsTree =
  computeBoundsTree as unknown as typeof THREE.BufferGeometry.prototype.computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

type Entry = {
  part: BodyPart;
  mesh: THREE.Mesh;
  material: TissueMaterial;
  incisions: Incision[];
  removed: boolean;
  lift: number;
  /** Original position from the model. */
  basePosition: THREE.Vector3;
  /** Where the structure rests now (differs after it was delivered into the wound). */
  home: THREE.Vector3;
  deliver: { from: THREE.Vector3; t: number } | null;
  baseScale: THREE.Vector3;
  /** World-space centre of the structure in its original position. */
  center: THREE.Vector3;
  /** Exploded-view offset (target and current, eased). */
  explode: THREE.Vector3;
  explodeNow: THREE.Vector3;
  /** Live-mode deformation: scale about a pivot plus a shift. */
  liveScale: THREE.Vector3;
  livePivot: THREE.Vector3 | null;
  liveShift: THREE.Vector3;
  ghosted: boolean;
};

export type LiveConfig = {
  process: LiveProcess;
  step: LiveStep | null;
  bpm: number;
  breathRate: number;
  speed: number;
  fade: boolean;
};

type Drawing = { stroke: number; mode: CutDepth; incisions: Map<Entry, Incision> };

type Prop = { id: number; obj: THREE.Object3D; attach: Entry | null; offset: THREE.Vector3; stroke?: number };

type Suturing = { target: Incision; strokes: number[]; startOpen: Map<number, number>; bins: boolean[] };

type Stitch = { stroke: number; t: number };

export type V3 = [number, number, number];
export type Hit = { partId: string; point: THREE.Vector3; normal: THREE.Vector3 };
export type PlainHit = { partId: string; point: V3; normal: V3 };

/** One scalpel stroke; in full-thickness mode it cuts several layers at once. */
export type IncisionInfo = {
  id: number;
  layers: string[];
  partIds: string[];
  open: number;
  length: number;
  /** Midpoint, start and end of the outermost layer of the stroke. */
  mid: V3;
  /** Surface normal at the midpoint (pointing out of the body). */
  normal: V3;
  start: V3;
  end: V3;
};

export type SutureInfo = { stroke: number; coverage: number; complete: boolean };

/** One structure along the blade's line of sight, from the surface inwards. */
export type LayerInfo = { partId: string; name: string; system: SystemId; cut: boolean };

/** Visible, physical result of a practice action (instrument, implant, mesh…). */
export type PracticeEffect = "hold" | "clamp" | "tie" | "mesh" | "ring" | "tube" | "kidney" | "ureter" | "cap" | "tray";

export type CutDepth = "layer" | "wall";

export type Landmarks = {
  asis: V3;
  umbilicus: V3;
  mcburney: V3;
  mcburneyNormal: V3;
  /** Recommended gridiron incision drawn on the skin. */
  guide: V3[];
  appendixBase: V3;
  appendixTip: V3;
  appendixId: string;
};

export type Marker = { point: V3; normal: V3; color: string; size?: number };

/**
 * A skin-surface plan: incision lines and port/landmark points given as front-view
 * (dx, dy) offsets in metres from the centre of the structure matching `anchor`
 * (a regular expression source), so the same plan fits any body model.
 */
export type SkinPlan = {
  anchor: string;
  lines?: [number, number][][];
  points?: { at: [number, number]; color?: string; size?: number }[];
};

/** A named route through the body that particle streams follow (gut, ureters, vessels…). */
type BodyPath = { curve: THREE.CatmullRomCurve3; marks: Record<string, number> };

/** Bounding region of a set of structures, with helpers to pick points inside it. */
type Region = { c: THREE.Vector3; s: THREE.Vector3; min: THREE.Vector3; max: THREE.Vector3 };

const MAX_TRAIN_PARTICLES = 256;

/** Layers of the body wall that a full-thickness cut goes through. */
const WALL_SYSTEMS = new Set(["integumentary", "muscular"]);
/** How deep a full-thickness cut may reach below the first surface (metres). */
const WALL_DEPTH = 0.07;
/** Spacing between incision points (metres). */
const STEP = 0.005;
/** How much of each new blade position is blended into the line (lower = smoother, but lags the hand). */
const SMOOTH = 0.55;
const MAX_OPEN = 0.05;
const STITCH_SPACING = 0.009;

const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/** Distance from p to q measured along the skin surface (depth along the normal is ignored). */
function lateralDistance(p: THREE.Vector3, q: THREE.Vector3, normal: THREE.Vector3 | undefined) {
  const d = p.clone().sub(q);
  if (normal) d.addScaledVector(normal, -d.dot(normal));
  return d.length();
}
const vec = (a: V3) => new THREE.Vector3(...a);

/**
 * Imperative three.js runtime for the body: owns meshes, materials, incisions,
 * instruments, picking and effects. React feeds it state; it never re-renders
 * 900 meshes.
 */
export class BodyEngine {
  readonly root = new THREE.Group();
  readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 100);
  private entries = new Map<string, Entry>();
  private pickables: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private nextIncisionId = 1;
  private nextStrokeId = 1;
  private nextPropId = 1;
  private drawing: Drawing | null = null;
  private suturing: Suturing | null = null;
  private blood = new BloodParticles();

  private cursors = new Map<InstrumentKind, Instrument>();
  private cursorKind: InstrumentKind | null = null;
  private cursorClosed = 0;
  private cursorClosedTarget = 0;
  private lastCursorPoint: THREE.Vector3 | null = null;
  private travel = new THREE.Vector3(1, 0, 0);
  private bladeBlood = 0;

  private props: Prop[] = [];
  private retractorProps = new Map<number, Prop[]>();
  private stitches: Stitch[] = [];
  private stitchGroup = new THREE.Group();
  private markerGroup = new THREE.Group();
  private guideGroup = new THREE.Group();

  private visibleSystems: Record<string, boolean> = {};
  private isolated: Set<string> | null = null;
  private live: LiveConfig | null = null;
  private liveTime = 0;
  private liveSets: {
    heart: Entry[];
    heartCenter: THREE.Vector3;
    lungs: { entries: Entry[]; pivot: THREE.Vector3 }[];
    diaphragm: Entry[];
    ribs: Entry[];
    origins: Record<"heart" | "airway" | "mouth" | "brain" | "kidney" | "liver", THREE.Vector3>;
  } | null = null;
  private highlightSet = new Set<string>();
  /** Highlights easing out (id → current glow) and the 0..1 ease-in of a new highlight. */
  private bpmNow = 72;
  private breathNow = 14;
  private heartPhase = 0;
  private breathPhase = 0;
  private glowFade = new Map<string, number>();
  private glowRamp = 1;
  private spotlight: RegExp | null = null;
  private paths = new Map<string, BodyPath>();
  private trainMesh: THREE.InstancedMesh;
  private trainTime = 0;
  private trainRand = Array.from({ length: 64 }, () => Math.random());
  private trainColor = new THREE.Color();
  private swellSet: Entry[] = [];
  private swellKey: LiveStep["swell"] | undefined;
  private planGroup = new THREE.Group();
  private openTweens = new Map<number, { from: number; to: number; t: number; dur: number }>();
  private lastKidney: THREE.Vector3 | null = null;
  private skinOpacity = 1;
  /** Trunks / briefs worn by the body; a child of the skin mesh. */
  private clothing: { mesh: THREE.Mesh; skin: THREE.Mesh } | null = null;
  private sliceOn = false;
  private hovered: string | null = null;
  private selected: string | null = null;

  private onIncisionsChange: (list: IncisionInfo[]) => void = () => {};

  constructor() {
    this.trainMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }),
      MAX_TRAIN_PARTICLES,
    );
    this.trainMesh.count = 0;
    this.trainMesh.frustumCulled = false;
    this.trainMesh.renderOrder = 20;
    this.trainMesh.raycast = () => {};
    this.trainMesh.setColorAt(0, this.trainColor.set("#ffffff"));
    this.root.add(this.blood.mesh, this.stitchGroup, this.markerGroup, this.guideGroup, this.planGroup, this.trainMesh);
  }

  /** Full procedural surface detail on/off (quality setting). */
  setDetail(on: boolean) {
    sharedDetail.value = on ? 1 : 0;
  }

  setIncisionListener(fn: (list: IncisionInfo[]) => void) {
    this.onIncisionsChange = fn;
  }

  /* ---------------- loading ---------------- */

  addSystem(system: SystemId, scene: THREE.Object3D, parts: BodyPart[]) {
    if (this.root.getObjectByName(`system:${system}`)) return;
    const byId = new Map(parts.map((p) => [p.id, p]));
    scene.name = `system:${system}`;
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const part = byId.get(o.name);
      if (!part) return;
      const material = createTissueMaterial(lookFor(part), this.plane);
      o.material = material;
      o.geometry.computeBoundsTree();
      o.userData.partId = part.id;
      this.entries.set(part.id, {
        part,
        mesh: o,
        material,
        incisions: [],
        removed: false,
        lift: 0,
        basePosition: o.position.clone(),
        home: o.position.clone(),
        deliver: null,
        baseScale: o.scale.clone(),
        center: new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()),
        explode: new THREE.Vector3(),
        explodeNow: new THREE.Vector3(),
        liveScale: new THREE.Vector3(1, 1, 1),
        livePivot: null,
        liveShift: new THREE.Vector3(),
        ghosted: false,
      });
      if (part.system === "integumentary" && /^skin$/i.test(part.name)) this.dress(o, part);
    });
    this.root.add(scene);
    this.applyVisibility();
    this.applyOpacity();
    if (this.live) this.prepareLive();
    if (this.spotlight || this.live?.step?.highlight) this.rebuildHighlight();
  }

  /** Puts trunks (male) or briefs (female) on the skin so the body is never shown unclothed. */
  private dress(skin: THREE.Mesh, part: BodyPart) {
    const mesh = buildClothing(skin, part.id.startsWith("F_") ? "briefs" : "shorts");
    if (!mesh) return;
    (mesh.material as THREE.Material).clippingPlanes = [this.plane];
    skin.add(mesh);
    this.clothing = { mesh, skin };
  }

  /* ---------------- state from React ---------------- */

  setVisibility(systems: Record<string, boolean>, isolated: string[] | null, removed: string[]) {
    this.visibleSystems = systems;
    this.isolated = isolated ? new Set(isolated) : null;
    const set = new Set(removed);
    for (const e of this.entries.values()) {
      if (!set.has(e.part.id)) e.lift = 0;
      e.removed = set.has(e.part.id);
    }
    this.applyVisibility();
  }

  setSkinOpacity(v: number) {
    this.skinOpacity = v;
    this.applyOpacity();
  }

  setSlice(slice: Slice) {
    this.sliceOn = slice.enabled;
    if (!slice.enabled) {
      this.plane.set(new THREE.Vector3(0, 0, -1), 100);
      return;
    }
    const n = new THREE.Vector3(slice.axis === "x" ? -1 : 0, slice.axis === "y" ? -1 : 0, slice.axis === "z" ? -1 : 0);
    let c = slice.pos;
    if (slice.flip) {
      n.negate();
      c = -c;
    }
    this.plane.set(n, c);
  }

  setHover(id: string | null) {
    if (this.hovered === id) return;
    const prev = this.hovered;
    this.hovered = id;
    this.highlight(prev);
    this.highlight(id);
  }

  setSelected(id: string | null) {
    const prev = this.selected;
    this.selected = id;
    this.highlight(prev);
    this.highlight(id);
  }

  partBounds(id: string) {
    const e = this.entries.get(id);
    if (!e) return null;
    const box = new THREE.Box3().setFromObject(e.mesh);
    return { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
  }

  private highlight(id: string | null) {
    if (!id) return;
    const e = this.entries.get(id);
    if (!e) return;
    e.material.emissiveIntensity = id === this.selected ? 0.32 : id === this.hovered ? 0.14 : 0;
  }

  /* ---------------- study mode ---------------- */

  /** Pulls the listed structures apart from their common centre (0 = assembled). */
  setExplode(ids: string[] | null, amount: number) {
    const list = (ids ?? []).map((id) => this.entries.get(id)).filter(Boolean) as Entry[];
    const c = new THREE.Vector3();
    list.forEach((e) => c.add(e.center));
    if (list.length) c.divideScalar(list.length);
    const set = new Set(list);
    for (const e of this.entries.values()) {
      if (set.has(e)) e.explode.copy(e.center).sub(c).multiplyScalar(amount * 1.6);
      else e.explode.set(0, 0, 0);
    }
  }

  /** Where a structure's centre is right now (after delivery, explosion or live motion). */
  partCenterNow(id: string, out = new THREE.Vector3()) {
    const e = this.entries.get(id);
    if (!e) return null;
    return out.copy(e.center).add(e.mesh.position).sub(e.basePosition);
  }

  /** Combined bounds of a set of structures. */
  boundsOf(ids: string[]) {
    const box = new THREE.Box3();
    for (const id of ids) {
      const e = this.entries.get(id);
      if (e) box.expandByObject(e.mesh);
    }
    if (box.isEmpty()) return null;
    return { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
  }

  /** Centre and extent of all visible structures whose name matches. */
  matchBounds(re: RegExp) {
    const box = new THREE.Box3();
    let n = 0;
    for (const e of this.entries.values()) {
      if (!re.test(e.part.name) || !this.visibleSystems[e.part.system]) continue;
      box.expandByObject(e.mesh);
      n++;
    }
    if (!n) return null;
    return { center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
  }

  /* ---------------- live mode ---------------- */

  setLive(cfg: LiveConfig | null) {
    const wasLive = !!this.live;
    this.live = cfg;
    if (cfg && !wasLive) {
      this.bpmNow = cfg.bpm;
      this.breathNow = cfg.breathRate;
    }
    this.rebuildHighlight();
    if (cfg && !this.liveSets) this.prepareLive();
    if (!cfg) {
      for (const u of Object.values(flowUniforms)) u.uFlowStrength.value = 0;
      for (const e of this.entries.values()) {
        e.liveScale.set(1, 1, 1);
        e.liveShift.set(0, 0, 0);
        e.livePivot = null;
        if (!this.isHighlightOwner(e)) e.material.emissiveIntensity = 0;
      }
      this.liveSets = null;
      this.glowFade.clear();
      this.swellSet = [];
      this.swellKey = undefined;
      this.trainMesh.count = 0;
    }
    if (!!cfg !== wasLive || cfg?.fade !== undefined) this.applyOpacity();
  }

  /** Pulsing highlight for a tutorial step (independent of the live mode). */
  setSpotlight(re: RegExp | null) {
    this.spotlight = re;
    this.rebuildHighlight();
  }

  private rebuildHighlight() {
    const next = new Set<string>();
    const re = this.live?.step?.highlight ?? this.spotlight;
    if (re) for (const e of this.entries.values()) if (re.test(e.part.name)) next.add(e.part.id);
    // structures that leave the highlight fade out instead of switching off
    for (const id of this.highlightSet) {
      if (next.has(id)) continue;
      const e = this.entries.get(id);
      if (e && !this.isHighlightOwner(e)) this.glowFade.set(id, e.material.emissiveIntensity);
    }
    if (next.size && !sameSet(next, this.highlightSet)) this.glowRamp = 0;
    this.highlightSet = next;
  }

  /** Whether every named path exists in this body model (some atlases lack organs). */
  hasPaths(ids: string[]) {
    if (!this.liveSets) this.prepareLive();
    return ids.every((id) => this.paths.has(id));
  }

  private isHighlightOwner(e: Entry) {
    return e.part.id === this.selected || e.part.id === this.hovered;
  }

  private prepareLive() {
    const all = [...this.entries.values()];
    const avg = (list: Entry[], fallback: THREE.Vector3) => {
      if (!list.length) return fallback.clone();
      const c = new THREE.Vector3();
      list.forEach((e) => c.add(e.center));
      return c.divideScalar(list.length);
    };
    const role = (e: Entry) => e.material.userData.role as FlowRole | null;
    const heartCore = all.filter((e) => role(e) === "heart");
    const heartCenter = avg(heartCore, new THREE.Vector3(0.02, 1.22, 0.04));
    const heart = all.filter((e) => e.part.system === "cardiovascular" && e.center.distanceTo(heartCenter) < 0.075);
    const lungEntries = all.filter((e) => role(e) === "lung");
    const lungs = [lungEntries.filter((e) => e.center.x >= 0), lungEntries.filter((e) => e.center.x < 0)]
      .filter((l) => l.length)
      .map((entries) => ({ entries, pivot: avg(entries, heartCenter) }));
    const airways = all.filter((e) => role(e) === "airway");
    let airwayTop = heartCenter.clone().add(new THREE.Vector3(0, 0.2, 0));
    let topY = -Infinity;
    for (const e of airways) {
      const top = e.center.y + e.part.size[1] / 2;
      if (top > topY) {
        topY = top;
        airwayTop = new THREE.Vector3(e.center.x, top, e.center.z);
      }
    }
    const mouthParts = all.filter((e) => /tongue|tooth|teeth/i.test(e.part.name));
    const brainParts = all.filter((e) => role(e) === "brain");
    const kidneyParts = all.filter((e) => role(e) === "kidney");
    const liverParts = all.filter((e) => role(e) === "liver");
    this.liveSets = {
      heart,
      heartCenter,
      lungs,
      diaphragm: all.filter((e) => /diaphragm/i.test(e.part.name)),
      ribs: all.filter((e) => /\brib\b|costal cartilage|sternum|intercostal/i.test(e.part.name)),
      origins: {
        heart: heartCenter,
        airway: airwayTop,
        mouth: avg(mouthParts, airwayTop.clone().add(new THREE.Vector3(0, 0.08, 0.06))),
        brain: avg(brainParts, airwayTop.clone().add(new THREE.Vector3(0, 0.3, 0))),
        kidney: avg(kidneyParts, heartCenter.clone().add(new THREE.Vector3(0, -0.17, -0.05))),
        liver: avg(liverParts, heartCenter.clone().add(new THREE.Vector3(-0.04, -0.12, 0.0))),
      },
    };
    this.buildPaths(heartCenter);
  }

  /* ---------------- body paths (food, urine, blood) ---------------- */

  private region(re: RegExp, system?: SystemId): Region | null {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    let n = 0;
    for (const e of this.entries.values()) {
      if ((system && e.part.system !== system) || !re.test(e.part.name)) continue;
      // world-space centre of the loaded mesh (the manifest centre can be in the atlas' own frame)
      const { x: cx, y: cy, z: cz } = e.center;
      const [sx, sy, sz] = e.part.size;
      min.min(new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2));
      max.max(new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2));
      n++;
    }
    if (!n) return null;
    return { c: min.clone().add(max).multiplyScalar(0.5), s: max.clone().sub(min), min, max };
  }

  private buildPaths(heartCenter: THREE.Vector3) {
    this.paths.clear();
    const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    /** Point inside region r: f* are fractions of its size from the centre (-0.5..0.5). */
    const at = (r: Region, fx: number, fy: number, fz: number) => P(r.c.x + r.s.x * fx, r.c.y + r.s.y * fy, r.c.z + r.s.z * fz);
    type Wp = [string | null, THREE.Vector3];
    const add = (id: string, wps: (Wp | null)[]) => {
      const list = wps.filter(Boolean) as Wp[];
      if (list.length < 2) return;
      const pts = list.map((w) => w[1]);
      const lens = [0];
      for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
      const total = lens[lens.length - 1] || 1;
      const marks: Record<string, number> = {};
      list.forEach((w, i) => {
        if (w[0]) marks[w[0]] = lens[i] / total;
      });
      this.paths.set(id, { curve: new THREE.CatmullRomCurve3(pts, false, "centripetal"), marks });
    };
    const w = (name: string | null, p: THREE.Vector3 | null): Wp | null => (p ? [name, p] : null);

    const teeth = this.region(/tooth|teeth/i, "digestive");
    const eso = this.region(/^esophagus$/i, "digestive");
    const sto = this.region(/^stomach$/i, "digestive");
    const duo = this.region(/^duodenum$/i, "digestive");
    const jej = this.region(/^jejunum$/i, "digestive");
    const ile = this.region(/^ileum$/i, "digestive");
    const col = this.region(/^colon$/i, "digestive");
    const rec = this.region(/^rectum$/i, "digestive");
    const anal = this.region(/anal sphincter/i, "digestive");
    const liver = this.region(/^liver$/i, "digestive");
    const gall = this.region(/^gallbladder$/i, "digestive");
    const panc = this.region(/^pancreas$/i, "digestive");

    // zig-zag passes through a coiled region of bowel
    const coil = (r: Region, passes: number, startLeft: boolean): Wp[] => {
      const out: Wp[] = [];
      for (let k = 0; k < passes; k++) {
        const y = 0.38 - (0.76 * k) / (passes - 1);
        const left = startLeft ? k % 2 === 0 : k % 2 === 1;
        const z = k % 2 === 0 ? 0.12 : -0.12;
        out.push([null, at(r, left ? 0.4 : -0.4, y, z)], [null, at(r, left ? -0.4 : 0.4, y, -z)]);
      }
      return out;
    };

    if (teeth && eso && sto && duo && jej && ile && col && rec) {
      const gi: (Wp | null)[] = [
        w("mouth", P(0, teeth.c.y, teeth.max.z + 0.012)),
        w(null, P(0, teeth.c.y - 0.004, teeth.c.z - 0.012)),
        w(null, P(eso.c.x, eso.max.y + 0.02, eso.c.z + 0.02)),
        w("throat", P(eso.c.x, eso.max.y - 0.004, eso.c.z)),
        w("esophagus", at(eso, 0, 0, 0.05)),
        w(null, at(eso, 0.2, -0.38, 0.2)),
        w("cardia", at(sto, -0.28, 0.3, -0.08)),
        w(null, at(sto, 0.05, 0.1, 0)),
        w(null, at(sto, 0.22, -0.2, 0.05)),
        w(null, at(sto, 0, -0.35, 0.12)),
        w("pylorus", at(sto, -0.4, -0.2, 0.08)),
        w(null, at(duo, -0.28, 0.3, 0)),
        w("duodenum", at(duo, -0.4, -0.05, 0)),
        w(null, at(duo, -0.2, -0.38, 0)),
        w(null, at(duo, 0.15, -0.42, 0)),
        w(null, at(duo, 0.4, 0, 0)),
        ...coil(jej, 5, true),
        ...coil(ile, 4, false),
        w("ileum", at(ile, -0.4, -0.38, 0.1)),
        w("cecum", at(col, -0.38, -0.4, 0)),
        w(null, at(col, -0.4, -0.05, 0)),
        w(null, at(col, -0.4, 0.3, 0)),
        w("transverse", at(col, 0, 0.28, 0.06)),
        w(null, at(col, 0.4, 0.36, 0)),
        w(null, at(col, 0.42, 0, 0)),
        w(null, at(col, 0.4, -0.35, 0)),
        w("sigmoid", at(col, 0.2, -0.44, 0)),
        w(null, at(col, 0.02, -0.4, -0.1)),
        w("rectum", at(rec, 0, 0.35, 0.1)),
        w(null, at(rec, 0, -0.35, -0.1)),
        w("anus", anal ? P(rec.c.x, anal.c.y - 0.012, anal.c.z - 0.004) : at(rec, 0, -0.62, -0.2)),
      ];
      add("gi", gi);
    }
    if (liver && gall && duo) {
      add("bile", [w("liver", liver.c.clone()), w(null, gall.c.clone()), w("duodenum", at(duo, -0.3, 0.25, 0))]);
    }
    if (panc && duo) add("pancreas", [w("pancreas", at(panc, 0.25, 0, 0)), w(null, at(panc, -0.2, 0, 0)), w("duodenum", at(duo, -0.2, -0.3, 0))]);
    const smv = this.region(/superior mesenteric vein/i, "cardiovascular");
    if (jej && liver) {
      add("portal", [w("gut", at(jej, -0.1, 0, 0)), smv ? w(null, smv.c.clone()) : null, w("liver", at(liver, 0.05, -0.1, 0))]);
    }

    // kidneys, renal vessels and ureters (one path set per side; right = −x)
    const aorta = this.region(/^descending aorta|^abdominal aorta/i, "cardiovascular");
    const ivc = this.region(/inferior vena cava/i, "cardiovascular");
    const bladder = this.region(/urinary bladder|trigone|bladder neck/i, "urinary");
    const urethra = this.region(/^urethra/i, "urinary");
    for (const side of ["R", "L"] as const) {
      const m = side === "R" ? 1 : -1; // medial direction in x
      const word = side === "R" ? "right" : "left";
      const kid = this.region(new RegExp(`^${word} .*(kidney|renal)`, "i"), "urinary");
      if (!kid) continue;
      const hilum = P(kid.c.x + m * kid.s.x * 0.28, kid.c.y, kid.c.z + kid.s.z * 0.1);
      const artery = this.region(new RegExp(`^${word} renal artery`, "i"), "cardiovascular");
      const vein = this.region(new RegExp(`^${word} renal vein`, "i"), "cardiovascular");
      if (aorta) {
        add(`renalIn${side}`, [
          w("aorta", P(aorta.c.x, kid.c.y + 0.012, aorta.c.z)),
          artery ? w(null, artery.c.clone()) : w(null, P((aorta.c.x + hilum.x) / 2, hilum.y + 0.008, (aorta.c.z + hilum.z) / 2)),
          w("kidney", hilum),
        ]);
      }
      if (ivc) {
        add(`renalOut${side}`, [
          w("kidney", hilum),
          vein ? w(null, vein.c.clone()) : w(null, P((ivc.c.x + hilum.x) / 2, hilum.y - 0.006, (ivc.c.z + hilum.z) / 2)),
          w("ivc", P(ivc.c.x, kid.c.y, ivc.c.z)),
          w(null, P(ivc.c.x, ivc.max.y - 0.01, ivc.c.z)),
          w("heart", heartCenter.clone().add(P(-0.012, -0.02, 0.01))),
        ]);
      }
      const ureter = this.region(new RegExp(`^${word} ureter$`, "i"), "urinary");
      if (ureter && bladder) {
        const top = ureter.max.y;
        const exit = urethra
          ? w("exit", P(0, urethra.min.y + 0.006, urethra.max.z - 0.006))
          : w("exit", P(bladder.c.x, bladder.min.y - 0.05, bladder.max.z + 0.01));
        add(`urine${side}`, [
          w("kidney", P(hilum.x, hilum.y - 0.005, hilum.z)),
          w(null, P(hilum.x + m * 0.004, top - 0.025, kid.c.z + 0.005)),
          w("ureter", at(ureter, m * 0.08, 0.1, 0)),
          w(null, at(ureter, m * 0.12, -0.2, 0)),
          w(null, P(bladder.c.x + m * bladder.s.x * 0.3, bladder.max.y - 0.006, bladder.c.z - bladder.s.z * 0.1)),
          w("bladder", at(bladder, 0, -0.05, 0)),
          w(null, at(bladder, 0, -0.4, 0.15)),
          urethra ? w("urethra", at(urethra, 0, 0.38, -0.2)) : null,
          urethra ? w(null, at(urethra, 0, 0.0, 0.1)) : null,
          exit,
        ]);
      }
    }
  }

  /** Streams of glowing particles (food, bile, urine, blood) for the current live step. */
  private updateTrains(dt: number) {
    const mesh = this.trainMesh;
    const trains = this.live?.step?.trains;
    if (!this.live || !trains?.length || !this.paths.size) {
      if (mesh.count) mesh.count = 0;
      return;
    }
    this.trainTime += dt * this.live.speed;
    // keep particles legible: larger when the camera is pulled back for an overview
    const zoom = 0.55 + (this.live.step?.focus?.distance ?? 0.5) * 0.9;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    let n = 0;
    for (const tr of trains) {
      const path = this.paths.get(tr.path);
      if (!path) continue;
      const a = path.marks[tr.from] ?? 0;
      const b = path.marks[tr.to] ?? 1;
      const count = Math.min(tr.count ?? 12, 60);
      const period = tr.period ?? 6;
      for (let i = 0; i < count && n < MAX_TRAIN_PARTICLES; i++) {
        const ph = (this.trainTime / period + i / count) % 1;
        const u = Math.min(1, Math.max(0, a + (b - a) * ph));
        path.curve.getPointAt(u, p);
        const fade = Math.min(1, ph / 0.12, (1 - ph) / 0.12);
        const r = (tr.size ?? 0.004) * zoom * (0.7 + 0.6 * this.trainRand[(i * 7 + n) % 64]) * (0.25 + 0.75 * fade);
        s.setScalar(r);
        m.compose(p, q, s);
        mesh.setMatrixAt(n, m);
        const k = tr.colors.length === 1 ? 0 : u * (tr.colors.length - 1);
        const i0 = Math.min(tr.colors.length - 1, Math.floor(k));
        const i1 = Math.min(tr.colors.length - 1, i0 + 1);
        this.trainColor.set(tr.colors[i0]).lerp(new THREE.Color(tr.colors[i1]), k - i0).multiplyScalar(1.7);
        mesh.setColorAt(n, this.trainColor);
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** Churn / fill / squeeze animation of the structures a live step talks about. */
  private updateSwell(t: number) {
    const sw = this.live?.step?.swell;
    if (sw !== this.swellKey) {
      for (const e of this.swellSet) {
        e.liveScale.set(1, 1, 1);
        e.livePivot = null;
      }
      this.swellKey = sw;
      this.swellSet = sw ? [...this.entries.values()].filter((e) => sw.match.test(e.part.name)) : [];
    }
    if (!sw) return;
    let sx = 1;
    let sy = 1;
    let sz = 1;
    if (sw.mode === "churn") {
      const w = Math.sin(t * 3.1);
      sx = 1 + sw.amount * w;
      sy = 1 - sw.amount * 0.6 * w;
      sz = 1 + sw.amount * 0.5 * Math.sin(t * 2.3 + 1);
    } else if (sw.mode === "fill") {
      sx = sy = sz = 1 + sw.amount * ((t / 8) % 1);
    } else {
      sx = sy = sz = 1 + sw.amount * (1 - ((t / 4) % 1));
    }
    for (const e of this.swellSet) {
      e.livePivot = e.center;
      e.liveScale.set(sx, sy, sz);
    }
  }

  private updateLive(dt: number) {
    const cfg = this.live;
    const sets = this.liveSets;
    if (!cfg || !sets) return;
    this.liveTime += dt * cfg.speed;
    const t = this.liveTime;

    // rates glide to their new values and the beat phase is integrated, so changing the
    // heart-rate or breathing slider (or a step that sets them) never makes the heart jump
    const glide = 1 - Math.exp(-dt * 2.5);
    this.bpmNow += (cfg.bpm - this.bpmNow) * glide;
    this.breathNow += (cfg.breathRate - this.breathNow) * glide;
    this.heartPhase = (this.heartPhase + (dt * cfg.speed * this.bpmNow) / 60) % 1;
    this.breathPhase = (this.breathPhase + (dt * cfg.speed * this.breathNow) / 60) % 1;

    // heartbeat: atria contract, then the ventricles (lub-dub)
    const ph = this.heartPhase;
    const bump = (x: number, a: number, b: number) => (x > a && x < b ? Math.sin((Math.PI * (x - a)) / (b - a)) : 0);
    const atria = bump(ph, 0.0, 0.12);
    const vent = bump(ph, 0.14, 0.44);
    const hs = 1 - 0.05 * vent - 0.018 * atria;
    for (const e of sets.heart) {
      e.livePivot = sets.heartCenter;
      e.liveScale.set(hs, hs, hs);
    }

    // breathing: chest expands, diaphragm descends
    const bp = this.breathPhase;
    const b = 0.5 - 0.5 * Math.cos(2 * Math.PI * bp);
    const inhaling = Math.sin(2 * Math.PI * bp) >= 0;
    for (const side of sets.lungs)
      for (const e of side.entries) {
        e.livePivot = side.pivot;
        e.liveScale.set(1 + 0.05 * b, 1 + 0.055 * b, 1 + 0.07 * b);
      }
    for (const e of sets.diaphragm) e.liveShift.set(0, -0.016 * b, 0);
    for (const e of sets.ribs) e.liveShift.set(0, 0.003 * b, 0.005 * b);

    // flowing waves
    for (const u of Object.values(flowUniforms)) u.uFlowStrength.value = 0;
    const circulation = !!cfg.process.pulseDriven;
    for (const fl of cfg.process.flows) {
      const u = flowUniforms[fl.role];
      u.uFlowColor.value.set(fl.color);
      u.uFlowOrigin.value.copy(sets.origins[fl.origin]);
      const dirOverride = cfg.step?.dir?.[fl.role];
      u.uFlowDir.value = dirOverride ?? (fl.dir === "breath" ? (inhaling ? 1 : -1) : fl.dir);
      u.uFlowSpeed.value = fl.speed * (circulation ? this.bpmNow / 72 : 1);
      u.uFlowFreq.value = fl.freq;
      u.uFlowScale.value = fl.scale ?? 1;
      let strength = fl.strength * (cfg.step?.emphasis?.[fl.role] ?? 1);
      if (fl.role === "heart") strength = 1.4 * vent + 0.5 * atria;
      if (fl.role === "lung" && cfg.process.id === "breathing") strength *= 0.3 + b;
      const only = cfg.step?.only;
      if (only && !only.includes(fl.role)) strength = 0;
      u.uFlowStrength.value = strength;
    }

    this.updateSwell(t);
  }

  /** Highlighted structures (live step or tutorial spotlight) pulse gently. */
  private pulseHighlights(elapsed: number, dt: number) {
    if (this.glowFade.size) {
      const k = Math.exp(-dt * 7);
      for (const [id, v] of this.glowFade) {
        const e = this.entries.get(id);
        const nv = v * k;
        if (!e || nv < 0.01 || this.highlightSet.has(id)) {
          if (e && !this.isHighlightOwner(e) && !this.highlightSet.has(id)) e.material.emissiveIntensity = 0;
          this.glowFade.delete(id);
        } else {
          this.glowFade.set(id, nv);
          if (!this.isHighlightOwner(e)) e.material.emissiveIntensity = nv;
        }
      }
    }
    if (!this.highlightSet.size) return;
    this.glowRamp = Math.min(1, this.glowRamp + dt * 3);
    const ramp = this.glowRamp * this.glowRamp * (3 - 2 * this.glowRamp);
    const glow = (0.22 + 0.16 * Math.sin(elapsed * 3.2)) * ramp;
    for (const id of this.highlightSet) {
      const e = this.entries.get(id);
      if (e && !this.isHighlightOwner(e)) e.material.emissiveIntensity = glow;
    }
  }

  private applyVisibility() {
    this.pickables = [];
    for (const e of this.entries.values()) {
      const visible = !!this.visibleSystems[e.part.system] && (this.isolated === null || this.isolated.has(e.part.id));
      // faded-out muscle would stack into a milky haze over the organs: hide it outright
      const hazy = e.ghosted && e.part.system === "muscular";
      e.mesh.visible = visible && !hazy && (!e.removed || e.lift < 1);
      if (visible && !e.removed && !e.ghosted) this.pickables.push(e.mesh);
    }
  }

  /** Skin transparency plus live-mode fading of tissues outside the process being shown. */
  private applyOpacity() {
    const keep = this.live?.fade ? new Set<string>([...this.live.process.keep, ...(this.live.step?.show ?? [])]) : null;
    const dim = this.live ? new Set<string>(this.live.process.dim ?? []) : null;
    const grey = new THREE.Color("#8a9aa6");
    for (const e of this.entries.values()) {
      const m = e.material;
      e.ghosted = !!keep && !keep.has(e.part.system);
      let o = e.part.system === "integumentary" ? this.skinOpacity : 1;
      if (e.ghosted) o = Math.min(o, e.part.system === "integumentary" ? 0.04 : e.part.system === "skeletal" ? 0.1 : 0.05);
      else if (dim?.has(e.part.system)) o = Math.min(o, 0.28);
      const transparent = o < 0.99;
      m.opacity = o;
      m.color.copy(m.userData.baseColor);
      if (e.ghosted) m.color.lerp(grey, 0.7);
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.depthWrite = !transparent;
        m.needsUpdate = true;
      }
      if (this.clothing && e.mesh === this.clothing.skin) {
        const c = this.clothing.mesh.material as THREE.MeshStandardMaterial;
        c.opacity = o;
        if (c.transparent !== transparent) {
          c.transparent = transparent;
          c.depthWrite = !transparent;
          c.needsUpdate = true;
        }
      }
    }
    this.applyVisibility();
  }

  /* ---------------- picking ---------------- */

  private setRay(ndc: THREE.Vector2, camera: THREE.Camera) {
    this.raycaster.setFromCamera(ndc, camera);
  }

  private normalOf(h: THREE.Intersection) {
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 0, 1);
    if (n.dot(this.raycaster.ray.direction) > 0) n.negate();
    return n;
  }

  /** First visible surface under the cursor, looking through openings and the slice plane. */
  pick(ndc: THREE.Vector2, camera: THREE.Camera): Hit | null {
    this.setRay(ndc, camera);
    for (const h of this.raycaster.intersectObjects(this.pickables, false)) {
      const entry = this.entries.get(h.object.userData.partId);
      if (!entry) continue;
      if (entry.part.system === "integumentary" && this.skinOpacity < 0.5) continue;
      if (this.sliceOn && this.plane.distanceToPoint(h.point) < 0) continue;
      if (entry.incisions.length && insideIncision(h.point, entry.incisions)) continue;
      return { partId: entry.part.id, point: h.point.clone(), normal: this.normalOf(h) };
    }
    return null;
  }

  /* ---------------- instruments ---------------- */

  setCursorInstrument(kind: InstrumentKind | null) {
    if (this.cursorKind === kind) return;
    if (this.cursorKind) this.cursors.get(this.cursorKind)!.visible = false;
    this.cursorKind = kind;
    if (!kind) return;
    if (!this.cursors.has(kind)) {
      const inst = createInstrument(kind);
      inst.visible = false;
      this.cursors.set(kind, inst);
      this.root.add(inst);
    }
    this.cursorClosed = this.cursorClosedTarget = kind === "needle" ? 1 : 0;
    this.cursors.get(kind)!.userData.setClosed?.(this.cursorClosed);
  }

  /** Moves the active instrument to the surface under the cursor. */
  updateCursor(hit: Hit | null, camera: THREE.Camera) {
    const inst = this.cursorKind ? this.cursors.get(this.cursorKind) : null;
    if (!inst) return;
    inst.visible = !!hit;
    if (!hit) {
      this.lastCursorPoint = null;
      return;
    }
    if (this.lastCursorPoint) {
      const d = hit.point.clone().sub(this.lastCursorPoint);
      if (d.length() > 0.002) this.travel.lerp(d.normalize(), 0.35).normalize();
    } else {
      // default: travel to the right of the screen, so the handle trails towards the viewer's left
      this.travel.set(1, 0, 0).applyQuaternion(camera.quaternion);
    }
    this.lastCursorPoint = hit.point.clone();
    orientInstrument(inst, hit.point.clone().addScaledVector(hit.normal, 0.0004), hit.normal, this.travel);
    // Flat instruments are edge-on when seen from straight above: roll them a
    // little towards the viewer, the way a surgeon's hand naturally cants them.
    if (this.cursorKind === "scalpel" || this.cursorKind === "forceps") {
      const face = new THREE.Vector3(0, 0, 1).applyQuaternion(inst.quaternion);
      const toEye = camera.position.clone().sub(hit.point);
      inst.rotateX(face.dot(toEye) >= 0 ? -0.55 : 0.55);
    }
  }

  pressCursor(down: boolean) {
    this.cursorClosedTarget = down || this.cursorKind === "needle" ? 1 : 0;
  }

  /** Leaves a copy of an instrument in the field, optionally moving with a structure. */
  placeInstrument(kind: InstrumentKind, point: THREE.Vector3, normal: THREE.Vector3, travel: THREE.Vector3, attachTo?: string) {
    const inst = createInstrument(kind);
    inst.userData.setClosed?.(1);
    orientInstrument(inst, point, normal, travel);
    return this.addProp(inst, attachTo);
  }

  /** A tied ligature around a tubular structure. */
  placeLigature(point: THREE.Vector3, axis: THREE.Vector3, radius: number, attachTo?: string) {
    const g = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: "#6b3fa0", roughness: 0.55, sheen: 0.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.00055, 8, 40), mat);
    g.add(ring);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 10, 8), mat);
    knot.position.set(radius, 0, 0);
    g.add(knot);
    for (const s of [1, -1]) {
      const tail = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(radius, 0, 0),
            new THREE.Vector3(radius + 0.003, s * 0.0015, 0.002),
            new THREE.Vector3(radius + 0.0055, s * 0.0025, 0.0035),
          ]),
          10,
          0.0004,
          6,
        ),
        mat,
      );
      g.add(tail);
    }
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis.clone().normalize());
    g.position.copy(point);
    g.traverse((o) => (o.raycast = () => {}));
    return this.addProp(g, attachTo);
  }

  private addProp(obj: THREE.Object3D, attachTo?: string, stroke?: number) {
    const attach = attachTo ? this.entries.get(attachTo) ?? null : null;
    const prop: Prop = {
      id: this.nextPropId++,
      obj,
      attach,
      offset: attach ? obj.position.clone().sub(attach.mesh.position) : new THREE.Vector3(),
      stroke,
    };
    this.props.push(prop);
    this.root.add(obj);
    return prop.id;
  }

  removeInstrument(id: number) {
    const p = this.props.find((x) => x.id === id);
    if (!p) return;
    this.root.remove(p.obj);
    this.props = this.props.filter((x) => x !== p);
  }

  clearInstruments() {
    for (const p of this.props) this.root.remove(p.obj);
    this.props = [];
    this.retractorProps.clear();
  }

  /* ---------------- landmarks & guides ---------------- */

  private find(re: RegExp) {
    for (const e of this.entries.values()) if (re.test(e.part.name)) return e;
    return null;
  }

  private eachWorldVertex(entry: Entry, cb: (v: THREE.Vector3) => void, stride = 1) {
    entry.mesh.updateMatrixWorld(true);
    const pos = entry.mesh.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += stride) cb(v.fromBufferAttribute(pos, i).applyMatrix4(entry.mesh.matrixWorld));
  }

  /** Projects a point onto the front of the skin. */
  private skinAt(x: number, y: number, skin: Entry) {
    this.raycaster.set(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
    const h = this.raycaster.intersectObject(skin.mesh, false)[0];
    return h ? { point: h.point.clone(), normal: this.normalOf(h) } : null;
  }

  computeLandmarks(): Landmarks | null {
    const skin = this.find(/^skin$/i);
    const hip = this.find(/^right hip bone$/i);
    const app = this.find(/^appendix$/i);
    const colon = this.find(/^colon$/i);
    if (!skin || !hip || !app || !colon) return null;

    // Anterior superior iliac spine: most anterior point of the upper (iliac) half of the hip bone
    const hipBox = new THREE.Box3().setFromObject(hip.mesh);
    const midY = (hipBox.min.y + hipBox.max.y) / 2;
    const asisBone = new THREE.Vector3(0, 0, -Infinity);
    this.eachWorldVertex(hip, (v) => {
      if (v.y > midY && v.z > asisBone.z) asisBone.copy(v);
    });
    const asis = this.skinAt(asisBone.x, asisBone.y, skin)?.point ?? asisBone;

    // Umbilicus: the deepest dimple on the anterior midline above the ASIS
    let best = { y: asis.y + 0.08, depth: -Infinity };
    const zAt = (y: number) => this.skinAt(0, y, skin)?.point.z ?? 0;
    for (let y = asis.y + 0.02; y < asis.y + 0.22; y += 0.002) {
      const depth = (zAt(y - 0.012) + zAt(y + 0.012)) / 2 - zAt(y);
      if (depth > best.depth) best = { y, depth };
    }
    const umbilicus = this.skinAt(0, best.y, skin)?.point ?? new THREE.Vector3(0, best.y, 0.1);

    // McBurney's point: one third of the way from the ASIS to the umbilicus
    const mcb2d = asis.clone().lerp(umbilicus, 1 / 3);
    const mc = this.skinAt(mcb2d.x, mcb2d.y, skin)!;

    // Gridiron incision: perpendicular to the spino-umbilical line, centred on McBurney's point
    const d = new THREE.Vector2(umbilicus.x - asis.x, umbilicus.y - asis.y).normalize();
    const perp = new THREE.Vector2(-d.y, d.x);
    const guide: V3[] = [];
    for (let i = 0; i <= 14; i++) {
      const s = (i / 14 - 0.5) * 0.065;
      const p = this.skinAt(mc.point.x + perp.x * s, mc.point.y + perp.y * s, skin);
      if (p) guide.push(v3(p.point));
    }

    // Appendix base = the end touching the caecum; tip = farthest point from it
    const colonPts: THREE.Vector3[] = [];
    this.eachWorldVertex(colon, (v) => colonPts.push(v.clone()), 3);
    const base = new THREE.Vector3();
    let bestD = Infinity;
    this.eachWorldVertex(app, (v) => {
      for (const c of colonPts) {
        const dd = v.distanceToSquared(c);
        if (dd < bestD) {
          bestD = dd;
          base.copy(v);
        }
      }
    }, 2);
    const tip = base.clone();
    let far = 0;
    this.eachWorldVertex(app, (v) => {
      const dd = v.distanceTo(base);
      if (dd > far) {
        far = dd;
        tip.copy(v);
      }
    });

    return {
      asis: v3(asis),
      umbilicus: v3(umbilicus),
      mcburney: v3(mc.point),
      mcburneyNormal: v3(mc.normal),
      guide,
      appendixBase: v3(base),
      appendixTip: v3(tip),
      appendixId: app.part.id,
    };
  }

  /** Current world position of a point that was measured on a structure before it moved. */
  movedPoint(partId: string, p: V3): V3 {
    const e = this.entries.get(partId);
    if (!e) return p;
    return v3(vec(p).add(e.mesh.position).sub(e.basePosition));
  }

  showMarkers(markers: Marker[]) {
    this.markerGroup.clear();
    for (const m of markers) {
      const g = new THREE.Group();
      const size = m.size ?? 0.012;
      const mat = new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.9, depthTest: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.75, size, 40), mat);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(size * 0.18, 20), mat);
      g.add(ring, dot);
      g.position.copy(vec(m.point)).addScaledVector(vec(m.normal), 0.001);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vec(m.normal));
      g.renderOrder = 10;
      g.traverse((o) => {
        o.raycast = () => {};
        o.renderOrder = 10;
      });
      this.markerGroup.add(g);
    }
  }

  /** Dashed surgical skin-marker line along the planned incision. */
  showGuide(points: V3[] | null) {
    this.guideGroup.clear();
    if (!points || points.length < 2) return;
    const curve = new THREE.CatmullRomCurve3(points.map(vec));
    const mat = new THREE.MeshBasicMaterial({ color: "#7c3aed", transparent: true, opacity: 0.85, depthWrite: false });
    const n = 22;
    for (let i = 0; i < n; i += 2) {
      const seg = new THREE.CatmullRomCurve3([curve.getPoint(i / n), curve.getPoint((i + 1) / n)]);
      const m = new THREE.Mesh(new THREE.TubeGeometry(seg, 2, 0.0007, 6), mat);
      m.raycast = () => {};
      this.guideGroup.add(m);
    }
  }

  /** Draws a tutorial's incision lines and port sites on the skin, from front-view (x, y) coordinates. */
  showPlan(plan: SkinPlan | null) {
    this.planGroup.clear();
    const skin = this.find(/^skin$/i);
    if (!plan || !skin) return;
    const origin = this.region(new RegExp(plan.anchor, "i"));
    if (!origin) return;
    const ox = origin.c.x;
    const oy = origin.c.y;
    const lineMat = new THREE.MeshBasicMaterial({ color: "#a78bfa", transparent: true, opacity: 0.95, depthWrite: false });
    for (const line of plan.lines ?? []) {
      const pts: THREE.Vector3[] = [];
      const spline = new THREE.SplineCurve(line.map((p) => new THREE.Vector2(ox + p[0], oy + p[1])));
      for (const q of spline.getPoints(28)) {
        const hit = this.skinAt(q.x, q.y, skin);
        if (hit) pts.push(hit.point.addScaledVector(hit.normal, 0.0008));
      }
      if (pts.length < 2) continue;
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0011, 6), lineMat);
      mesh.raycast = () => {};
      this.planGroup.add(mesh);
    }
    for (const pt of plan.points ?? []) {
      const hit = this.skinAt(ox + pt.at[0], oy + pt.at[1], skin);
      if (!hit) continue;
      const size = pt.size ?? 0.008;
      const mat = new THREE.MeshBasicMaterial({ color: pt.color ?? "#fbbf24", transparent: true, opacity: 0.95, depthTest: false });
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.RingGeometry(size * 0.7, size, 36), mat), new THREE.Mesh(new THREE.CircleGeometry(size * 0.2, 16), mat));
      g.position.copy(hit.point).addScaledVector(hit.normal, 0.001);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hit.normal);
      g.traverse((o) => {
        o.raycast = () => {};
        o.renderOrder = 10;
      });
      this.planGroup.add(g);
    }
  }

  /* ---------------- delivering a structure into the wound ---------------- */

  /** Smoothly moves a structure so that `anchor` (a point on it) arrives at `target`. */
  deliver(partId: string, anchor: V3, target: V3) {
    const e = this.entries.get(partId);
    if (!e) return;
    const delta = vec(target).sub(vec(anchor));
    e.deliver = { from: e.mesh.position.clone(), t: 0 };
    e.home = e.basePosition.clone().add(delta);
  }

  resetPositions() {
    for (const e of this.entries.values()) {
      e.home.copy(e.basePosition);
      e.deliver = null;
      e.mesh.position.copy(e.basePosition);
    }
  }

  /* ---------------- layers under the blade ---------------- */

  /**
   * The structures the blade would meet at this cursor position, from the surface
   * inwards, each flagged with whether it is already cut open at that point.
   * The first entry with cut = false is the layer the next stroke will divide.
   */
  layerStack(ndc: THREE.Vector2, camera: THREE.Camera, max = 6): LayerInfo[] {
    this.setRay(ndc, camera);
    const out: LayerInfo[] = [];
    const seen = new Set<Entry>();
    let first = -1;
    for (const h of this.raycaster.intersectObjects(this.pickables, false)) {
      const entry = this.entries.get(h.object.userData.partId);
      if (!entry || seen.has(entry)) continue;
      if (entry.part.system === "integumentary" && this.skinOpacity < 0.5) continue;
      if (this.sliceOn && this.plane.distanceToPoint(h.point) < 0) continue;
      seen.add(entry);
      if (first < 0) first = h.distance;
      if (h.distance - first > 0.12) break;
      const cut = entry.incisions.length > 0 && insideIncision(h.point, entry.incisions);
      out.push({ partId: entry.part.id, name: entry.part.name, system: entry.part.system, cut });
      // once past the first uncut layer, a couple more are enough to show what is next
      const uncut = out.filter((l) => !l.cut).length;
      if (out.length >= max || uncut >= 3) break;
    }
    return out;
  }

  /** What lies beneath a point of the surface (e.g. the middle of a cut), from the surface inwards. */
  layersBelow(point: V3, normal: V3, max = 5): LayerInfo[] {
    const n = vec(normal).normalize();
    this.raycaster.set(vec(point).addScaledVector(n, 0.02), n.clone().negate());
    const out: LayerInfo[] = [];
    const seen = new Set<Entry>();
    for (const h of this.raycaster.intersectObjects(this.pickables, false)) {
      const entry = this.entries.get(h.object.userData.partId);
      if (!entry || seen.has(entry)) continue;
      seen.add(entry);
      const cut = entry.incisions.length > 0 && insideIncision(h.point, entry.incisions);
      out.push({ partId: entry.part.id, name: entry.part.name, system: entry.part.system, cut });
      if (out.length >= max || out.filter((l) => !l.cut).length >= 2) break;
    }
    return out;
  }

  /** World-space centre of the structures whose name matches. */
  matchCenter(re: RegExp): V3 | null {
    const r = this.region(re);
    return r ? v3(r.c) : null;
  }

  /** Resolves a skin plan to world points on the skin (ports, incision lines). */
  planWorld(plan: SkinPlan): { points: V3[]; lines: V3[][] } {
    const skin = this.find(/^skin$/i);
    const origin = this.region(new RegExp(plan.anchor, "i"));
    const out = { points: [] as V3[], lines: [] as V3[][] };
    if (!skin || !origin) return out;
    for (const p of plan.points ?? []) {
      const h = this.skinAt(origin.c.x + p.at[0], origin.c.y + p.at[1], skin);
      out.points.push(h ? v3(h.point) : [origin.c.x + p.at[0], origin.c.y + p.at[1], 0]);
    }
    for (const line of plan.lines ?? []) {
      const pts: V3[] = [];
      const spline = new THREE.SplineCurve(line.map((p) => new THREE.Vector2(origin.c.x + p[0], origin.c.y + p[1])));
      for (const q of spline.getPoints(24)) {
        const h = this.skinAt(q.x, q.y, skin);
        if (h) pts.push(v3(h.point));
      }
      out.lines.push(pts);
    }
    return out;
  }

  /** Puts an instrument, ligature, mesh or implant on a structure as the result of a practice action. */
  applyEffect(effect: PracticeEffect, partId: string, point: V3, normal: V3) {
    const e = this.entries.get(partId);
    const p = vec(point);
    const n = vec(normal).normalize();
    const size = e ? new THREE.Vector3(...e.part.size) : new THREE.Vector3(0.03, 0.03, 0.03);
    const major =
      size.x >= size.y && size.x >= size.z ? new THREE.Vector3(1, 0, 0) : size.y >= size.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const minor = Math.min(size.x, size.y, size.z);
    const mat = (color: string, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, ...o });
    const quiet = (g: THREE.Object3D) => g.traverse((o) => (o.raycast = () => {}));

    if (effect === "hold") {
      const travel = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0));
      if (travel.lengthSq() < 1e-4) travel.set(1, 0, 0);
      this.placeInstrument("babcock", p, n, travel.normalize(), partId);
    } else if (effect === "clamp") {
      const travel = new THREE.Vector3().crossVectors(n, major);
      if (travel.lengthSq() < 1e-4) travel.set(1, 0, 0);
      this.placeInstrument("clamp", p, n, travel.normalize(), partId);
    } else if (effect === "tie") {
      this.placeLigature(p.clone().addScaledVector(n, -minor * 0.15), major, THREE.MathUtils.clamp(minor * 0.6, 0.003, 0.02), partId);
    } else if (effect === "mesh") {
      const g = new THREE.Group();
      const sheet = new THREE.Mesh(
        new THREE.PlaneGeometry(0.07, 0.045),
        mat("#8fb4ff", { transparent: true, opacity: 0.8, side: THREE.DoubleSide, roughness: 0.8 }),
      );
      g.add(sheet);
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.07, 0.045)), new THREE.LineBasicMaterial({ color: "#dbe7ff" })));
      for (let i = 1; i < 7; i++) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.035 + i * 0.01, -0.0225, 0.0001),
          new THREE.Vector3(-0.035 + i * 0.01, 0.0225, 0.0001),
        ]);
        g.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: "#c7d8ff", transparent: true, opacity: 0.6 })));
      }
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      g.position.copy(p).addScaledVector(n, 0.0012);
      quiet(g);
      this.addProp(g);
    } else if (effect === "ring") {
      // prosthetic valve sewing ring at the base of a vessel
      const r = THREE.MathUtils.clamp(Math.min(size.x, size.z) * 0.5, 0.008, 0.03);
      const ring = new THREE.Group();
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 12, 36), mat("#d9b24a", { metalness: 0.9, roughness: 0.25 })));
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, r * 0.1, 10, 28), mat("#f3f0e8", { roughness: 0.5 })));
      ring.rotation.x = Math.PI / 2;
      const holder = new THREE.Group();
      holder.add(ring);
      const c = e ? new THREE.Box3().setFromObject(e.mesh) : null;
      holder.position.set(c ? (c.min.x + c.max.x) / 2 : p.x, c ? c.min.y + r * 0.35 : p.y, c ? (c.min.z + c.max.z) / 2 : p.z);
      quiet(holder);
      this.addProp(holder, partId);
    } else if (effect === "tube") {
      // tracheostomy tube: a cuffed tube entering along the surface normal, with a neck flange
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.05, 20), mat("#e9eef2", { roughness: 0.3, clearcoat: 0.6 }));
      body.rotation.x = Math.PI / 2;
      body.position.z = -0.0125;
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.0025, 24), mat("#cfd8df"));
      flange.rotation.x = Math.PI / 2;
      flange.position.z = 0.012;
      const cuff = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 12), mat("#5aa8ff", { transparent: true, opacity: 0.75 }));
      cuff.scale.set(1, 1, 1.5);
      cuff.position.z = -0.03;
      g.add(body, flange, cuff);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      g.position.copy(p);
      quiet(g);
      this.addProp(g);
    } else if (effect === "kidney") {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 20), mat("#7d3324", { roughness: 0.45, clearcoat: 0.3 }));
      k.scale.set(0.045, 0.1, 0.035);
      const g = new THREE.Group();
      g.add(k);
      g.position.copy(p).addScaledVector(n, 0.03);
      g.rotation.z = -0.35;
      quiet(g);
      this.lastKidney = g.position.clone();
      this.addProp(g);
    } else if (effect === "ureter") {
      const from = this.lastKidney ?? p.clone().add(new THREE.Vector3(0.03, 0.05, 0.02));
      const mid = from.clone().lerp(p, 0.5).addScaledVector(n, 0.012);
      const curve = new THREE.CatmullRomCurve3([from.clone().add(new THREE.Vector3(0, -0.045, 0)), mid, p.clone().addScaledVector(n, 0.002)]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0022, 10), mat("#e7c8a0", { roughness: 0.5 }));
      quiet(tube);
      this.addProp(tube);
    } else if (effect === "cap" || effect === "tray") {
      // femoral component on the end of the thigh bone / tibial tray on the top of the shin
      const c = e ? new THREE.Box3().setFromObject(e.mesh) : new THREE.Box3(p.clone().subScalar(0.02), p.clone().addScalar(0.02));
      const ctr = c.getCenter(new THREE.Vector3());
      const w = Math.max(0.02, Math.min(c.max.x - c.min.x, c.max.z - c.min.z) * 0.95);
      const g = new THREE.Group();
      if (effect === "cap") {
        const shell = new THREE.Mesh(
          new THREE.SphereGeometry(w / 2, 28, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
          mat("#c9d1d9", { metalness: 1, roughness: 0.2, side: THREE.DoubleSide }),
        );
        shell.scale.y = 0.55;
        g.add(shell);
        g.position.set(ctr.x, c.min.y + 0.002, ctr.z);
      } else {
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.004, 32), mat("#c9d1d9", { metalness: 1, roughness: 0.25 })));
        const insert = new THREE.Mesh(new THREE.CylinderGeometry(w / 2.2, w / 2.2, 0.006, 32), mat("#f2f4f6", { roughness: 0.6 }));
        insert.position.y = 0.005;
        g.add(insert);
        g.position.set(ctr.x, c.max.y + 0.002, ctr.z);
      }
      quiet(g);
      this.addProp(g, partId);
    }
  }

  /* ---------------- scalpel ---------------- */

  /**
   * Surfaces the blade passes through at this cursor position. In "layer" mode
   * that is only the first visible surface; in "wall" mode it is every layer of
   * the body wall (skin, muscles, fasciae) down to the first organ or bone,
   * limited to a few centimetres of depth.
   */
  private bladeHits(ndc: THREE.Vector2, camera: THREE.Camera, mode: CutDepth): Hit[] {
    const d = this.drawing;
    this.setRay(ndc, camera);
    // wall mode may keep to the layers already being cut; layer mode must always see the true first surface
    const raw = this.raycaster.intersectObjects(d && d.mode === "wall" ? this.drawingTargets(d) : this.pickables, false);
    const out: Hit[] = [];
    const seen = new Set<Entry>();
    let firstDepth = -1;
    for (const h of raw) {
      const entry = this.entries.get(h.object.userData.partId);
      if (!entry || seen.has(entry)) continue;
      if (entry.part.system === "integumentary" && this.skinOpacity < 0.5) continue;
      if (this.sliceOn && this.plane.distanceToPoint(h.point) < 0) continue;
      const current = d?.incisions.get(entry);
      const others = current ? entry.incisions.filter((i) => i !== current) : entry.incisions;
      if (others.length && insideIncision(h.point, others)) continue;
      seen.add(entry);
      if (firstDepth < 0) firstDepth = h.distance;
      if (h.distance - firstDepth > WALL_DEPTH) break;
      const wall = WALL_SYSTEMS.has(entry.part.system);
      if (mode === "wall" && !wall && out.length) break;
      out.push({ partId: entry.part.id, point: h.point.clone(), normal: this.normalOf(h) });
      if (mode === "layer" || !wall) break;
    }
    return out;
  }

  /** While drawing in layer mode only the structure being cut can be hit. */
  private drawingTargets(d: Drawing) {
    if (d.mode === "wall") return this.pickables;
    return [...d.incisions.keys()].map((e) => e.mesh);
  }

  private startIncision(entry: Entry, hit: Hit, stroke: number) {
    if (segmentCount(entry.incisions) >= MAX_CUT_SEGMENTS - 2) return null;
    const incision: Incision = {
      id: this.nextIncisionId++,
      stroke,
      partId: entry.part.id,
      points: [hit.point.clone()],
      normals: [hit.normal.clone()],
      open: 0.0015,
      createdAt: sharedTime.value,
    };
    entry.incisions.push(incision);
    enableCutting(entry.material);
    return incision;
  }

  beginIncision(ndc: THREE.Vector2, camera: THREE.Camera, mode: CutDepth): boolean {
    const hits = this.bladeHits(ndc, camera, mode);
    if (!hits.length) return false;
    const stroke = this.nextStrokeId++;
    const incisions = new Map<Entry, Incision>();
    for (const hit of hits) {
      const entry = this.entries.get(hit.partId)!;
      const inc = this.startIncision(entry, hit, stroke);
      if (inc) incisions.set(entry, inc);
    }
    if (!incisions.size) return false;
    this.drawing = { stroke, mode, incisions };
    this.updateCursor(hits[0], camera);
    return true;
  }

  extendIncision(ndc: THREE.Vector2, camera: THREE.Camera) {
    const d = this.drawing;
    if (!d) return;
    const hits = this.bladeHits(ndc, camera, d.mode);
    if (!hits.length) return;
    this.updateCursor(hits[0], camera);
    for (const hit of hits) {
      const entry = this.entries.get(hit.partId)!;
      const inc = d.incisions.get(entry);
      if (!inc) {
        // the blade reached a new layer mid-stroke (full-thickness mode)
        const started = d.mode === "wall" ? this.startIncision(entry, hit, d.stroke) : null;
        if (started) d.incisions.set(entry, started);
        continue;
      }
      const pts = inc.points;
      const dist = hit.point.distanceTo(pts[pts.length - 1]);
      // a long jump means the ray went through the opening to the far side
      if (dist < STEP || dist > 0.05) continue;
      if (segmentCount(entry.incisions) >= MAX_CUT_SEGMENTS) continue;
      // blend with the previous point so a shaky hand still draws a clean, flowing line
      const prev = pts[pts.length - 1];
      const target = prev.clone().lerp(hit.point, SMOOTH + (1 - SMOOTH) * Math.min(1, dist / 0.02) * 0.5);
      this.appendCurved(entry, inc, target, hit.normal);
      writeIncisions(entry.material, entry.incisions);
      if (hit === hits[0]) {
        this.blood.spawn(hit.point, hit.normal, 6);
        this.bladeBlood = Math.min(1, this.bladeBlood + 0.05);
      }
    }
  }

  /**
   * Adds the stretch from the last incision point to `target` as a Hermite curve that leaves the
   * line along its current direction, so quick strokes bend smoothly instead of forming corners.
   */
  private appendCurved(entry: Entry, inc: Incision, target: THREE.Vector3, normal: THREE.Vector3) {
    const pts = inc.points;
    const p0 = pts[pts.length - 1];
    const gap = p0.distanceTo(target);
    const n = Math.max(1, Math.min(6, Math.round(gap / STEP)));
    const n0 = inc.normals[inc.normals.length - 1];
    const dir = target.clone().sub(p0).normalize();
    // tangent at the start: the direction the line was already travelling (if it has one)
    const m0 = pts.length >= 2 ? p0.clone().sub(pts[pts.length - 2]).normalize() : dir.clone();
    if (m0.dot(dir) < 0.2) m0.copy(dir); // sharp turn: do not overshoot
    m0.multiplyScalar(gap);
    const m1 = dir.multiplyScalar(gap);
    for (let k = 1; k <= n; k++) {
      if (segmentCount(entry.incisions) >= MAX_CUT_SEGMENTS) return;
      const s = k / n;
      const s2 = s * s;
      const s3 = s2 * s;
      const p = new THREE.Vector3()
        .addScaledVector(p0, 2 * s3 - 3 * s2 + 1)
        .addScaledVector(m0, s3 - 2 * s2 + s)
        .addScaledVector(target, -2 * s3 + 3 * s2)
        .addScaledVector(m1, s3 - s2);
      pts.push(p);
      inc.normals.push(n0.clone().lerp(normal, s).normalize());
    }
  }

  endIncision(): IncisionInfo | null {
    const d = this.drawing;
    this.drawing = null;
    if (!d) return null;
    for (const [entry, inc] of d.incisions) {
      if (inc.points.length >= 2) continue;
      entry.incisions = entry.incisions.filter((i) => i !== inc);
      writeIncisions(entry.material, entry.incisions);
    }
    this.emitIncisions();
    return this.strokeInfo(d.stroke);
  }

  get isDrawing() {
    return !!this.drawing;
  }

  get isSuturing() {
    return !!this.suturing;
  }

  /* ---------------- retractor ---------------- */

  /** All incision strokes near the cursor ray (within 4 cm) — a retractor pulls every layer of a wound. */
  strokesNear(ndc: THREE.Vector2, camera: THREE.Camera): number[] {
    this.setRay(ndc, camera);
    const ray = this.raycaster.ray;
    const out = new Set<number>();
    for (const e of this.entries.values()) {
      if (!e.mesh.visible) continue;
      for (const inc of e.incisions) if (inc.points.some((p) => ray.distanceToPoint(p) < 0.04)) out.add(inc.stroke);
    }
    return [...out].sort((a, b) => a - b);
  }

  getOpen(stroke: number) {
    return this.strokeIncisions(stroke)[0]?.incision.open ?? 0;
  }

  /** Eases a wound open (or shut) over a moment, the way tissue relaxes after the blade. */
  animateOpen(stroke: number, to: number, seconds = 0.7) {
    this.openTweens.set(stroke, { from: this.getOpen(stroke), to, t: 0, dur: Math.max(0.05, seconds) });
  }

  setOpen(stroke: number, open: number, emit = true) {
    this.openTweens.delete(stroke);
    this.applyOpen(stroke, open, emit);
  }

  private applyOpen(stroke: number, open: number, emit = true) {
    const list = this.strokeIncisions(stroke);
    const v = THREE.MathUtils.clamp(open, 0.0005, MAX_OPEN);
    // deeper layers open slightly less than the skin above them, like a real wound
    list.forEach(({ incision }, i) => (incision.open = v * Math.pow(0.9, i)));
    for (const entry of new Set(list.map((l) => l.entry))) writeIncisions(entry.material, entry.incisions);
    this.updateRetractors(stroke);
    this.rebuildStitches();
    if (emit) this.emitIncisions();
  }

  private updateOpenTweens(dt: number) {
    if (!this.openTweens.size) return;
    for (const [stroke, tw] of this.openTweens) {
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = 1 - Math.pow(1 - tw.t, 3); // ease-out
      const done = tw.t >= 1;
      this.applyOpen(stroke, tw.from + (tw.to - tw.from) * k, done);
      if (done) this.openTweens.delete(stroke);
    }
  }

  /** Two Langenbeck retractors holding the wound edges apart at the middle of the incision. */
  placeRetractors(stroke: number) {
    if (this.retractorProps.has(stroke)) return this.updateRetractors(stroke);
    const props: Prop[] = [];
    for (let i = 0; i < 2; i++) {
      const obj = createInstrument("retractor");
      this.root.add(obj);
      const prop: Prop = { id: this.nextPropId++, obj, attach: null, offset: new THREE.Vector3(), stroke };
      this.props.push(prop);
      props.push(prop);
    }
    this.retractorProps.set(stroke, props);
    this.updateRetractors(stroke);
  }

  private updateRetractors(stroke: number) {
    const props = this.retractorProps.get(stroke);
    const inc = this.strokeIncisions(stroke)[0]?.incision;
    if (!props || !inc) return;
    const frame = this.incisionFrame(inc, 0.5);
    if (!frame) return;
    const hw = openingHalfWidth(inc.open, 0.5);
    props.forEach((p, i) => {
      const s = i === 0 ? 1 : -1;
      const edge = frame.point.clone().addScaledVector(frame.side, s * hw);
      // +X of the retractor points into the wound, so the handle leads outwards
      orientInstrument(p.obj, edge, frame.normal, frame.side.clone().multiplyScalar(-s));
    });
  }

  private removeRetractors(stroke: number) {
    for (const p of this.retractorProps.get(stroke) ?? []) this.removeInstrument(p.id);
    this.retractorProps.delete(stroke);
  }

  /** Point, normal, tangent and side vector at parameter t along an incision. */
  private incisionFrame(inc: Incision, t: number) {
    const pts = inc.points;
    if (pts.length < 2) return null;
    const lengths = [0];
    for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = lengths[lengths.length - 1];
    const target = t * total;
    let i = 1;
    while (i < pts.length - 1 && lengths[i] < target) i++;
    const k = (target - lengths[i - 1]) / Math.max(lengths[i] - lengths[i - 1], 1e-9);
    const point = pts[i - 1].clone().lerp(pts[i], k);
    const normal = inc.normals[i - 1].clone().lerp(inc.normals[i], k).normalize();
    const tangent = pts[i].clone().sub(pts[i - 1]).normalize();
    const side = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    return { point, normal, tangent, side, total };
  }

  removeIncision(stroke: number) {
    this.openTweens.delete(stroke);
    for (const { entry, incision } of this.strokeIncisions(stroke)) {
      entry.incisions = entry.incisions.filter((i) => i !== incision);
      writeIncisions(entry.material, entry.incisions);
    }
    this.removeRetractors(stroke);
    this.stitches = this.stitches.filter((s) => s.stroke !== stroke);
    this.rebuildStitches();
    this.emitIncisions();
  }

  clearIncisions() {
    this.openTweens.clear();
    this.lastKidney = null;
    for (const e of this.entries.values()) {
      if (!e.incisions.length) continue;
      e.incisions = [];
      writeIncisions(e.material, []);
    }
    this.clearInstruments();
    this.stitches = [];
    this.rebuildStitches();
    this.bladeBlood = 0;
    this.emitIncisions();
  }

  /** Incisions of one stroke, ordered from the surface inwards. */
  private strokeIncisions(stroke: number) {
    const out: { entry: Entry; incision: Incision }[] = [];
    for (const entry of this.entries.values())
      for (const incision of entry.incisions) if (incision.stroke === stroke) out.push({ entry, incision });
    return out.sort((a, b) => a.incision.id - b.incision.id);
  }

  private strokeInfo(stroke: number): IncisionInfo | null {
    const list = this.strokeIncisions(stroke);
    if (!list.length) return null;
    const first = list[0].incision;
    const pts = first.points;
    let length = 0;
    for (let i = 1; i < pts.length; i++) length += pts[i].distanceTo(pts[i - 1]);
    const frame = this.incisionFrame(first, 0.5);
    const mid = frame?.point ?? pts[0];
    return {
      id: stroke,
      layers: list.map((l) => l.entry.part.name),
      partIds: list.map((l) => l.entry.part.id),
      open: first.open,
      length,
      mid: v3(mid),
      normal: frame ? v3(frame.normal) : [0, 0, 1],
      start: v3(pts[0]),
      end: v3(pts[pts.length - 1]),
    };
  }

  private emitIncisions() {
    const strokes = new Set<number>();
    for (const e of this.entries.values()) for (const inc of e.incisions) strokes.add(inc.stroke);
    this.onIncisionsChange([...strokes].sort((a, b) => a - b).map((s) => this.strokeInfo(s)!));
  }

  /* ---------------- suturing ---------------- */

  /** Starts closing the wound nearest to the needle. */
  beginSuture(hit: Hit): boolean {
    // the outermost (earliest) incision of the wound under the needle is the one that is sewn
    let target: Incision | null = null;
    const near = (inc: Incision) => inc.points.some((p, i) => lateralDistance(hit.point, p, inc.normals[i]) < inc.open + 0.03);
    // the layer the needle is actually touching comes first; otherwise the outermost wound nearby
    const under = this.entries.get(hit.partId);
    for (const inc of under?.incisions ?? []) if (near(inc) && (!target || inc.id < target.id)) target = inc;
    if (!target)
      for (const e of this.entries.values())
        for (const inc of e.incisions) if ((!target || inc.id < target.id) && near(inc)) target = inc;
    if (!target) return false;
    // all strokes of the same wound close together
    const strokes = new Set<number>();
    for (const e of this.entries.values())
      for (const inc of e.incisions)
        if (inc.points.some((p) => target!.points.some((q) => q.distanceTo(p) < 0.02))) strokes.add(inc.stroke);
    const frame = this.incisionFrame(target, 0.5)!;
    const bins = new Array(Math.max(2, Math.round(frame.total / STITCH_SPACING))).fill(false);
    for (const s of this.stitches) if (s.stroke === target.stroke) bins[Math.min(bins.length - 1, Math.floor(s.t * bins.length))] = true;
    this.suturing = {
      target,
      strokes: [...strokes],
      startOpen: new Map([...strokes].map((s) => [s, this.getOpen(s)])),
      bins,
    };
    this.extendSuture(hit);
    return true;
  }

  extendSuture(hit: Hit): SutureInfo | null {
    const su = this.suturing;
    if (!su) return null;
    // parameter of the closest point on the target incision
    const pts = su.target.points;
    let acc = 0;
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += pts[i].distanceTo(pts[i - 1]);
    let best = { d: Infinity, t: 0 };
    const ab = new THREE.Vector3();
    const ap = new THREE.Vector3();
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = pts[i + 1].distanceTo(pts[i]);
      ab.subVectors(pts[i + 1], pts[i]);
      ap.subVectors(hit.point, pts[i]);
      const h = THREE.MathUtils.clamp(ap.dot(ab) / Math.max(ab.lengthSq(), 1e-10), 0, 1);
      const closest = pts[i].clone().add(ab.multiplyScalar(h));
      const d = lateralDistance(hit.point, closest, su.target.normals[i]);
      if (d < best.d) best = { d, t: (acc + seg * h) / total };
      acc += seg;
    }
    // the needle passes through the wound edges, which sit up to the opening's half width from the line
    if (best.d < openingHalfWidth(su.target.open, best.t) + 0.02) {
      const bin = Math.min(su.bins.length - 1, Math.floor(best.t * su.bins.length));
      if (!su.bins[bin]) {
        su.bins[bin] = true;
        this.stitches.push({ stroke: su.target.stroke, t: (bin + 0.5) / su.bins.length });
      }
    }
    const coverage = su.bins.filter(Boolean).length / su.bins.length;
    // each stitch pulls the edges together
    for (const s of su.strokes) this.setOpen(s, (su.startOpen.get(s) ?? 0) * (1 - coverage), false);
    this.rebuildStitches();
    return { stroke: su.target.stroke, coverage, complete: coverage >= 0.85 };
  }

  endSuture(): SutureInfo | null {
    const su = this.suturing;
    this.suturing = null;
    if (!su) return null;
    const coverage = su.bins.filter(Boolean).length / su.bins.length;
    const complete = coverage >= 0.85;
    if (complete) {
      su.bins.forEach((b, i) => {
        if (!b) this.stitches.push({ stroke: su.target.stroke, t: (i + 0.5) / su.bins.length });
      });
      for (const s of su.strokes) {
        this.setOpen(s, 0.0005, false);
        this.removeRetractors(s);
      }
      this.rebuildStitches();
    }
    this.emitIncisions();
    return { stroke: su.target.stroke, coverage: complete ? 1 : coverage, complete };
  }

  /** Interrupted nylon skin sutures, sized to the current wound gap. */
  private rebuildStitches() {
    this.stitchGroup.clear();
    if (!this.stitches.length) return;
    const mat = new THREE.MeshPhysicalMaterial({ color: "#1d2f6f", roughness: 0.35, clearcoat: 0.8 });
    for (const s of this.stitches) {
      const inc = this.strokeIncisions(s.stroke)[0]?.incision;
      if (!inc) continue;
      const f = this.incisionFrame(inc, s.t);
      if (!f) continue;
      const w = openingHalfWidth(inc.open, s.t) + 0.0035;
      const a = f.point.clone().addScaledVector(f.side, w).addScaledVector(f.normal, -0.0003);
      const b = f.point.clone().addScaledVector(f.side, -w).addScaledVector(f.normal, -0.0003);
      const top = f.point.clone().addScaledVector(f.normal, 0.0016);
      const loop = new THREE.CatmullRomCurve3([a, a.clone().lerp(top, 0.6).addScaledVector(f.normal, 0.0006), top, b.clone().lerp(top, 0.6).addScaledVector(f.normal, 0.0006), b]);
      this.stitchGroup.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 16, 0.00028, 6), mat));
      // knot and cut tails on one side
      const knotPos = f.point.clone().addScaledVector(f.side, w * 0.55).addScaledVector(f.normal, 0.0012);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0007, 8, 6), mat);
      knot.position.copy(knotPos);
      this.stitchGroup.add(knot);
      for (const sgn of [1, -1]) {
        const tail = new THREE.CatmullRomCurve3([
          knotPos,
          knotPos.clone().addScaledVector(f.tangent, sgn * 0.0025).addScaledVector(f.normal, 0.0012),
          knotPos.clone().addScaledVector(f.tangent, sgn * 0.004).addScaledVector(f.side, 0.001).addScaledVector(f.normal, 0.001),
        ]);
        this.stitchGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 6, 0.00025, 5), mat));
      }
    }
    this.stitchGroup.traverse((o) => (o.raycast = () => {}));
  }

  /* ---------------- per frame ---------------- */

  update(dt: number, elapsed: number) {
    sharedTime.value = elapsed;
    this.updateLive(dt);
    this.updateOpenTweens(dt);
    this.updateTrains(dt);
    this.pulseHighlights(elapsed, dt);
    let visibilityDirty = false;
    const ease = 1 - Math.exp(-dt * 6);
    const p = new THREE.Vector3();
    for (const e of this.entries.values()) {
      e.explodeNow.lerp(e.explode, ease);
      if (e.deliver) {
        e.deliver.t = Math.min(1, e.deliver.t + dt * 0.8);
        const k = THREE.MathUtils.smootherstep(e.deliver.t, 0, 1);
        e.mesh.position.lerpVectors(e.deliver.from, e.home, k);
        if (e.deliver.t >= 1) e.deliver = null;
        continue;
      }
      if (!e.removed) {
        p.copy(e.home).add(e.explodeNow).add(e.liveShift);
        if (e.livePivot) {
          p.sub(e.livePivot).multiply(e.liveScale).add(e.livePivot);
          e.mesh.scale.copy(e.baseScale).multiply(e.liveScale);
        } else if (!e.mesh.scale.equals(e.baseScale)) e.mesh.scale.copy(e.baseScale);
        if (!e.mesh.position.equals(p)) e.mesh.position.copy(p);
        continue;
      }
      if (e.lift >= 1) continue;
      // forceps: lift the structure up and out towards the viewer
      e.lift = Math.min(1, e.lift + dt * 1.1);
      const k = e.lift * e.lift;
      e.mesh.position.set(e.home.x, e.home.y + k * 0.25, e.home.z + k * 1.2);
      if (e.lift >= 1) visibilityDirty = true;
    }
    if (visibilityDirty) this.applyVisibility();

    // instruments that hold a structure travel with it
    for (const p of this.props) {
      if (!p.attach) continue;
      p.obj.position.copy(p.attach.mesh.position).add(p.offset);
      p.obj.visible = p.attach.mesh.visible;
    }

    // jaws close smoothly when the button is held
    if (this.cursorKind) {
      const inst = this.cursors.get(this.cursorKind)!;
      this.cursorClosed += (this.cursorClosedTarget - this.cursorClosed) * Math.min(1, dt * 14);
      inst.userData.setClosed?.(this.cursorClosed);
      inst.userData.setBlood?.(this.bladeBlood);
    }

    // pulsing landmark markers
    const pulse = 1 + Math.sin(elapsed * 4) * 0.12;
    this.markerGroup.children.forEach((m) => m.scale.setScalar(pulse));

    this.blood.update(dt);
  }

  dispose() {
    for (const e of this.entries.values()) {
      e.material.dispose();
      e.mesh.geometry.disposeBoundsTree();
    }
    if (this.clothing) {
      this.clothing.mesh.geometry.dispose();
      (this.clothing.mesh.material as THREE.Material).dispose();
      this.clothing = null;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

class BloodParticles {
  private count = 400;
  readonly mesh: THREE.InstancedMesh;
  private pos = Array.from({ length: this.count }, () => new THREE.Vector3());
  private vel = Array.from({ length: this.count }, () => new THREE.Vector3());
  private life = new Float32Array(this.count);
  private cursor = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();

  constructor() {
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshPhysicalMaterial({ color: "#7a0610", roughness: 0.15, clearcoat: 1 }),
      this.count,
    );
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    for (let i = 0; i < this.count; i++) this.write(i, 0);
  }

  spawn(at: THREE.Vector3, normal: THREE.Vector3, n: number) {
    for (let k = 0; k < n; k++) {
      const i = this.cursor++ % this.count;
      this.pos[i].copy(at).addScaledVector(normal, 0.0015);
      this.vel[i]
        .copy(normal)
        .multiplyScalar(0.02 + Math.random() * 0.03)
        .add(new THREE.Vector3((Math.random() - 0.5) * 0.03, Math.random() * 0.02, (Math.random() - 0.5) * 0.03));
      this.life[i] = 0.8 + Math.random() * 0.6;
    }
  }

  private write(i: number, scale: number) {
    this.s.setScalar(scale);
    this.m.compose(this.pos[i], this.q, this.s);
    this.mesh.setMatrixAt(i, this.m);
  }

  update(dt: number) {
    let any = false;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      this.vel[i].y -= 3.5 * dt;
      this.vel[i].multiplyScalar(0.98);
      this.pos[i].addScaledVector(this.vel[i], dt);
      this.write(i, this.life[i] > 0 ? 0.0011 * Math.min(1, this.life[i] * 2) : 0);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
