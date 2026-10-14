import * as THREE from "three";

/**
 * Modesty garments for the body models: trunks for the male body, briefs for the female body.
 *
 * Both skin meshes are nude, so the garment is cut out of the skin itself — the triangles of the
 * pelvic region are copied, pushed a few millimetres outwards and, over the genitals, flattened
 * onto a smooth surface so no outline shows through. It fits whatever shape the skin has and
 * becomes a child of the skin mesh, so it is shown, hidden, faded and sliced together with it.
 */
export type ClothingKind = "shorts" | "briefs";

/** World-space limits of the garments (the body is ~1.65 m tall, feet at y = 0, facing +z). */
/** Waist line: just above the pubic bone and its hair line, still below the appendectomy field. */
const WAIST: Record<ClothingKind, number> = { shorts: 0.86, briefs: 0.875 };
const SHORTS_HEM = 0.6;
/** Crotch height and how steeply a brief's leg opening climbs towards the hip, front and back. */
const BRIEF_CROTCH = 0.69;
const BRIEF_FRONT_SLOPE = 0.85;
const BRIEF_BACK_SLOPE = 0.5;
/** Front-to-back mid plane of the pelvis. */
const MID_Z = -0.02;
/** How far the cloth stands off the skin. */
const OFFSET = 0.006;
/** Genital zone that is smoothed over. */
const ZONE_X = 0.1;
const ZONE_BOTTOM = 0.685;
/** The smoothed zone ends this far below the waist. */
const ZONE_GAP = 0.015;
const CELL = 0.004;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function buildClothing(skin: THREE.Mesh, kind: ClothingKind): THREE.Mesh | null {
  const waist = WAIST[kind];
  const zoneTop = waist - ZONE_GAP;
  const geo = skin.geometry;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  if (!pos || !nor) return null;

  const s = skin.scale.x;
  const t = skin.position;
  const count = pos.count;
  const P = new Float32Array(count * 3);
  const N = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    P[i * 3] = pos.getX(i) * s + t.x;
    P[i * 3 + 1] = pos.getY(i) * s + t.y;
    P[i * 3 + 2] = pos.getZ(i) * s + t.z;
    N[i * 3] = nor.getX(i);
    N[i * 3 + 1] = nor.getY(i);
    N[i * 3 + 2] = nor.getZ(i);
  }

  const index = geo.index?.array ?? null;
  const triCount = index ? index.length / 3 : Math.floor(count / 3);
  const vert = (tri: number, k: number) => (index ? index[tri * 3 + k] : tri * 3 + k);

  /* ---- 1. triangles inside the garment's outline ---- */
  /** Lowest point of the garment at this x / z: the hem of the shorts or the leg opening of the briefs. */
  const lowest = (x: number, z: number) => {
    if (kind === "shorts") return SHORTS_HEM;
    const slope = BRIEF_BACK_SLOPE + (BRIEF_FRONT_SLOPE - BRIEF_BACK_SLOPE) * smoothstep(MID_Z - 0.03, MID_Z + 0.03, z);
    return BRIEF_CROTCH + slope * Math.max(0, Math.abs(x) - 0.03);
  };
  // every triangle touching the outline is taken; vertices beyond it are snapped onto the line below
  const inside = (v: number) => P[v * 3 + 1] < waist && P[v * 3 + 1] > lowest(P[v * 3], P[v * 3 + 2]);
  const picked: number[] = [];
  for (let tri = 0; tri < triCount; tri++) {
    if (inside(vert(tri, 0)) || inside(vert(tri, 1)) || inside(vert(tri, 2))) picked.push(tri);
  }
  if (!picked.length) return null;

  /* ---- 2. drop the arms: separate shells that never come near the midline ---- */
  const parent = new Int32Array(count).map((_, i) => i);
  const find = (i: number) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  for (const tri of picked) {
    const a = find(vert(tri, 0));
    for (let k = 1; k < 3; k++) {
      const b = find(vert(tri, k));
      if (a !== b) parent[b] = a;
    }
  }
  const nearMidline = new Map<number, boolean>();
  for (const tri of picked) {
    for (let k = 0; k < 3; k++) {
      const v = vert(tri, k);
      if (Math.abs(P[v * 3]) < 0.12) nearMidline.set(find(v), true);
    }
  }
  const kept = picked.filter((tri) => nearMidline.get(find(vert(tri, 0))));
  if (!kept.length) return null;

  /* ---- 3. a smooth cover over the genital zone ---- */
  const used = new Map<number, number>();
  for (const tri of kept) for (let k = 0; k < 3; k++) if (!used.has(vert(tri, k))) used.set(vert(tri, k), used.size);

  const gx = Math.ceil((ZONE_X * 2) / CELL) + 1;
  const gy = Math.ceil((zoneTop - ZONE_BOTTOM) / CELL) + 1;
  const cell = (x: number, y: number) => {
    const cx = Math.round((x + ZONE_X) / CELL);
    const cy = Math.round((y - ZONE_BOTTOM) / CELL);
    return cx < 0 || cy < 0 || cx >= gx || cy >= gy ? -1 : cy * gx + cx;
  };
  let height = new Float32Array(gx * gy).fill(-Infinity);
  for (const v of used.keys()) {
    const z = P[v * 3 + 2];
    if (z <= MID_Z) continue;
    const c = cell(P[v * 3], P[v * 3 + 1]);
    if (c >= 0 && z > height[c]) height[c] = z;
  }
  // grow every bump into a plateau, then round the plateau off
  const filter = (src: Float32Array, radius: number, op: "max" | "mean") => {
    const mid = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    for (const [from, to, w, h, along] of [
      [src, mid, gx, gy, true],
      [mid, out, gx, gy, false],
    ] as const) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let best = -Infinity;
          let sum = 0;
          let n = 0;
          for (let d = -radius; d <= radius; d++) {
            const xx = along ? x + d : x;
            const yy = along ? y : y + d;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const value = from[yy * w + xx];
            if (value === -Infinity) continue;
            best = Math.max(best, value);
            sum += value;
            n++;
          }
          to[y * w + x] = n ? (op === "max" ? best : sum / n) : -Infinity;
        }
      }
    }
    return out;
  };
  height = filter(height, 9, "max");
  for (let pass = 0; pass < 3; pass++) height = filter(height, 3, "mean");

  /* ---- 4. assemble the shell ---- */
  const out = new Float32Array(used.size * 3);
  for (const [v, o] of used) {
    const x = P[v * 3] + N[v * 3] * OFFSET;
    // snapped onto the true waist / hem / leg line, so the border is straight
    const base = Math.min(waist, Math.max(lowest(P[v * 3], P[v * 3 + 2]), P[v * 3 + 1]));
    const y = base + N[v * 3 + 1] * OFFSET;
    let z = P[v * 3 + 2] + N[v * 3 + 2] * OFFSET;
    const h = height[Math.max(0, cell(P[v * 3], P[v * 3 + 1]))];
    if (h !== -Infinity && cell(P[v * 3], P[v * 3 + 1]) >= 0) {
      const w =
        smoothstep(ZONE_X, ZONE_X * 0.7, Math.abs(P[v * 3])) *
        smoothstep(ZONE_BOTTOM, ZONE_BOTTOM + 0.03, P[v * 3 + 1]) *
        smoothstep(zoneTop, zoneTop - 0.04, P[v * 3 + 1]) *
        smoothstep(MID_Z, MID_Z + 0.05, P[v * 3 + 2]);
      z = Math.max(z, P[v * 3 + 2] + w * Math.max(0, h - P[v * 3 + 2]) + OFFSET);
    }
    out[o * 3] = (x - t.x) / s;
    out[o * 3 + 1] = (y - t.y) / s;
    out[o * 3 + 2] = (z - t.z) / s;
  }
  const indices = new Uint32Array(kept.length * 3);
  kept.forEach((tri, i) => {
    for (let k = 0; k < 3; k++) indices[i * 3 + k] = used.get(vert(tri, k))!;
  });

  const shell = new THREE.BufferGeometry();
  shell.setAttribute("position", new THREE.BufferAttribute(out, 3));
  shell.setIndex(new THREE.BufferAttribute(indices, 1));
  shell.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: kind === "shorts" ? "#3d5a80" : "#b86b83",
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(shell, material);
  mesh.name = `clothing:${kind}`;
  mesh.raycast = () => {};
  return mesh;
}
