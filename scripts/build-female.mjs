/**
 * Converts the Human Reference Atlas "united female" model into web-ready GLBs,
 * in the same layout and body frame as the male BodyParts3D build.
 *
 *   raw/hra/3d-vh-f-united.glb       <- https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/assets/3d-vh-f-united.glb
 *   public/models/female/<system>.glb
 *   public/models/female/manifest.json
 *
 * Source: Human Reference Atlas (HuBMAP), 3D Reference Organs built from the
 * NLM Visible Human Female, CC BY 4.0 — https://humanatlas.io/3d-reference-library
 *
 * Usage: node scripts/build-female.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, simplifyPrimitive, weldPrimitive } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "raw", "hra", "3d-vh-f-united.glb");
const OUT = path.join(ROOT, "public", "models", "female");

const TRIANGLE_BUDGET = 1_150_000;
const DETAIL_BOOST = { integumentary: 1.6, cardiovascular: 1.4, digestive: 1.2, reproductive: 1.5 };
const MIN_TRIANGLES = 160;

const SYSTEM_OF = {
  integumentary_system: "integumentary",
  nervous_system: "nervous",
  skeletal_system: "skeletal",
  lower_limb: "skeletal",
  muscular_system: "muscular",
  circulatory_system: "cardiovascular",
  respiratory_system: "respiratory",
  digestive_system: "digestive",
  urinary_system: "urinary",
  reproductive_system: "reproductive",
  lymphatic_system: "other",
};

const strip = (n) => n.replace(/^VH_F_/, "").replace(/^Allen_/, "");
function prettyName(raw) {
  let n = strip(raw).replace(/ginviva/g, "gingiva");
  let side = "";
  const m = n.match(/_(L|R|l|r)(_[a-z0-9]+)?$/);
  if (m) {
    side = m[1].toUpperCase() === "L" ? "Left " : "Right ";
    n = n.slice(0, m.index) + (m[2] ?? "");
  }
  n = n.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  n = side + n;
  return n.charAt(0).toUpperCase() + n.slice(1);
}

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });
console.log("Reading", path.relative(ROOT, SRC));
const src = await io.read(SRC);
const scene = src.getRoot().listScenes()[0];

/* ---- collect meshes with their hierarchy path and world-space geometry ---- */
const parts = [];
const usedIds = new Set();
function walk(node, trail) {
  const mesh = node.getMesh();
  const name = node.getName();
  // the full-term placenta is a pregnancy model floating in front of the abdomen — not part of this body
  if (name === "VH_F_placenta") return;
  if (mesh && !/^Yao_/.test(name)) {
    const sysKey = (trail[1] ?? "").replace(/^VH_F_/, "");
    const system = SYSTEM_OF[sysKey] ?? "other";
    const world = node.getWorldMatrix();
    const pos = [];
    const idx = [];
    for (const prim of mesh.listPrimitives()) {
      const p = prim.getAttribute("POSITION");
      if (!p) continue;
      const base = pos.length / 3;
      const v = [0, 0, 0];
      for (let i = 0; i < p.getCount(); i++) {
        p.getElement(i, v);
        const [x, y, z] = v;
        pos.push(
          world[0] * x + world[4] * y + world[8] * z + world[12],
          world[1] * x + world[5] * y + world[9] * z + world[13],
          world[2] * x + world[6] * y + world[10] * z + world[14],
        );
      }
      const ind = prim.getIndices();
      if (ind) for (let i = 0; i < ind.getCount(); i++) idx.push(base + ind.getScalar(i));
      else for (let i = 0; i < p.getCount(); i++) idx.push(base + i);
    }
    if (idx.length >= 9) {
      let id = `F_${strip(name)}`;
      for (let k = 2; usedIds.has(id); k++) id = `F_${strip(name)}_${k}`;
      usedIds.add(id);
      let displayName = prettyName(name);
      // mammary glands are shown with the reproductive organs rather than as part of the skin layer
      const sys = system === "integumentary" && !/^VH_F_skin$|adipose|fat/i.test(name) ? "reproductive" : system;
      parts.push({ id, name: displayName, system: sys, pos: new Float32Array(pos), idx: new Uint32Array(idx), trail: trail.slice(2) });
    }
  }
  for (const c of node.listChildren()) walk(c, [...trail, node.getName()]);
}
for (const n of scene.listChildren()) walk(n, []);
console.log(`${parts.length} structures`);

/* ---- body frame: feet on the floor, centred on X/Z (bounds from the skin) ---- */
const skin = parts.find((p) => p.id === "F_skin");
const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (let i = 0; i < skin.pos.length; i += 3)
  for (let k = 0; k < 3; k++) {
    b.min[k] = Math.min(b.min[k], skin.pos[i + k]);
    b.max[k] = Math.max(b.max[k], skin.pos[i + k]);
  }
const cx = (b.min[0] + b.max[0]) / 2;
const cz = (b.min[2] + b.max[2]) / 2;
const y0 = b.min[1];
for (const p of parts)
  for (let i = 0; i < p.pos.length; i += 3) {
    p.pos[i] -= cx;
    p.pos[i + 1] -= y0;
    p.pos[i + 2] -= cz;
  }
skin.name = "Skin";

/* ---- write one GLB per system ---- */
const totalTris = parts.reduce((s, p) => s + p.idx.length / 3, 0);
const baseRatio = Math.min(1, TRIANGLE_BUDGET / totalTris);
console.log(`Raw triangles: ${totalTris.toLocaleString()}  base ratio ${baseRatio.toFixed(3)}`);
fs.mkdirSync(OUT, { recursive: true });
const out = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

const manifest = {
  source: "Human Reference Atlas (HuBMAP), Visible Human Female, CC BY 4.0",
  systems: {},
  parts: [],
  groups: [],
};
let finalTris = 0;
for (const system of [...new Set(parts.map((p) => p.system))]) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const sc = doc.createScene(system);
  const group = parts.filter((p) => p.system === system);
  for (const p of group) {
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(p.pos).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(p.idx).setBuffer(buffer));
    weldPrimitive(prim);
    const tris = prim.getIndices().getCount() / 3;
    const target = Math.max(MIN_TRIANGLES, tris * Math.min(1, baseRatio * (DETAIL_BOOST[system] ?? 1)));
    if (target < tris) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: target / tris, error: 0.01 });
    const outTris = prim.getIndices().getCount() / 3;
    finalTris += outTris;
    sc.addChild(doc.createNode(p.id).setMesh(doc.createMesh(p.id).addPrimitive(prim)));

    const arr = prim.getAttribute("POSITION").getArray();
    const mn = [Infinity, Infinity, Infinity];
    const mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < arr.length; i += 3)
      for (let k = 0; k < 3; k++) {
        mn[k] = Math.min(mn[k], arr[i + k]);
        mx[k] = Math.max(mx[k], arr[i + k]);
      }
    const r = (v) => Math.round(v * 1000) / 1000;
    manifest.parts.push({
      id: p.id,
      name: p.name,
      system,
      center: mn.map((v, k) => r((v + mx[k]) / 2)),
      size: mn.map((v, k) => r(mx[k] - v)),
      tris: outTris,
    });
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium", quantizationVolume: "scene" }));
  await out.write(path.join(OUT, `${system}.glb`), doc);
  const kb = Math.round(fs.statSync(path.join(OUT, `${system}.glb`)).size / 1024);
  manifest.systems[system] = { file: `/models/female/${system}.glb`, count: group.length, kb };
  console.log(`  ${system.padEnd(16)} ${String(group.length).padStart(4)} parts  ${kb} KB`);
}

/* ---- organ groups from the HRA hierarchy ---- */
const GROUP_KEYS = {
  heart: "heart",
  Allen_brain: "brain",
  eyes: "eye",
  kidney: "kidneys",
  lung: "lungs",
  liver: "liver",
  uterus: "uterus",
  mammary_gland: "breast",
  spinal_cord: "spinal-cord",
  vertebral_column: "vertebral-column",
  colon: "large-intestine",
  small_intestine: "small-intestine",
  stomach: "stomach",
  pelvis: "bony-pelvis",
  spleen: "spleen",
  tracheobronchial_tree: "airways",
  ovary: "ovaries",
  blood_vasculature: "vessels",
};
const groups = new Map();
for (const p of parts)
  for (const seg of p.trail) {
    const key = GROUP_KEYS[seg.replace(/^VH_F_/, "")];
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(p.id);
  }
manifest.groups = [...groups].map(([key, s]) => ({ key, members: [...s] })).filter((g) => g.members.length > 1);

manifest.parts.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
console.log(`Done: ${manifest.parts.length} structures, ${finalTris.toLocaleString()} triangles, groups: ${manifest.groups.map((g) => g.key).join(", ")}`);
