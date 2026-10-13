import type { Detail, FlowRole, TissueOptions } from "./tissue";
import type { Lang } from "./i18n";

export type SystemId =
  | "integumentary"
  | "muscular"
  | "skeletal"
  | "nervous"
  | "cardiovascular"
  | "respiratory"
  | "digestive"
  | "urinary"
  | "reproductive"
  | "other";

export type Sex = "male" | "female";

export type V3 = [number, number, number];

export type BodyPart = {
  id: string;
  name: string;
  system: SystemId;
  center: V3;
  size: V3;
  tris: number;
};

export type OrganGroup = { key: string; members: string[] };

export type Manifest = {
  source: string;
  systems: Partial<Record<SystemId, { file: string; count: number; kb: number }>>;
  parts: BodyPart[];
  groups?: OrganGroup[];
};

export const MANIFEST_URL: Record<Sex, string> = {
  male: "/models/manifest.json",
  female: "/models/female/manifest.json",
};

type Bi = { en: string; bn: string };

export const SYSTEMS: { id: SystemId; name: Bi; color: string; about: Bi }[] = [
  {
    id: "integumentary",
    name: { en: "Skin", bn: "ত্বক" },
    color: "#d9a383",
    about: {
      en: "The skin and the fat beneath it — the body's outer protective layer.",
      bn: "চামড়া ও তার নিচের চর্বি — শরীরের বাইরের সুরক্ষা স্তর।",
    },
  },
  {
    id: "muscular",
    name: { en: "Muscular", bn: "পেশীতন্ত্র" },
    color: "#b5333d",
    about: {
      en: "Skeletal muscles, tendons and fasciae. Muscles pull on bones to move the body.",
      bn: "কঙ্কাল পেশী, টেন্ডন ও ফ্যাশিয়া। পেশী হাড়কে টেনে শরীর নড়ায়।",
    },
  },
  {
    id: "skeletal",
    name: { en: "Skeletal", bn: "কঙ্কালতন্ত্র" },
    color: "#e8dfc8",
    about: {
      en: "Bones, cartilages and joints: the framework that supports and protects the body.",
      bn: "হাড়, তরুণাস্থি ও জোড়া: শরীরের কাঠামো, যা ভার বহন করে ও অঙ্গকে রক্ষা করে।",
    },
  },
  {
    id: "nervous",
    name: { en: "Nervous", bn: "স্নায়ুতন্ত্র" },
    color: "#e9b8b4",
    about: {
      en: "Brain, spinal cord and nerves — they sense, decide and control everything the body does.",
      bn: "মস্তিষ্ক, সুষুম্নাকাণ্ড ও স্নায়ু — অনুভব করে, সিদ্ধান্ত নেয় এবং শরীরের সব কাজ নিয়ন্ত্রণ করে।",
    },
  },
  {
    id: "cardiovascular",
    name: { en: "Cardiovascular", bn: "সংবহনতন্ত্র" },
    color: "#c4162a",
    about: {
      en: "The heart pumps blood through arteries to every tissue; veins bring it back.",
      bn: "হৃৎপিণ্ড ধমনী দিয়ে প্রতিটি টিস্যুতে রক্ত পাঠায়; শিরা দিয়ে রক্ত ফিরে আসে।",
    },
  },
  {
    id: "respiratory",
    name: { en: "Respiratory", bn: "শ্বসনতন্ত্র" },
    color: "#e88f9a",
    about: {
      en: "Airways carry air to the lungs, where oxygen enters the blood and carbon dioxide leaves.",
      bn: "শ্বাসনালী বাতাসকে ফুসফুসে নেয়; সেখানে অক্সিজেন রক্তে ঢোকে আর কার্বন ডাই-অক্সাইড বের হয়।",
    },
  },
  {
    id: "digestive",
    name: { en: "Digestive", bn: "পরিপাকতন্ত্র" },
    color: "#d88a6a",
    about: {
      en: "The tube from mouth to anus plus the liver, gallbladder and pancreas: food is broken down and absorbed.",
      bn: "মুখ থেকে পায়ু পর্যন্ত নালী এবং যকৃৎ, পিত্তথলি ও অগ্ন্যাশয়: খাবার ভেঙে শোষিত হয়।",
    },
  },
  {
    id: "urinary",
    name: { en: "Urinary", bn: "রেচনতন্ত্র" },
    color: "#8a3a26",
    about: {
      en: "Kidneys filter the blood; urine flows down the ureters to the bladder.",
      bn: "বৃক্ক রক্ত ছেঁকে পরিষ্কার করে; প্রস্রাব ইউরেটার দিয়ে মূত্রথলিতে যায়।",
    },
  },
  {
    id: "reproductive",
    name: { en: "Reproductive", bn: "প্রজননতন্ত্র" },
    color: "#c98a8a",
    about: {
      en: "Organs of reproduction (and, in the female body, the breasts).",
      bn: "প্রজনন অঙ্গসমূহ (নারী শরীরে স্তনও)।",
    },
  },
  {
    id: "other",
    name: { en: "Glands & senses", bn: "গ্রন্থি ও ইন্দ্রিয়" },
    color: "#9bb6c9",
    about: {
      en: "Endocrine glands, lymphoid organs such as the spleen and thymus, and sense organs.",
      bn: "অন্তঃক্ষরা গ্রন্থি, প্লীহা ও থাইমাসের মতো লিম্ফয়েড অঙ্গ, এবং ইন্দ্রিয় অঙ্গ।",
    },
  },
];

export const SYSTEMS_BY_ID = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<
  SystemId,
  (typeof SYSTEMS)[number]
>;

/* ------------------------------------------------------------------ */
/* Appearance                                                          */
/* ------------------------------------------------------------------ */

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

/** Slight per-structure colour variation so neighbouring parts stay distinguishable. */
function vary(hex: string, id: string, amount = 0.08) {
  const n = (hash(id) - 0.5) * 2 * amount;
  const c = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + n))));
  const r = ch((c >> 16) & 255);
  const g = ch((c >> 8) & 255);
  const b = ch(c & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

type Look = Omit<TissueOptions, "skin" | "flow" | "detail">;

/**
 * Surface-detail profiles: what makes each tissue look like itself up close —
 * lungs are spongy and speckled, the liver is smooth and dark, intestines are
 * veined, muscle is fibrous, bone is grainy.
 */
const D = {
  liver: { mottle: 0.4, mottleColor: "#3d100c", mottleFreq: 38, veins: 0.1, veinColor: "#5a1a16", bump: 0.1, bumpFreq: 80, sss: 0.3, sssColor: "#8a2218" },
  lung: { mottle: 0.55, mottleColor: "#8c6c78", mottleFreq: 60, veins: 0.3, veinColor: "#a8424f", veinFreq: 120, bump: 0.45, bumpFreq: 230, sss: 0.5, sssColor: "#ff8a96" },
  heart: { mottle: 0.55, mottleColor: "#e3c070", mottleFreq: 42, veins: 0.18, veinColor: "#6e1017", bump: 0.22, bumpFreq: 120, sss: 0.3, sssColor: "#a8262f" },
  gut: { mottle: 0.4, mottleColor: "#f2cfae", mottleFreq: 70, veins: 0.55, veinColor: "#b02f33", veinFreq: 110, bump: 0.3, bumpFreq: 170, sss: 0.42, sssColor: "#ff9a7e" },
  colon: { mottle: 0.4, mottleColor: "#e8c79a", mottleFreq: 55, veins: 0.4, veinColor: "#9e3a30", veinFreq: 100, bump: 0.35, bumpFreq: 150, sss: 0.38, sssColor: "#f08a68" },
  stomach: { mottle: 0.45, mottleColor: "#f0d2b4", mottleFreq: 48, veins: 0.5, veinColor: "#b02f33", veinFreq: 90, bump: 0.28, bumpFreq: 130, sss: 0.45, sssColor: "#ff9a86" },
  kidney: { mottle: 0.3, mottleColor: "#35100a", mottleFreq: 55, veins: 0.12, veinColor: "#4a1610", bump: 0.07, bumpFreq: 70, sss: 0.5, sssColor: "#b0301c" },
  brain: { mottle: 0.4, mottleColor: "#c7a79c", mottleFreq: 90, veins: 0.6, veinColor: "#a02e3a", veinFreq: 150, bump: 0.5, bumpFreq: 160, sss: 0.4, sssColor: "#e8a8a4" },
  muscle: { mottle: 0.42, mottleColor: "#d98a76", mottleFreq: 90, veins: 0, veinColor: "#7a1a1a", bump: 0.4, bumpFreq: 260, sss: 0.28, sssColor: "#c0392b" },
  bone: { mottle: 0.55, mottleColor: "#a58b5c", mottleFreq: 85, veins: 0, veinColor: "#8a6a3a", bump: 0.4, bumpFreq: 380, sss: 0.08, sssColor: "#e8d4a8" },
  skin: { mottle: 0.3, mottleColor: "#c58872", mottleFreq: 40, veins: 0.08, veinColor: "#9a7a9c", bump: 0.16, bumpFreq: 520, sss: 0.45, sssColor: "#e05a46" },
  vessel: { mottle: 0.25, mottleColor: "#6e1017", mottleFreq: 120, veins: 0, veinColor: "#000000", bump: 0.12, bumpFreq: 260, sss: 0.3, sssColor: "#e03a3a" },
  nerve: { mottle: 0.25, mottleColor: "#c9a23c", mottleFreq: 160, veins: 0, veinColor: "#000000", bump: 0.15, bumpFreq: 300, sss: 0.15, sssColor: "#ffe08a" },
  gland: { mottle: 0.4, mottleColor: "#d8a46a", mottleFreq: 90, veins: 0.15, veinColor: "#a0402f", bump: 0.35, bumpFreq: 200, sss: 0.35, sssColor: "#e07a5a" },
  fat: { mottle: 0.3, mottleColor: "#e0b660", mottleFreq: 60, veins: 0.08, veinColor: "#c06a4a", bump: 0.5, bumpFreq: 320, sss: 0.4, sssColor: "#ffd890" },
  fibrous: { mottle: 0.25, mottleColor: "#b9a98c", mottleFreq: 110, veins: 0, veinColor: "#000000", bump: 0.25, bumpFreq: 340, sss: 0.15, sssColor: "#fff0d0", stretch: [1, 0.2, 1] },
  tissue: { mottle: 0.35, mottleColor: "#a86a60", mottleFreq: 55, veins: 0.15, veinColor: "#8a2a2a", bump: 0.2, bumpFreq: 160, sss: 0.3, sssColor: "#c05a4a" },
} satisfies Record<string, Detail>;

const DETAILS: [RegExp, Detail][] = [
  [/tooth|teeth|incisor|molar|canine|premolar|eyeball|lens|cornea|sclera/i, { ...D.bone, mottle: 0.25, bump: 0.05, bumpFreq: 200, mottleColor: "#d8cfae" }],
  [/cartilage|disk|disc|menisc|labrum|nucleus pulposus/i, { ...D.fibrous, stretch: undefined, mottleColor: "#a9bec8", bump: 0.15 }],
  [/tendon|aponeuros|retinacul|ligament|fascia|tract|membrane|sheath/i, D.fibrous],
  [/artery|arteries|aorta|arterial|vein|vena|sinus|trunk/i, D.vessel],
  [/nerve|plexus|spinal cord|chiasm/i, D.nerve],
  [/gyrus|brain|cerebr|cortex|lobe$|pons|medulla|midbrain|thalam|hippocamp|insula|lobule|sulcus|cerebell/i, D.brain],
  [/liver|hepatic/i, D.liver],
  [/gallbladder/i, { ...D.liver, mottleColor: "#2f4f20", sssColor: "#9ac04a", bump: 0.06 }],
  [/lung|lobe of|trachea|bronch|larynx/i, D.lung],
  [/heart|atrium|ventric|myocard|papillary|septum|valve/i, D.heart],
  [/kidney|renal|calyx|pyramid|papilla|cortex of kidney/i, D.kidney],
  [/stomach|gastric|esophagus/i, D.stomach],
  [/colon|cecum|caecum|rectum|appendix|taenia|anal/i, D.colon],
  [/duodenum|jejunum|ileum|intestine/i, D.gut],
  [/pancrea|thyroid|thymus|adrenal|pineal|pituitary|gland|spleen/i, D.gland],
  [/adipose|fat/i, D.fat],
  [/bladder|ureter|urethra|uterus|uterine|cervix|ovary|fallopian/i, D.tissue],
];

const SYSTEM_DETAIL: Record<SystemId, Detail> = {
  integumentary: D.skin,
  muscular: D.muscle,
  skeletal: D.bone,
  nervous: D.brain,
  cardiovascular: D.vessel,
  respiratory: D.lung,
  digestive: D.gut,
  urinary: D.tissue,
  reproductive: D.tissue,
  other: D.gland,
};

function detailFor(part: BodyPart): Detail {
  if (part.system === "skeletal" && !/cartilage|disk|disc|menisc|tooth|nucleus pulposus/i.test(part.name)) return D.bone;
  const hit = DETAILS.find(([re]) => re.test(part.name))?.[1];
  let d = hit ?? SYSTEM_DETAIL[part.system];
  if (part.system === "muscular" && !hit) {
    // fibres run along the longest axis of the muscle
    const [sx, sy, sz] = part.size;
    const k = 0.18;
    const stretch: [number, number, number] = sy >= sx && sy >= sz ? [1, k, 1] : sx >= sz ? [k, 1, 1] : [1, 1, k];
    d = { ...D.muscle, stretch };
  }
  return d;
}

const LOOKS: [RegExp, Look][] = [
  [/tooth|teeth|incisor|molar|canine|premolar/i, { color: "#f2eee2", interior: "#d9cfb6", roughness: 0.25, clearcoat: 0.8 }],
  [/cartilage|disk|disc|menisc|labrum|nucleus pulposus/i, { color: "#cfdde4", interior: "#b8c9d1", roughness: 0.35, clearcoat: 0.6 }],
  [/tendon|aponeuros|retinacul|ligament|fascia|tract|membrane|sheath/i, { color: "#ddd3c2", interior: "#c9bba3", roughness: 0.3, clearcoat: 0.7 }],
  [/pulmonary arter|pulmonary trunk/i, { color: "#3554b8", interior: "#1c2f61", roughness: 0.35, clearcoat: 0.6 }],
  [/pulmonary vein/i, { color: "#c4162a", interior: "#7a0d18", roughness: 0.35, clearcoat: 0.6 }],
  [/artery|arteries|aorta|arterial|trunk/i, { color: "#c4162a", interior: "#7a0d18", roughness: 0.35, clearcoat: 0.6 }],
  [/vein|vena|sinus/i, { color: "#2f4f9e", interior: "#1c2f61", roughness: 0.35, clearcoat: 0.6 }],
  [/nerve|plexus/i, { color: "#f0d06a", interior: "#c9a84a", roughness: 0.45, clearcoat: 0.3 }],
  [/lateral ventricle|third ventricle|fourth ventricle|aqueduct|canal of spinal|humor/i, { color: "#8fb9d9", interior: "#6c93b3", roughness: 0.3, clearcoat: 0.5 }],
  [/white matter|internal capsule|corpus callosum|fornix|commissure|tract/i, { color: "#efe5d8", interior: "#d9cbb8", roughness: 0.55, clearcoat: 0.2 }],
  [/spinal cord/i, { color: "#efd9a9", interior: "#d9c08a", roughness: 0.5, clearcoat: 0.3 }],
  [/liver|hepatic|porta hepatis/i, { color: "#7a2a22", interior: "#5b1a14", roughness: 0.35, clearcoat: 0.7 }],
  [/gallbladder|bile/i, { color: "#4f7a3a", interior: "#365528", roughness: 0.3, clearcoat: 0.8 }],
  [/lung|lobe of/i, { color: "#e3929b", interior: "#b9636e", roughness: 0.55, clearcoat: 0.4 }],
  [/trachea|bronch|larynx/i, { color: "#e3c4b6", interior: "#c79f8f", roughness: 0.4, clearcoat: 0.4 }],
  [/heart|atrium|ventric|myocard|papillary|septum|valve/i, { color: "#a8262f", interior: "#6e1219", roughness: 0.4, clearcoat: 0.6 }],
  [/kidney|renal|calyx|pyramid|papilla/i, { color: "#7d3324", interior: "#5a1f14", roughness: 0.35, clearcoat: 0.6 }],
  [/bladder/i, { color: "#d6a15d", interior: "#a87a40", roughness: 0.35, clearcoat: 0.6 }],
  [/ureter|urethra|deferent|duct/i, { color: "#dcb68f", interior: "#b48e68", roughness: 0.4, clearcoat: 0.5 }],
  [/stomach|gastric/i, { color: "#d68878", interior: "#a85a4d", roughness: 0.35, clearcoat: 0.7 }],
  [/esophagus/i, { color: "#c9776d", interior: "#98504a", roughness: 0.35, clearcoat: 0.7 }],
  [/duodenum|jejunum|ileum|small intestine/i, { color: "#e3a48d", interior: "#b67462", roughness: 0.35, clearcoat: 0.7 }],
  [/colon|cecum|caecum|rectum|appendix|taenia|anal/i, { color: "#cf9474", interior: "#9e6650", roughness: 0.35, clearcoat: 0.7 }],
  [/pancrea/i, { color: "#e1bd7a", interior: "#b8964f", roughness: 0.45, clearcoat: 0.5 }],
  [/spleen/i, { color: "#6b2a3a", interior: "#4a1a27", roughness: 0.35, clearcoat: 0.6 }],
  [/uterus|uterine|cervix|cornua|fundus/i, { color: "#c9757f", interior: "#99505a", roughness: 0.4, clearcoat: 0.5 }],
  [/ovary|fallopian|ostium/i, { color: "#e3b9a7", interior: "#b88d7c", roughness: 0.45, clearcoat: 0.4 }],
  [/mammary|lactiferous|areola|nipple|breast/i, { color: "#e8b49a", interior: "#c0876d", roughness: 0.55, clearcoat: 0.3 }],
  [/adipose|fat/i, { color: "#efd28c", interior: "#d7b766", roughness: 0.6, clearcoat: 0.2 }],
  [/thyroid|thymus|adrenal|pineal|gland/i, { color: "#b9675c", interior: "#8c4238", roughness: 0.4, clearcoat: 0.5 }],
  [/tongue|gingiva|lip|mucosa|palate/i, { color: "#c45a5f", interior: "#933b40", roughness: 0.35, clearcoat: 0.6 }],
  [/eyeball|eye|lens|cornea|sclera|retina|iris/i, { color: "#f4f1ec", interior: "#d9d2c4", roughness: 0.15, clearcoat: 1 }],
];

const SYSTEM_LOOK: Record<SystemId, Look> = {
  integumentary: { color: "#d9a383", interior: "#b24a45", roughness: 0.62, clearcoat: 0.12, sheen: 0.5 },
  muscular: { color: "#a8323a", interior: "#6f1a20", roughness: 0.45, clearcoat: 0.45 },
  skeletal: { color: "#e6dcc3", interior: "#c9a77f", roughness: 0.6, clearcoat: 0.15 },
  nervous: { color: "#e6b2ad", interior: "#c98f8a", roughness: 0.55, clearcoat: 0.3 },
  cardiovascular: { color: "#b51f2e", interior: "#6e1219", roughness: 0.4, clearcoat: 0.6 },
  respiratory: { color: "#e3929b", interior: "#b9636e", roughness: 0.5, clearcoat: 0.4 },
  digestive: { color: "#d88a6a", interior: "#a85a4d", roughness: 0.35, clearcoat: 0.7 },
  urinary: { color: "#8a3a26", interior: "#5a1f14", roughness: 0.4, clearcoat: 0.6 },
  reproductive: { color: "#c98a8a", interior: "#985e5e", roughness: 0.4, clearcoat: 0.5 },
  other: { color: "#b9675c", interior: "#8c4238", roughness: 0.4, clearcoat: 0.5 },
};

export function lookFor(part: BodyPart): TissueOptions {
  const flow = flowFor(part);
  if (part.system === "integumentary") {
    const fat = /adipose|fat/i.test(part.name);
    return fat
      ? { color: "#efd28c", interior: "#d7b766", roughness: 0.6, clearcoat: 0.1, skin: true, detail: D.fat }
      : { ...SYSTEM_LOOK.integumentary, clearcoat: 0.06, skin: true, detail: D.skin };
  }
  // bones keep their own look even when their name matches an organ ("lobe", "trunk"…)
  const match =
    part.system === "skeletal" && !/cartilage|disk|disc|menisc|tooth|nucleus pulposus/i.test(part.name)
      ? undefined
      : LOOKS.find(([re]) => re.test(part.name))?.[1];
  const look = match ?? SYSTEM_LOOK[part.system];
  const amount = part.system === "muscular" ? 0.12 : 0.05;
  // wet but not glassy: a softer, broader highlight reads as living tissue rather than plastic
  return {
    ...look,
    color: vary(look.color, part.id, amount),
    roughness: Math.min(0.8, look.roughness + 0.12),
    clearcoat: look.clearcoat * 0.45,
    flow,
    detail: detailFor(part),
  };
}

/* ------------------------------------------------------------------ */
/* Physiological role (live mode)                                      */
/* ------------------------------------------------------------------ */

const GI_ORDER: [RegExp, number][] = [
  [/tongue|teeth|tooth|palate|mucosa/i, 0],
  [/esophagus/i, 1],
  [/stomach|gastric|pylor/i, 2],
  [/duodenum/i, 3],
  [/jejunum|small intestine/i, 4],
  [/ileum/i, 5],
  [/cecum|caecum|appendix/i, 6],
  [/colon|taenia|epiploic/i, 6.6],
  [/rectum|anal/i, 7.6],
];

export function flowFor(part: BodyPart): { role: FlowRole; offset: number } | undefined {
  const n = part.name;
  if (part.system === "cardiovascular") {
    if (/pulmonary (arter|trunk)/i.test(n)) return { role: "pulmonaryArtery", offset: 0 };
    if (/pulmonary vein/i.test(n)) return { role: "pulmonaryVein", offset: 0 };
    if (/vein|vena|sinus/i.test(n)) return { role: "vein", offset: 0 };
    if (/arter|aorta|trunk/i.test(n)) return { role: "artery", offset: 0 };
    return { role: "heart", offset: 0 };
  }
  if (part.system === "respiratory") {
    if (/trachea|bronch|larynx/i.test(n)) return { role: "airway", offset: 0 };
    return { role: "lung", offset: 0 };
  }
  if (part.system === "digestive") {
    if (/liver|hepatic/i.test(n) && !/gallbladder/i.test(n)) return { role: "liver", offset: 0 };
    const hit = GI_ORDER.find(([re]) => re.test(n));
    if (hit) return { role: "gi", offset: hit[1] };
    return undefined;
  }
  if (part.system === "urinary") {
    if (/ureter|ureteral/i.test(n)) return { role: "urine", offset: 0 };
    if (/bladder|urethra/i.test(n)) return { role: "urine", offset: 0 };
    return { role: "kidney", offset: 0 };
  }
  if (part.system === "nervous") {
    if (/spinal cord|nerve|chiasm|cauda/i.test(n)) return { role: "nerve", offset: 0 };
    if (/eye|retina|lens|cornea|sclera|iris|humor|pupil|ciliary|conjunctiva|fovea|macula|choroid/i.test(n)) return undefined;
    return { role: "brain", offset: 0 };
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Educational notes (English + Bangla)                                */
/* ------------------------------------------------------------------ */

export type Info = {
  bn?: string;
  description: Bi;
  functions?: Bi[];
  clinical?: Bi;
};

const NOTES: [RegExp, Info][] = [
  [/^skin$/i, {
    bn: "ত্বক",
    description: {
      en: "The largest organ of the body, made of epidermis, dermis and subcutaneous tissue.",
      bn: "শরীরের সবচেয়ে বড় অঙ্গ — এপিডার্মিস, ডার্মিস ও তার নিচের চর্বির স্তর নিয়ে গঠিত।",
    },
    functions: [
      { en: "Barrier against infection, UV and injury", bn: "জীবাণু, অতিবেগুনি রশ্মি ও আঘাত থেকে রক্ষা" },
      { en: "Temperature regulation by sweat and blood flow", bn: "ঘাম ও রক্তপ্রবাহ দিয়ে শরীরের তাপমাত্রা নিয়ন্ত্রণ" },
      { en: "Touch, pain and temperature sensation", bn: "স্পর্শ, ব্যথা ও তাপ অনুভব" },
      { en: "Vitamin D synthesis", bn: "ভিটামিন ডি তৈরি" },
    ],
    clinical: {
      en: "Incisions follow Langer's lines for better healing. Under the skin lies yellow subcutaneous fat, then the deep fascia and muscle.",
      bn: "লেঙ্গার লাইন বরাবর কাটলে ক্ষত ভালো শুকায়। চামড়ার নিচে হলুদ চর্বি, তারপর ফ্যাশিয়া ও পেশী।",
    },
  }],
  [/left ventricle|right ventricle|cardiac atrium|wall of heart|interventricular septum|^heart/i, {
    bn: "হৃৎপিণ্ড",
    description: {
      en: "A four-chambered muscular pump behind the sternum. The right side pumps blood to the lungs, the left side to the whole body.",
      bn: "বুকের হাড়ের পেছনে চার প্রকোষ্ঠের পেশীবহুল পাম্প। ডান দিক ফুসফুসে রক্ত পাঠায়, বাম দিক সারা শরীরে।",
    },
    functions: [
      { en: "Beats about 60–100 times a minute, ~100,000 times a day", bn: "মিনিটে প্রায় ৬০–১০০ বার, দিনে প্রায় ১ লক্ষ বার স্পন্দিত হয়" },
      { en: "Pumps about 5 litres of blood every minute", bn: "প্রতি মিনিটে প্রায় ৫ লিটার রক্ত পাম্প করে" },
      { en: "Valves keep blood flowing in one direction", bn: "ভালভ রক্তকে এক দিকে চলতে রাখে" },
    ],
    clinical: {
      en: "Open-heart surgery (bypass, valve replacement) is done through a median sternotomy. A blocked coronary artery causes a heart attack.",
      bn: "ওপেন-হার্ট সার্জারি (বাইপাস, ভালভ পরিবর্তন) বুকের হাড় চিরে করা হয়। করোনারি ধমনী বন্ধ হলে হার্ট অ্যাটাক হয়।",
    },
  }],
  [/valve/i, {
    bn: "হৃৎপিণ্ডের ভালভ",
    description: {
      en: "One of the four heart valves (tricuspid, pulmonary, mitral, aortic). Their closing makes the 'lub-dub' heart sounds.",
      bn: "হৃৎপিণ্ডের চারটি ভালভের একটি (ট্রাইকাসপিড, পালমোনারি, মাইট্রাল, অ্যাওর্টিক)। এগুলো বন্ধ হওয়ার শব্দই 'লাব-ডাব'।",
    },
    clinical: { en: "Narrowed (stenosis) or leaking (regurgitation) valves may need repair or replacement.", bn: "ভালভ সরু (স্টেনোসিস) বা লিক (রিগার্জিটেশন) হলে মেরামত বা পরিবর্তন লাগে।" },
  }],
  [/^liver|lobe of liver|impression of liver/i, {
    bn: "যকৃৎ",
    description: {
      en: "The largest internal organ (~1.5 kg), under the right side of the diaphragm, with 8 functional segments.",
      bn: "সবচেয়ে বড় অভ্যন্তরীণ অঙ্গ (~১.৫ কেজি), ডান দিকে মধ্যচ্ছদার নিচে, ৮টি কার্যকরী অংশ।",
    },
    functions: [
      { en: "Makes bile to digest fat", bn: "চর্বি হজমের জন্য পিত্ত তৈরি" },
      { en: "Detoxifies drugs and alcohol", bn: "ওষুধ ও বিষাক্ত পদার্থ নিষ্ক্রিয় করে" },
      { en: "Stores sugar as glycogen; makes clotting proteins", bn: "শর্করা গ্লাইকোজেন হিসেবে জমা রাখে; রক্ত জমাট বাঁধার প্রোটিন তৈরি করে" },
    ],
    clinical: { en: "Part of the liver can be removed — it regrows. Cirrhosis and hepatitis damage it.", bn: "যকৃতের অংশ কেটে ফেললেও আবার বড় হয়। সিরোসিস ও হেপাটাইটিসে ক্ষতি হয়।" },
  }],
  [/lobe of (right|left) lung|lobe of lung|lung/i, {
    bn: "ফুসফুস",
    description: {
      en: "Paired breathing organs. The right lung has 3 lobes, the left has 2 to leave room for the heart.",
      bn: "শ্বাস-প্রশ্বাসের জোড়া অঙ্গ। ডান ফুসফুসে ৩টি খণ্ড, বামে ২টি — হৃৎপিণ্ডের জায়গার জন্য।",
    },
    functions: [
      { en: "~300 million alveoli exchange oxygen and carbon dioxide", bn: "প্রায় ৩০ কোটি অ্যালভিওলাই অক্সিজেন ও কার্বন ডাই-অক্সাইড বিনিময় করে" },
      { en: "About 12–20 breaths per minute at rest", bn: "বিশ্রামে মিনিটে প্রায় ১২–২০ বার শ্বাস" },
    ],
    clinical: { en: "Lobectomy treats lung cancer; a chest drain treats a collapsed lung.", bn: "ফুসফুসের ক্যান্সারে লোবেক্টমি; ফুসফুস চুপসে গেলে চেস্ট ড্রেন দেওয়া হয়।" },
  }],
  [/stomach|gastric/i, {
    bn: "পাকস্থলী",
    description: { en: "A J-shaped muscular bag in the upper left abdomen that holds and churns food.", bn: "পেটের উপরে বাম দিকে J-আকৃতির পেশীবহুল থলি, যা খাবার জমা রাখে ও মেশায়।" },
    functions: [
      { en: "Acid and pepsin start protein digestion", bn: "অ্যাসিড ও পেপসিন প্রোটিন হজম শুরু করে" },
      { en: "Holds about 1–1.5 litres", bn: "প্রায় ১–১.৫ লিটার ধরে" },
    ],
    clinical: { en: "Peptic ulcers, gastric cancer; sleeve gastrectomy for obesity.", bn: "পেপটিক আলসার, পাকস্থলীর ক্যান্সার; স্থূলতায় স্লিভ গ্যাস্ট্রেক্টমি।" },
  }],
  [/kidney|renal|calyx|pyramid|papilla/i, {
    bn: "বৃক্ক (কিডনি)",
    description: {
      en: "Bean-shaped organs at the back of the abdomen; each has about a million filtering units (nephrons).",
      bn: "পেটের পেছনে শিমের মতো দুটি অঙ্গ; প্রতিটিতে প্রায় ১০ লক্ষ ছাঁকনি একক (নেফ্রন)।",
    },
    functions: [
      { en: "Filter ~180 litres of blood plasma a day", bn: "দিনে প্রায় ১৮০ লিটার রক্তরস ছাঁকে" },
      { en: "Control blood pressure, salt and water", bn: "রক্তচাপ, লবণ ও পানির ভারসাম্য রাখে" },
      { en: "Make erythropoietin for red blood cells", bn: "লোহিত রক্তকণিকার জন্য ইরিথ্রোপোয়েটিন তৈরি করে" },
    ],
    clinical: { en: "Kidney stones, kidney failure (dialysis), transplantation.", bn: "কিডনিতে পাথর, কিডনি বিকল (ডায়ালাইসিস), কিডনি প্রতিস্থাপন।" },
  }],
  [/brain|gyrus|lobe$|cerebell|pons|medulla|midbrain|hippocamp|thalam|insula|cortex|caudate|putamen|amygdala|olfactory/i, {
    bn: "মস্তিষ্কের অংশ",
    description: { en: "A region of the brain — the control centre of the body with ~86 billion neurons.", bn: "মস্তিষ্কের একটি অংশ — প্রায় ৮৬০০ কোটি নিউরন নিয়ে শরীরের নিয়ন্ত্রণ কেন্দ্র।" },
    functions: [
      { en: "Frontal lobe: planning and movement; parietal: touch; occipital: vision; temporal: hearing and memory", bn: "ফ্রন্টাল লোব: পরিকল্পনা ও নড়াচড়া; প্যারাইটাল: স্পর্শ; অক্সিপিটাল: দৃষ্টি; টেম্পোরাল: শ্রবণ ও স্মৃতি" },
    ],
    clinical: { en: "Stroke happens when blood supply to a brain region stops.", bn: "মস্তিষ্কের কোনো অংশে রক্ত চলাচল বন্ধ হলে স্ট্রোক হয়।" },
  }],
  [/pancrea/i, {
    bn: "অগ্ন্যাশয়",
    description: { en: "A gland behind the stomach with a head, body and tail.", bn: "পাকস্থলীর পেছনে একটি গ্রন্থি — মাথা, দেহ ও লেজ নিয়ে।" },
    functions: [
      { en: "Digestive enzymes into the duodenum", bn: "ডিওডেনামে হজমের এনজাইম পাঠায়" },
      { en: "Insulin and glucagon control blood sugar", bn: "ইনসুলিন ও গ্লুকাগন রক্তে শর্করা নিয়ন্ত্রণ করে" },
    ],
    clinical: { en: "Diabetes; pancreatitis; the Whipple operation for cancer.", bn: "ডায়াবেটিস; প্যানক্রিয়াটাইটিস; ক্যান্সারে হুইপল অপারেশন।" },
  }],
  [/spleen/i, {
    bn: "প্লীহা",
    description: { en: "A fist-sized lymphoid organ in the upper left abdomen under the ribs.", bn: "পেটের উপরে বাম দিকে পাঁজরের নিচে মুঠির মতো লিম্ফয়েড অঙ্গ।" },
    functions: [{ en: "Removes old red blood cells; fights infection", bn: "পুরোনো লোহিত কণিকা সরায়; সংক্রমণের বিরুদ্ধে লড়ে" }],
    clinical: { en: "Can rupture in trauma and bleed heavily.", bn: "আঘাতে ফেটে গিয়ে প্রচুর রক্তক্ষরণ হতে পারে।" },
  }],
  [/gallbladder/i, {
    bn: "পিত্তথলি",
    description: { en: "A small sac under the liver that stores and concentrates bile.", bn: "যকৃতের নিচে ছোট থলি, যা পিত্ত জমা রাখে ও ঘন করে।" },
    clinical: { en: "Gallstones are removed by laparoscopic cholecystectomy.", bn: "পিত্তথলির পাথর ল্যাপারোস্কোপিক কোলেসিস্টেক্টমিতে সরানো হয়।" },
  }],
  [/esophagus/i, {
    bn: "অন্ননালী",
    description: { en: "A 25 cm muscular tube that carries swallowed food to the stomach by waves of contraction.", bn: "২৫ সেমি পেশীবহুল নালী, যা সংকোচনের ঢেউ দিয়ে গিলে ফেলা খাবার পাকস্থলীতে নেয়।" },
  }],
  [/duodenum|jejunum|ileum|small intestine/i, {
    bn: "ক্ষুদ্রান্ত্র",
    description: { en: "About 6 m of coiled tube where most digestion and absorption of nutrients happens.", bn: "প্রায় ৬ মিটার প্যাঁচানো নালী — এখানেই বেশিরভাগ হজম ও পুষ্টি শোষণ হয়।" },
    functions: [{ en: "Villi give an absorbing surface the size of a tennis court", bn: "ভিলাই মিলে টেনিস কোর্টের সমান শোষণ-তল তৈরি করে" }],
  }],
  [/colon|cecum|caecum|rectum|taenia/i, {
    bn: "বৃহদন্ত্র",
    description: { en: "About 1.5 m of large intestine that absorbs water and forms stool.", bn: "প্রায় ১.৫ মিটার বৃহদন্ত্র — পানি শোষণ করে মল তৈরি করে।" },
    clinical: { en: "Colon cancer screening by colonoscopy; colectomy.", bn: "কোলোনোস্কোপিতে কোলন ক্যান্সার পরীক্ষা; কোলেক্টমি।" },
  }],
  [/appendix/i, {
    bn: "অ্যাপেন্ডিক্স",
    description: { en: "A finger-like tube from the caecum.", bn: "সিকাম থেকে বের হওয়া আঙুলের মতো নালী।" },
    clinical: { en: "Appendicitis is treated by appendicectomy — try the guided surgery!", bn: "অ্যাপেন্ডিসাইটিস হলে অ্যাপেন্ডেক্টমি করা হয় — গাইডেড সার্জারিতে চেষ্টা করুন!" },
  }],
  [/urinary bladder/i, {
    bn: "মূত্রথলি",
    description: { en: "A muscular bag in the pelvis that stores 400–600 ml of urine.", bn: "শ্রোণীতে পেশীবহুল থলি, যা ৪০০–৬০০ মিলি প্রস্রাব ধরে রাখে।" },
  }],
  [/trachea/i, {
    bn: "শ্বাসনালী",
    description: { en: "The windpipe, kept open by C-shaped cartilage rings; it divides into the two main bronchi.", bn: "C-আকৃতির তরুণাস্থির আংটি দিয়ে খোলা থাকা শ্বাসনালী; নিচে দুটি প্রধান ব্রঙ্কাইতে ভাগ হয়।" },
    clinical: { en: "A tracheostomy opens it below the larynx.", bn: "ট্র্যাকিওস্টমিতে ল্যারিংক্সের নিচে এটি খোলা হয়।" },
  }],
  [/bronch/i, { bn: "ব্রঙ্কাস", description: { en: "Branching airways that carry air deep into the lungs.", bn: "শাখা-প্রশাখা নালী, যা বাতাসকে ফুসফুসের গভীরে নিয়ে যায়।" } }],
  [/aorta/i, {
    bn: "মহাধমনী",
    description: { en: "The largest artery, carrying oxygen-rich blood from the left ventricle to the whole body.", bn: "সবচেয়ে বড় ধমনী — বাম নিলয় থেকে অক্সিজেনসমৃদ্ধ রক্ত সারা শরীরে নেয়।" },
    clinical: { en: "An aneurysm (bulge) can rupture; it is repaired with a graft or stent.", bn: "অ্যানিউরিজম (ফুলে ওঠা) ফেটে যেতে পারে; গ্রাফট বা স্টেন্ট দিয়ে মেরামত করা হয়।" },
  }],
  [/vena cava/i, { bn: "মহাশিরা", description: { en: "A great vein returning blood from the body to the right atrium.", bn: "শরীর থেকে রক্ত ডান অলিন্দে ফেরত আনার বড় শিরা।" } }],
  [/pulmonary (arter|trunk)/i, { bn: "পালমোনারি ধমনী", description: { en: "Carries oxygen-poor blood from the right ventricle to the lungs — the only artery with 'blue' blood.", bn: "ডান নিলয় থেকে অক্সিজেনহীন রক্ত ফুসফুসে নেয় — একমাত্র ধমনী যাতে 'নীল' রক্ত।" } }],
  [/pulmonary vein/i, { bn: "পালমোনারি শিরা", description: { en: "Brings oxygen-rich blood from the lungs to the left atrium — the only vein with 'red' blood.", bn: "ফুসফুস থেকে অক্সিজেনসমৃদ্ধ রক্ত বাম অলিন্দে আনে — একমাত্র শিরা যাতে 'লাল' রক্ত।" } }],
  [/diaphragm/i, {
    bn: "মধ্যচ্ছদা",
    description: { en: "A dome-shaped muscle between chest and abdomen — the main muscle of breathing.", bn: "বুক ও পেটের মাঝে গম্বুজ আকৃতির পেশী — শ্বাস নেওয়ার প্রধান পেশী।" },
    functions: [{ en: "Contracts and flattens to draw air into the lungs", bn: "সংকুচিত হয়ে চ্যাপ্টা হলে ফুসফুসে বাতাস ঢোকে" }],
  }],
  [/uterus|uterine|cornua|cervix/i, {
    bn: "জরায়ু",
    description: { en: "A pear-shaped muscular organ in the female pelvis where a baby grows during pregnancy.", bn: "নারীর শ্রোণীতে নাশপাতি আকৃতির পেশীবহুল অঙ্গ, গর্ভাবস্থায় যেখানে শিশু বড় হয়।" },
    functions: [{ en: "Monthly lining builds up and sheds (menstruation)", bn: "প্রতি মাসে ভেতরের স্তর তৈরি হয় ও ঝরে পড়ে (মাসিক)" }],
    clinical: { en: "Caesarean section, hysterectomy, fibroids.", bn: "সিজারিয়ান সেকশন, হিস্টেরেক্টমি, ফাইব্রয়েড।" },
  }],
  [/ovary/i, {
    bn: "ডিম্বাশয়",
    description: { en: "Paired almond-sized glands that release an egg each month and make oestrogen and progesterone.", bn: "বাদামের মতো জোড়া গ্রন্থি — প্রতি মাসে ডিম্বাণু ছাড়ে এবং ইস্ট্রোজেন ও প্রোজেস্টেরন তৈরি করে।" },
  }],
  [/mammary|lactiferous|areola|nipple/i, {
    bn: "স্তন গ্রন্থি",
    description: { en: "Glandular lobes and ducts that produce and carry milk after childbirth.", bn: "গ্রন্থির খণ্ড ও নালী, যা সন্তান জন্মের পর দুধ তৈরি ও বহন করে।" },
    clinical: { en: "Breast cancer screening by self-examination and mammography.", bn: "নিজে পরীক্ষা ও ম্যামোগ্রাফির মাধ্যমে স্তন ক্যান্সার শনাক্ত।" },
  }],
  [/pectoralis major/i, { bn: "বক্ষপেশী", description: { en: "Large fan-shaped chest muscle that moves the arm across the body.", bn: "বুকের বড় পাখা-আকৃতির পেশী, যা হাতকে শরীরের সামনে টানে।" } }],
  [/rectus abdominis/i, {
    bn: "রেক্টাস অ্যাবডোমিনিস",
    description: { en: "The 'six-pack' muscles of the front of the abdomen.", bn: "পেটের সামনের 'সিক্স-প্যাক' পেশী।" },
    clinical: { en: "A midline laparotomy goes between the two recti.", bn: "মাঝ বরাবর ল্যাপারোটমি দুই রেক্টাসের মাঝ দিয়ে যায়।" },
  }],
  [/external oblique|internal oblique|transversus abdominis/i, {
    bn: "পেটের পাশের পেশী",
    description: { en: "One of the three flat muscle layers of the side of the abdominal wall.", bn: "পেটের পাশের তিনটি চ্যাপ্টা পেশী স্তরের একটি।" },
    clinical: { en: "Split along their fibres in a gridiron (appendix) incision.", bn: "অ্যাপেন্ডিক্স অপারেশনে এদের আঁশ বরাবর আলাদা করা হয়।" },
  }],
  [/biceps/i, { bn: "বাইসেপস", description: { en: "Front of the upper arm; bends the elbow and turns the palm up.", bn: "বাহুর সামনের পেশী; কনুই ভাঁজ করে ও হাতের তালু উপরে ঘোরায়।" } }],
  [/quadriceps|rectus femoris|vastus/i, { bn: "উরুর সামনের পেশী", description: { en: "Part of the quadriceps; straightens the knee.", bn: "কোয়াড্রিসেপসের অংশ; হাঁটু সোজা করে।" } }],
  [/gluteus/i, { bn: "নিতম্বের পেশী", description: { en: "Buttock muscle that extends and stabilises the hip.", bn: "নিতম্বের পেশী, যা কোমর পেছনে টানে ও স্থির রাখে।" } }],
  [/\brib\b/i, {
    bn: "পাঁজরের হাড়",
    description: { en: "One of 12 pairs of ribs protecting the heart and lungs.", bn: "হৃৎপিণ্ড ও ফুসফুস রক্ষাকারী ১২ জোড়া পাঁজরের একটি।" },
    clinical: { en: "Needles go just above a rib to avoid the vessels and nerve running beneath it.", bn: "সুই পাঁজরের ঠিক উপর দিয়ে দেওয়া হয়, কারণ নিচ দিয়ে রক্তনালী ও স্নায়ু যায়।" },
  }],
  [/sternum|manubrium|xiphoid/i, { bn: "বক্ষাস্থি", description: { en: "The breastbone at the front of the chest.", bn: "বুকের সামনের হাড়।" } }],
  [/vertebra/i, { bn: "কশেরুকা", description: { en: "A bone of the spine; the spinal cord runs through its canal.", bn: "মেরুদণ্ডের একটি হাড়; এর ভেতর দিয়ে সুষুম্নাকাণ্ড যায়।" } }],
  [/femur/i, { bn: "ঊর্বাস্থি", description: { en: "The thigh bone — the longest and strongest bone in the body.", bn: "উরুর হাড় — শরীরের সবচেয়ে লম্বা ও শক্ত হাড়।" } }],
  [/humerus/i, { bn: "প্রগণ্ডাস্থি", description: { en: "The bone of the upper arm.", bn: "বাহুর হাড়।" } }],
  [/skull|frontal bone|parietal bone|occipital bone|temporal bone/i, { bn: "করোটির হাড়", description: { en: "A bone of the skull protecting the brain.", bn: "মস্তিষ্ক রক্ষাকারী মাথার খুলির হাড়।" } }],
  [/eyeball|retina|lens|cornea|iris|sclera/i, { bn: "চোখ", description: { en: "Part of the eye, the organ of vision.", bn: "চোখের অংশ — দেখার অঙ্গ।" } }],
  [/spinal cord/i, {
    bn: "সুষুম্নাকাণ্ড",
    description: { en: "The bundle of nerves inside the spine linking brain and body; it ends at about L1–L2.", bn: "মেরুদণ্ডের ভেতরের স্নায়ুগুচ্ছ, যা মস্তিষ্ক ও শরীরকে যুক্ত করে; প্রায় L1–L2 তে শেষ হয়।" },
    clinical: { en: "Lumbar puncture is done below its end, at L3–L4.", bn: "লাম্বার পাংচার এর শেষের নিচে L3–L4 এ করা হয়।" },
  }],
];

/* Generic descriptions for every structure that has no specific note. */
const TYPE_NOTES: [RegExp, Info][] = [
  [/artery|arteries|arterial/i, { bn: "ধমনী", description: { en: "An artery: carries oxygen-rich blood away from the heart under high pressure.", bn: "ধমনী: হৃৎপিণ্ড থেকে উচ্চ চাপে অক্সিজেনসমৃদ্ধ রক্ত দূরে নিয়ে যায়।" } }],
  [/vein|vena|sinus/i, { bn: "শিরা", description: { en: "A vein: brings oxygen-poor blood back to the heart; valves stop it flowing backwards.", bn: "শিরা: অক্সিজেনহীন রক্ত হৃৎপিণ্ডে ফেরত আনে; ভেতরের ভালভ রক্তকে উল্টো যেতে দেয় না।" } }],
  [/nerve|plexus/i, { bn: "স্নায়ু", description: { en: "A nerve: carries electrical signals between the brain or spinal cord and the body.", bn: "স্নায়ু: মস্তিষ্ক বা সুষুম্নাকাণ্ড ও শরীরের মধ্যে বৈদ্যুতিক সংকেত বহন করে।" } }],
  [/tendon|aponeuros/i, { bn: "টেন্ডন", description: { en: "Tough connective tissue joining muscle to bone.", bn: "শক্ত সংযোজক টিস্যু, যা পেশীকে হাড়ের সাথে জোড়ে।" } }],
  [/ligament/i, { bn: "লিগামেন্ট", description: { en: "A band of connective tissue joining bone to bone and stabilising a joint.", bn: "হাড়কে হাড়ের সাথে জোড়া দেওয়া সংযোজক টিস্যুর ফিতা, যা জোড়াকে স্থির রাখে।" } }],
  [/cartilage|disk|disc|menisc|nucleus pulposus/i, { bn: "তরুণাস্থি", description: { en: "Cartilage: smooth, flexible tissue that cushions joints and the spine.", bn: "তরুণাস্থি: মসৃণ নমনীয় টিস্যু, যা জোড়া ও মেরুদণ্ডে কুশনের কাজ করে।" } }],
  [/tooth|teeth|incisor|molar|canine|premolar/i, { bn: "দাঁত", description: { en: "A tooth: enamel-covered, it cuts and grinds food.", bn: "দাঁত: এনামেলে ঢাকা, খাবার কাটে ও পিষে।" } }],
  [/phalanx/i, { bn: "আঙুলের হাড়", description: { en: "A bone of a finger or toe.", bn: "হাত বা পায়ের আঙুলের হাড়।" } }],
];

const SYSTEM_TYPE: Record<SystemId, Bi> = {
  integumentary: { en: "Part of the skin layer.", bn: "চামড়ার স্তরের অংশ।" },
  muscular: { en: "A skeletal muscle: it contracts to move a joint.", bn: "একটি কঙ্কাল পেশী: সংকুচিত হয়ে জোড়া নড়ায়।" },
  skeletal: { en: "A bone: it supports the body, protects organs and stores calcium; marrow makes blood cells.", bn: "একটি হাড়: শরীর ধরে রাখে, অঙ্গ রক্ষা করে, ক্যালসিয়াম জমায়; মজ্জায় রক্তকণিকা তৈরি হয়।" },
  nervous: { en: "Part of the nervous system.", bn: "স্নায়ুতন্ত্রের অংশ।" },
  cardiovascular: { en: "Part of the heart and blood vessels.", bn: "হৃৎপিণ্ড ও রক্তনালীর অংশ।" },
  respiratory: { en: "Part of the breathing system.", bn: "শ্বসনতন্ত্রের অংশ।" },
  digestive: { en: "Part of the digestive system.", bn: "পরিপাকতন্ত্রের অংশ।" },
  urinary: { en: "Part of the urinary system.", bn: "রেচনতন্ত্রের অংশ।" },
  reproductive: { en: "Part of the reproductive system.", bn: "প্রজননতন্ত্রের অংশ।" },
  other: { en: "A gland, lymphoid or sense organ.", bn: "একটি গ্রন্থি, লিম্ফয়েড বা ইন্দ্রিয় অঙ্গ।" },
};

const SIDE: [RegExp, string][] = [
  [/^left\b/i, "বাম"],
  [/^right\b/i, "ডান"],
];

export function infoFor(part: BodyPart): Info {
  const hit = NOTES.find(([re]) => re.test(part.name)) ?? TYPE_NOTES.find(([re]) => re.test(part.name));
  const sys = SYSTEMS_BY_ID[part.system];
  const base: Info = hit
    ? hit[1]
    : {
        bn: undefined,
        description: {
          en: `${SYSTEM_TYPE[part.system].en} ${sys.about.en}`,
          bn: `${SYSTEM_TYPE[part.system].bn} ${sys.about.bn}`,
        },
      };
  return base;
}

/** Short Bangla label shown under the English name: side + kind, or the curated name. */
export function bnLabel(part: BodyPart): string {
  const info = infoFor(part);
  const side = SIDE.find(([re]) => re.test(part.name))?.[1];
  const kind = info.bn ?? SYSTEMS_BY_ID[part.system].name.bn;
  return side ? `${side} ${kind}` : kind;
}

export const describe = (lang: Lang, s: Bi) => (lang === "bn" ? s.bn : s.en);

/* ------------------------------------------------------------------ */
/* Organ groups (study mode)                                           */
/* ------------------------------------------------------------------ */

export const GROUP_INFO: Record<string, { name: Bi; about: Bi; icon: string }> = {
  heart: { icon: "❤️", name: { en: "Heart", bn: "হৃৎপিণ্ড" }, about: { en: "Chambers, valves, papillary muscles and coronary vessels of the heart.", bn: "হৃৎপিণ্ডের প্রকোষ্ঠ, ভালভ, প্যাপিলারি পেশী ও করোনারি রক্তনালী।" } },
  brain: { icon: "🧠", name: { en: "Brain", bn: "মস্তিষ্ক" }, about: { en: "Cerebral cortex regions, deep nuclei, ventricles, cerebellum and brainstem.", bn: "সেরিব্রাল কর্টেক্সের অংশ, গভীর নিউক্লিয়াস, ভেন্ট্রিকল, সেরিবেলাম ও ব্রেইনস্টেম।" } },
  "cerebral-hemisphere": { icon: "🧠", name: { en: "Cerebral hemispheres", bn: "সেরিব্রাল গোলার্ধ" }, about: { en: "The two halves of the cerebrum with their lobes and gyri.", bn: "গুরুমস্তিষ্কের দুই অর্ধেক, তাদের লোব ও গাইরাস সহ।" } },
  eye: { icon: "👁️", name: { en: "Eye", bn: "চোখ" }, about: { en: "Eyeball layers, lens, humours and the optic nerve.", bn: "চোখের স্তর, লেন্স, তরল ও অপটিক স্নায়ু।" } },
  lungs: { icon: "🫁", name: { en: "Lungs", bn: "ফুসফুস" }, about: { en: "Lobes of both lungs.", bn: "দুই ফুসফুসের খণ্ডসমূহ।" } },
  "right-lung": { icon: "🫁", name: { en: "Right lung", bn: "ডান ফুসফুস" }, about: { en: "Upper, middle and lower lobes.", bn: "উপরের, মাঝের ও নিচের খণ্ড।" } },
  "left-lung": { icon: "🫁", name: { en: "Left lung", bn: "বাম ফুসফুস" }, about: { en: "Upper and lower lobes.", bn: "উপরের ও নিচের খণ্ড।" } },
  airways: { icon: "🫁", name: { en: "Airways", bn: "শ্বাসনালী" }, about: { en: "Trachea and the branching bronchial tree.", bn: "শ্বাসনালী ও শাখা-প্রশাখা ব্রঙ্কিয়াল ট্রি।" } },
  kidneys: { icon: "🫘", name: { en: "Kidneys", bn: "বৃক্ক" }, about: { en: "Cortex, medullary pyramids, calyces and renal pelvis.", bn: "কর্টেক্স, মেডুলারি পিরামিড, ক্যালিক্স ও রেনাল পেলভিস।" } },
  liver: { icon: "🟤", name: { en: "Liver", bn: "যকৃৎ" }, about: { en: "Liver surfaces, lobes and impressions of neighbouring organs.", bn: "যকৃতের তল, খণ্ড ও আশেপাশের অঙ্গের ছাপ।" } },
  stomach: { icon: "🫃", name: { en: "Stomach", bn: "পাকস্থলী" }, about: { en: "Regions of the stomach.", bn: "পাকস্থলীর অংশসমূহ।" } },
  "small-intestine": { icon: "🌀", name: { en: "Small intestine", bn: "ক্ষুদ্রান্ত্র" }, about: { en: "Duodenum, jejunum and ileum.", bn: "ডিওডেনাম, জেজুনাম ও ইলিয়াম।" } },
  "large-intestine": { icon: "🌀", name: { en: "Large intestine", bn: "বৃহদন্ত্র" }, about: { en: "Caecum, colon, rectum and appendix.", bn: "সিকাম, কোলন, রেক্টাম ও অ্যাপেন্ডিক্স।" } },
  digestive: { icon: "🍽️", name: { en: "Digestive system", bn: "পরিপাকতন্ত্র" }, about: { en: "The whole digestive tract and its glands.", bn: "পুরো পরিপাকনালী ও তার গ্রন্থিসমূহ।" } },
  respiratory: { icon: "🫁", name: { en: "Respiratory system", bn: "শ্বসনতন্ত্র" }, about: { en: "Airways and lungs.", bn: "শ্বাসনালী ও ফুসফুস।" } },
  urinary: { icon: "💧", name: { en: "Urinary system", bn: "রেচনতন্ত্র" }, about: { en: "Kidneys, ureters and bladder.", bn: "বৃক্ক, ইউরেটার ও মূত্রথলি।" } },
  genital: { icon: "♂️", name: { en: "Male reproductive organs", bn: "পুরুষ প্রজনন অঙ্গ" }, about: { en: "Testes, ducts, glands and penis.", bn: "অণ্ডকোষ, নালী, গ্রন্থি ও লিঙ্গ।" } },
  uterus: { icon: "♀️", name: { en: "Uterus", bn: "জরায়ু" }, about: { en: "Fundus, body, walls and cervix of the uterus.", bn: "জরায়ুর ফান্ডাস, দেহ, দেয়াল ও সার্ভিক্স।" } },
  ovaries: { icon: "♀️", name: { en: "Ovaries", bn: "ডিম্বাশয়" }, about: { en: "Both ovaries and their ligaments.", bn: "দুই ডিম্বাশয় ও তাদের লিগামেন্ট।" } },
  breast: { icon: "♀️", name: { en: "Breasts", bn: "স্তন" }, about: { en: "Mammary lobes, ducts, sinuses and suspensory ligaments.", bn: "স্তনের খণ্ড, নালী, সাইনাস ও সাসপেন্সরি লিগামেন্ট।" } },
  spleen: { icon: "🟣", name: { en: "Spleen", bn: "প্লীহা" }, about: { en: "Surfaces and hilum of the spleen.", bn: "প্লীহার তল ও হাইলাম।" } },
  "spinal-cord": { icon: "⚡", name: { en: "Spinal cord", bn: "সুষুম্নাকাণ্ড" }, about: { en: "Segments of the spinal cord.", bn: "সুষুম্নাকাণ্ডের অংশসমূহ।" } },
  vessels: { icon: "🩸", name: { en: "Blood vessels", bn: "রক্তনালী" }, about: { en: "Arteries and veins of the organs.", bn: "অঙ্গগুলোর ধমনী ও শিরা।" } },
  aorta: { icon: "🩸", name: { en: "Aorta", bn: "মহাধমনী" }, about: { en: "Ascending aorta, arch and descending aorta.", bn: "ঊর্ধ্বগামী মহাধমনী, খিলান ও নিম্নগামী মহাধমনী।" } },
  skull: { icon: "💀", name: { en: "Skull", bn: "মাথার খুলি" }, about: { en: "The cranial and facial bones.", bn: "করোটি ও মুখের হাড়।" } },
  "vertebral-column": { icon: "🦴", name: { en: "Vertebral column", bn: "মেরুদণ্ড" }, about: { en: "Vertebrae and intervertebral discs.", bn: "কশেরুকা ও তাদের মাঝের ডিস্ক।" } },
  "rib-cage": { icon: "🦴", name: { en: "Rib cage", bn: "পাঁজর" }, about: { en: "Ribs, costal cartilages and sternum.", bn: "পাঁজরের হাড়, তরুণাস্থি ও বক্ষাস্থি।" } },
  "bony-pelvis": { icon: "🦴", name: { en: "Pelvis", bn: "শ্রোণীচক্র" }, about: { en: "Hip bones, sacrum and coccyx.", bn: "নিতম্বের হাড়, স্যাক্রাম ও কক্কিক্স।" } },
  "upper-limb-skeleton": { icon: "🦴", name: { en: "Arm bones", bn: "হাতের হাড়" }, about: { en: "Bones of both upper limbs.", bn: "দুই হাতের হাড়।" } },
  "lower-limb-skeleton": { icon: "🦴", name: { en: "Leg bones", bn: "পায়ের হাড়" }, about: { en: "Bones of both lower limbs.", bn: "দুই পায়ের হাড়।" } },
  hand: { icon: "✋", name: { en: "Hand", bn: "হাতের কব্জি ও আঙুল" }, about: { en: "Bones and muscles of the hands.", bn: "হাতের হাড় ও পেশী।" } },
  foot: { icon: "🦶", name: { en: "Foot", bn: "পা" }, about: { en: "Bones and muscles of the feet.", bn: "পায়ের পাতার হাড় ও পেশী।" } },
  "head-muscles": { icon: "💪", name: { en: "Muscles of the head", bn: "মাথার পেশী" }, about: { en: "Facial expression and chewing muscles.", bn: "মুখভঙ্গি ও চিবানোর পেশী।" } },
  "neck-muscles": { icon: "💪", name: { en: "Muscles of the neck", bn: "ঘাড়ের পেশী" }, about: { en: "Muscles that move the head and swallow.", bn: "মাথা নাড়ানো ও গেলার পেশী।" } },
  "back-muscles": { icon: "💪", name: { en: "Muscles of the back", bn: "পিঠের পেশী" }, about: { en: "Muscles that hold the spine upright.", bn: "মেরুদণ্ড সোজা রাখার পেশী।" } },
  "thorax-muscles": { icon: "💪", name: { en: "Muscles of the chest", bn: "বুকের পেশী" }, about: { en: "Chest wall and breathing muscles.", bn: "বুকের দেয়াল ও শ্বাসের পেশী।" } },
  "abdomen-muscles": { icon: "💪", name: { en: "Muscles of the abdomen", bn: "পেটের পেশী" }, about: { en: "The abdominal wall layers.", bn: "পেটের দেয়ালের স্তরসমূহ।" } },
  "upper-limb-muscles": { icon: "💪", name: { en: "Arm muscles", bn: "হাতের পেশী" }, about: { en: "Muscles of both upper limbs.", bn: "দুই হাতের পেশী।" } },
  "lower-limb-muscles": { icon: "💪", name: { en: "Leg muscles", bn: "পায়ের পেশী" }, about: { en: "Muscles of both lower limbs.", bn: "দুই পায়ের পেশী।" } },
  face: { icon: "🙂", name: { en: "Face", bn: "মুখমণ্ডল" }, about: { en: "Bones, muscles and structures of the face.", bn: "মুখের হাড়, পেশী ও অন্যান্য অংশ।" } },
  teeth: { icon: "🦷", name: { en: "Teeth", bn: "দাঁত" }, about: { en: "All 28 permanent teeth of the upper and lower jaw.", bn: "উপর ও নিচের চোয়ালের স্থায়ী দাঁত।" } },
};

export const groupLabel = (key: string, lang: Lang) => {
  const g = GROUP_INFO[key];
  if (!g) return key.replace(/-/g, " ");
  return lang === "bn" ? g.name.bn : g.name.en;
};
