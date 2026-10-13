import type { PracticeEffect, SkinPlan } from "./engine";
import type { InstrumentKind } from "./instruments";
import type { Tool } from "./lab";

/**
 * Hands-on practice scripts. A script is a short list of things to do with the
 * instruments, each checked against what actually happens in the 3D body:
 * which layer was cut, whether the cut is where the plan says, whether the
 * right structure was clamped, whether the wound is open wide enough.
 */

type Bi = { en: string; bn: string };

export type PracticeDo =
  /** Click each marked skin site (ports, landmarks). */
  | { kind: "sites"; plan: SkinPlan; radius?: number }
  /**
   * One scalpel stroke. `layer`: the layer it divides must match. `plan`: it must
   * follow the marked line. `target`: it must pass through a structure matching this.
   * Dissection steps instead finish when a layer matching `untilCut` was cut, or when
   * a layer matching `untilExpose` (or "@organ") lies exposed beneath the cut.
   */
  | {
      kind: "cut";
      layer?: string;
      untilCut?: string;
      untilExpose?: string;
      avoid?: string;
      target?: string;
      plan?: boolean;
      minLength: number;
      open?: number;
      /** Structures (name regex) lifted out when the cut succeeds. */
      remove?: string;
      /** Remove the bone(s) that were cut (a bone flap). */
      removeCut?: boolean;
    }
  /** Click a structure with a tool; optionally leave an instrument or implant on it. */
  | { kind: "touch"; target: string; effect?: PracticeEffect; remove?: string }
  /** Pull the wound open with the retractor until the gap is wide enough (metres). */
  | { kind: "retract"; gap: number }
  /** Sew a wound closed (optionally a particular layer). */
  | { kind: "close"; layer?: string };

export type PracticeStep = {
  id: string;
  title: Bi;
  text: Bi;
  /** Shown as feedback when the step is done. */
  ok: Bi;
  note?: Bi;
  tool: Tool;
  instrument: InstrumentKind | null;
  do: PracticeDo;
  /** Internal (laparoscopic / deep) view: the body wall is made see-through. */
  inside?: boolean;
  /** Line or points drawn on the skin as a guide. */
  plan?: SkinPlan;
  /** Structures that pulse as the target. */
  highlight?: string;
  focus?: { match: string; distance: number };
  /** A ligature step: the needle holder ties instead of sewing. */
  tie?: boolean;
};

export type Practice = {
  surgeryId: string;
  /** Body model the script is written for. */
  body: "male" | "female";
  steps: PracticeStep[];
};

/* ------------------------------------------------------------------ */
/* shared plans                                                        */
/* ------------------------------------------------------------------ */

const STERNOTOMY: SkinPlan = { anchor: "wall of heart|papillary muscle of heart", lines: [[[-0.022, 0.085], [-0.022, -0.11]]] };
const PFANNENSTIEL: SkinPlan = { anchor: "uterus|uterine", lines: [[[-0.07, -0.025], [0, -0.04], [0.07, -0.025]]] };

const APP_PORTS: SkinPlan = {
  anchor: "^appendix$|vermiform",
  points: [
    { at: [0.059, 0.09], color: "#38bdf8", size: 0.008 },
    { at: [0.059, -0.095], color: "#fbbf24", size: 0.007 },
    { at: [0.13, 0.01], color: "#fbbf24", size: 0.007 },
  ],
};
const GB_PORTS: SkinPlan = {
  anchor: "^gallbladder$",
  points: [
    { at: [0.054, -0.1], color: "#38bdf8", size: 0.008 },
    { at: [0.054, 0.045], color: "#fbbf24", size: 0.007 },
    { at: [-0.04, -0.005], color: "#fbbf24", size: 0.007 },
    { at: [-0.075, -0.035], color: "#fbbf24", size: 0.007 },
  ],
};
const SLEEVE_PORTS: SkinPlan = {
  anchor: "^stomach$",
  points: [
    { at: [-0.044, -0.095], color: "#38bdf8", size: 0.008 },
    { at: [-0.11, -0.05], color: "#fbbf24", size: 0.007 },
    { at: [0.05, -0.06], color: "#fbbf24", size: 0.007 },
    { at: [-0.044, -0.02], color: "#fbbf24", size: 0.007 },
    { at: [0.095, -0.04], color: "#fbbf24", size: 0.007 },
  ],
};
const SPLEEN_PORTS: SkinPlan = {
  anchor: "^spleen$",
  points: [
    { at: [-0.04, -0.08], color: "#38bdf8", size: 0.008 },
    { at: [0.0, -0.06], color: "#fbbf24", size: 0.007 },
    { at: [0.04, -0.045], color: "#fbbf24", size: 0.007 },
    { at: [0.06, -0.035], color: "#fbbf24", size: 0.007 },
  ],
};
const LOBE_PORTS: SkinPlan = {
  anchor: "(upper|lower) lobe of right lung|middle lobe of lung",
  points: [
    { at: [-0.07, -0.03], color: "#38bdf8", size: 0.009 },
    { at: [-0.09, -0.09], color: "#fbbf24", size: 0.007 },
    { at: [-0.045, -0.06], color: "#fbbf24", size: 0.007 },
  ],
};

const HERNIA_LINE: SkinPlan = { anchor: "^right inguinal ligament", lines: [[[-0.019, 0.043], [0.019, -0.003]]] };
const MIDLINE: SkinPlan = { anchor: "^colon$|ascending colon", lines: [[[0, 0.09], [0, -0.05]]] };
const TRACH_LINE: SkinPlan = { anchor: "^trachea$", lines: [[[-0.017, -0.012], [0.017, -0.012]]] };
const HOCKEY: SkinPlan = { anchor: "urinary bladder|trigone|bladder neck", lines: [[[-0.1, 0.07], [-0.075, 0.01], [-0.03, -0.02], [0, -0.035]]] };
const SCALP: SkinPlan = { anchor: "frontal bone|parietal bone", lines: [[[-0.07, 0], [-0.05, 0.04], [0, 0.06], [0.05, 0.04], [0.07, 0]]] };
const KNEE_LINE: SkinPlan = { anchor: "^right patella", lines: [[[0, 0.09], [0, -0.09]]] };

/* ------------------------------------------------------------------ */
/* reusable steps                                                      */
/* ------------------------------------------------------------------ */

const cutSkin = (plan: SkinPlan, minLength: number, text: Bi, ok?: Bi): PracticeStep => ({
  id: "skin",
  title: { en: "Skin incision", bn: "চামড়া কাটা" },
  text,
  ok: ok ?? { en: "Skin divided. The next layer is now exposed.", bn: "চামড়া কাটা হয়েছে। এখন পরের স্তর দেখা যাচ্ছে।" },
  tool: "scalpel",
  instrument: "scalpel",
  do: { kind: "cut", layer: "^skin$", plan: true, minLength, open: 0.012 },
  plan,
  note: {
    en: "One stroke cuts one layer: the blade never goes deeper than the layer under it.",
    bn: "এক টানে এক স্তরই কাটে — ব্লেড তার নিচের স্তরের চেয়ে গভীরে যায় না।",
  },
});

const retract = (gap: number, text?: Bi): PracticeStep => ({
  id: "retract",
  title: { en: "Hold the wound open", bn: "ক্ষত খুলে ধরা" },
  text: text ?? {
    en: "Drag across the wound with the retractor to open it wide enough to work in.",
    bn: "রিট্র্যাক্টর দিয়ে ক্ষতের উপর টেনে কাজ করার মতো যথেষ্ট খুলুন।",
  },
  ok: { en: "The wound is held open.", bn: "ক্ষত খোলা অবস্থায় ধরা আছে।" },
  tool: "retractor",
  instrument: "retractor",
  do: { kind: "retract", gap },
});

const closeSkin = (): PracticeStep => ({
  id: "close",
  title: { en: "Close the skin", bn: "চামড়া সেলাই" },
  text: {
    en: "With the needle holder, sew along the whole length of the skin incision with interrupted stitches.",
    bn: "নিডল হোল্ডার দিয়ে চামড়ার কাটার পুরো দৈর্ঘ্য বরাবর আলাদা আলাদা সেলাই দিন।",
  },
  ok: { en: "Skin closed. Procedure complete.", bn: "চামড়া বন্ধ হয়েছে। অপারেশন সম্পন্ন।" },
  tool: "suture",
  instrument: "needle",
  do: { kind: "close", layer: "^skin$" },
});

const portsIn = (plan: SkinPlan, n: number): PracticeStep => ({
  id: "ports",
  title: { en: "Place the ports", bn: "পোর্ট বসানো" },
  text: {
    en: `Click each of the ${n} marked sites on the skin to place a trocar. The blue ring is the camera port at the umbilicus.`,
    bn: `চামড়ার উপর চিহ্নিত ${n}টি জায়গায় একে একে ক্লিক করে ট্রকার বসান। নীল বলয়টি নাভির ক্যামেরা পোর্ট।`,
  },
  ok: { en: "All ports are in. The abdomen is insufflated and the camera view opens.", bn: "সব পোর্ট বসেছে। পেটে গ্যাস ভরা হয়েছে, ক্যামেরার দৃশ্য খুলছে।" },
  tool: "explore",
  instrument: null,
  do: { kind: "sites", plan },
});

const portsOut = (plan: SkinPlan, n: number): PracticeStep => ({
  id: "ports-out",
  title: { en: "Remove the ports and close", bn: "পোর্ট খুলে বন্ধ করা" },
  text: {
    en: `Click each of the ${n} port sites again to release the gas, remove the trocar and close the small wound.`,
    bn: `${n}টি পোর্টের জায়গায় আবার ক্লিক করে গ্যাস ছাড়ুন, ট্রকার খুলুন এবং ছোট ক্ষত বন্ধ করুন।`,
  },
  ok: { en: "Ports removed and wounds closed. Procedure complete.", bn: "পোর্ট খোলা ও ক্ষত বন্ধ। অপারেশন সম্পন্ন।" },
  tool: "explore",
  instrument: null,
  do: { kind: "sites", plan: { ...plan, points: plan.points?.map((p) => ({ ...p, color: "#22c55e" })) } },
});

/* ------------------------------------------------------------------ */
/* the scripts                                                         */
/* ------------------------------------------------------------------ */

export const PRACTICE: Record<string, Practice> = {
  /* ---------------- laparoscopic appendicectomy ---------------- */
  "appendicectomy-lap": {
    surgeryId: "appendicectomy-lap",
    body: "male",
    steps: [
      portsIn(APP_PORTS, 3),
      {
        id: "grasp",
        title: { en: "Grasp the appendix", bn: "অ্যাপেন্ডিক্স ধরা" },
        text: {
          en: "With the atraumatic grasper, click the appendix to lift it and put its blood supply on stretch.",
          bn: "অ্যাট্রমাটিক গ্র্যাসপার দিয়ে অ্যাপেন্ডিক্সে ক্লিক করে এটি তুলে ধরুন, যাতে রক্তনালী টানটান হয়।",
        },
        ok: { en: "Appendix held up. The mesoappendix is on stretch.", bn: "অ্যাপেন্ডিক্স তোলা হয়েছে। মেসোঅ্যাপেন্ডিক্স টানটান।" },
        tool: "forceps",
        instrument: "babcock",
        do: { kind: "touch", target: "^appendix$|vermiform", effect: "hold" },
        inside: true,
        highlight: "^appendix$|vermiform",
        focus: { match: "^appendix$|vermiform", distance: 0.3 },
      },
      {
        id: "seal",
        title: { en: "Seal the mesoappendix", bn: "মেসোঅ্যাপেন্ডিক্স সিল করা" },
        text: {
          en: "Click the appendix near its base with the energy clamp to seal the vessels that supply it.",
          bn: "এনার্জি ক্ল্যাম্প দিয়ে অ্যাপেন্ডিক্সের গোড়ার কাছে ক্লিক করে এর রক্তনালী সিল করুন।",
        },
        ok: { en: "Vessels sealed.", bn: "রক্তনালী সিল হয়েছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "^appendix$|vermiform", effect: "clamp" },
        inside: true,
        highlight: "^appendix$|vermiform",
      },
      {
        id: "loop",
        title: { en: "Tie the base", bn: "গোড়া বাঁধা" },
        text: {
          en: "Tie an endoloop around the base of the appendix: click at the base with the needle holder.",
          bn: "অ্যাপেন্ডিক্সের গোড়ায় এন্ডোলুপ বাঁধুন — নিডল হোল্ডার দিয়ে গোড়ায় ক্লিক করুন।",
        },
        ok: { en: "Base secured with an endoloop.", bn: "গোড়া এন্ডোলুপ দিয়ে বাঁধা হয়েছে।" },
        tool: "suture",
        instrument: "needle",
        tie: true,
        do: { kind: "touch", target: "^appendix$|vermiform", effect: "tie" },
        inside: true,
        highlight: "^appendix$|vermiform",
      },
      {
        id: "divide",
        title: { en: "Divide the appendix", bn: "অ্যাপেন্ডিক্স কাটা" },
        text: {
          en: "Cut across the appendix with the scissors, just beyond the loop, to free it.",
          bn: "লুপের ঠিক পরে কাঁচি দিয়ে অ্যাপেন্ডিক্সের আড়াআড়ি কেটে এটি আলাদা করুন।",
        },
        ok: { en: "Appendix divided and removed in a retrieval bag.", bn: "অ্যাপেন্ডিক্স কেটে ব্যাগে ভরে বের করা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", target: "^appendix$|vermiform", minLength: 0.006, remove: "^appendix$|vermiform", open: 0.004 },
        inside: true,
        highlight: "^appendix$|vermiform",
      },
      portsOut(APP_PORTS, 3),
    ],
  },

  /* ---------------- laparoscopic cholecystectomy ---------------- */
  "cholecystectomy-lap": {
    surgeryId: "cholecystectomy-lap",
    body: "male",
    steps: [
      portsIn(GB_PORTS, 4),
      {
        id: "fundus",
        title: { en: "Lift the fundus", bn: "ফান্ডাস তোলা" },
        text: {
          en: "Click the gallbladder with the grasper to push its fundus up over the liver and expose the neck.",
          bn: "গ্র্যাসপার দিয়ে পিত্তথলিতে ক্লিক করে এর ফান্ডাস যকৃতের উপর তুলে গলা উন্মুক্ত করুন।",
        },
        ok: { en: "Fundus retracted. Calot's triangle is open.", bn: "ফান্ডাস সরানো হয়েছে। ক্যালট ত্রিকোণ খুলেছে।" },
        tool: "forceps",
        instrument: "babcock",
        do: { kind: "touch", target: "^gallbladder$", effect: "hold" },
        inside: true,
        highlight: "^gallbladder$",
        focus: { match: "^gallbladder$", distance: 0.28 },
      },
      {
        id: "clip",
        title: { en: "Clip the cystic duct", bn: "সিস্টিক নালী ক্লিপ" },
        text: {
          en: "Apply a clip on the neck of the gallbladder / cystic duct: click it with the clip applier.",
          bn: "পিত্তথলির গলা বা সিস্টিক নালীতে ক্লিপ লাগান — ক্লিপ অ্যাপ্লায়ার দিয়ে ক্লিক করুন।",
        },
        ok: { en: "Cystic duct and artery clipped.", bn: "সিস্টিক নালী ও ধমনী ক্লিপ করা হয়েছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "^cystic duct$|^gallbladder$", effect: "clamp" },
        inside: true,
        highlight: "^cystic duct$|^gallbladder$",
        note: {
          en: "Before clipping, the critical view of safety must be seen: only two structures enter the gallbladder.",
          bn: "ক্লিপ করার আগে ক্রিটিক্যাল ভিউ অব সেফটি দেখতে হবে: পিত্তথলিতে মাত্র দুটি কাঠামো ঢোকে।",
        },
      },
      {
        id: "divide",
        title: { en: "Divide and remove", bn: "কেটে বের করা" },
        text: {
          en: "Cut across the clipped gallbladder neck with the scissors, then the gallbladder is freed from the liver bed.",
          bn: "ক্লিপ করা পিত্তথলির গলার আড়াআড়ি কাঁচি দিয়ে কাটুন — তারপর পিত্তথলি যকৃতের বিছানা থেকে আলাদা হবে।",
        },
        ok: { en: "Gallbladder freed and removed in a bag.", bn: "পিত্তথলি আলাদা করে ব্যাগে ভরে বের করা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", target: "^cystic duct$|^gallbladder$", minLength: 0.01, remove: "^gallbladder$", open: 0.004 },
        inside: true,
        highlight: "^gallbladder$",
      },
      portsOut(GB_PORTS, 4),
    ],
  },

  /* ---------------- inguinal hernia ---------------- */
  "hernia-inguinal": {
    surgeryId: "hernia-inguinal",
    body: "male",
    steps: [
      cutSkin(HERNIA_LINE, 0.04, {
        en: "Cut the skin along the purple line, about 2 cm above and parallel to the inguinal ligament.",
        bn: "বেগুনি দাগ বরাবর চামড়া কাটুন — ইনগুইনাল লিগামেন্টের প্রায় ২ সেমি উপরে ও সমান্তরালে।",
      }),
      {
        id: "eo",
        title: { en: "Open the aponeurosis", bn: "অ্যাপোনিউরোসিস খোলা" },
        text: {
          en: "Cut the external oblique aponeurosis, now showing in the wound, along its fibres.",
          bn: "ক্ষতের ভেতরে দেখা যাওয়া এক্সটার্নাল অবলিক অ্যাপোনিউরোসিস তন্তু বরাবর কাটুন।",
        },
        ok: { en: "Aponeurosis opened. The inguinal canal is exposed.", bn: "অ্যাপোনিউরোসিস খোলা হয়েছে। ইনগুইনাল ক্যানাল উন্মুক্ত।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", layer: "^right external oblique$", minLength: 0.02, open: 0.01 },
        highlight: "^right external oblique$",
        focus: { match: "^right inguinal ligament", distance: 0.3 },
      },
      retract(0.034),
      {
        id: "floor",
        title: { en: "Identify the floor", bn: "ক্যানালের মেঝে চেনা" },
        text: {
          en: "Click the inguinal ligament — the lower border of the repair — to identify the floor of the canal.",
          bn: "ইনগুইনাল লিগামেন্টে ক্লিক করুন — মেরামতের নিচের সীমা — ক্যানালের মেঝে চিনে নিতে।",
        },
        ok: { en: "Floor of the canal identified.", bn: "ক্যানালের মেঝে শনাক্ত হয়েছে।" },
        tool: "explore",
        instrument: null,
        do: { kind: "touch", target: "^right (inguinal ligament|rectus abdominis|internal oblique)" },
        highlight: "^right inguinal ligament",
      },
      {
        id: "mesh",
        title: { en: "Lay the mesh", bn: "মেশ বসানো" },
        text: {
          en: "Click on the floor of the canal to lay the polypropylene mesh over it and fix it to the ligament.",
          bn: "ক্যানালের মেঝেতে ক্লিক করে পলিপ্রোপিলিন মেশ বসান ও লিগামেন্টের সাথে আটকান।",
        },
        ok: { en: "Mesh laid and fixed. The posterior wall is reinforced.", bn: "মেশ বসে আটকানো হয়েছে। পেছনের দেয়াল মজবুত হয়েছে।" },
        tool: "explore",
        instrument: null,
        do: { kind: "touch", target: "^right (inguinal ligament|rectus abdominis|internal oblique)", effect: "mesh" },
      },
      closeSkin(),
    ],
  },

  /* ---------------- sleeve gastrectomy ---------------- */
  "sleeve-gastrectomy": {
    surgeryId: "sleeve-gastrectomy",
    body: "male",
    steps: [
      portsIn(SLEEVE_PORTS, 5),
      {
        id: "hold",
        title: { en: "Hold the stomach", bn: "পাকস্থলী ধরা" },
        text: {
          en: "Click the stomach with the grasper to lift it and expose the greater curvature.",
          bn: "গ্র্যাসপার দিয়ে পাকস্থলীতে ক্লিক করে তুলে ধরুন, যাতে বৃহত্তর বক্রতা দেখা যায়।",
        },
        ok: { en: "Stomach held.", bn: "পাকস্থলী ধরা হয়েছে।" },
        tool: "forceps",
        instrument: "babcock",
        do: { kind: "touch", target: "^stomach$", effect: "hold" },
        inside: true,
        highlight: "^stomach$",
        focus: { match: "^stomach$", distance: 0.4 },
      },
      {
        id: "staple",
        title: { en: "Staple the sleeve", bn: "স্ট্যাপল দিয়ে স্লিভ বানানো" },
        text: {
          en: "Draw a long stroke along the stomach (at least 7 cm) with the stapler to divide it parallel to the lesser curvature.",
          bn: "স্ট্যাপলার দিয়ে পাকস্থলীর উপর (অন্তত ৭ সেমি) লম্বা টান দিন, ক্ষুদ্র বক্রতার সমান্তরালে কাটতে।",
        },
        ok: { en: "Staple line made. About 80% of the stomach is divided off.", bn: "স্ট্যাপল লাইন হয়েছে। পাকস্থলীর প্রায় ৮০% আলাদা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", target: "^stomach$", minLength: 0.07, open: 0.004 },
        inside: true,
        highlight: "^stomach$",
      },
      {
        id: "leak",
        title: { en: "Check for leaks", bn: "লিক পরীক্ষা" },
        text: {
          en: "Click along the new stomach to test the staple line for leaks and bleeding.",
          bn: "নতুন পাকস্থলীর উপর ক্লিক করে স্ট্যাপল লাইনে লিক ও রক্তক্ষরণ পরীক্ষা করুন।",
        },
        ok: { en: "Staple line is airtight and dry.", bn: "স্ট্যাপল লাইন বায়ুরোধী ও শুকনো।" },
        tool: "explore",
        instrument: null,
        do: { kind: "touch", target: "^stomach$" },
        inside: true,
      },
      portsOut(SLEEVE_PORTS, 5),
    ],
  },

  /* ---------------- right hemicolectomy ---------------- */
  "hemicolectomy-right": {
    surgeryId: "hemicolectomy-right",
    body: "male",
    steps: [
      cutSkin(MIDLINE, 0.08, {
        en: "Cut the skin along the midline, about 12 cm centred on the umbilicus.",
        bn: "মাঝ বরাবর চামড়া কাটুন — নাভিকে কেন্দ্র করে প্রায় ১২ সেমি।",
      }),
      {
        id: "wall",
        title: { en: "Open the abdominal wall", bn: "পেটের দেয়াল খোলা" },
        text: {
          en: "Cut down through the linea alba in the wound, one layer at a time, until the bowel is exposed. The Layers panel shows what is next.",
          bn: "ক্ষতের ভেতরে লিনিয়া অ্যালবা এক স্তর করে কেটে নামুন, যতক্ষণ না অন্ত্র দেখা যায়। লেয়ার প্যানেল দেখাবে পরের স্তর কী।",
        },
        ok: { en: "The abdomen is open. The bowel is in view.", bn: "পেট খোলা হয়েছে। অন্ত্র দেখা যাচ্ছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilExpose: "@organ", avoid: "colon|jejunum|ileum|stomach|liver|bladder", minLength: 0.03, open: 0.012 },
        focus: { match: "^colon$|ascending colon", distance: 0.5 },
      },
      retract(0.05, {
        en: "Pull the wound open wide with the retractors: this is a big operation and needs room.",
        bn: "রিট্র্যাক্টর দিয়ে ক্ষত বড় করে খুলুন — এটি বড় অপারেশন, জায়গা লাগে।",
      }),
      {
        id: "mobilise",
        title: { en: "Mobilise the colon", bn: "কোলন মুক্ত করা" },
        text: {
          en: "Grasp the right colon and lift it towards the middle, freeing it from the back wall.",
          bn: "ডান কোলন ধরে মাঝের দিকে তুলে পেছনের দেয়াল থেকে মুক্ত করুন।",
        },
        ok: { en: "Right colon mobilised. The ureter and duodenum lie safely behind.", bn: "ডান কোলন মুক্ত হয়েছে। ইউরেটার ও ডিওডেনাম নিরাপদে পেছনে।" },
        tool: "forceps",
        instrument: "babcock",
        do: { kind: "touch", target: "^colon$|ascending colon|caecum|cecum", effect: "hold" },
        highlight: "^colon$|ascending colon|caecum",
        focus: { match: "^colon$|ascending colon", distance: 0.5 },
      },
      {
        id: "vessels",
        title: { en: "Control the blood supply", bn: "রক্ত সরবরাহ নিয়ন্ত্রণ" },
        text: {
          en: "Click the superior mesenteric vessels with the clamp to control the supply of the right colon.",
          bn: "ক্ল্যাম্প দিয়ে সুপিরিয়র মেসেন্টেরিক রক্তনালীতে ক্লিক করে ডান কোলনের সরবরাহ নিয়ন্ত্রণ করুন।",
        },
        ok: { en: "Vessels clamped and divided.", bn: "রক্তনালী ক্ল্যাম্প করে কাটা হয়েছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "superior mesenteric", effect: "clamp" },
        highlight: "superior mesenteric",
        focus: { match: "superior mesenteric", distance: 0.35 },
      },
      {
        id: "resect",
        title: { en: "Divide the bowel", bn: "অন্ত্র কাটা" },
        text: {
          en: "Cut across the colon with the stapler, at least 5 cm from the tumour, to take out the right colon.",
          bn: "টিউমার থেকে অন্তত ৫ সেমি দূরে স্ট্যাপলার দিয়ে কোলনের আড়াআড়ি কেটে ডান কোলন বের করুন।",
        },
        ok: { en: "Bowel divided.", bn: "অন্ত্র কাটা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", target: "^colon$|ascending colon|caecum|cecum", minLength: 0.03, open: 0.006 },
        highlight: "^colon$|ascending colon",
      },
      {
        id: "anast",
        title: { en: "Join the ends", bn: "দুই প্রান্ত জোড়া" },
        text: {
          en: "Sew the cut in the bowel closed with the needle holder to make the anastomosis.",
          bn: "নিডল হোল্ডার দিয়ে অন্ত্রের কাটা জায়গা সেলাই করে অ্যানাস্টোমোসিস তৈরি করুন।",
        },
        ok: { en: "Anastomosis complete. Good blood supply, no tension.", bn: "অ্যানাস্টোমোসিস সম্পন্ন। ভালো রক্ত সরবরাহ, টান নেই।" },
        tool: "suture",
        instrument: "needle",
        do: { kind: "close", layer: "colon|caecum|cecum" },
        highlight: "^colon$|ascending colon",
      },
      closeSkin(),
    ],
  },

  /* ---------------- splenectomy ---------------- */
  splenectomy: {
    surgeryId: "splenectomy",
    body: "male",
    steps: [
      portsIn(SPLEEN_PORTS, 4),
      {
        id: "lift",
        title: { en: "Lift the spleen", bn: "প্লীহা তোলা" },
        text: {
          en: "Click the spleen with the grasper to lift it away from the kidney and the colon.",
          bn: "গ্র্যাসপার দিয়ে প্লীহায় ক্লিক করে কিডনি ও কোলন থেকে তুলে ধরুন।",
        },
        ok: { en: "Spleen lifted. The hilum is visible.", bn: "প্লীহা তোলা হয়েছে। হাইলাম দেখা যাচ্ছে।" },
        tool: "forceps",
        instrument: "babcock",
        do: { kind: "touch", target: "^spleen$", effect: "hold" },
        inside: true,
        highlight: "^spleen$",
        focus: { match: "^spleen$", distance: 0.35 },
      },
      {
        id: "hilum",
        title: { en: "Clamp the splenic vessels", bn: "স্প্লিনিক রক্তনালী ক্ল্যাম্প" },
        text: {
          en: "Click the splenic artery or vein with the clamp to control the blood supply at the hilum.",
          bn: "ক্ল্যাম্প দিয়ে স্প্লিনিক ধমনী বা শিরায় ক্লিক করে হাইলামে রক্ত সরবরাহ নিয়ন্ত্রণ করুন।",
        },
        ok: { en: "Splenic vessels controlled.", bn: "স্প্লিনিক রক্তনালী নিয়ন্ত্রিত।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "^splenic (artery|vein)$", effect: "clamp" },
        inside: true,
        highlight: "^splenic (artery|vein)$",
        focus: { match: "^splenic (artery|vein)$|^spleen$", distance: 0.3 },
      },
      {
        id: "divide",
        title: { en: "Divide and remove", bn: "কেটে বের করা" },
        text: {
          en: "Cut across the vessels at the hilum with the stapler to free the spleen.",
          bn: "হাইলামে স্ট্যাপলার দিয়ে রক্তনালীর আড়াআড়ি কেটে প্লীহা মুক্ত করুন।",
        },
        ok: { en: "Spleen freed and removed in a bag.", bn: "প্লীহা মুক্ত করে ব্যাগে ভরে বের করা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", target: "^spleen$", minLength: 0.01, remove: "^spleen$", open: 0.004 },
        inside: true,
        highlight: "^spleen$",
      },
      portsOut(SPLEEN_PORTS, 4),
    ],
  },

  /* ---------------- CABG ---------------- */
  cabg: {
    surgeryId: "cabg",
    body: "male",
    steps: [
      cutSkin(STERNOTOMY, 0.1, {
        en: "Cut the skin over the breastbone along the midline, about 20 cm.",
        bn: "বুকের হাড়ের উপর মাঝ বরাবর প্রায় ২০ সেমি চামড়া কাটুন।",
      }),
      {
        id: "sternum",
        title: { en: "Divide the sternum", bn: "বুকের হাড় চেরা" },
        text: {
          en: "Cut down, layer by layer, to the breastbone and divide it in the midline with the sternal saw.",
          bn: "স্তরে স্তরে নেমে বুকের হাড়ে পৌঁছান এবং স্টার্নাল করাত দিয়ে মাঝ বরাবর চিরুন।",
        },
        ok: { en: "Sternum divided.", bn: "বুকের হাড় চেরা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilCut: "sternum|manubrium", avoid: "heart|aorta|lung", minLength: 0.05, open: 0.012 },
        highlight: "sternum|manubrium",
        focus: { match: "sternum|manubrium", distance: 0.5 },
      },
      retract(0.045, {
        en: "Spread the two halves of the sternum with the retractor to expose the heart.",
        bn: "রিট্র্যাক্টর দিয়ে বুকের হাড়ের দুই অর্ধেক ফাঁক করে হৃৎপিণ্ড উন্মুক্ত করুন।",
      }),
      {
        id: "clamp",
        title: { en: "Clamp the aorta", bn: "মহাধমনী ক্ল্যাম্প" },
        text: {
          en: "On bypass, put the cross-clamp across the ascending aorta so the heart can be stopped.",
          bn: "বাইপাসে গিয়ে ঊর্ধ্বগামী মহাধমনীতে ক্রস-ক্ল্যাম্প দিন যাতে হৃৎপিণ্ড থামানো যায়।",
        },
        ok: { en: "Aorta clamped. The heart is arrested with cardioplegia.", bn: "মহাধমনী ক্ল্যাম্প। কার্ডিওপ্লেজিয়ায় হৃৎপিণ্ড থেমেছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "^ascending aorta$", effect: "clamp" },
        highlight: "^ascending aorta$",
        focus: { match: "^ascending aorta$|wall of heart", distance: 0.4 },
      },
      {
        id: "arteriotomy",
        title: { en: "Open the coronary artery", bn: "করোনারি ধমনী খোলা" },
        text: {
          en: "Make a small cut (1 cm) in the coronary artery just beyond the blockage, to receive the graft.",
          bn: "গ্রাফট বসানোর জন্য ব্লকেজের ঠিক পরে করোনারি ধমনীতে ছোট (১ সেমি) কাটা দিন।",
        },
        ok: { en: "Coronary artery opened.", bn: "করোনারি ধমনী খোলা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", layer: "coronary|anterior interventricular|circumflex|marginal", minLength: 0.006, open: 0.003 },
        highlight: "anterior interventricular|circumflex|coronary",
        focus: { match: "anterior interventricular|circumflex", distance: 0.28 },
      },
      {
        id: "graft",
        title: { en: "Sew the graft", bn: "গ্রাফট সেলাই" },
        text: {
          en: "Sew the graft to the opening with fine continuous stitches to restore the blood flow beyond the blockage.",
          bn: "সূক্ষ্ম একটানা সেলাইয়ে গ্রাফটটি খোলা জায়গায় জুড়ুন, যাতে ব্লকেজের পরে রক্তপ্রবাহ ফেরে।",
        },
        ok: { en: "Graft anastomosed. Warm blood flows beyond the blockage.", bn: "গ্রাফট জোড়া হয়েছে। ব্লকেজের পরে উষ্ণ রক্ত বইছে।" },
        tool: "suture",
        instrument: "needle",
        do: { kind: "close", layer: "coronary|anterior interventricular|circumflex|marginal" },
        highlight: "anterior interventricular|circumflex|coronary",
      },
      closeSkin(),
    ],
  },

  /* ---------------- aortic valve replacement ---------------- */
  avr: {
    surgeryId: "avr",
    body: "male",
    steps: [
      cutSkin(STERNOTOMY, 0.1, {
        en: "Cut the skin over the breastbone along the midline, about 20 cm.",
        bn: "বুকের হাড়ের উপর মাঝ বরাবর প্রায় ২০ সেমি চামড়া কাটুন।",
      }),
      {
        id: "sternum",
        title: { en: "Divide the sternum", bn: "বুকের হাড় চেরা" },
        text: {
          en: "Cut down to the breastbone, layer by layer, and divide it in the midline.",
          bn: "স্তরে স্তরে বুকের হাড় পর্যন্ত নেমে মাঝ বরাবর চিরুন।",
        },
        ok: { en: "Sternum divided.", bn: "বুকের হাড় চেরা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilCut: "sternum|manubrium", avoid: "heart|aorta|lung", minLength: 0.05, open: 0.012 },
        highlight: "sternum|manubrium",
        focus: { match: "sternum|manubrium", distance: 0.5 },
      },
      retract(0.045, {
        en: "Spread the sternum with the retractor to expose the heart and the aorta.",
        bn: "রিট্র্যাক্টর দিয়ে বুকের হাড় ফাঁক করে হৃৎপিণ্ড ও মহাধমনী উন্মুক্ত করুন।",
      }),
      {
        id: "clamp",
        title: { en: "Clamp the aorta", bn: "মহাধমনী ক্ল্যাম্প" },
        text: {
          en: "Put the cross-clamp across the ascending aorta, above the valve.",
          bn: "ভালভের উপরে ঊর্ধ্বগামী মহাধমনীতে ক্রস-ক্ল্যাম্প দিন।",
        },
        ok: { en: "Aorta clamped and the heart arrested.", bn: "মহাধমনী ক্ল্যাম্প, হৃৎপিণ্ড থেমেছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "^ascending aorta$", effect: "clamp" },
        highlight: "^ascending aorta$",
        focus: { match: "^ascending aorta$", distance: 0.3 },
      },
      {
        id: "aortotomy",
        title: { en: "Open the aorta", bn: "মহাধমনী খোলা" },
        text: {
          en: "Cut obliquely across the ascending aorta (at least 1.5 cm) to look down onto the valve.",
          bn: "ভালভ দেখতে ঊর্ধ্বগামী মহাধমনীতে (অন্তত ১.৫ সেমি) তির্যক কাটা দিন।",
        },
        ok: { en: "Aorta opened. The valve is in view.", bn: "মহাধমনী খোলা হয়েছে। ভালভ দেখা যাচ্ছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", layer: "^ascending aorta$", minLength: 0.012, open: 0.01 },
        highlight: "^ascending aorta$",
      },
      {
        id: "valve",
        title: { en: "Seat the new valve", bn: "নতুন ভালভ বসানো" },
        text: {
          en: "Click the base of the aorta to lower the prosthetic valve onto its sewing ring and tie it down.",
          bn: "মহাধমনীর গোড়ায় ক্লিক করে কৃত্রিম ভালভটি সেলাইয়ের বলয়ের উপর নামিয়ে বেঁধে দিন।",
        },
        ok: { en: "Valve seated and secured.", bn: "ভালভ বসে আটকানো হয়েছে।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "^ascending aorta$", effect: "ring" },
        highlight: "^ascending aorta$",
      },
      {
        id: "close-aorta",
        title: { en: "Close the aorta", bn: "মহাধমনী বন্ধ" },
        text: {
          en: "Sew the aortic opening closed with continuous stitches, then the clamp is released.",
          bn: "একটানা সেলাইয়ে মহাধমনীর খোলা জায়গা বন্ধ করুন, তারপর ক্ল্যাম্প খুলবে।",
        },
        ok: { en: "Aorta closed. The heart restarts.", bn: "মহাধমনী বন্ধ। হৃৎপিণ্ড আবার চলছে।" },
        tool: "suture",
        instrument: "needle",
        do: { kind: "close", layer: "^ascending aorta$" },
      },
      closeSkin(),
    ],
  },

  /* ---------------- lung lobectomy ---------------- */
  lobectomy: {
    surgeryId: "lobectomy",
    body: "male",
    steps: [
      portsIn(LOBE_PORTS, 3),
      {
        id: "vein",
        title: { en: "Control the vein", bn: "শিরা নিয়ন্ত্রণ" },
        text: {
          en: "Click the pulmonary vein with the stapler to secure the lobe's venous drainage first.",
          bn: "প্রথমে স্ট্যাপলার দিয়ে পালমোনারি শিরায় ক্লিক করে লোবের শিরা-নিষ্কাশন নিয়ন্ত্রণ করুন।",
        },
        ok: { en: "Vein stapled and divided first.", bn: "শিরা আগে স্ট্যাপল করে কাটা হয়েছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "pulmonary vein", effect: "clamp" },
        inside: true,
        highlight: "pulmonary vein",
        focus: { match: "pulmonary vein|lobe of right lung", distance: 0.45 },
        note: {
          en: "Vein first, then artery, then bronchus: this order avoids squeezing tumour cells into the blood.",
          bn: "আগে শিরা, তারপর ধমনী, তারপর ব্রঙ্কাস — এই ক্রমে টিউমারের কোষ রক্তে চেপে যায় না।",
        },
      },
      {
        id: "artery",
        title: { en: "Control the artery", bn: "ধমনী নিয়ন্ত্রণ" },
        text: {
          en: "Click the pulmonary artery with the stapler to control the arterial supply.",
          bn: "স্ট্যাপলার দিয়ে পালমোনারি ধমনীতে ক্লিক করে ধমনী-সরবরাহ নিয়ন্ত্রণ করুন।",
        },
        ok: { en: "Artery stapled and divided.", bn: "ধমনী স্ট্যাপল করে কাটা হয়েছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "pulmonary artery", effect: "clamp" },
        inside: true,
        highlight: "pulmonary artery",
      },
      {
        id: "bronchus",
        title: { en: "Staple the bronchus", bn: "ব্রঙ্কাস স্ট্যাপল" },
        text: {
          en: "Click the bronchus with the stapler to close and divide the airway to the lobe.",
          bn: "স্ট্যাপলার দিয়ে ব্রঙ্কাসে ক্লিক করে লোবের শ্বাসপথ বন্ধ করে কাটুন।",
        },
        ok: { en: "Bronchus closed and divided.", bn: "ব্রঙ্কাস বন্ধ করে কাটা হয়েছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "^bronchus$", effect: "clamp" },
        inside: true,
        highlight: "^bronchus$",
      },
      {
        id: "lobe",
        title: { en: "Free the lobe", bn: "লোব মুক্ত করা" },
        text: {
          en: "Cut across the lower lobe of the right lung to complete the fissure and free the lobe.",
          bn: "ডান ফুসফুসের নিচের লোবের আড়াআড়ি কেটে ফিশার সম্পূর্ণ করুন ও লোব মুক্ত করুন।",
        },
        ok: { en: "Lobe freed and removed in a bag.", bn: "লোব মুক্ত করে ব্যাগে ভরে বের করা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", target: "^lower lobe of right lung$", minLength: 0.03, remove: "^lower lobe of right lung$", open: 0.006 },
        inside: true,
        highlight: "^lower lobe of right lung$",
        focus: { match: "lobe of right lung|middle lobe of lung", distance: 0.5 },
      },
      portsOut(LOBE_PORTS, 3),
    ],
  },

  /* ---------------- tracheostomy ---------------- */
  tracheostomy: {
    surgeryId: "tracheostomy",
    body: "male",
    steps: [
      cutSkin(TRACH_LINE, 0.02, {
        en: "Cut the skin horizontally (2–3 cm) midway between the thyroid cartilage and the sternal notch.",
        bn: "থাইরয়েড কার্টিলেজ ও স্টার্নাল নচের মাঝামাঝি অনুভূমিকভাবে (২–৩ সেমি) চামড়া কাটুন।",
      }),
      {
        id: "strap",
        title: { en: "Through the strap muscles", bn: "স্ট্র্যাপ পেশীর মধ্য দিয়ে" },
        text: {
          en: "Cut down through the neck layers in the midline until the trachea is exposed. Keep away from the vessels at the sides.",
          bn: "মাঝ বরাবর ঘাড়ের স্তরগুলো কেটে নামুন যতক্ষণ না শ্বাসনালী দেখা যায়। পাশের রক্তনালী থেকে দূরে থাকুন।",
        },
        ok: { en: "The trachea is exposed.", bn: "শ্বাসনালী উন্মুক্ত হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilExpose: "^trachea$", avoid: "carotid|jugular|subclavian|thyroid cartilage", minLength: 0.012, open: 0.01 },
        focus: { match: "^trachea$", distance: 0.28 },
      },
      retract(0.03, {
        en: "Retract the muscles to either side to widen the view of the trachea.",
        bn: "শ্বাসনালীর দৃশ্য বড় করতে পেশী দুই পাশে সরান।",
      }),
      {
        id: "window",
        title: { en: "Open the trachea", bn: "শ্বাসনালী খোলা" },
        text: {
          en: "Make a small cut (about 1 cm) in the front of the trachea between the 2nd and 3rd rings.",
          bn: "২য় ও ৩য় রিংয়ের মাঝে শ্বাসনালীর সামনে ছোট (প্রায় ১ সেমি) কাটা দিন।",
        },
        ok: { en: "Trachea opened. Air is heard rushing through.", bn: "শ্বাসনালী খোলা হয়েছে। বাতাসের শব্দ শোনা যাচ্ছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", layer: "^trachea$", minLength: 0.008, open: 0.006 },
        highlight: "^trachea$",
        focus: { match: "^trachea$", distance: 0.22 },
      },
      {
        id: "tube",
        title: { en: "Insert the tube", bn: "নল ঢোকানো" },
        text: {
          en: "Click the opening to insert the tracheostomy tube, inflate the cuff and connect the ventilator.",
          bn: "খোলা জায়গায় ক্লিক করে ট্র্যাকিওস্টমি নল ঢোকান, কাফ ফোলান এবং ভেন্টিলেটর যুক্ত করুন।",
        },
        ok: { en: "Tube in place, cuff inflated. Procedure complete.", bn: "নল বসেছে, কাফ ফোলানো। অপারেশন সম্পন্ন।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "^trachea$", effect: "tube" },
        highlight: "^trachea$",
      },
    ],
  },

  /* ---------------- kidney transplant ---------------- */
  "kidney-transplant": {
    surgeryId: "kidney-transplant",
    body: "male",
    steps: [
      cutSkin(HOCKEY, 0.07, {
        en: "Cut the skin along the curved 'hockey-stick' line in the right lower abdomen.",
        bn: "ডান নিচের পেটে বাঁকা 'হকি-স্টিক' দাগ বরাবর চামড়া কাটুন।",
      }),
      {
        id: "wall",
        title: { en: "Down to the iliac vessels", bn: "ইলিয়াক রক্তনালী পর্যন্ত" },
        text: {
          en: "Cut through the muscle layers, one at a time, until the external iliac vessels are exposed behind the peritoneum.",
          bn: "পেশীর স্তরগুলো একে একে কেটে নামুন, যতক্ষণ না পেরিটোনিয়ামের পেছনে এক্সটার্নাল ইলিয়াক রক্তনালী দেখা যায়।",
        },
        ok: { en: "The external iliac vessels are exposed.", bn: "এক্সটার্নাল ইলিয়াক রক্তনালী উন্মুক্ত।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilExpose: "iliac (artery|vein)", avoid: "bladder|colon|ileum", minLength: 0.03, open: 0.012 },
        focus: { match: "right external iliac|right common iliac", distance: 0.45 },
      },
      retract(0.05),
      {
        id: "clamp",
        title: { en: "Clamp the iliac vein", bn: "ইলিয়াক শিরা ক্ল্যাম্প" },
        text: {
          en: "Place the vascular clamp on the external iliac vein for the venous anastomosis.",
          bn: "শিরার জোড়ার জন্য এক্সটার্নাল ইলিয়াক শিরায় ভাস্কুলার ক্ল্যাম্প দিন।",
        },
        ok: { en: "Vein clamped.", bn: "শিরা ক্ল্যাম্প করা হয়েছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "right (external|common) iliac vein", effect: "clamp" },
        highlight: "right (external|common) iliac vein",
        focus: { match: "right (external|common) iliac", distance: 0.4 },
      },
      {
        id: "kidney",
        title: { en: "Lower in the kidney", bn: "কিডনি বসানো" },
        text: {
          en: "Click on the iliac vessels to lower the donor kidney into the iliac fossa and sew its vein and artery to them.",
          bn: "ইলিয়াক রক্তনালীতে ক্লিক করে দাতার কিডনি ইলিয়াক ফোসায় নামান এবং এর শিরা ও ধমনী সেলাই করে জুড়ুন।",
        },
        ok: { en: "Kidney in place. It pinks up as the clamps come off.", bn: "কিডনি বসেছে। ক্ল্যাম্প খুলতেই গোলাপি হয়ে উঠছে।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "right (external|common) iliac (artery|vein)", effect: "kidney" },
        highlight: "right (external|common) iliac",
      },
      {
        id: "ureter",
        title: { en: "Connect the ureter", bn: "ইউরেটার জোড়া" },
        text: {
          en: "Click the bladder with the needle holder to implant the ureter of the new kidney into it.",
          bn: "নিডল হোল্ডার দিয়ে মূত্রথলিতে ক্লিক করে নতুন কিডনির ইউরেটার তাতে বসান।",
        },
        ok: { en: "Ureter implanted over a stent. Urine will drain into the bladder.", bn: "স্টেন্টের উপর ইউরেটার বসেছে। প্রস্রাব মূত্রথলিতে যাবে।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "urinary bladder", effect: "ureter" },
        highlight: "urinary bladder",
        focus: { match: "urinary bladder", distance: 0.35 },
      },
      closeSkin(),
    ],
  },

  /* ---------------- caesarean ---------------- */
  caesarean: {
    surgeryId: "caesarean",
    body: "female",
    steps: [
      cutSkin(PFANNENSTIEL, 0.08, {
        en: "Cut the skin along the low curved line, 2–3 cm above the pubic bone.",
        bn: "পিউবিক হাড়ের ২–৩ সেমি উপরে নিচু বাঁকা দাগ বরাবর চামড়া কাটুন।",
      }),
      {
        id: "layers",
        title: { en: "Through the layers", bn: "স্তরগুলোর মধ্য দিয়ে" },
        text: {
          en: "Open the fat and abdominal wall layers one by one, until the bowel and uterus come into view.",
          bn: "চর্বি ও পেটের দেয়ালের স্তরগুলো একে একে খুলুন, যতক্ষণ না অন্ত্র ও জরায়ু দেখা যায়।",
        },
        ok: { en: "The peritoneum is open. The uterus is in view.", bn: "পেরিটোনিয়াম খোলা হয়েছে। জরায়ু দেখা যাচ্ছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilExpose: "@organ", avoid: "uterus|uterine|bladder|ovary|ileum|colon|omentum|jejenum", minLength: 0.03, open: 0.012 },
        focus: { match: "uterus|uterine", distance: 0.45 },
      },
      {
        id: "pack",
        title: { en: "Move the bowel aside", bn: "অন্ত্র সরানো" },
        text: {
          en: "Lift the omentum and bowel away from the uterus with the forceps so they are out of the way.",
          bn: "ফরসেপ দিয়ে ওমেন্টাম ও অন্ত্র জরায়ুর সামনে থেকে তুলে সরিয়ে দিন।",
        },
        ok: { en: "Bowel packed away. The lower segment of the uterus is clear.", bn: "অন্ত্র সরানো হয়েছে। জরায়ুর নিচের অংশ পরিষ্কার।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "omentum|ileum|jejenum|colon|caecum", remove: "self" },
        highlight: "omentum",
      },
      retract(0.05),
      {
        id: "uterus",
        title: { en: "Open the uterus", bn: "জরায়ু খোলা" },
        text: {
          en: "Cut a small transverse incision (at least 3 cm) in the lower part of the uterus.",
          bn: "জরায়ুর নিচের অংশে ছোট আড়াআড়ি কাটা (অন্তত ৩ সেমি) দিন।",
        },
        ok: { en: "Uterus opened. The baby's head is visible.", bn: "জরায়ু খোলা হয়েছে। শিশুর মাথা দেখা যাচ্ছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", layer: "uterus|uterine|cervix", minLength: 0.025, open: 0.014 },
        highlight: "uterus|uterine",
        focus: { match: "uterus|uterine", distance: 0.3 },
        note: { en: "Cut slowly: the baby's head or arm lies just beneath.", bn: "ধীরে কাটুন — শিশুর মাথা বা হাত ঠিক নিচেই।" },
      },
      {
        id: "deliver",
        title: { en: "Deliver the baby", bn: "শিশুকে বের করা" },
        text: {
          en: "Click the opening to slip a hand under the baby's head and lift the baby out; then clamp and cut the cord.",
          bn: "খোলা জায়গায় ক্লিক করে শিশুর মাথার নিচে হাত ঢুকিয়ে শিশুকে তুলে আনুন; তারপর নাড়ি ক্ল্যাম্প করে কাটুন।",
        },
        ok: { en: "The baby is delivered and cries. Oxytocin is given.", bn: "শিশু জন্মেছে ও কাঁদছে। অক্সিটোসিন দেওয়া হয়েছে।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "uterus|uterine|cervix" },
        highlight: "uterus|uterine",
      },
      {
        id: "repair",
        title: { en: "Repair the uterus", bn: "জরায়ু মেরামত" },
        text: {
          en: "Sew the uterine incision closed with the needle holder. Point at the uterus, not the skin.",
          bn: "নিডল হোল্ডার দিয়ে জরায়ুর কাটা সেলাই করে বন্ধ করুন। চামড়ায় নয়, জরায়ুতে সুই ধরুন।",
        },
        ok: { en: "Uterus closed in two layers. It is firm and contracting.", bn: "জরায়ু দুই স্তরে বন্ধ। এটি শক্ত ও সংকুচিত হচ্ছে।" },
        tool: "suture",
        instrument: "needle",
        do: { kind: "close", layer: "uterus|uterine|cervix" },
        highlight: "uterus|uterine",
      },
      closeSkin(),
    ],
  },

  /* ---------------- hysterectomy ---------------- */
  hysterectomy: {
    surgeryId: "hysterectomy",
    body: "female",
    steps: [
      cutSkin(PFANNENSTIEL, 0.08, {
        en: "Cut the skin along the low curved line, 2–3 cm above the pubic bone.",
        bn: "পিউবিক হাড়ের ২–৩ সেমি উপরে নিচু বাঁকা দাগ বরাবর চামড়া কাটুন।",
      }),
      {
        id: "layers",
        title: { en: "Through the layers", bn: "স্তরগুলোর মধ্য দিয়ে" },
        text: {
          en: "Open the fat and abdominal wall layers one at a time, until the pelvic organs are in view.",
          bn: "চর্বি ও পেটের দেয়ালের স্তরগুলো একে একে খুলুন, যতক্ষণ না শ্রোণীর অঙ্গ দেখা যায়।",
        },
        ok: { en: "The abdomen is open.", bn: "পেট খোলা হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilExpose: "@organ", avoid: "uterus|uterine|bladder|ovary|ileum|colon|omentum|jejenum", minLength: 0.03, open: 0.012 },
        focus: { match: "uterus|uterine", distance: 0.45 },
      },
      {
        id: "pack",
        title: { en: "Move the bowel aside", bn: "অন্ত্র সরানো" },
        text: {
          en: "Lift the omentum and bowel up and out of the pelvis with the forceps.",
          bn: "ফরসেপ দিয়ে ওমেন্টাম ও অন্ত্র শ্রোণী থেকে উপরে তুলে সরান।",
        },
        ok: { en: "The pelvis is clear.", bn: "শ্রোণী পরিষ্কার।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "omentum|ileum|jejenum|colon|caecum", remove: "self" },
        highlight: "omentum",
      },
      retract(0.05),
      {
        id: "round",
        title: { en: "Clamp the round ligaments", bn: "রাউন্ড লিগামেন্ট ক্ল্যাম্প" },
        text: {
          en: "Click a round ligament of the uterus with the clamp to divide and tie it.",
          bn: "ক্ল্যাম্প দিয়ে জরায়ুর রাউন্ড লিগামেন্টে ক্লিক করে কেটে বাঁধুন।",
        },
        ok: { en: "Round ligament clamped and divided.", bn: "রাউন্ড লিগামেন্ট ক্ল্যাম্প করে কাটা হয়েছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "round ligament of uterus|broad ligament", effect: "clamp" },
        highlight: "round ligament of uterus|broad ligament",
        focus: { match: "uterus|uterine", distance: 0.3 },
      },
      {
        id: "pedicle",
        title: { en: "Clamp the tube and ovarian ligament", bn: "নালী ও ডিম্বাশয় লিগামেন্ট ক্ল্যাম্প" },
        text: {
          en: "Clamp the uterine tube and ovarian ligament on that side (the ovary is conserved).",
          bn: "ওই পাশের ইউটেরাইন নালী ও ডিম্বাশয় লিগামেন্ট ক্ল্যাম্প করুন (ডিম্বাশয় রাখা হচ্ছে)।",
        },
        ok: { en: "Pedicle clamped. The ureter is seen to be clear.", bn: "পেডিকল ক্ল্যাম্প। ইউরেটার নিরাপদ দেখা গেছে।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "ovarian ligament|uterine tube|fallopian|isthmus", effect: "clamp" },
        highlight: "ovarian ligament|isthmus of fallopian|uterine tube",
      },
      {
        id: "arteries",
        title: { en: "Clamp the uterine vessels", bn: "জরায়ুর রক্তনালী ক্ল্যাম্প" },
        text: {
          en: "Clamp the cardinal ligament at the side of the cervix, which carries the uterine artery. Check the ureter first.",
          bn: "সার্ভিক্সের পাশে ইউটেরাইন ধমনীবাহী কার্ডিনাল লিগামেন্ট ক্ল্যাম্প করুন। আগে ইউরেটার দেখে নিন।",
        },
        ok: { en: "Uterine vessels secured.", bn: "জরায়ুর রক্তনালী নিয়ন্ত্রিত।" },
        tool: "clamp",
        instrument: "clamp",
        do: { kind: "touch", target: "cardinal ligament|uterosacral", effect: "clamp" },
        highlight: "cardinal ligament|uterosacral",
        note: {
          en: "The ureter passes 1–2 cm from the uterine artery: 'water under the bridge'.",
          bn: "ইউরেটার ইউটেরাইন ধমনী থেকে ১–২ সেমি দূর দিয়ে যায় — 'ব্রিজের নিচে পানি'।",
        },
      },
      {
        id: "remove",
        title: { en: "Free the uterus", bn: "জরায়ু আলাদা করা" },
        text: {
          en: "Cut across the cervix to free the uterus and lift it out.",
          bn: "সার্ভিক্সের আড়াআড়ি কেটে জরায়ু আলাদা করে তুলে বের করুন।",
        },
        ok: { en: "Uterus removed. The top of the vagina is closed.", bn: "জরায়ু বের করা হয়েছে। যোনির উপরের অংশ বন্ধ।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: {
          kind: "cut",
          target: "cervix|body of uterus|fundus of uterus|anterior wall of uterus|posterior wall of uterus|lower uterine segment",
          minLength: 0.015,
          remove: "^(body of uterus|fundus of uterus|anterior wall of uterus|posterior wall of uterus|lower uterine segment|cornua)$",
          open: 0.006,
        },
        highlight: "uterus|cervix",
      },
      closeSkin(),
    ],
  },

  /* ---------------- craniotomy ---------------- */
  craniotomy: {
    surgeryId: "craniotomy",
    body: "male",
    steps: [
      cutSkin(SCALP, 0.1, {
        en: "Cut the scalp along the curved line behind the hairline.",
        bn: "চুলের রেখার পেছনে বাঁকা দাগ বরাবর স্ক্যাল্প কাটুন।",
      }),
      {
        id: "galea",
        title: { en: "Down to the bone", bn: "হাড় পর্যন্ত" },
        text: {
          en: "Cut through the galea and muscle layers of the scalp, one layer at a time, until the skull bone is bare.",
          bn: "স্ক্যাল্পের গ্যালিয়া ও পেশীর স্তর একে একে কেটে নামুন, যতক্ষণ না খুলির হাড় উন্মুক্ত হয়।",
        },
        ok: { en: "The skull is exposed.", bn: "খুলি উন্মুক্ত হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilExpose: "frontal bone|parietal bone|temporal bone", avoid: "gyrus|cerebr", minLength: 0.04, open: 0.012 },
        focus: { match: "frontal bone|parietal bone", distance: 0.4 },
      },
      retract(0.05, {
        en: "Fold back the scalp flap with the retractors to expose the bone.",
        bn: "রিট্র্যাক্টর দিয়ে স্ক্যাল্প ফ্ল্যাপ উল্টে হাড় উন্মুক্ত করুন।",
      }),
      {
        id: "flap",
        title: { en: "Cut the bone flap", bn: "হাড়ের ফ্ল্যাপ কাটা" },
        text: {
          en: "Cut across the bone with the craniotome to lift a window of skull (at least 4 cm).",
          bn: "ক্র্যানিওটোম দিয়ে হাড়ের আড়াআড়ি কেটে খুলির একটি জানালা (অন্তত ৪ সেমি) তুলুন।",
        },
        ok: { en: "Bone flap lifted. The brain is covered by the dura.", bn: "হাড়ের ফ্ল্যাপ তোলা হয়েছে। মস্তিষ্ক ডুরায় ঢাকা।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", layer: "frontal bone|parietal bone|temporal bone", minLength: 0.04, removeCut: true, open: 0.01 },
        highlight: "frontal bone|parietal bone",
      },
      {
        id: "lesion",
        title: { en: "Remove the lesion", bn: "ক্ষত অপসারণ" },
        text: {
          en: "With the forceps and suction, click the highlighted gyrus to remove the lesion beneath it.",
          bn: "ফরসেপ ও সাকশন দিয়ে জ্বলজ্বলে গাইরাসে ক্লিক করে এর নিচের ক্ষত সরান।",
        },
        ok: { en: "Lesion resected with a clear margin.", bn: "ক্ষত পরিষ্কার মার্জিনসহ সরানো হয়েছে।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "left (superior|middle) frontal gyrus|right (superior|middle) frontal gyrus", remove: "self" },
        highlight: "(superior|middle) frontal gyrus",
        focus: { match: "(superior|middle) frontal gyrus", distance: 0.28 },
      },
      closeSkin(),
    ],
  },

  /* ---------------- total knee replacement ---------------- */
  tkr: {
    surgeryId: "tkr",
    body: "male",
    steps: [
      cutSkin(KNEE_LINE, 0.1, {
        en: "Cut the skin in the midline over the knee, about 15 cm.",
        bn: "হাঁটুর উপর মাঝ বরাবর প্রায় ১৫ সেমি চামড়া কাটুন।",
      }),
      {
        id: "capsule",
        title: { en: "Open the joint", bn: "জোড়া খোলা" },
        text: {
          en: "Cut through the layers over the knee, one at a time, until the kneecap and the thigh bone are exposed.",
          bn: "হাঁটুর উপরের স্তরগুলো একে একে কেটে নামুন, যতক্ষণ না হাঁটুর বাটি ও উরুর হাড় দেখা যায়।",
        },
        ok: { en: "The joint is open. The kneecap is exposed.", bn: "জোড়া খোলা। হাঁটুর বাটি উন্মুক্ত।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", untilExpose: "right patella|right femur", avoid: "femoral|popliteal|saphenous", minLength: 0.04, open: 0.012 },
        focus: { match: "^right patella", distance: 0.4 },
      },
      retract(0.04, {
        en: "Pull the soft tissue to the side with the retractors and flip the kneecap away.",
        bn: "রিট্র্যাক্টর দিয়ে নরম টিস্যু পাশে টেনে হাঁটুর বাটি সরিয়ে দিন।",
      }),
      {
        id: "femur",
        title: { en: "Cut the femur", bn: "ঊর্বাস্থি কাটা" },
        text: {
          en: "Cut across the end of the thigh bone with the saw (at least 3 cm) to remove the worn surface.",
          bn: "করাত দিয়ে উরুর হাড়ের প্রান্তের আড়াআড়ি (অন্তত ৩ সেমি) কেটে ক্ষয়ে যাওয়া তল সরান।",
        },
        ok: { en: "Femoral cut made at the planned angle.", bn: "পরিকল্পিত কোণে ফিমোরাল কাট হয়েছে।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", layer: "^right femur$", minLength: 0.03, open: 0.003 },
        highlight: "^right femur$",
        focus: { match: "^right femur$", distance: 0.5 },
      },
      {
        id: "tibia",
        title: { en: "Cut the tibia", bn: "টিবিয়া কাটা" },
        text: {
          en: "Cut across the top of the shin bone with the saw (at least 3 cm).",
          bn: "করাত দিয়ে শিনের হাড়ের মাথার আড়াআড়ি (অন্তত ৩ সেমি) কাটুন।",
        },
        ok: { en: "Tibial cut made. The gaps are balanced.", bn: "টিবিয়াল কাট হয়েছে। ফাঁক সমান।" },
        tool: "scalpel",
        instrument: "scalpel",
        do: { kind: "cut", layer: "^right tibia$", minLength: 0.03, open: 0.003 },
        highlight: "^right tibia$",
        focus: { match: "^right tibia$", distance: 0.5 },
      },
      {
        id: "femoral-cap",
        title: { en: "Fit the femoral component", bn: "ফিমোরাল কম্পোনেন্ট বসানো" },
        text: {
          en: "Click the end of the thigh bone to cement and fit the metal femoral component.",
          bn: "উরুর হাড়ের প্রান্তে ক্লিক করে ধাতব ফিমোরাল কম্পোনেন্ট সিমেন্ট করে বসান।",
        },
        ok: { en: "Femoral component cemented.", bn: "ফিমোরাল কম্পোনেন্ট সিমেন্ট হয়েছে।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "^right femur$", effect: "cap" },
        highlight: "^right femur$",
      },
      {
        id: "tibial-tray",
        title: { en: "Fit the tibial tray", bn: "টিবিয়াল ট্রে বসানো" },
        text: {
          en: "Click the top of the shin bone to cement the tibial tray with its plastic insert.",
          bn: "শিনের হাড়ের মাথায় ক্লিক করে প্লাস্টিক ইনসার্টসহ টিবিয়াল ট্রে সিমেন্ট করুন।",
        },
        ok: { en: "Tibial component fitted. The knee bends and straightens smoothly.", bn: "টিবিয়াল কম্পোনেন্ট বসেছে। হাঁটু মসৃণভাবে ভাঁজ-সোজা হচ্ছে।" },
        tool: "forceps",
        instrument: "forceps",
        do: { kind: "touch", target: "^right tibia$", effect: "tray" },
        highlight: "^right tibia$",
      },
      closeSkin(),
    ],
  },
};

export const hasPractice = (id: string) => id === "appendicectomy-open" || id in PRACTICE;
