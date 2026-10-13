/**
 * Converts the BodyParts3D 3.0 OBJ dataset into web-ready GLB files.
 *
 *   raw/bodyparts3d/            <- unzipped BodyParts3D_3.0_obj_99 + txt metadata
 *   public/models/<system>.glb  <- one GLB per body system, one node per structure
 *   public/models/manifest.json <- id, name, system, centre and size of every structure
 *
 * Source: BodyParts3D, © The Database Center for Life Science, CC BY 4.0
 * https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
 *
 * Usage: node scripts/build-models.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, simplifyPrimitive, weldPrimitive } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "raw", "bodyparts3d");
const OUT = path.join(ROOT, "public", "models");

/** Overall triangle budget for the whole body (the raw set is ~3–4M). */
const TRIANGLE_BUDGET = 1_100_000;
/** Structures that are cut with the scalpel keep more detail. */
const DETAIL_BOOST = { integumentary: 2.2, digestive: 1.3, cardiovascular: 1.2 };
const MIN_TRIANGLES = 160;

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */

const readTsv = (file) =>
  fs
    .readFileSync(path.join(RAW, file), "utf8")
    .replace(/\r/g, "")
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((l) => l.split("\t"));

const names = new Map(readTsv("parts_list_e.txt").map(([id, en]) => [id.replace(/"/g, ""), en]));

const children = new Map();
for (const [cid, , pid] of readTsv("composite_parts.txt")) {
  if (!children.has(cid)) children.set(cid, new Set());
  children.get(cid).add(pid);
}

const objDir = fs
  .readdirSync(RAW, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(RAW, d.name))
  .find((d) => fs.readdirSync(d).some((f) => f.endsWith(".obj")));
if (!objDir) throw new Error(`No OBJ folder found in ${RAW}`);
const objFiles = new Map(
  fs
    .readdirSync(objDir)
    .filter((f) => f.endsWith(".obj"))
    .map((f) => [path.basename(f, ".obj"), path.join(objDir, f)]),
);

const primitives = [...objFiles.keys()].filter((id) => !children.has(id));

const closureCache = new Map();
function leaves(id) {
  if (closureCache.has(id)) return closureCache.get(id);
  const out = new Set();
  for (const c of children.get(id) ?? []) {
    if (children.has(c)) for (const l of leaves(c)) out.add(l);
    else out.add(c);
  }
  closureCache.set(id, out);
  return out;
}

// Order matters: the first system that contains a structure wins, so organ
// systems claim their own muscle (e.g. papillary muscles belong to the heart).
const SYSTEM_ORDER = [
  ["integumentary", ["FMA72979"]],
  ["cardiovascular", ["FMA7161"]],
  ["respiratory", ["FMA7158"]],
  ["digestive", ["FMA7152"]],
  ["urinary", ["FMA7159"]],
  ["reproductive", ["FMA7160"]],
  ["nervous", ["FMA7157"]],
  ["skeletal", ["FMA23881", "FMA23878"]],
  ["muscular", ["FMA72954"]],
  ["other", ["FMA9668", "FMA74594", "FMA78499"]],
];
const systemSets = SYSTEM_ORDER.map(([sys, ids]) => {
  const set = new Set();
  for (const id of ids) for (const l of leaves(id)) set.add(l);
  return [sys, set];
});

// BodyParts3D's composite groups are loose (teeth sit under "respiratory system",
// vertebrae under "other"), so names decide first and the groups are a fallback.
const NAME_RULES = [
  ["integumentary", /^skin$|hair|nail/i],
  ["cardiovascular", /heart|valve|papillary|coronary|cardiac|atrium|of (left|right) ventricle|interventricular (branch|septum|septal)|artery|arteries|aorta|vein|vena|sinus$|arch of aorta|trunk$/i],
  ["skeletal", /bone|\bvertebra\b|\brib\b|sternum|phalanx|metacarp|metatars|\bfemur\b|\btibia\b|\bfibula\b|\bradius\b|\bulna\b|\bhumerus\b|clavicle|\bscapula\b|\bpatella\b|\bsacrum\b|coccyx|\bhyoid bone|mandible|maxilla|vomer|ethmoid|sphenoid|concha|^atlas$|^axis$|calcaneus|talus|cuboid|navicular|cuneiform|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|sesamoid|cartilage|disk|menisc|ligament|symphysis|interosseous membrane/i],
  ["respiratory", /lung|bronch|trachea|larynx|epiglott|thyroid cartilage|cricoid/i],
  ["digestive", /tooth|teeth|incisor|molar|canine|liver|gallbladder|stomach|esophagus|duodenum|jejunum|ileum|colon|cecum|rectum|appendix|taenia|pancrea|tongue|gingiva|pharynx|\banal\b|salivary|parotid|mesocolon|omentum/i],
  ["urinary", /kidney|ureter|urinary bladder|urethra/i],
  ["reproductive", /testis|epididymis|deferent|seminal|prostate|penis|scrot|glans/i],
  ["nervous", /brain|gyrus|lobe$|lobule|cerebr|cerebell|thalam|colliculus|commissure|fornix|nerve|chiasm|spinal cord|pons|medulla|midbrain|amygdala|hippocamp|caudate|putamen|pallidus|insula|corpus callosum|capsule|geniculate|tuber cinereum|stria|choroid plexus|foramen|habenula|pineal|mammillary|nucleus|ventricle|aqueduct|cuneus|precuneus|uncus/i],
  ["other", /adrenal|thymus|thyroid gland|pituitary|spleen|eyeball|lens|cornea|^ear$/i],
  ["muscular", /muscle|diaphragm|linea alba|abdominis|ulnaris|part of mouth/i],
];
const FALLBACK_ORDER = ["skeletal", "muscular", "nervous", "cardiovascular", "respiratory", "digestive", "urinary", "reproductive", "integumentary", "other"];

function classify(id, name) {
  for (const [sys, re] of NAME_RULES) if (re.test(name)) return sys;
  for (const sys of FALLBACK_ORDER) {
    const hit = systemSets.find(([s, set]) => s === sys && set.has(id));
    if (hit) return sys;
  }
  return "other";
}

const SKIP = /hair|eyebrow|eyelash|immaterial|cavity|lumen|space/i;

const prettyName = (raw) => {
  const n = raw.replace(/,\s*nsn$/i, "").trim();
  return n.charAt(0).toUpperCase() + n.slice(1);
};

/* ------------------------------------------------------------------ */
/* OBJ parsing                                                         */
/* ------------------------------------------------------------------ */

function parseObj(file) {
  const pos = [];
  const idx = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("v ")) {
      const [, x, y, z] = line.trim().split(/\s+/);
      pos.push(+x, +y, +z);
    } else if (line.startsWith("f ")) {
      const f = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((t) => {
          const i = parseInt(t.split("/")[0], 10);
          return i < 0 ? pos.length / 3 + i : i - 1;
        });
      for (let k = 1; k < f.length - 1; k++) idx.push(f[0], f[k], f[k + 1]);
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

console.log(`Parsing ${primitives.length} structures…`);
const parts = [];
for (const id of primitives) {
  const raw = names.get(id) ?? id;
  if (SKIP.test(raw)) continue;
  const { pos, idx } = parseObj(objFiles.get(id));
  if (idx.length < 9) continue;
  parts.push({ id, name: prettyName(raw), system: classify(id, raw), pos, idx });
}

// Body-space transform: millimetres, Z-up, -Y anterior  ->  metres, Y-up, +Z anterior,
// feet on the floor and the body centred on X/Z (bounds taken from the skin).
const skin = parts.find((p) => p.system === "integumentary" && /^skin$/i.test(p.name)) ?? parts[0];
const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (let i = 0; i < skin.pos.length; i += 3)
  for (let k = 0; k < 3; k++) {
    b.min[k] = Math.min(b.min[k], skin.pos[i + k]);
    b.max[k] = Math.max(b.max[k], skin.pos[i + k]);
  }
const cx = (b.min[0] + b.max[0]) / 2;
const cy = (b.min[1] + b.max[1]) / 2;
const z0 = b.min[2];
for (const p of parts) {
  const out = new Float32Array(p.pos.length);
  for (let i = 0; i < p.pos.length; i += 3) {
    out[i] = (p.pos[i] - cx) / 1000;
    out[i + 1] = (p.pos[i + 2] - z0) / 1000;
    out[i + 2] = -(p.pos[i + 1] - cy) / 1000;
  }
  // (x, z, -y) is a proper rotation, so triangle winding stays valid.
  p.pos = out;
}

const totalTris = parts.reduce((s, p) => s + p.idx.length / 3, 0);
const baseRatio = Math.min(1, TRIANGLE_BUDGET / totalTris);
console.log(`Raw triangles: ${totalTris.toLocaleString()}  base ratio ${baseRatio.toFixed(3)}`);

fs.mkdirSync(OUT, { recursive: true });
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

const manifest = { source: "BodyParts3D, © The Database Center for Life Science, CC BY 4.0", systems: {}, parts: [] };
const systems = [...new Set(parts.map((p) => p.system))];
let finalTris = 0;

for (const system of systems) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(system);
  const group = parts.filter((p) => p.system === system);

  for (const p of group) {
    const position = doc.createAccessor().setType("VEC3").setArray(p.pos).setBuffer(buffer);
    const indices = doc.createAccessor().setType("SCALAR").setArray(p.idx).setBuffer(buffer);
    const prim = doc.createPrimitive().setAttribute("POSITION", position).setIndices(indices);
    weldPrimitive(prim);

    const tris = prim.getIndices().getCount() / 3;
    const ratio = Math.min(1, baseRatio * (DETAIL_BOOST[system] ?? 1));
    const target = Math.max(MIN_TRIANGLES, tris * ratio);
    if (target < tris) {
      simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: target / tris, error: 0.01 });
    }
    const outTris = prim.getIndices().getCount() / 3;
    finalTris += outTris;

    const mesh = doc.createMesh(p.id).addPrimitive(prim);
    scene.addChild(doc.createNode(p.id).setMesh(mesh));

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

  await doc.transform(
    meshopt({ encoder: MeshoptEncoder, level: "medium", quantizationVolume: "scene" }),
  );
  const file = `${system}.glb`;
  await io.write(path.join(OUT, file), doc);
  const kb = Math.round(fs.statSync(path.join(OUT, file)).size / 1024);
  manifest.systems[system] = { file: `/models/${file}`, count: group.length, kb };
  console.log(`  ${file.padEnd(22)} ${String(group.length).padStart(4)} parts  ${kb} KB`);
}

manifest.parts.sort((a, b) => a.name.localeCompare(b.name));

// Organ groups for the study mode: every BodyParts3D composite resolved to the structures we kept.
const GROUPS = [
  ["FMA7088", "heart"],
  ["FMA50801", "brain"],
  ["FMA61817", "cerebral-hemisphere"],
  ["FMA54448", "eye"],
  ["FMA7195", "lungs"],
  ["FMA7309", "right-lung"],
  ["FMA7310", "left-lung"],
  ["FMA7203", "kidneys"],
  ["FMA7200", "small-intestine"],
  ["FMA7201", "large-intestine"],
  ["FMA7152", "digestive"],
  ["FMA7158", "respiratory"],
  ["FMA7159", "urinary"],
  ["FMA45664", "genital"],
  ["FMA3734", "aorta"],
  ["FMA46565", "skull"],
  ["FMA13478", "vertebral-column"],
  ["FMA7480", "rib-cage"],
  ["FMA16580", "bony-pelvis"],
  ["FMA24139", "upper-limb-skeleton"],
  ["FMA24140", "lower-limb-skeleton"],
  ["FMA9712", "hand"],
  ["FMA9664", "foot"],
  ["FMA71287", "head-muscles"],
  ["FMA71290", "neck-muscles"],
  ["FMA71291", "back-muscles"],
  ["FMA71293", "thorax-muscles"],
  ["FMA86917", "abdomen-muscles"],
  ["FMA9621", "upper-limb-muscles"],
  ["FMA9622", "lower-limb-muscles"],
  ["FMA24728", "face"],
];
const kept = new Set(manifest.parts.map((p) => p.id));
manifest.groups = GROUPS.map(([id, key]) => ({
  key,
  members: [...leaves(id)].filter((l) => kept.has(l)),
})).filter((g) => g.members.length > 1);
// teeth: both dental arcades
const teeth = [...leaves("FMA55634"), ...leaves("FMA55635")].filter((l) => kept.has(l));
if (teeth.length) manifest.groups.push({ key: "teeth", members: teeth });
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
console.log(`Done: ${manifest.parts.length} structures, ${finalTris.toLocaleString()} triangles.`);
