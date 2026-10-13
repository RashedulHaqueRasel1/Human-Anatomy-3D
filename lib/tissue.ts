import * as THREE from "three";

/**
 * Tissue material with real-time incisions.
 *
 * An incision is a polyline drawn on a mesh surface. The fragment shader opens
 * the surface along that line (discarding fragments inside a lens-shaped
 * opening), paints a wet, bleeding wound rim around it, and renders back faces
 * as cut tissue — so you can see straight through the opening into the next
 * layer, which can then be cut in turn.
 */

export const MAX_CUT_SEGMENTS = 48;
/** Half width of a fresh scalpel line (metres). */
export const SCALPEL_HALF_WIDTH = 0.0011;

/** Half width of the opening at parameter t (0..1) along an incision; mirrors the shader. */
export const openingHalfWidth = (open: number, t: number) => {
  const lens = Math.pow(Math.max(Math.sin(Math.PI * t), 0), 0.65);
  return SCALPEL_HALF_WIDTH * (0.35 + 0.65 * lens) + open * lens;
};
/** Width of the bloody wound rim around an opening (metres). */
export const RIM_WIDTH = 0.0045;

export type Incision = {
  id: number;
  /** Scalpel stroke this incision belongs to (one stroke can cut several layers). */
  stroke: number;
  partId: string;
  points: THREE.Vector3[];
  /** Surface normal at each point (used to place sutures and retractors). */
  normals: THREE.Vector3[];
  /** Extra half-width added at the middle of the incision by the retractor. */
  open: number;
  createdAt: number;
};

export type CutUniforms = {
  uCutA: { value: THREE.Vector4[] };
  uCutB: { value: THREE.Vector4[] };
  uCutP: { value: THREE.Vector2[] };
  uCutCount: { value: number };
  uInterior: { value: THREE.Color };
  uSkin: { value: number };
};

export const sharedTime = { value: 0 };
/** 1 = full procedural surface detail, 0 = flat shading (fast quality). */
export const sharedDetail = { value: 1 };

/**
 * Procedural surface detail that makes tissue read as living flesh rather than
 * moulded plastic: colour mottling, surface vessels, micro-relief and a soft
 * translucent rim (a cheap stand-in for subsurface scattering).
 */
export type Detail = {
  mottle: number;
  mottleColor: string;
  mottleFreq: number;
  veins: number;
  veinColor: string;
  veinFreq?: number;
  bump: number;
  bumpFreq: number;
  sss: number;
  sssColor: string;
  /** Per-axis noise scale; a small component stretches features along that axis (muscle fibres). */
  stretch?: [number, number, number];
};

export const DEFAULT_DETAIL: Detail = {
  mottle: 0.3,
  mottleColor: "#a86a60",
  mottleFreq: 45,
  veins: 0,
  veinColor: "#8a2a2a",
  bump: 0.15,
  bumpFreq: 140,
  sss: 0.25,
  sssColor: "#a8342a",
};

/**
 * Physiological "flow" roles. All structures of a role share one set of
 * uniforms, so the live mode animates every artery (or every airway…) by
 * changing a handful of numbers — no recompilation, no per-mesh updates.
 *
 * A bright band travels away from (dir = 1) or towards (dir = -1) an origin:
 *   phase = (offset + |p - origin| * scale) * freq - dir * time * speed
 */
export type FlowRole =
  | "artery"
  | "vein"
  | "pulmonaryArtery"
  | "pulmonaryVein"
  | "heart"
  | "airway"
  | "lung"
  | "gi"
  | "nerve"
  | "brain"
  | "kidney"
  | "urine"
  | "liver";

const FLOW_ROLES: FlowRole[] = [
  "artery",
  "vein",
  "pulmonaryArtery",
  "pulmonaryVein",
  "heart",
  "airway",
  "lung",
  "gi",
  "nerve",
  "brain",
  "kidney",
  "urine",
  "liver",
];

export type FlowUniforms = {
  uFlowColor: { value: THREE.Color };
  uFlowStrength: { value: number };
  uFlowOrigin: { value: THREE.Vector3 };
  uFlowDir: { value: number };
  uFlowSpeed: { value: number };
  uFlowFreq: { value: number };
  uFlowScale: { value: number };
};

export const flowUniforms: Record<FlowRole, FlowUniforms> = Object.fromEntries(
  FLOW_ROLES.map((r) => [
    r,
    {
      uFlowColor: { value: new THREE.Color(1, 1, 1) },
      uFlowStrength: { value: 0 },
      uFlowOrigin: { value: new THREE.Vector3() },
      uFlowDir: { value: 1 },
      uFlowSpeed: { value: 1 },
      uFlowFreq: { value: 40 },
      uFlowScale: { value: 1 },
    },
  ]),
) as Record<FlowRole, FlowUniforms>;

const v4s = () => Array.from({ length: MAX_CUT_SEGMENTS }, () => new THREE.Vector4());
const v2s = () => Array.from({ length: MAX_CUT_SEGMENTS }, () => new THREE.Vector2());

export type TissueOptions = {
  color: string;
  interior: string;
  roughness: number;
  clearcoat: number;
  sheen?: number;
  skin?: boolean;
  /** Physiological role for the live mode, and this structure's position along the flow path. */
  flow?: { role: FlowRole; offset: number };
  detail?: Detail;
};

export type TissueMaterial = THREE.MeshPhysicalMaterial & {
  userData: { cut: CutUniforms; baseColor: THREE.Color; role: FlowRole | null };
};

export function createTissueMaterial(o: TissueOptions, plane: THREE.Plane): TissueMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: o.color,
    emissive: o.color,
    emissiveIntensity: 0,
    roughness: o.roughness,
    clearcoat: o.clearcoat,
    clearcoatRoughness: 0.42,
    sheen: o.sheen ?? 0,
    sheenColor: new THREE.Color("#ffd9c7"),
    side: THREE.DoubleSide,
    clippingPlanes: [plane],
  }) as TissueMaterial;

  const cut: CutUniforms = {
    uCutA: { value: v4s() },
    uCutB: { value: v4s() },
    uCutP: { value: v2s() },
    uCutCount: { value: 0 },
    uInterior: { value: new THREE.Color(o.interior) },
    uSkin: { value: o.skin ? 1 : 0 },
  };
  m.userData.cut = cut;
  m.userData.baseColor = new THREE.Color(o.color);
  m.userData.role = o.flow?.role ?? null;
  const d = o.detail ?? DEFAULT_DETAIL;
  const detailU = {
    uDetail: sharedDetail,
    uDMottle: { value: d.mottle },
    uDMottleColor: { value: new THREE.Color(d.mottleColor) },
    uDFreq: { value: new THREE.Vector4(d.mottleFreq, d.veinFreq ?? d.mottleFreq * 1.6, d.bumpFreq, d.bump) },
    uDVeins: { value: d.veins },
    uDVeinColor: { value: new THREE.Color(d.veinColor) },
    uDSss: { value: d.sss },
    uDSssColor: { value: new THREE.Color(d.sssColor) },
    uDStretch: { value: new THREE.Vector3(...(d.stretch ?? [1, 1, 1])) },
  };
  const flow = o.flow ? { ...flowUniforms[o.flow.role], uFlowOffset: { value: o.flow.offset } } : null;
  if (flow) m.defines = { ...(m.defines ?? {}), TISSUE_FLOW: "" };

  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cut, detailU, { uTime: sharedTime }, flow ?? {});

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTissueWorld;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvTissueWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
varying vec3 vTissueWorld;
uniform vec3 uInterior;
uniform float uSkin;
uniform float uTime;
uniform float uDetail;
uniform float uDMottle;
uniform vec3 uDMottleColor;
uniform vec4 uDFreq;
uniform float uDVeins;
uniform vec3 uDVeinColor;
uniform float uDSss;
uniform vec3 uDSssColor;
uniform vec3 uDStretch;
#ifdef TISSUE_FLOW
uniform vec3 uFlowColor;
uniform float uFlowStrength;
uniform vec3 uFlowOrigin;
uniform float uFlowDir;
uniform float uFlowSpeed;
uniform float uFlowFreq;
uniform float uFlowScale;
uniform float uFlowOffset;
#endif
#ifdef TISSUE_CUT
uniform vec4 uCutA[${MAX_CUT_SEGMENTS}];
uniform vec4 uCutB[${MAX_CUT_SEGMENTS}];
uniform vec2 uCutP[${MAX_CUT_SEGMENTS}];
uniform int uCutCount;
#endif
float tissueHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float tissueNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(tissueHash(i), tissueHash(i + vec3(1,0,0)), f.x),
                 mix(tissueHash(i + vec3(0,1,0)), tissueHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(tissueHash(i + vec3(0,0,1)), tissueHash(i + vec3(1,0,1)), f.x),
                 mix(tissueHash(i + vec3(0,1,1)), tissueHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float tissueFbm(vec3 p) {
  return 0.6 * tissueNoise(p) + 0.28 * tissueNoise(p * 2.13 + 7.1) + 0.12 * tissueNoise(p * 4.37 + 19.3);
}`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        /* glsl */ `#include <clipping_planes_fragment>
float woundEdge = 1e3;   // signed distance to the opening (negative = inside)
float woundAge = 1e3;
#ifdef TISSUE_CUT
for (int i = 0; i < ${MAX_CUT_SEGMENTS}; i++) {
  if (i >= uCutCount) break;
  vec3 a = uCutA[i].xyz;
  vec3 b = uCutB[i].xyz;
  vec3 ab = b - a;
  float h = clamp(dot(vTissueWorld - a, ab) / max(dot(ab, ab), 1e-10), 0.0, 1.0);
  float d = length(vTissueWorld - a - ab * h);
  float t = mix(uCutA[i].w, uCutB[i].w, h);
  // lens shaped opening: widest in the middle of the incision, closed at the ends
  float lens = pow(max(sin(3.14159 * t), 0.0), 0.65);
  float wobble = (tissueNoise(vTissueWorld * 900.0) - 0.5) * 0.0007;
  float hw = ${SCALPEL_HALF_WIDTH.toFixed(5)} * (0.35 + 0.65 * lens) + uCutP[i].x * lens + wobble;
  float e = d - hw;
  if (e < woundEdge) { woundEdge = e; woundAge = uCutP[i].y; }
}
if (woundEdge < 0.0) discard;
#endif`,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
float wetness = 0.0;
float detailVar = 0.5;
if (uDetail > 0.5 && gl_FrontFacing) {
  vec3 dp = vTissueWorld * uDStretch;
  float n1 = tissueFbm(dp * uDFreq.x);
  float n2 = tissueFbm(dp * uDFreq.x * 3.1 + 11.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, uDMottleColor, smoothstep(0.38, 0.72, n1) * uDMottle);
  diffuseColor.rgb *= 0.86 + 0.28 * n2;
  if (uDVeins > 0.0) {
    float r = 1.0 - abs(2.0 * tissueFbm(dp * uDFreq.y + 5.3) - 1.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, uDVeinColor, smoothstep(0.88, 0.975, r) * uDVeins);
  }
  detailVar = n2;
}
if (!gl_FrontFacing) {
  // cut tissue seen from inside: darker, fibrous
  float n = tissueNoise(vTissueWorld * 260.0);
  diffuseColor.rgb = uInterior * (0.75 + 0.35 * n);
  wetness = 0.6;
}
#ifdef TISSUE_CUT
if (woundEdge < ${RIM_WIDTH.toFixed(4)}) {
  float k = 1.0 - woundEdge / ${RIM_WIDTH.toFixed(4)};
  float n = tissueNoise(vTissueWorld * 420.0);
  // bleeding spreads outward over the first seconds after the cut
  float spread = clamp((uTime - woundAge) * 0.7, 0.15, 1.0);
  float blood = smoothstep(1.0 - spread, 1.0, k + (n - 0.5) * 0.5);
  vec3 bloodCol = mix(vec3(0.42, 0.02, 0.03), vec3(0.62, 0.05, 0.06), n);
  vec3 col = diffuseColor.rgb;
  if (uSkin > 0.5) {
    // skin: epidermis -> yellow subcutaneous fat right at the cut edge
    col = mix(col, vec3(0.93, 0.78, 0.45), smoothstep(0.55, 0.95, k) * (1.0 - blood));
  }
  diffuseColor.rgb = mix(col, bloodCol, blood);
  wetness = max(wetness, blood);
}
#endif`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
#ifdef TISSUE_FLOW
if (uFlowStrength > 0.0) {
  float d = uFlowOffset + distance(vTissueWorld, uFlowOrigin) * uFlowScale;
  float ph = d * uFlowFreq - uFlowDir * uTime * uFlowSpeed;
  float band = pow(0.5 + 0.5 * sin(ph), 6.0);
  float shimmer = 0.75 + 0.25 * tissueNoise(vTissueWorld * 300.0 + uTime);
  totalEmissiveRadiance += uFlowColor * band * shimmer * uFlowStrength;
}
#endif
if (uDetail > 0.5 && uDSss > 0.0) {
  float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4);
  totalEmissiveRadiance += uDSssColor * rim * uDSss * 0.55;
}`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.18, wetness);\nroughnessFactor = clamp(roughnessFactor * (0.72 + 0.56 * detailVar), 0.06, 1.0);",
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
if (uDetail > 0.5 && uDFreq.w > 0.0) {
  vec3 bp = vTissueWorld * uDStretch * uDFreq.z;
  float h0 = tissueFbm(bp);
  vec3 g = vec3(tissueFbm(bp + vec3(0.3, 0.0, 0.0)) - h0, tissueFbm(bp + vec3(0.0, 0.3, 0.0)) - h0, tissueFbm(bp + vec3(0.0, 0.0, 0.3)) - h0) / 0.3;
  vec3 gv = (viewMatrix * vec4(g * uDStretch, 0.0)).xyz;
  normal = normalize(normal - uDFreq.w * (gv - dot(gv, normal) * normal));
}`,
      );
  };

  m.customProgramCacheKey = () =>
    `tissue${m.defines?.TISSUE_CUT !== undefined ? "-cut" : ""}${m.defines?.TISSUE_FLOW !== undefined ? "-flow" : ""}`;
  return m;
}

/** Turns on the incision code path for a material the first time it is cut. */
export function enableCutting(m: TissueMaterial) {
  if (m.defines?.TISSUE_CUT !== undefined) return;
  m.defines = { ...(m.defines ?? {}), TISSUE_CUT: "" };
  m.needsUpdate = true;
}

/** Packs all incisions of one structure into its uniform arrays. */
export function writeIncisions(m: TissueMaterial, incisions: Incision[]) {
  const u = m.userData.cut;
  let n = 0;
  for (const inc of incisions) {
    const pts = inc.points;
    if (pts.length < 2) continue;
    const lengths = [0];
    for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = lengths[lengths.length - 1] || 1;
    for (let i = 0; i < pts.length - 1 && n < MAX_CUT_SEGMENTS; i++, n++) {
      u.uCutA.value[n].set(pts[i].x, pts[i].y, pts[i].z, lengths[i] / total);
      u.uCutB.value[n].set(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z, lengths[i + 1] / total);
      u.uCutP.value[n].set(inc.open, inc.createdAt);
    }
  }
  u.uCutCount.value = n;
}

export const segmentCount = (incisions: Incision[]) =>
  incisions.reduce((s, i) => s + Math.max(0, i.points.length - 1), 0);

const _ab = new THREE.Vector3();
const _ap = new THREE.Vector3();

/** CPU mirror of the shader test: is this point inside an opening? */
export function insideIncision(p: THREE.Vector3, incisions: Incision[], margin = 0): boolean {
  for (const inc of incisions) {
    const pts = inc.points;
    if (pts.length < 2) continue;
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += pts[i].distanceTo(pts[i - 1]);
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const seg = pts[i + 1].distanceTo(a);
      _ab.subVectors(pts[i + 1], a);
      _ap.subVectors(p, a);
      const h = THREE.MathUtils.clamp(_ap.dot(_ab) / Math.max(_ab.lengthSq(), 1e-10), 0, 1);
      const d = _ap.sub(_ab.multiplyScalar(h)).length();
      const t = (acc + seg * h) / (total || 1);
      const lens = Math.pow(Math.max(Math.sin(Math.PI * t), 0), 0.65);
      const half = SCALPEL_HALF_WIDTH * (0.35 + 0.65 * lens) + inc.open * lens;
      if (d < half + margin) return true;
      acc += seg;
    }
  }
  return false;
}
