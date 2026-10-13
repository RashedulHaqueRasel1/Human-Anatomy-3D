import type { SkinPlan } from "./engine";
import type { SystemId } from "./body";
import { APPENDECTOMY, type StepId } from "./appendectomy";

/**
 * The surgery library. Every entry has a step-by-step tutorial (camera, highlighted
 * anatomy, skin markings, instruments) in English and Bangla. Entries flagged
 * `practice` can also be performed by hand in the guided simulator.
 */

type Bi = { en: string; bn: string };

export type SurgeryCategory = "abdominal" | "cardiothoracic" | "urology" | "gynae" | "neuro" | "ortho" | "headneck";

export const CATEGORIES: { id: SurgeryCategory; name: Bi }[] = [
  { id: "abdominal", name: { en: "Abdominal", bn: "পেটের অপারেশন" } },
  { id: "cardiothoracic", name: { en: "Heart & chest", bn: "হৃদ্‌রোগ ও বুক" } },
  { id: "urology", name: { en: "Kidney & urinary", bn: "কিডনি ও মূত্রতন্ত্র" } },
  { id: "gynae", name: { en: "Gynaecology & obstetrics", bn: "স্ত্রীরোগ ও প্রসূতি" } },
  { id: "neuro", name: { en: "Brain", bn: "মস্তিষ্ক" } },
  { id: "ortho", name: { en: "Bones & joints", bn: "হাড় ও জোড়া" } },
  { id: "headneck", name: { en: "Head & neck", bn: "মাথা ও ঘাড়" } },
];

export type TutorialStep = {
  title: Bi;
  text: Bi;
  /** Instrument or equipment used in this step. */
  instrument?: Bi;
  /** Regex source (case-insensitive) of the structures to highlight. */
  highlight?: string;
  /** Camera target: regex source of the structures to frame, and distance in metres. */
  focus?: { match: string; distance: number };
  /** Skin markings (incision lines, port sites); when present the skin is shown. */
  plan?: SkinPlan;
  /** Systems visible in this step (defaults to the surgery's list). */
  show?: SystemId[];
  /** Clinical pearl or warning. */
  tip?: Bi;
};

export type Surgery = {
  id: string;
  category: SurgeryCategory;
  name: Bi;
  summary: Bi;
  /** The anatomical model needed; the lab switches to it automatically. */
  body: "any" | "female" | "male";
  difficulty: 1 | 2 | 3;
  duration: Bi;
  anaesthesia: Bi;
  indications: Bi;
  risks: Bi;
  /** Systems shown while the tutorial plays. */
  show: SystemId[];
  /** Default camera target. */
  focus: { match: string; distance: number };
  /** Hands-on simulation available. */
  practice?: boolean;
  steps: TutorialStep[];
};

/* ------------------------------------------------------------------ */
/* Open appendicectomy: derived from the interactive procedure script  */
/* ------------------------------------------------------------------ */

const APP_VIEW: Partial<Record<StepId, { highlight: string; focus: { match: string; distance: number } }>> = {
  landmark: { highlight: "right hip bone|appendix", focus: { match: "^appendix$|vermiform", distance: 0.55 } },
  skin: { highlight: "^skin$", focus: { match: "^appendix$|vermiform", distance: 0.4 } },
  eo: { highlight: "right external oblique", focus: { match: "^appendix$|vermiform", distance: 0.35 } },
  io: { highlight: "right internal oblique", focus: { match: "^appendix$|vermiform", distance: 0.3 } },
  ta: { highlight: "right transversus abdominis", focus: { match: "^appendix$|vermiform", distance: 0.28 } },
  retract: { highlight: "peritoneum|right transversus abdominis", focus: { match: "^appendix$|vermiform", distance: 0.26 } },
  deliver: { highlight: "colon|cecum|caecum|ileum", focus: { match: "^colon$|^appendix$|caecum|cecum", distance: 0.3 } },
  identify: { highlight: "appendix|taenia", focus: { match: "^appendix$|vermiform", distance: 0.2 } },
  clamp: { highlight: "appendix", focus: { match: "^appendix$|vermiform", distance: 0.16 } },
  ligate: { highlight: "appendix", focus: { match: "^appendix$|vermiform", distance: 0.16 } },
  excise: { highlight: "appendix", focus: { match: "^appendix$|vermiform", distance: 0.16 } },
  close: { highlight: "^skin$", focus: { match: "^appendix$|vermiform", distance: 0.3 } },
};

const APP_INSTRUMENT: Partial<Record<StepId, Bi>> = {
  skin: { en: "Scalpel, No. 10 blade", bn: "স্ক্যালপেল, ১০ নম্বর ব্লেড" },
  eo: { en: "Scalpel / scissors", bn: "স্ক্যালপেল / কাঁচি" },
  io: { en: "Scalpel, artery forceps", bn: "স্ক্যালপেল, আর্টারি ফরসেপ" },
  ta: { en: "Artery forceps (blunt split)", bn: "আর্টারি ফরসেপ" },
  retract: { en: "Langenbeck retractors", bn: "ল্যাঙ্গেনবেক রিট্র্যাক্টর" },
  deliver: { en: "Babcock forceps", bn: "ব্যাবকক ফরসেপ" },
  clamp: { en: "Kelly artery forceps", bn: "কেলি আর্টারি ফরসেপ" },
  ligate: { en: "Vicryl 2-0 ligature", bn: "ভিক্রিল ২-০ সুতা" },
  excise: { en: "Scalpel", bn: "স্ক্যালপেল" },
  close: { en: "Needle holder, sutures", bn: "নিডল হোল্ডার, সুতা" },
};

const GRIDIRON: SkinPlan = {
  anchor: "^appendix$|vermiform",
  lines: [
    [
      [-0.023, 0.016],
      [-0.049, 0.07],
    ],
  ],
  points: [{ at: [-0.036, 0.043], color: "#fbbf24", size: 0.007 }],
};

/** Body-wall layers are shown while they are being cut, then hidden to reveal the bowel. */
const APP_SHOW: Partial<Record<StepId, SystemId[]>> = {
  eo: ["muscular", "skeletal"],
  io: ["muscular", "skeletal"],
  ta: ["muscular", "skeletal"],
  retract: ["digestive", "skeletal"],
  deliver: ["digestive", "skeletal"],
  identify: ["digestive", "skeletal"],
  clamp: ["digestive", "skeletal"],
  ligate: ["digestive", "skeletal"],
  excise: ["digestive", "skeletal"],
};

const APP_NOTE_BN: Partial<Record<StepId, string>> = {
  landmark: "এটি সাধারণত অ্যাপেন্ডিক্সের গোড়ার ঠিক উপরে থাকে।",
  skin: "গ্রিডআয়রন কাটা স্পাইনো-অম্বিলিক্যাল রেখার লম্ব, ম্যাকবার্নি'স পয়েন্টকে কেন্দ্র করে।",
  eo: "এর আঁশ নিচের দিকে ও ভেতরের দিকে যায় — যেন পকেটে হাত রেখেছেন।",
  io: "পেশী আড়াআড়ি না কেটে আলাদা করা হয়, তাই পরে হার্নিয়ার ঝুঁকি কম।",
  retract: "পেরিটোনিয়াম তুলে ধরে কাটুন, যাতে নিচের অন্ত্রে আঘাত না লাগে।",
  deliver: "ব্যাবকক ফরসেপ অন্ত্রকে থেঁতলে না দিয়ে ধরে।",
  clamp: "মেসোঅ্যাপেন্ডিক্স ও অ্যাপেন্ডিকুলার ধমনী আগে ক্ল্যাম্প করে কেটে বাঁধা হয়।",
  excise: "নমুনা হিস্টোপ্যাথলজিতে যায়; স্টাম্প পার্স-স্ট্রিং সেলাইয়ে ঢেকে দেওয়া যায়।",
  close: "প্রতিটি পেশী স্তর আলাদা করে সেলাই হয়, শেষে চামড়া।",
};

const OPEN_APP_STEPS: TutorialStep[] = APPENDECTOMY.map((s) => ({
  title: { en: s.title, bn: s.bn },
  text: { en: s.instruction, bn: s.bnInstruction },
  instrument: APP_INSTRUMENT[s.id],
  highlight: APP_VIEW[s.id]?.highlight,
  focus: APP_VIEW[s.id]?.focus,
  show: APP_SHOW[s.id],
  plan: s.id === "landmark" || s.id === "skin" || s.id === "close" ? GRIDIRON : undefined,
  tip: s.note ? { en: s.note, bn: APP_NOTE_BN[s.id] ?? s.note } : undefined,
}));

/* ------------------------------------------------------------------ */

const STERNOTOMY: SkinPlan = { anchor: "wall of heart|papillary muscle of heart", lines: [[[-0.022, 0.085], [-0.022, -0.11]]] };

export const SURGERIES: Surgery[] = [
  {
    id: "appendicectomy-open",
    category: "abdominal",
    name: { en: "Open appendicectomy", bn: "ওপেন অ্যাপেন্ডেক্টমি" },
    summary: {
      en: "Removal of the inflamed appendix through a small gridiron incision in the right lower abdomen.",
      bn: "পেটের ডান নিচের দিকে ছোট গ্রিডআয়রন কাটা দিয়ে প্রদাহিত অ্যাপেন্ডিক্স কেটে ফেলা।",
    },
    body: "male",
    difficulty: 1,
    duration: { en: "30–60 min", bn: "৩০–৬০ মিনিট" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "Acute appendicitis: pain moving to the right lower abdomen, fever, vomiting.", bn: "তীব্র অ্যাপেন্ডিসাইটিস: ব্যথা ডান নিচের পেটে সরে আসে, জ্বর, বমি।" },
    risks: { en: "Wound infection, bleeding, abscess, bowel injury, adhesions.", bn: "ক্ষতে সংক্রমণ, রক্তক্ষরণ, ফোড়া, অন্ত্রে আঘাত, আঠালো টিস্যু।" },
    show: ["digestive", "muscular", "skeletal", "cardiovascular"],
    focus: { match: "^appendix$|vermiform", distance: 0.45 },
    practice: true,
    steps: OPEN_APP_STEPS,
  },
  {
    id: "appendicectomy-lap",
    category: "abdominal",
    name: { en: "Laparoscopic appendicectomy", bn: "ল্যাপারোস্কোপিক অ্যাপেন্ডেক্টমি" },
    summary: {
      en: "Keyhole removal of the appendix through three small ports with a camera.",
      bn: "ক্যামেরা ও তিনটি ছোট পোর্ট দিয়ে 'কি-হোল' পদ্ধতিতে অ্যাপেন্ডিক্স অপসারণ।",
    },
    body: "any",
    difficulty: 2,
    duration: { en: "30–60 min", bn: "৩০–৬০ মিনিট" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "Appendicitis, especially in women of child-bearing age and obese patients.", bn: "অ্যাপেন্ডিসাইটিস, বিশেষ করে সন্তান ধারণের বয়সী নারী ও স্থূল রোগীতে।" },
    risks: { en: "Port-site infection, bowel injury, bleeding, conversion to open surgery.", bn: "পোর্টের জায়গায় সংক্রমণ, অন্ত্রে আঘাত, রক্তক্ষরণ, ওপেন সার্জারিতে রূপান্তর।" },
    show: ["digestive", "urinary", "skeletal", "cardiovascular"],
    focus: { match: "appendix", distance: 0.5 },
    steps: [
      {
        title: { en: "Place the ports", bn: "পোর্ট বসানো" },
        text: {
          en: "Through a small cut at the umbilicus a 10-mm port is inserted for the camera, then carbon dioxide is pumped in to lift the abdominal wall. Two more ports go in under vision: one just above the pubis and one in the left lower abdomen.",
          bn: "নাভির কাছে ছোট কেটে ক্যামেরার জন্য ১০ মিমি পোর্ট বসানো হয়, তারপর কার্বন ডাই-অক্সাইড ভরে পেটের দেয়াল উঁচু করা হয়। আরও দুটি পোর্ট চোখের সামনে বসে — একটি ঠিক পিউবিসের উপরে, আরেকটি বাম নিচের পেটে।",
        },
        instrument: { en: "Veress needle / Hasson trocar", bn: "ভেরেস নিডল / হ্যাসন ট্রকার" },
        plan: {
          anchor: "^appendix$|vermiform",
          points: [
            { at: [0.059, 0.09], color: "#38bdf8", size: 0.008 },
            { at: [0.059, -0.095], color: "#fbbf24", size: 0.006 },
            { at: [0.13, 0.01], color: "#fbbf24", size: 0.006 },
          ],
        },
        tip: { en: "Pressure of 12–15 mmHg gives a working space without harming breathing.", bn: "১২–১৫ মিমিএইচজি চাপে কাজের জায়গা হয়, শ্বাসে সমস্যা হয় না।" },
      },
      {
        title: { en: "Find the appendix", bn: "অ্যাপেন্ডিক্স খুঁজে বের করা" },
        text: {
          en: "The table is tilted head-down and to the left so the bowel falls away. The surgeon follows the taeniae of the caecum down to where they meet — the base of the appendix — and lifts it with a grasper.",
          bn: "টেবিল মাথা নিচু ও বাম দিকে হেলানো হয়, যাতে অন্ত্র সরে যায়। সার্জন সিকামের টিনিয়া অনুসরণ করে যেখানে তারা মিলেছে — অ্যাপেন্ডিক্সের গোড়া — সেখানে পৌঁছে গ্র্যাসপার দিয়ে এটি তুলে ধরেন।",
        },
        instrument: { en: "Atraumatic grasper", bn: "অ্যাট্রমাটিক গ্র্যাসপার" },
        highlight: "appendix|cecum|caecum|taenia|ileum",
        focus: { match: "appendix", distance: 0.2 },
      },
      {
        title: { en: "Divide the mesoappendix", bn: "মেসোঅ্যাপেন্ডিক্স কাটা" },
        text: {
          en: "The thin fold of tissue that carries the appendicular artery is sealed and divided close to the appendix using diathermy or an ultrasonic device, so the appendix is freed from its blood supply.",
          bn: "অ্যাপেন্ডিকুলার ধমনী বহনকারী পাতলা ভাঁজটি ডায়াথার্মি বা আলট্রাসনিক যন্ত্র দিয়ে অ্যাপেন্ডিক্সের কাছেই সিল করে কাটা হয়, ফলে অ্যাপেন্ডিক্স রক্তসরবরাহ থেকে আলাদা হয়ে যায়।",
        },
        instrument: { en: "Diathermy hook / harmonic scalpel", bn: "ডায়াথার্মি হুক / হারমোনিক স্ক্যালপেল" },
        highlight: "appendix|ileocolic|mesenteric",
        focus: { match: "appendix", distance: 0.16 },
      },
      {
        title: { en: "Secure and divide the base", bn: "গোড়া বেঁধে কাটা" },
        text: {
          en: "Two loops (endoloops) are tightened around the base of the appendix, or a stapler is fired across it. The appendix is then cut between the loops, leaving a secured stump on the caecum.",
          bn: "অ্যাপেন্ডিক্সের গোড়ায় দুটি লুপ (এন্ডোলুপ) শক্ত করে বাঁধা হয় বা স্ট্যাপলার চালানো হয়। তারপর লুপের মাঝে কেটে সিকামে নিরাপদ স্টাম্প রেখে দেওয়া হয়।",
        },
        instrument: { en: "Endoloop ×2 or linear stapler", bn: "এন্ডোলুপ ×২ বা লিনিয়ার স্ট্যাপলার" },
        highlight: "appendix|cecum|caecum",
        focus: { match: "appendix", distance: 0.14 },
        tip: { en: "Never cut flush with the caecum: a leak from the stump is the most feared complication.", bn: "সিকামের সাথে একেবারে লাগিয়ে কাটতে নেই — স্টাম্প থেকে লিক সবচেয়ে ভয়ংকর জটিলতা।" },
      },
      {
        title: { en: "Remove, wash and close", bn: "বের করে, ধুয়ে, বন্ধ করা" },
        text: {
          en: "The appendix is placed in a retrieval bag and pulled out through the umbilical port so it cannot touch the wound. The pelvis is washed if infected, the gas is released, and the port sites are closed with stitches or glue.",
          bn: "অ্যাপেন্ডিক্স একটি ব্যাগে ভরে নাভির পোর্ট দিয়ে বের করা হয়, যাতে ক্ষতের সংস্পর্শে না আসে। সংক্রমিত থাকলে শ্রোণী ধোয়া হয়, গ্যাস ছেড়ে দেওয়া হয় এবং পোর্টের জায়গা সেলাই বা আঠা দিয়ে বন্ধ করা হয়।",
        },
        instrument: { en: "Retrieval bag, suture", bn: "রিট্রিভাল ব্যাগ, সুতা" },
        plan: {
          anchor: "^appendix$|vermiform",
          points: [
            { at: [0.059, 0.09], color: "#22c55e", size: 0.008 },
            { at: [0.059, -0.095], color: "#22c55e", size: 0.006 },
            { at: [0.13, 0.01], color: "#22c55e", size: 0.006 },
          ],
        },
      },
    ],
  },
  {
    id: "cholecystectomy-lap",
    category: "abdominal",
    name: { en: "Laparoscopic cholecystectomy", bn: "ল্যাপারোস্কোপিক কোলেসিস্টেক্টমি" },
    summary: {
      en: "Keyhole removal of the gallbladder, most often for gallstones.",
      bn: "কি-হোল পদ্ধতিতে পিত্তথলি অপসারণ — সাধারণত পিত্তথলির পাথরের জন্য।",
    },
    body: "any",
    difficulty: 2,
    duration: { en: "45–90 min", bn: "৪৫–৯০ মিনিট" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "Symptomatic gallstones, cholecystitis, gallbladder polyps.", bn: "উপসর্গযুক্ত পিত্তথলির পাথর, কোলেসিস্টাইটিস, পলিপ।" },
    risks: { en: "Bile duct injury (rare but serious), bile leak, bleeding, infection.", bn: "পিত্তনালীর আঘাত (বিরল কিন্তু গুরুতর), পিত্ত লিক, রক্তক্ষরণ, সংক্রমণ।" },
    show: ["digestive", "cardiovascular", "skeletal", "urinary"],
    focus: { match: "gallbladder", distance: 0.5 },
    steps: [
      {
        title: { en: "Ports and pneumoperitoneum", bn: "পোর্ট ও গ্যাস ভরা" },
        text: {
          en: "Four ports are used: the camera port at the umbilicus, a working port below the breastbone, and two small ports under the right rib margin for graspers. Gas lifts the abdominal wall away from the organs.",
          bn: "চারটি পোর্ট ব্যবহার হয়: নাভিতে ক্যামেরা পোর্ট, বুকের হাড়ের নিচে কাজের পোর্ট, আর ডান পাঁজরের কিনারার নিচে গ্র্যাসপারের জন্য দুটি ছোট পোর্ট। গ্যাস পেটের দেয়ালকে অঙ্গ থেকে উঁচু করে।",
        },
        instrument: { en: "Trocars 10/10/5/5 mm", bn: "ট্রকার ১০/১০/৫/৫ মিমি" },
        plan: {
          anchor: "^gallbladder$",
          points: [
            { at: [0.054, -0.1], color: "#38bdf8", size: 0.008 },
            { at: [0.054, 0.045], color: "#fbbf24", size: 0.008 },
            { at: [-0.04, -0.005], color: "#fbbf24", size: 0.006 },
            { at: [-0.075, -0.035], color: "#fbbf24", size: 0.006 },
          ],
        },
      },
      {
        title: { en: "Expose Calot's triangle", bn: "ক্যালট ত্রিকোণ উন্মুক্ত করা" },
        text: {
          en: "The fundus of the gallbladder is pushed up over the liver and the neck is pulled to the right. This opens Calot's triangle, bounded by the cystic duct, the common hepatic duct and the liver edge. The fat and fibrous tissue are gently stripped away.",
          bn: "পিত্তথলির ফান্ডাস যকৃতের উপর দিয়ে উপরে ঠেলে দেওয়া হয় এবং গলা ডান দিকে টানা হয়। এতে সিস্টিক নালী, কমন হেপাটিক নালী ও যকৃতের কিনারা দিয়ে ঘেরা ক্যালট ত্রিকোণ খুলে যায়। চর্বি ও তন্তু আলতোভাবে সরানো হয়।",
        },
        instrument: { en: "Grasper, dissecting hook", bn: "গ্র্যাসপার, ডিসেক্টিং হুক" },
        highlight: "gallbladder|cystic duct|hepatic duct|common bile duct",
        focus: { match: "gallbladder|cystic", distance: 0.18 },
      },
      {
        title: { en: "The critical view of safety", bn: "ক্রিটিক্যাল ভিউ অব সেফটি" },
        text: {
          en: "Before anything is cut, two and only two structures must be seen entering the gallbladder — the cystic duct and the cystic artery — and the lower third of the gallbladder must be cleared off the liver bed. This view prevents mistaking the bile duct for the cystic duct.",
          bn: "কিছু কাটার আগে দেখা চাই যে মাত্র দুটি কাঠামো — সিস্টিক নালী ও সিস্টিক ধমনী — পিত্তথলিতে ঢুকছে, এবং পিত্তথলির নিচের তিন ভাগের এক ভাগ যকৃতের বিছানা থেকে আলাদা হয়েছে। এতে পিত্তনালীকে সিস্টিক নালী ভেবে ভুল করা এড়ানো যায়।",
        },
        instrument: { en: "Maryland dissector", bn: "মেরিল্যান্ড ডিসেক্টর" },
        highlight: "cystic|gallbladder|hepatic",
        focus: { match: "gallbladder|cystic", distance: 0.14 },
        tip: { en: "Bile-duct injury is the main avoidable disaster of this operation — if the view is not clear, convert or take a bailout (subtotal) approach.", bn: "পিত্তনালীর আঘাতই এই অপারেশনের প্রধান এড়ানোযোগ্য বিপদ — দৃশ্য পরিষ্কার না হলে ওপেনে রূপান্তর বা বিকল্প পদ্ধতি নিন।" },
      },
      {
        title: { en: "Clip and divide", bn: "ক্লিপ করে কাটা" },
        text: {
          en: "Three titanium clips are applied to the cystic duct and artery — two on the patient side, one on the gallbladder side — and each is cut between the clips with scissors.",
          bn: "সিস্টিক নালী ও ধমনীতে তিনটি টাইটানিয়াম ক্লিপ লাগানো হয় — রোগীর দিকে দুটি, পিত্তথলির দিকে একটি — তারপর ক্লিপের মাঝে কাঁচি দিয়ে কাটা হয়।",
        },
        instrument: { en: "Clip applier, laparoscopic scissors", bn: "ক্লিপ অ্যাপ্লায়ার, ল্যাপারোস্কোপিক কাঁচি" },
        highlight: "cystic|gallbladder|common hepatic artery",
        focus: { match: "gallbladder|cystic", distance: 0.13 },
      },
      {
        title: { en: "Free it from the liver", bn: "যকৃৎ থেকে আলাদা করা" },
        text: {
          en: "Using diathermy, the gallbladder is peeled off its bed on the underside of the liver from the neck towards the fundus. Any oozing from the liver surface is sealed.",
          bn: "ডায়াথার্মি দিয়ে যকৃতের নিচের বিছানা থেকে পিত্তথলি গলা থেকে ফান্ডাসের দিকে ছাড়িয়ে আনা হয়। যকৃতের তল থেকে চুঁইয়ে পড়া রক্ত সিল করা হয়।",
        },
        instrument: { en: "Diathermy hook", bn: "ডায়াথার্মি হুক" },
        highlight: "gallbladder|liver",
        focus: { match: "gallbladder|liver", distance: 0.3 },
      },
      {
        title: { en: "Remove and close", bn: "বের করে বন্ধ করা" },
        text: {
          en: "The gallbladder, with its stones, is put in a bag and pulled out through the umbilical port. The bed is checked for bleeding or bile leak, the gas is released and the small wounds are closed.",
          bn: "পাথরসহ পিত্তথলি ব্যাগে ভরে নাভির পোর্ট দিয়ে বের করা হয়। বিছানায় রক্তক্ষরণ বা পিত্ত লিক আছে কিনা দেখা হয়, গ্যাস ছেড়ে ছোট ক্ষতগুলো বন্ধ করা হয়।",
        },
        instrument: { en: "Retrieval bag, suture", bn: "রিট্রিভাল ব্যাগ, সুতা" },
        tip: { en: "Most patients go home the same day or the next morning.", bn: "অধিকাংশ রোগী একই দিন বা পরদিন সকালে বাড়ি যান।" },
      },
    ],
  },
  {
    id: "hernia-inguinal",
    category: "abdominal",
    name: { en: "Inguinal hernia repair (Lichtenstein)", bn: "কুঁচকির হার্নিয়া মেরামত (লিখটেনস্টাইন)" },
    summary: {
      en: "Pushing the bulging bowel back and strengthening the groin wall with a mesh.",
      bn: "বেরিয়ে আসা অন্ত্র ভেতরে ঠেলে কুঁচকির দেয়ালকে জাল (মেশ) দিয়ে মজবুত করা।",
    },
    body: "male",
    difficulty: 2,
    duration: { en: "45–60 min", bn: "৪৫–৬০ মিনিট" },
    anaesthesia: { en: "Local, spinal or general", bn: "লোকাল, স্পাইনাল বা জেনারেল" },
    indications: { en: "A painful or enlarging bulge in the groin; risk of bowel getting trapped.", bn: "কুঁচকিতে ব্যথাযুক্ত বা বড় হতে থাকা ফোলা; অন্ত্র আটকে যাওয়ার ঝুঁকি।" },
    risks: { en: "Chronic groin pain, numbness, recurrence, testicular swelling, infection.", bn: "দীর্ঘস্থায়ী কুঁচকির ব্যথা, অসাড়তা, পুনরায় হার্নিয়া, অণ্ডকোষ ফোলা, সংক্রমণ।" },
    show: ["muscular", "skeletal", "digestive", "cardiovascular"],
    focus: { match: "^right inguinal ligament", distance: 0.4 },
    steps: [
      {
        title: { en: "Skin incision", bn: "চামড়া কাটা" },
        text: {
          en: "A 5–6 cm oblique cut is made about 2 cm above and parallel to the inguinal ligament, which runs from the hip bone to the pubic bone. Skin and fat are divided down to the shiny external oblique aponeurosis.",
          bn: "হিপ হাড় থেকে পিউবিক হাড় পর্যন্ত যাওয়া ইনগুইনাল লিগামেন্টের প্রায় ২ সেমি উপরে ও সমান্তরালে ৫–৬ সেমি তির্যক কাটা হয়। চামড়া ও চর্বি কেটে চকচকে এক্সটার্নাল অবলিক অ্যাপোনিউরোসিসে পৌঁছানো হয়।",
        },
        instrument: { en: "Scalpel, diathermy", bn: "স্ক্যালপেল, ডায়াথার্মি" },
        plan: { anchor: "^right inguinal ligament", lines: [[[-0.019, 0.043], [0.019, -0.003]]] },
        highlight: "right inguinal ligament|right external oblique",
        focus: { match: "^right inguinal ligament", distance: 0.35 },
      },
      {
        title: { en: "Open the aponeurosis", bn: "অ্যাপোনিউরোসিস খোলা" },
        text: {
          en: "The external oblique aponeurosis is opened along its fibres through the external ring, exposing the spermatic cord. The ilioinguinal nerve lies on top of the cord and must be seen and protected.",
          bn: "এক্সটার্নাল অবলিক অ্যাপোনিউরোসিস তন্তু বরাবর এক্সটার্নাল রিং পর্যন্ত খোলা হয়, ফলে স্পার্মাটিক কর্ড দেখা যায়। ইলিওইনগুইনাল স্নায়ু কর্ডের উপর থাকে — এটি দেখে সংরক্ষণ করতে হয়।",
        },
        instrument: { en: "Scissors, forceps", bn: "কাঁচি, ফরসেপ" },
        highlight: "external oblique|inguinal ligament|spermatic",
        focus: { match: "^right inguinal ligament", distance: 0.25 },
      },
      {
        title: { en: "Free the cord and find the sac", bn: "কর্ড মুক্ত করে থলি খোঁজা" },
        text: {
          en: "The spermatic cord is lifted off the floor of the canal with a tape. The hernial sac is separated from the cord structures — the vas deferens and testicular vessels — and opened to check the contents.",
          bn: "টেপ দিয়ে স্পার্মাটিক কর্ড খালের মেঝে থেকে তোলা হয়। হার্নিয়ার থলি কর্ডের অংশ — ভাস ডেফারেন্স ও অণ্ডকোষের রক্তনালী — থেকে আলাদা করে খুলে ভেতরের জিনিস দেখা হয়।",
        },
        instrument: { en: "Dissecting forceps, cord tape", bn: "ডিসেক্টিং ফরসেপ, কর্ড টেপ" },
        highlight: "spermatic|inguinal|rectus abdominis",
        focus: { match: "^right inguinal ligament", distance: 0.22 },
      },
      {
        title: { en: "Reduce the sac", bn: "থলি ভেতরে পাঠানো" },
        text: {
          en: "The bowel or fat is pushed back into the abdomen. The empty sac is either tied off at its neck (high ligation) or simply pushed back (invaginated) inside the deep ring.",
          bn: "অন্ত্র বা চর্বি পেটের ভেতরে ঠেলে দেওয়া হয়। খালি থলি গলার কাছে বেঁধে ফেলা হয় (হাই লাইগেশন) বা শুধু ভেতরে ঠেলে দেওয়া হয় (ইনভ্যাজিনেশন)।",
        },
        highlight: "colon|ileum|inguinal",
        focus: { match: "^right inguinal ligament", distance: 0.28 },
      },
      {
        title: { en: "Place the mesh", bn: "মেশ বসানো" },
        text: {
          en: "A flat polypropylene mesh is laid over the back wall of the canal and fixed with a few stitches to the pubic tubercle, the inguinal ligament below and the muscle above. A slit lets the cord pass through.",
          bn: "খালের পেছনের দেয়ালের উপর সমতল পলিপ্রোপিলিন মেশ বসিয়ে কয়েকটি সেলাইয়ে পিউবিক টিউবারকল, নিচে ইনগুইনাল লিগামেন্ট ও উপরের পেশীর সাথে আটকানো হয়। কর্ড যাওয়ার জন্য মেশে একটি চেরা থাকে।",
        },
        instrument: { en: "Polypropylene mesh, 2-0 prolene", bn: "পলিপ্রোপিলিন মেশ, ২-০ প্রোলিন" },
        highlight: "inguinal ligament|rectus abdominis|pubic|spermatic",
        focus: { match: "^right inguinal ligament", distance: 0.22 },
        tip: { en: "Tension-free repair: the mesh, not the stitches, holds the wall.", bn: "টান-মুক্ত মেরামত: দেয়াল ধরে রাখে মেশ, সেলাই নয়।" },
      },
      {
        title: { en: "Close in layers", bn: "স্তরে স্তরে বন্ধ করা" },
        text: {
          en: "The aponeurosis is stitched over the mesh with absorbable suture, then the fat and skin are closed. Local anaesthetic is infiltrated for pain relief.",
          bn: "মেশের উপর শোষণযোগ্য সুতায় অ্যাপোনিউরোসিস সেলাই করা হয়, তারপর চর্বি ও চামড়া বন্ধ হয়। ব্যথা কমাতে লোকাল অ্যানেস্থেটিক দেওয়া হয়।",
        },
        instrument: { en: "Vicryl 2-0 / 3-0, skin stitch", bn: "ভিক্রিল ২-০ / ৩-০, স্কিন সেলাই" },
        plan: { anchor: "^right inguinal ligament", lines: [[[-0.019, 0.043], [0.019, -0.003]]] },
      },
    ],
  },
  {
    id: "sleeve-gastrectomy",
    category: "abdominal",
    name: { en: "Sleeve gastrectomy", bn: "স্লিভ গ্যাস্ট্রেক্টমি" },
    summary: {
      en: "Weight-loss surgery that removes about 80% of the stomach, leaving a narrow tube.",
      bn: "ওজন কমানোর অপারেশন — পাকস্থলীর প্রায় ৮০% কেটে সরু নল রেখে দেওয়া হয়।",
    },
    body: "male",
    difficulty: 3,
    duration: { en: "60–90 min", bn: "৬০–৯০ মিনিট" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "Severe obesity (BMI ≥ 40, or ≥ 35 with serious related disease).", bn: "গুরুতর স্থূলতা (BMI ≥ ৪০, বা ≥ ৩৫ ও সংশ্লিষ্ট গুরুতর রোগ)।" },
    risks: { en: "Staple-line leak, bleeding, narrowing, reflux, vitamin deficiency.", bn: "স্ট্যাপল লাইনে লিক, রক্তক্ষরণ, সরু হয়ে যাওয়া, রিফ্লাক্স, ভিটামিনের অভাব।" },
    show: ["digestive", "skeletal", "cardiovascular"],
    focus: { match: "^stomach$", distance: 0.45 },
    steps: [
      {
        title: { en: "Ports and exposure", bn: "পোর্ট ও দৃশ্য পরিষ্কার" },
        text: {
          en: "Five small ports are placed across the upper abdomen. A retractor lifts the left lobe of the liver so the whole stomach is visible, from the oesophageal junction to the pylorus.",
          bn: "উপরের পেটজুড়ে পাঁচটি ছোট পোর্ট বসে। রিট্র্যাক্টর যকৃতের বাম খণ্ড তুলে ধরে, যাতে অন্ননালীর সংযোগ থেকে পাইলোরাস পর্যন্ত পুরো পাকস্থলী দেখা যায়।",
        },
        instrument: { en: "5 trocars, liver retractor", bn: "৫টি ট্রকার, লিভার রিট্র্যাক্টর" },
        plan: {
          anchor: "^stomach$",
          points: [
            { at: [-0.044, -0.095], color: "#38bdf8", size: 0.008 },
            { at: [-0.11, -0.05], color: "#fbbf24", size: 0.006 },
            { at: [0.05, -0.06], color: "#fbbf24", size: 0.006 },
            { at: [-0.044, -0.02], color: "#fbbf24", size: 0.006 },
            { at: [0.095, -0.04], color: "#fbbf24", size: 0.006 },
          ],
        },
      },
      {
        title: { en: "Free the greater curvature", bn: "বৃহত্তর বক্রতা মুক্ত করা" },
        text: {
          en: "Starting 4–6 cm from the pylorus, the blood vessels and omentum attached to the greater curvature are divided with an energy device, moving up to the left crus of the diaphragm. This frees the part of the stomach that will be removed.",
          bn: "পাইলোরাস থেকে ৪–৬ সেমি দূরে শুরু করে বৃহত্তর বক্রতার সাথে লাগানো রক্তনালী ও ওমেন্টাম এনার্জি ডিভাইস দিয়ে কাটা হয়, মধ্যচ্ছদার বাম ক্রাস পর্যন্ত। এতে যে অংশ কেটে ফেলা হবে সেটি মুক্ত হয়।",
        },
        instrument: { en: "Harmonic / LigaSure", bn: "হারমোনিক / লাইগাশিওর" },
        highlight: "^stomach$|spleen|splenic",
        focus: { match: "^stomach$", distance: 0.32 },
      },
      {
        title: { en: "Pass the bougie", bn: "বুজি ঢোকানো" },
        text: {
          en: "The anaesthetist passes a 36–40 Fr calibration tube (bougie) through the mouth, along the lesser curvature to the pylorus. It decides the size of the new stomach so it is not cut too narrow.",
          bn: "অ্যানেস্থেটিস্ট মুখ দিয়ে ৩৬–৪০ ফ্রেঞ্চ ক্যালিব্রেশন টিউব (বুজি) ক্ষুদ্র বক্রতা বরাবর পাইলোরাস পর্যন্ত ঢোকান। এটি নতুন পাকস্থলীর মাপ ঠিক করে, যাতে বেশি সরু না কাটা হয়।",
        },
        instrument: { en: "Bougie 36 Fr", bn: "বুজি ৩৬ ফ্রেঞ্চ" },
        highlight: "esophagus|^stomach$",
        focus: { match: "esophagus|^stomach$", distance: 0.5 },
      },
      {
        title: { en: "Staple vertically", bn: "লম্বালম্বি স্ট্যাপল" },
        text: {
          en: "A linear stapler is fired several times parallel to the bougie, starting 4–6 cm from the pylorus, cutting and sealing the stomach at the same time. The staple line is kept straight and away from the oesophagus.",
          bn: "বুজির সমান্তরালে পাইলোরাস থেকে ৪–৬ সেমি দূরে লিনিয়ার স্ট্যাপলার কয়েকবার চালিয়ে পাকস্থলী একসাথে কাটা ও সিল করা হয়। স্ট্যাপল লাইন সোজা রাখা হয় এবং অন্ননালী থেকে দূরে।",
        },
        instrument: { en: "Linear stapler, 60 mm", bn: "লিনিয়ার স্ট্যাপলার, ৬০ মিমি" },
        highlight: "^stomach$",
        focus: { match: "^stomach$", distance: 0.3 },
        tip: { en: "Stay at least 1 cm from the angle of His to avoid leaks.", bn: "লিক এড়াতে অ্যাঙ্গেল অব হিস থেকে অন্তত ১ সেমি দূরে থাকুন।" },
      },
      {
        title: { en: "Check and remove", bn: "পরীক্ষা করে বের করা" },
        text: {
          en: "The staple line is tested for leaks (air or dye) and checked for bleeding. The removed part of the stomach is taken out through a port. The new stomach holds about 100–150 mL instead of 1–1.5 L.",
          bn: "স্ট্যাপল লাইনে লিক (বাতাস বা রং দিয়ে) ও রক্তক্ষরণ পরীক্ষা করা হয়। কেটে ফেলা পাকস্থলীর অংশ পোর্ট দিয়ে বের করা হয়। নতুন পাকস্থলী ১–১.৫ লিটারের বদলে প্রায় ১০০–১৫০ মিলি ধরে।",
        },
        highlight: "^stomach$|esophagus",
        focus: { match: "^stomach$", distance: 0.4 },
      },
    ],
  },
  {
    id: "hemicolectomy-right",
    category: "abdominal",
    name: { en: "Right hemicolectomy", bn: "রাইট হেমিকোলেক্টমি" },
    summary: {
      en: "Removal of the caecum and ascending colon (usually for cancer) and joining the ileum to the colon.",
      bn: "সিকাম ও ঊর্ধ্বগামী কোলন কেটে (সাধারণত ক্যান্সারের জন্য) ইলিয়ামকে কোলনের সাথে জোড়া দেওয়া।",
    },
    body: "any",
    difficulty: 3,
    duration: { en: "2–3 hours", bn: "২–৩ ঘণ্টা" },
    anaesthesia: { en: "General ± epidural", bn: "জেনারেল ± এপিডুরাল" },
    indications: { en: "Right-sided colon cancer, caecal tumour, Crohn's disease of the terminal ileum.", bn: "ডান দিকের কোলন ক্যান্সার, সিকামের টিউমার, টার্মিনাল ইলিয়ামের ক্রোনস রোগ।" },
    risks: { en: "Anastomotic leak, bleeding, infection, ileus, ureter or duodenal injury.", bn: "জোড়ার জায়গায় লিক, রক্তক্ষরণ, সংক্রমণ, ইলিয়াস, ইউরেটার বা ডিওডেনামে আঘাত।" },
    show: ["digestive", "cardiovascular", "urinary", "skeletal"],
    focus: { match: "colon|cecum|caecum", distance: 0.7 },
    steps: [
      {
        title: { en: "Open and explore", bn: "খুলে পরীক্ষা করা" },
        text: {
          en: "A midline incision is made, or laparoscopic ports are placed. The surgeon examines the liver, peritoneum and the whole bowel for spread of the tumour before starting.",
          bn: "মাঝ বরাবর কাটা হয় বা ল্যাপারোস্কোপিক পোর্ট বসানো হয়। শুরুর আগে সার্জন টিউমার ছড়িয়েছে কিনা দেখতে যকৃৎ, পেরিটোনিয়াম ও পুরো অন্ত্র পরীক্ষা করেন।",
        },
        instrument: { en: "Scalpel, diathermy", bn: "স্ক্যালপেল, ডায়াথার্মি" },
        plan: { anchor: "^colon$|ascending colon", lines: [[[0, 0.09], [0, -0.05]]] },
        highlight: "colon|cecum|caecum|liver",
        focus: { match: "colon|cecum|caecum", distance: 0.8 },
      },
      {
        title: { en: "Mobilise the right colon", bn: "ডান কোলন মুক্ত করা" },
        text: {
          en: "The peritoneal attachments along the outer side of the colon are cut, and the colon is lifted towards the middle off the back wall of the abdomen. The right ureter, the gonadal vessels and the duodenum lie behind and are protected.",
          bn: "কোলনের বাইরের দিকের পেরিটোনিয়াল সংযোগ কেটে কোলন পেটের পেছনের দেয়াল থেকে মাঝের দিকে তুলে আনা হয়। পেছনে থাকা ডান ইউরেটার, গোনাডাল রক্তনালী ও ডিওডেনাম রক্ষা করা হয়।",
        },
        instrument: { en: "Diathermy, blunt dissection", bn: "ডায়াথার্মি, ব্লান্ট ডিসেকশন" },
        highlight: "colon|cecum|caecum|right ureter|duodenum",
        focus: { match: "colon|cecum|caecum", distance: 0.55 },
        tip: { en: "Always identify the right ureter — it lies directly behind the mobilised colon.", bn: "ডান ইউরেটার অবশ্যই শনাক্ত করুন — মুক্ত করা কোলনের ঠিক পেছনেই থাকে।" },
      },
      {
        title: { en: "Divide the blood supply", bn: "রক্ত সরবরাহ কাটা" },
        text: {
          en: "The ileocolic, right colic and right branch of the middle colic vessels are tied and divided near their origin from the superior mesenteric artery and vein. This also removes the lymph nodes draining the tumour.",
          bn: "ইলিওকোলিক, রাইট কোলিক ও মিডল কোলিকের ডান শাখা সুপিরিয়র মেসেন্টেরিক ধমনী ও শিরা থেকে উৎপত্তির কাছে বেঁধে কাটা হয়। এতে টিউমারের লসিকা গ্রন্থিও বেরিয়ে যায়।",
        },
        instrument: { en: "Vessel sealer / ligatures", bn: "ভেসেল সিলার / লাইগেচার" },
        highlight: "superior mesenteric|ileocolic|colon",
        focus: { match: "superior mesenteric|colon", distance: 0.5 },
      },
      {
        title: { en: "Cut out the bowel", bn: "অন্ত্র কেটে বের করা" },
        text: {
          en: "The terminal ileum and the transverse colon are divided with staplers, at least 5 cm clear of the tumour, and the specimen — caecum, ascending colon and part of the transverse colon — is removed.",
          bn: "টার্মিনাল ইলিয়াম ও আড়াআড়ি কোলন টিউমার থেকে অন্তত ৫ সেমি দূরে স্ট্যাপলার দিয়ে কাটা হয় এবং নমুনা — সিকাম, ঊর্ধ্বগামী কোলন ও আড়াআড়ি কোলনের অংশ — বের করা হয়।",
        },
        instrument: { en: "Linear cutter stapler", bn: "লিনিয়ার কাটার স্ট্যাপলার" },
        highlight: "colon|cecum|caecum|ileum",
        focus: { match: "colon|ileum", distance: 0.6 },
      },
      {
        title: { en: "Join ileum to colon", bn: "ইলিয়াম ও কোলন জোড়া" },
        text: {
          en: "The two ends are laid side by side and joined with a stapler or hand-sewn stitches (anastomosis), and the opening is closed. The surgeon checks that both ends are pink, well perfused and without tension.",
          bn: "দুই প্রান্ত পাশাপাশি রেখে স্ট্যাপলার বা হাতের সেলাইয়ে জোড়া (অ্যানাস্টোমোসিস) দেওয়া হয় এবং খোলা মুখ বন্ধ করা হয়। সার্জন দেখেন দুই প্রান্ত গোলাপি, রক্ত পাচ্ছে ও টান নেই।",
        },
        instrument: { en: "Stapler / 3-0 PDS", bn: "স্ট্যাপলার / ৩-০ পিডিএস" },
        highlight: "ileum|colon",
        focus: { match: "ileum|colon", distance: 0.5 },
        tip: { en: "A good blood supply and no tension are the two rules for a healing join.", bn: "ভালো রক্ত সরবরাহ ও টানহীনতা — জোড়া ঠিকমতো শুকানোর দুটি নিয়ম।" },
      },
      {
        title: { en: "Close", bn: "বন্ধ করা" },
        text: {
          en: "The gap in the mesentery is closed, the abdomen is washed and a drain may be left. The abdominal wall and skin are closed in layers.",
          bn: "মেসেন্টারির ফাঁক বন্ধ হয়, পেট ধোয়া হয় এবং প্রয়োজনে ড্রেন রাখা হয়। পেটের দেয়াল ও চামড়া স্তরে স্তরে বন্ধ করা হয়।",
        },
        instrument: { en: "Looped PDS, skin staples", bn: "লুপড পিডিএস, স্কিন স্ট্যাপল" },
        plan: { anchor: "^colon$|ascending colon", lines: [[[0, 0.09], [0, -0.05]]] },
      },
    ],
  },
  {
    id: "splenectomy",
    category: "abdominal",
    name: { en: "Laparoscopic splenectomy", bn: "ল্যাপারোস্কোপিক স্প্লিনেক্টমি" },
    summary: {
      en: "Keyhole removal of the spleen after cutting its attachments and blood vessels.",
      bn: "প্লীহার সংযোগ ও রক্তনালী কেটে কি-হোল পদ্ধতিতে প্লীহা অপসারণ।",
    },
    body: "male",
    difficulty: 3,
    duration: { en: "1.5–3 hours", bn: "১.৫–৩ ঘণ্টা" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "Ruptured spleen, immune thrombocytopenia (ITP), hereditary spherocytosis, large tumours.", bn: "প্লীহা ফেটে যাওয়া, ITP, হেরিডিটারি স্ফেরোসাইটোসিস, বড় টিউমার।" },
    risks: { en: "Bleeding, pancreatic tail injury, infection, lifelong risk of severe infections.", bn: "রক্তক্ষরণ, অগ্ন্যাশয়ের লেজে আঘাত, সংক্রমণ, আজীবন গুরুতর সংক্রমণের ঝুঁকি।" },
    show: ["digestive", "other", "cardiovascular", "skeletal"],
    focus: { match: "^spleen$", distance: 0.5 },
    steps: [
      {
        title: { en: "Position and ports", bn: "অবস্থান ও পোর্ট" },
        text: {
          en: "The patient lies on the right side so that gravity pulls the stomach and colon away from the spleen. Four ports are placed along the left costal margin.",
          bn: "রোগী ডান কাতে শোয়, যাতে অভিকর্ষে পাকস্থলী ও কোলন প্লীহা থেকে সরে যায়। বাম পাঁজরের কিনারা বরাবর চারটি পোর্ট বসে।",
        },
        instrument: { en: "Trocars 12/5/5/5 mm", bn: "ট্রকার ১২/৫/৫/৫ মিমি" },
        plan: {
          anchor: "^spleen$",
          points: [
            { at: [-0.04, -0.08], color: "#38bdf8", size: 0.008 },
            { at: [0.0, -0.06], color: "#fbbf24", size: 0.006 },
            { at: [0.04, -0.045], color: "#fbbf24", size: 0.006 },
            { at: [0.06, -0.035], color: "#fbbf24", size: 0.006 },
          ],
        },
      },
      {
        title: { en: "Divide the attachments", bn: "সংযোগগুলো কাটা" },
        text: {
          en: "The ligaments tying the spleen to the stomach (gastrosplenic), kidney (splenorenal) and colon (splenocolic) are divided, and the short gastric vessels are sealed one by one.",
          bn: "প্লীহাকে পাকস্থলী (গ্যাস্ট্রোস্প্লিনিক), কিডনি (স্প্লিনোরেনাল) ও কোলনের (স্প্লিনোকোলিক) সাথে বাঁধা লিগামেন্ট কাটা হয় এবং শর্ট গ্যাস্ট্রিক রক্তনালী একে একে সিল করা হয়।",
        },
        instrument: { en: "Energy device", bn: "এনার্জি ডিভাইস" },
        highlight: "^spleen$|^stomach$|left kidney|colon",
        focus: { match: "^spleen$", distance: 0.28 },
      },
      {
        title: { en: "Control the hilum", bn: "হাইলাম নিয়ন্ত্রণ" },
        text: {
          en: "The splenic artery and vein are isolated at the hilum, taking care not to touch the tail of the pancreas, and divided together with a vascular stapler.",
          bn: "অগ্ন্যাশয়ের লেজ স্পর্শ না করে হাইলামে স্প্লিনিক ধমনী ও শিরা আলাদা করা হয় এবং ভাস্কুলার স্ট্যাপলার দিয়ে একসাথে কাটা হয়।",
        },
        instrument: { en: "Vascular stapler", bn: "ভাস্কুলার স্ট্যাপলার" },
        highlight: "splenic|^spleen$|pancreas",
        focus: { match: "^spleen$|splenic", distance: 0.2 },
        tip: { en: "Bleeding from the splenic vein can be severe — control the artery first.", bn: "স্প্লিনিক শিরা থেকে ভীষণ রক্তক্ষরণ হতে পারে — আগে ধমনী নিয়ন্ত্রণ করুন।" },
      },
      {
        title: { en: "Remove in a bag", bn: "ব্যাগে ভরে বের করা" },
        text: {
          en: "The freed spleen is put in a strong bag, broken into pieces inside the bag, and pulled out through a port. The bed is checked for bleeding and a drain may be left.",
          bn: "মুক্ত প্লীহা শক্ত ব্যাগে ভরে ব্যাগের ভেতরেই টুকরো করে পোর্ট দিয়ে বের করা হয়। বিছানায় রক্তক্ষরণ দেখা হয় এবং প্রয়োজনে ড্রেন রাখা হয়।",
        },
        instrument: { en: "Retrieval bag", bn: "রিট্রিভাল ব্যাগ" },
        tip: { en: "Vaccines against pneumococcus, meningococcus and Hib are needed ideally 2 weeks before.", bn: "নিউমোকক্কাস, মেনিংগোকক্কাস ও হিব-এর টিকা অপারেশনের অন্তত ২ সপ্তাহ আগে নেওয়া উচিত।" },
      },
    ],
  },
  {
    id: "cabg",
    category: "cardiothoracic",
    name: { en: "Coronary artery bypass (CABG)", bn: "করোনারি আর্টারি বাইপাস (CABG)" },
    summary: {
      en: "New blood vessels are sewn onto the heart to carry blood around blocked coronary arteries.",
      bn: "বন্ধ করোনারি ধমনী এড়িয়ে রক্ত পৌঁছাতে হৃৎপিণ্ডে নতুন রক্তনালী সেলাই করা।",
    },
    body: "any",
    difficulty: 3,
    duration: { en: "3–6 hours", bn: "৩–৬ ঘণ্টা" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "Left main or multi-vessel coronary disease, angina not controlled by drugs or stents.", bn: "লেফট মেইন বা একাধিক করোনারি ধমনীর রোগ, ওষুধ বা স্টেন্টে নিয়ন্ত্রণ না হওয়া এনজাইনা।" },
    risks: { en: "Stroke, bleeding, infection, kidney injury, irregular heartbeat, death (~1–3%).", bn: "স্ট্রোক, রক্তক্ষরণ, সংক্রমণ, কিডনির ক্ষতি, অনিয়মিত স্পন্দন, মৃত্যু (~১–৩%)।" },
    show: ["cardiovascular", "skeletal", "respiratory"],
    focus: { match: "heart|coronary|aorta", distance: 0.5 },
    steps: [
      {
        title: { en: "Harvest the grafts", bn: "গ্রাফট সংগ্রহ" },
        text: {
          en: "While the chest is prepared, a team takes a vein from the leg (great saphenous vein). The surgeon also frees the left internal thoracic (mammary) artery from behind the chest wall — it is the best graft and lasts longest.",
          bn: "বুক প্রস্তুতির সময় একটি দল পা থেকে শিরা (গ্রেট স্যাফেনাস) নেয়। সার্জন বুকের দেয়ালের পেছন থেকে বাম ইন্টারনাল থোরাসিক (ম্যামারি) ধমনীও মুক্ত করেন — এটিই সেরা গ্রাফট, সবচেয়ে বেশি দিন টেকে।",
        },
        instrument: { en: "Scalpel, endoscopic vein harvester", bn: "স্ক্যালপেল, এন্ডোস্কোপিক ভেইন হার্ভেস্টার" },
        highlight: "internal thoracic|sternum|rib",
        focus: { match: "sternum|rib", distance: 0.8 },
      },
      {
        title: { en: "Median sternotomy", bn: "বুকের হাড় চেরা (স্টার্নোটমি)" },
        text: {
          en: "A 20-cm vertical skin incision is made over the breastbone, and the sternum is divided down the middle with an oscillating saw. A retractor spreads the two halves to expose the pericardium and the heart.",
          bn: "বুকের হাড়ের উপর ২০ সেমি লম্বা খাড়া কাটা হয় এবং অসিলেটিং করাত দিয়ে স্টার্নাম মাঝ বরাবর চেরা হয়। রিট্র্যাক্টর দুই অর্ধেক ফাঁক করে পেরিকার্ডিয়াম ও হৃৎপিণ্ড উন্মুক্ত করে।",
        },
        instrument: { en: "Sternal saw, retractor", bn: "স্টার্নাল করাত, রিট্র্যাক্টর" },
        plan: STERNOTOMY,
        highlight: "sternum|manubrium",
        focus: { match: "sternum|manubrium", distance: 0.55 },
      },
      {
        title: { en: "Go on bypass and stop the heart", bn: "বাইপাসে যাওয়া ও হৃৎপিণ্ড থামানো" },
        text: {
          en: "The patient is given heparin, tubes are placed in the aorta and right atrium, and the heart–lung machine takes over the circulation. A clamp is put across the aorta and cold potassium solution (cardioplegia) stops the heart so it is still and bloodless.",
          bn: "রোগীকে হেপারিন দেওয়া হয়, মহাধমনী ও ডান অলিন্দে নল বসে এবং হার্ট-লাং মেশিন রক্তসঞ্চালন নিয়ে নেয়। মহাধমনীতে ক্ল্যাম্প দিয়ে ঠান্ডা পটাসিয়াম দ্রবণ (কার্ডিওপ্লেজিয়া) হৃৎপিণ্ড থামিয়ে দেয়, ফলে এটি স্থির ও রক্তশূন্য থাকে।",
        },
        instrument: { en: "Heart–lung machine, aortic cross-clamp", bn: "হার্ট-লাং মেশিন, অ্যাওর্টিক ক্রস-ক্ল্যাম্প" },
        highlight: "ascending aorta|arch of aorta|right cardiac atrium|wall of heart|superior vena cava|inferior vena cava",
        focus: { match: "ascending aorta|wall of heart", distance: 0.35 },
        tip: { en: "Some surgeons do 'off-pump' CABG on the beating heart with a stabiliser.", bn: "কিছু সার্জন স্পন্দিত হৃৎপিণ্ডে স্ট্যাবিলাইজার দিয়ে 'অফ-পাম্প' CABG করেন।" },
      },
      {
        title: { en: "Sew the distal ends", bn: "দূরের প্রান্ত সেলাই" },
        text: {
          en: "Under magnification, each graft is sewn to a coronary artery just beyond the blockage with very fine 7-0 or 8-0 stitches, using about 15 stitches per join. The mammary artery is usually joined to the left anterior descending artery.",
          bn: "ম্যাগনিফাইং চশমায় প্রতিটি গ্রাফট ব্লকেজের ঠিক পরে করোনারি ধমনীর সাথে ৭-০ বা ৮-০ অতি সূক্ষ্ম সুতায় সেলাই করা হয় — প্রতিটি জোড়ায় প্রায় ১৫টি ফোঁড়। ম্যামারি ধমনী সাধারণত লেফট অ্যান্টেরিয়র ডিসেন্ডিং ধমনীর সাথে জোড়া হয়।",
        },
        instrument: { en: "Prolene 7-0, loupes", bn: "প্রোলিন ৭-০, লুপ" },
        highlight: "coronary|anterior interventricular|circumflex|marginal",
        focus: { match: "coronary|anterior interventricular|circumflex", distance: 0.22 },
      },
      {
        title: { en: "Join to the aorta and restart", bn: "মহাধমনীতে জোড়া ও চালু করা" },
        text: {
          en: "The upper ends of the vein grafts are sewn to small openings in the aorta. The clamp is released, warm blood flows into the heart and it starts beating — sometimes after a small electric shock.",
          bn: "শিরা-গ্রাফটের উপরের প্রান্ত মহাধমনীর ছোট ছিদ্রে সেলাই করা হয়। ক্ল্যাম্প খুলে দিলে উষ্ণ রক্ত হৃৎপিণ্ডে ঢোকে এবং এটি স্পন্দিত হতে শুরু করে — মাঝে মাঝে ছোট বৈদ্যুতিক শকের পর।",
        },
        instrument: { en: "Side-biting clamp, 6-0 prolene", bn: "সাইড-বাইটিং ক্ল্যাম্প, ৬-০ প্রোলিন" },
        highlight: "ascending aorta|arch of aorta|coronary",
        focus: { match: "ascending aorta|arch of aorta", distance: 0.3 },
      },
      {
        title: { en: "Come off bypass and close", bn: "বাইপাস শেষ করে বন্ধ করা" },
        text: {
          en: "The patient is gradually weaned from the heart–lung machine and heparin is reversed. Temporary pacing wires and chest drains are placed, the breastbone is rejoined with steel wires and the skin is closed.",
          bn: "রোগীকে ধীরে ধীরে হার্ট-লাং মেশিন থেকে ছাড়ানো হয় এবং হেপারিন নিষ্ক্রিয় করা হয়। অস্থায়ী পেসিং তার ও চেস্ট ড্রেন বসে, বুকের হাড় স্টিলের তারে জোড়া লাগে এবং চামড়া বন্ধ হয়।",
        },
        instrument: { en: "Sternal wires, chest drains", bn: "স্টার্নাল তার, চেস্ট ড্রেন" },
        plan: STERNOTOMY,
        tip: { en: "Patients are in intensive care for 1–2 days and in hospital for about a week.", bn: "রোগী ১–২ দিন আইসিইউতে ও প্রায় এক সপ্তাহ হাসপাতালে থাকেন।" },
      },
    ],
  },
  {
    id: "avr",
    category: "cardiothoracic",
    name: { en: "Aortic valve replacement", bn: "অ্যাওর্টিক ভালভ প্রতিস্থাপন" },
    summary: {
      en: "A narrowed or leaking aortic valve is cut out and replaced with an artificial valve.",
      bn: "সরু বা লিক করা অ্যাওর্টিক ভালভ কেটে বের করে কৃত্রিম ভালভ বসানো।",
    },
    body: "any",
    difficulty: 3,
    duration: { en: "3–4 hours", bn: "৩–৪ ঘণ্টা" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "Severe aortic stenosis or regurgitation causing breathlessness, chest pain or fainting.", bn: "গুরুতর অ্যাওর্টিক স্টেনোসিস বা রিগার্জিটেশন — শ্বাসকষ্ট, বুকে ব্যথা বা অজ্ঞান হয়ে যাওয়া।" },
    risks: { en: "Stroke, bleeding, heart block, valve infection, need for lifelong blood thinners (mechanical valve).", bn: "স্ট্রোক, রক্তক্ষরণ, হার্ট ব্লক, ভালভে সংক্রমণ, আজীবন রক্ত পাতলা করার ওষুধ (মেকানিক্যাল ভালভে)।" },
    show: ["cardiovascular", "skeletal", "respiratory"],
    focus: { match: "ascending aorta|wall of heart", distance: 0.4 },
    steps: [
      {
        title: { en: "Sternotomy and bypass", bn: "স্টার্নোটমি ও বাইপাস" },
        text: {
          en: "As for bypass surgery, the breastbone is opened, the patient is connected to the heart–lung machine and the aorta is clamped so the heart can be stopped with cardioplegia.",
          bn: "বাইপাস সার্জারির মতোই বুকের হাড় খোলা হয়, রোগীকে হার্ট-লাং মেশিনে যুক্ত করা হয় এবং মহাধমনী ক্ল্যাম্প করে কার্ডিওপ্লেজিয়া দিয়ে হৃৎপিণ্ড থামানো হয়।",
        },
        instrument: { en: "Sternal saw, bypass circuit", bn: "স্টার্নাল করাত, বাইপাস সার্কিট" },
        plan: STERNOTOMY,
        highlight: "ascending aorta|wall of heart",
        focus: { match: "ascending aorta|wall of heart", distance: 0.45 },
      },
      {
        title: { en: "Open the aorta", bn: "মহাধমনী খোলা" },
        text: {
          en: "An oblique incision is made in the ascending aorta above the valve. Stay stitches pull it open so the surgeon looks straight down onto the three leaflets of the aortic valve.",
          bn: "ভালভের উপরে ঊর্ধ্বগামী মহাধমনীতে তির্যক কাটা হয়। স্টে-সেলাই টেনে খুলে ধরলে সার্জন সরাসরি অ্যাওর্টিক ভালভের তিনটি পাপড়ির দিকে তাকাতে পারেন।",
        },
        instrument: { en: "Scalpel, Potts scissors", bn: "স্ক্যালপেল, পটস কাঁচি" },
        highlight: "ascending aorta|aortic",
        focus: { match: "ascending aorta", distance: 0.2 },
      },
      {
        title: { en: "Remove the diseased valve", bn: "রোগাক্রান্ত ভালভ বের করা" },
        text: {
          en: "The thickened, calcified leaflets are cut out, and chalky calcium is carefully removed from the annulus so that no fragment can travel to the brain.",
          bn: "মোটা ও ক্যালসিয়ামযুক্ত পাপড়িগুলো কেটে বের করা হয়, এবং অ্যানুলাস থেকে খড়িমাটির মতো ক্যালসিয়াম সাবধানে সরানো হয় যাতে কোনো টুকরো মস্তিষ্কে যেতে না পারে।",
        },
        instrument: { en: "Scalpel, rongeur", bn: "স্ক্যালপেল, রঙ্গার" },
        highlight: "aortic|aorta|left ventricle",
        focus: { match: "ascending aorta", distance: 0.16 },
      },
      {
        title: { en: "Size and implant the new valve", bn: "মাপ নিয়ে নতুন ভালভ বসানো" },
        text: {
          en: "Sizers measure the annulus. A mechanical or tissue (pig/cow) valve is lowered into place on a ring of 12–15 interrupted pledgeted stitches and tied down.",
          bn: "সাইজার দিয়ে অ্যানুলাস মাপা হয়। মেকানিক্যাল বা টিস্যু (শূকর/গরু) ভালভ ১২–১৫টি আলাদা প্যাডযুক্ত সেলাইয়ের বলয়ের উপর নামিয়ে বসিয়ে বেঁধে দেওয়া হয়।",
        },
        instrument: { en: "Valve sizers, pledgeted 2-0 sutures", bn: "ভালভ সাইজার, প্যাডযুক্ত ২-০ সুতা" },
        highlight: "aortic|aorta",
        focus: { match: "ascending aorta", distance: 0.16 },
        tip: { en: "Mechanical valves last a lifetime but need warfarin; tissue valves last ~10–15 years without it.", bn: "মেকানিক্যাল ভালভ আজীবন টেকে কিন্তু ওয়ারফারিন লাগে; টিস্যু ভালভ ওয়ারফারিন ছাড়া ~১০–১৫ বছর টেকে।" },
      },
      {
        title: { en: "Close and restart", bn: "বন্ধ করে চালু করা" },
        text: {
          en: "The aorta is closed, air is removed from the heart chambers, the clamp is taken off and the heart restarts. After weaning from bypass the chest is closed as in bypass surgery.",
          bn: "মহাধমনী বন্ধ করা হয়, হৃৎপিণ্ডের প্রকোষ্ঠ থেকে বাতাস বের করা হয়, ক্ল্যাম্প খুলে হৃৎপিণ্ড চালু হয়। বাইপাস থেকে ছাড়ানোর পর বাইপাস সার্জারির মতোই বুক বন্ধ করা হয়।",
        },
        instrument: { en: "4-0 prolene, chest drains", bn: "৪-০ প্রোলিন, চেস্ট ড্রেন" },
        highlight: "ascending aorta|wall of heart",
        focus: { match: "ascending aorta|wall of heart", distance: 0.4 },
        tip: { en: "Many older patients now have a TAVI: the valve is delivered through the groin artery with no chest incision.", bn: "অনেক বয়স্ক রোগীর এখন TAVI হয়: বুক না কেটে কুঁচকির ধমনী দিয়ে ভালভ পৌঁছানো হয়।" },
      },
    ],
  },
  {
    id: "lobectomy",
    category: "cardiothoracic",
    name: { en: "Lung lobectomy (VATS)", bn: "ফুসফুস লোবেক্টমি (VATS)" },
    summary: {
      en: "Keyhole removal of one lobe of the lung, usually for early lung cancer.",
      bn: "কি-হোল পদ্ধতিতে ফুসফুসের একটি খণ্ড কেটে ফেলা — সাধারণত প্রাথমিক ফুসফুস ক্যান্সারে।",
    },
    body: "male",
    difficulty: 3,
    duration: { en: "2–4 hours", bn: "২–৪ ঘণ্টা" },
    anaesthesia: { en: "General with one-lung ventilation", bn: "জেনারেল, এক ফুসফুসে শ্বাস" },
    indications: { en: "Early-stage non-small-cell lung cancer, localised infection or bronchiectasis.", bn: "প্রাথমিক পর্যায়ের নন-স্মল-সেল ফুসফুস ক্যান্সার, স্থানীয় সংক্রমণ বা ব্রঙ্কিয়েক্টাসিস।" },
    risks: { en: "Air leak, bleeding, pneumonia, irregular heartbeat, bronchial stump leak.", bn: "বাতাস লিক, রক্তক্ষরণ, নিউমোনিয়া, অনিয়মিত স্পন্দন, ব্রঙ্কিয়াল স্টাম্প লিক।" },
    show: ["respiratory", "cardiovascular", "skeletal"],
    focus: { match: "lobe of right lung|middle lobe of lung", distance: 0.7 },
    steps: [
      {
        title: { en: "Position and ports", bn: "অবস্থান ও পোর্ট" },
        text: {
          en: "The patient lies on the side with a double-lumen tube so the operated lung can be collapsed while the other lung breathes. Three small ports are made between the ribs, one of them about 4 cm long as the working incision.",
          bn: "রোগী কাত হয়ে শোয়, ডাবল-লুমেন নল থাকে যাতে অপারেশনের ফুসফুস চুপসে থাকে আর অন্যটি শ্বাস নেয়। পাঁজরের মাঝে তিনটি ছোট পোর্ট হয়, একটি প্রায় ৪ সেমি লম্বা — কাজের কাটা।",
        },
        instrument: { en: "Double-lumen tube, thoracoscope", bn: "ডাবল-লুমেন টিউব, থোরাকোস্কোপ" },
        plan: {
          anchor: "(upper|lower) lobe of right lung|middle lobe of lung",
          points: [
            { at: [-0.07, -0.03], color: "#38bdf8", size: 0.009 },
            { at: [-0.09, -0.09], color: "#fbbf24", size: 0.006 },
            { at: [-0.045, -0.06], color: "#fbbf24", size: 0.006 },
          ],
        },
      },
      {
        title: { en: "Divide the vein", bn: "শিরা কাটা" },
        text: {
          en: "The pulmonary ligament is released and the pulmonary vein draining the lobe is isolated and divided with a vascular stapler. The vein is always taken first so tumour cells are not squeezed into the blood.",
          bn: "পালমোনারি লিগামেন্ট ছাড়িয়ে লোবের রক্ত নিষ্কাশনকারী পালমোনারি শিরা আলাদা করে ভাস্কুলার স্ট্যাপলার দিয়ে কাটা হয়। শিরা সবসময় আগে কাটা হয়, যাতে টিউমারের কোষ রক্তে চেপে না যায়।",
        },
        instrument: { en: "Vascular stapler", bn: "ভাস্কুলার স্ট্যাপলার" },
        highlight: "pulmonary vein|lobe of",
        focus: { match: "lobe of right lung|middle lobe of lung|pulmonary", distance: 0.4 },
      },
      {
        title: { en: "Divide the artery", bn: "ধমনী কাটা" },
        text: {
          en: "The lobar branch of the pulmonary artery is carefully separated from the surrounding lymph nodes and divided, usually in two or three firings of the stapler.",
          bn: "পালমোনারি ধমনীর লোবার শাখা চারপাশের লসিকা গ্রন্থি থেকে সাবধানে আলাদা করে সাধারণত দুই বা তিনবার স্ট্যাপলার চালিয়ে কাটা হয়।",
        },
        instrument: { en: "Vascular stapler, clips", bn: "ভাস্কুলার স্ট্যাপলার, ক্লিপ" },
        highlight: "pulmonary artery|pulmonary trunk|lobe of",
        focus: { match: "pulmonary", distance: 0.35 },
        tip: { en: "A torn pulmonary artery bleeds fast — keep a sponge ready and the incision large enough to convert.", bn: "পালমোনারি ধমনী ছিঁড়লে দ্রুত রক্ত যায় — স্পঞ্জ প্রস্তুত রাখুন, দরকারে ওপেনে যেতে পারেন।" },
      },
      {
        title: { en: "Divide the bronchus and fissure", bn: "ব্রঙ্কাস ও ফিশার কাটা" },
        text: {
          en: "The bronchus to the lobe is stapled shut and cut, then the fissure between the lobes is completed with staplers. The lobe is now free.",
          bn: "লোবের ব্রঙ্কাস স্ট্যাপলে বন্ধ করে কাটা হয়, তারপর লোবগুলোর মাঝের ফিশার স্ট্যাপলার দিয়ে সম্পূর্ণ করা হয়। লোবটি এখন মুক্ত।",
        },
        instrument: { en: "Bronchial stapler", bn: "ব্রঙ্কিয়াল স্ট্যাপলার" },
        highlight: "bronch|lobe of",
        focus: { match: "bronch|trachea", distance: 0.35 },
      },
      {
        title: { en: "Remove and check", bn: "বের করে পরীক্ষা" },
        text: {
          en: "The lobe is put in a bag and removed. Lymph nodes are sampled to stage the cancer. The surgeon fills the chest with water and ventilates the lung to look for air bubbles from the stump, then places a chest drain.",
          bn: "লোবটি ব্যাগে ভরে বের করা হয়। ক্যান্সারের স্টেজ জানতে লসিকা গ্রন্থির নমুনা নেওয়া হয়। বুকে পানি ভরে ফুসফুসে বাতাস দিয়ে স্টাম্প থেকে বুদবুদ আসছে কিনা দেখা হয়, তারপর চেস্ট ড্রেন বসানো হয়।",
        },
        instrument: { en: "Retrieval bag, chest drain", bn: "রিট্রিভাল ব্যাগ, চেস্ট ড্রেন" },
        highlight: "lung|lobe of",
        focus: { match: "lobe of right lung|middle lobe of lung", distance: 0.8 },
      },
    ],
  },
  {
    id: "tracheostomy",
    category: "headneck",
    name: { en: "Open tracheostomy", bn: "ওপেন ট্র্যাকিওস্টমি" },
    summary: {
      en: "A tube is placed directly into the windpipe through the front of the neck to help breathing.",
      bn: "শ্বাসে সাহায্য করতে ঘাড়ের সামনে দিয়ে সরাসরি শ্বাসনালীতে নল বসানো।",
    },
    body: "any",
    difficulty: 2,
    duration: { en: "20–40 min", bn: "২০–৪০ মিনিট" },
    anaesthesia: { en: "General or local", bn: "জেনারেল বা লোকাল" },
    indications: { en: "Prolonged ventilation, upper airway obstruction, airway protection, secretion clearance.", bn: "দীর্ঘ সময় ভেন্টিলেশন, উপরের শ্বাসপথ বন্ধ, শ্বাসপথ রক্ষা, কফ পরিষ্কার।" },
    risks: { en: "Bleeding, tube blockage or displacement, infection, tracheal narrowing, pneumothorax.", bn: "রক্তক্ষরণ, নল আটকে যাওয়া বা সরে যাওয়া, সংক্রমণ, শ্বাসনালী সরু হওয়া, নিউমোথোরাক্স।" },
    show: ["respiratory", "cardiovascular", "skeletal", "muscular"],
    focus: { match: "^trachea$", distance: 0.35 },
    steps: [
      {
        title: { en: "Position and landmarks", bn: "অবস্থান ও ল্যান্ডমার্ক" },
        text: {
          en: "A roll under the shoulders extends the neck and brings the windpipe forward. The thyroid cartilage, the ring-shaped cricoid cartilage below it and the sternal notch are felt and marked.",
          bn: "কাঁধের নিচে রোল দিয়ে ঘাড় পেছনে টানা হয়, ফলে শ্বাসনালী সামনে আসে। থাইরয়েড কার্টিলেজ, তার নিচে বলয়াকৃতি ক্রিকয়েড কার্টিলেজ ও স্টার্নাল নচ হাত দিয়ে অনুভব করে চিহ্নিত করা হয়।",
        },
        highlight: "thyroid cartilage|cricoid|^trachea$|larynx",
        focus: { match: "^trachea$|thyroid cartilage", distance: 0.35 },
      },
      {
        title: { en: "Skin incision and strap muscles", bn: "চামড়া কাটা ও স্ট্র্যাপ পেশী" },
        text: {
          en: "A horizontal 2–3 cm incision is made midway between the cricoid and the sternal notch. The platysma is cut and the strap muscles are separated in the midline, where there are almost no vessels.",
          bn: "ক্রিকয়েড ও স্টার্নাল নচের মাঝামাঝি অনুভূমিকভাবে ২–৩ সেমি কাটা হয়। প্ল্যাটিসমা কেটে মাঝ বরাবর স্ট্র্যাপ পেশী আলাদা করা হয় — সেখানে প্রায় কোনো রক্তনালী নেই।",
        },
        instrument: { en: "Scalpel, mosquito forceps", bn: "স্ক্যালপেল, মশকিটো ফরসেপ" },
        plan: { anchor: "^trachea$", lines: [[[-0.017, -0.012], [0.017, -0.012]]] },
        highlight: "sternothyroid|sternohyoid|omohyoid",
        focus: { match: "^trachea$", distance: 0.3 },
      },
      {
        title: { en: "Expose the trachea", bn: "শ্বাসনালী উন্মুক্ত করা" },
        text: {
          en: "The thyroid isthmus, lying over the 2nd–4th rings, is retracted upwards or divided between clamps and tied. The tracheal rings are now visible and the surgeon makes sure the airway is free of bleeding.",
          bn: "২য়–৪র্থ রিংয়ের উপর থাকা থাইরয়েড ইস্থমাস উপরে সরানো হয় বা ক্ল্যাম্পের মাঝে কেটে বেঁধে দেওয়া হয়। শ্বাসনালীর রিং এখন দেখা যায়, আর সার্জন নিশ্চিত করেন যে রক্তক্ষরণ নেই।",
        },
        instrument: { en: "Retractors, ligature", bn: "রিট্র্যাক্টর, লাইগেচার" },
        highlight: "^trachea$|tracheal cartilage|thyroid",
        focus: { match: "^trachea$", distance: 0.22 },
      },
      {
        title: { en: "Open the trachea", bn: "শ্বাসনালী খোলা" },
        text: {
          en: "The anaesthetist deflates the endotracheal tube cuff. A window or an inferiorly based flap (Björk flap) is cut in the 2nd–3rd tracheal rings, and the airway is cleared of secretions with suction.",
          bn: "অ্যানেস্থেটিস্ট এন্ডোট্র্যাকিয়াল টিউবের কাফ চুপসে দেন। ২য়–৩য় ট্র্যাকিয়াল রিংয়ে একটি জানালা বা নিচের দিকে ভিত্তিযুক্ত ফ্ল্যাপ (বিয়র্ক ফ্ল্যাপ) কাটা হয় এবং সাকশন দিয়ে কফ পরিষ্কার করা হয়।",
        },
        instrument: { en: "Scalpel, tracheal dilator", bn: "স্ক্যালপেল, ট্র্যাকিয়াল ডাইলেটর" },
        highlight: "^trachea$|tracheal cartilage",
        focus: { match: "^trachea$", distance: 0.18 },
        tip: { en: "Never cut the first ring or the cricoid — it can cause tracheal narrowing later.", bn: "প্রথম রিং বা ক্রিকয়েড কখনো কাটবেন না — পরে শ্বাসনালী সরু হতে পারে।" },
      },
      {
        title: { en: "Insert and secure the tube", bn: "নল বসিয়ে আটকানো" },
        text: {
          en: "The tracheostomy tube is inserted, the cuff is inflated and the ventilator is connected. A rising CO₂ trace confirms correct placement. Tapes and stitches fix the flange to the neck.",
          bn: "ট্র্যাকিওস্টমি নল ঢোকানো হয়, কাফ ফোলানো হয় এবং ভেন্টিলেটর যুক্ত হয়। কার্বন ডাই-অক্সাইডের ট্রেস দেখে সঠিক অবস্থান নিশ্চিত হয়। টেপ ও সেলাই দিয়ে ফ্ল্যাঞ্জ ঘাড়ের সাথে আটকানো হয়।",
        },
        instrument: { en: "Tracheostomy tube (cuffed)", bn: "ট্র্যাকিওস্টমি টিউব (কাফযুক্ত)" },
        highlight: "^trachea$",
        focus: { match: "^trachea$", distance: 0.3 },
      },
    ],
  },
  {
    id: "kidney-transplant",
    category: "urology",
    name: { en: "Kidney transplant", bn: "কিডনি প্রতিস্থাপন" },
    summary: {
      en: "A healthy donor kidney is placed in the lower abdomen and joined to the recipient's vessels and bladder.",
      bn: "সুস্থ দাতার কিডনি তলপেটে বসিয়ে গ্রহীতার রক্তনালী ও মূত্রথলির সাথে জোড়া।",
    },
    body: "any",
    difficulty: 3,
    duration: { en: "3–4 hours", bn: "৩–৪ ঘণ্টা" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "End-stage kidney failure, in people on or approaching dialysis.", bn: "কিডনি সম্পূর্ণ বিকল — যারা ডায়ালাইসিসে আছেন বা শীঘ্রই লাগবে।" },
    risks: { en: "Rejection, clots in the graft vessels, urine leak, infection from immunosuppression.", bn: "রিজেকশন, গ্রাফটের রক্তনালীতে জমাট, প্রস্রাব লিক, ইমিউনোসাপ্রেশন থেকে সংক্রমণ।" },
    show: ["urinary", "cardiovascular", "skeletal", "digestive"],
    focus: { match: "bladder|iliac", distance: 0.55 },
    steps: [
      {
        title: { en: "Prepare the donor kidney", bn: "দাতার কিডনি প্রস্তুত" },
        text: {
          en: "The kidney is kept in cold preservation fluid. On the back table the surgeon removes extra fat, identifies the renal artery, renal vein and ureter, and checks them for damage.",
          bn: "কিডনি ঠান্ডা সংরক্ষণ দ্রবণে রাখা হয়। আলাদা টেবিলে সার্জন বাড়তি চর্বি সরান, রেনাল ধমনী, রেনাল শিরা ও ইউরেটার শনাক্ত করে ক্ষতি আছে কিনা দেখেন।",
        },
        instrument: { en: "Cold storage, fine scissors", bn: "কোল্ড স্টোরেজ, সূক্ষ্ম কাঁচি" },
        highlight: "kidney|renal",
        focus: { match: "kidney|renal", distance: 0.6 },
      },
      {
        title: { en: "Iliac fossa incision", bn: "ইলিয়াক ফোসায় কাটা" },
        text: {
          en: "A curved 'hockey-stick' incision is made in the right lower abdomen. The surgeon works outside the peritoneal cavity to reach the external iliac artery and vein, which will supply the new kidney. The patient's own kidneys are left in place.",
          bn: "ডান নিচের পেটে বাঁকা 'হকি-স্টিক' কাটা হয়। নতুন কিডনিকে রক্ত দেওয়া এক্সটার্নাল ইলিয়াক ধমনী ও শিরায় পৌঁছাতে সার্জন পেরিটোনিয়াল গহ্বরের বাইরে কাজ করেন। রোগীর নিজের কিডনি যেখানে ছিল সেখানেই থাকে।",
        },
        instrument: { en: "Scalpel, self-retaining retractor", bn: "স্ক্যালপেল, সেলফ-রিটেইনিং রিট্র্যাক্টর" },
        plan: { anchor: "urinary bladder|trigone|bladder neck", lines: [[[-0.1, 0.07], [-0.075, 0.01], [-0.03, -0.02], [0, -0.035]]] },
        highlight: "right external iliac|right common iliac|urinary bladder",
        focus: { match: "right external iliac|urinary bladder", distance: 0.4 },
      },
      {
        title: { en: "Join the renal vein", bn: "রেনাল শিরা জোড়া" },
        text: {
          en: "Soft clamps are placed on the external iliac vein. A slit is made and the donor renal vein is sewn end-to-side to it with fine continuous stitches.",
          bn: "এক্সটার্নাল ইলিয়াক শিরায় নরম ক্ল্যাম্প বসে। চেরা করে দাতার রেনাল শিরা সূক্ষ্ম একটানা সেলাইয়ে এন্ড-টু-সাইড জোড়া হয়।",
        },
        instrument: { en: "Vascular clamps, 5-0 prolene", bn: "ভাস্কুলার ক্ল্যাম্প, ৫-০ প্রোলিন" },
        highlight: "external iliac vein|common iliac vein|renal vein",
        focus: { match: "right external iliac vein|right common iliac vein", distance: 0.28 },
      },
      {
        title: { en: "Join the renal artery", bn: "রেনাল ধমনী জোড়া" },
        text: {
          en: "The renal artery is sewn end-to-side to the external iliac artery. When the clamps are released the kidney becomes pink and firm within seconds and often starts making urine on the table.",
          bn: "রেনাল ধমনী এক্সটার্নাল ইলিয়াক ধমনীর সাথে এন্ড-টু-সাইড সেলাই হয়। ক্ল্যাম্প খুলতেই কিডনি কয়েক সেকেন্ডে গোলাপি ও শক্ত হয় এবং প্রায়ই টেবিলেই প্রস্রাব তৈরি শুরু করে।",
        },
        instrument: { en: "Vascular clamps, 6-0 prolene", bn: "ভাস্কুলার ক্ল্যাম্প, ৬-০ প্রোলিন" },
        highlight: "external iliac artery|common iliac artery|renal artery",
        focus: { match: "right external iliac artery|right common iliac artery", distance: 0.28 },
        tip: { en: "Warm ischaemia time must be as short as possible — the kidney is sewn in while kept cold with ice slush.", bn: "উষ্ণ ইস্কিমিয়ার সময় যত সম্ভব কম রাখতে হয় — বরফ দিয়ে ঠান্ডা রেখে সেলাই করা হয়।" },
      },
      {
        title: { en: "Connect the ureter", bn: "ইউরেটার জোড়া" },
        text: {
          en: "The donor ureter is tunnelled into the bladder through the muscle (Lich–Gregoir technique) so that it cannot reflux, over a small internal stent that stays for 4–6 weeks.",
          bn: "দাতার ইউরেটার পেশীর ভেতর দিয়ে সুড়ঙ্গ করে মূত্রথলিতে বসানো হয় (লিখ–গ্রেগোয়ার পদ্ধতি) যাতে প্রস্রাব পেছনে না ফেরে, একটি ছোট ভেতরের স্টেন্টের উপর — যা ৪–৬ সপ্তাহ থাকে।",
        },
        instrument: { en: "Double-J stent, 4-0 PDS", bn: "ডাবল-জে স্টেন্ট, ৪-০ পিডিএস" },
        highlight: "urinary bladder|ureter|bladder",
        focus: { match: "urinary bladder|fundus of urinary bladder", distance: 0.28 },
      },
    ],
  },
  {
    id: "caesarean",
    category: "gynae",
    name: { en: "Caesarean section", bn: "সিজারিয়ান সেকশন" },
    summary: {
      en: "Delivery of a baby through an incision in the lower abdomen and the uterus.",
      bn: "তলপেট ও জরায়ুর কাটার মধ্য দিয়ে শিশুর জন্ম।",
    },
    body: "female",
    difficulty: 2,
    duration: { en: "30–60 min", bn: "৩০–৬০ মিনিট" },
    anaesthesia: { en: "Spinal (usually) or general", bn: "স্পাইনাল (সাধারণত) বা জেনারেল" },
    indications: { en: "Obstructed labour, fetal distress, breech, placenta praevia, previous caesarean.", bn: "প্রসব বাধাগ্রস্ত, ভ্রূণের কষ্ট, ব্রিচ, প্লাসেন্টা প্রিভিয়া, আগের সিজার।" },
    risks: { en: "Bleeding, infection, bladder or bowel injury, clots, scar in the uterus.", bn: "রক্তক্ষরণ, সংক্রমণ, মূত্রথলি বা অন্ত্রে আঘাত, রক্ত জমাট, জরায়ুতে দাগ।" },
    show: ["reproductive", "urinary", "skeletal"],
    focus: { match: "uterus|uterine", distance: 0.5 },
    steps: [
      {
        title: { en: "Prepare and position", bn: "প্রস্তুতি ও অবস্থান" },
        text: {
          en: "Spinal anaesthesia is given, a catheter empties the bladder and antibiotics are given. The mother is tilted slightly to the left so the heavy uterus does not press on the large veins and reduce blood return.",
          bn: "স্পাইনাল অ্যানেস্থেসিয়া দেওয়া হয়, ক্যাথেটার দিয়ে মূত্রথলি খালি করা হয় এবং অ্যান্টিবায়োটিক দেওয়া হয়। মাকে সামান্য বাম দিকে হেলানো হয়, যাতে ভারী জরায়ু বড় শিরা চেপে রক্ত ফেরা কমিয়ে না দেয়।",
        },
        instrument: { en: "Spinal needle, Foley catheter", bn: "স্পাইনাল নিডল, ফোলি ক্যাথেটার" },
        highlight: "bladder|uterus",
        focus: { match: "uterus|uterine", distance: 0.6 },
      },
      {
        title: { en: "Abdominal incision", bn: "পেটের কাটা" },
        text: {
          en: "A low transverse (Pfannenstiel) incision is made 2–3 cm above the pubic bone. The layers — fat, rectus sheath, rectus muscles, peritoneum — are opened one by one, the muscles being separated rather than cut.",
          bn: "পিউবিক হাড়ের ২–৩ সেমি উপরে নিচু আড়াআড়ি (ফানেনস্টিল) কাটা হয়। স্তরগুলো — চর্বি, রেক্টাস শিথ, রেক্টাস পেশী, পেরিটোনিয়াম — একে একে খোলা হয়; পেশী কাটা হয় না, আলাদা করা হয়।",
        },
        instrument: { en: "Scalpel, scissors, diathermy", bn: "স্ক্যালপেল, কাঁচি, ডায়াথার্মি" },
        plan: { anchor: "uterus|uterine", lines: [[[-0.07, -0.025], [0, -0.04], [0.07, -0.025]]] },
        highlight: "uterus|uterine|bladder",
        focus: { match: "uterus|uterine", distance: 0.5 },
      },
      {
        title: { en: "Open the uterus", bn: "জরায়ু খোলা" },
        text: {
          en: "The bladder is pushed down off the front of the uterus. A small transverse cut is made in the thin lower segment and widened with the fingers to avoid the vessels at the sides. Waters are released.",
          bn: "মূত্রথলি জরায়ুর সামনে থেকে নিচে নামানো হয়। পাতলা নিচের অংশে ছোট আড়াআড়ি কাটা হয় এবং পাশের রক্তনালী এড়াতে আঙুল দিয়ে চওড়া করা হয়। পানি বেরিয়ে আসে।",
        },
        instrument: { en: "Scalpel, bandage scissors", bn: "স্ক্যালপেল, ব্যান্ডেজ কাঁচি" },
        highlight: "uterus|uterine|body of uterus|bladder",
        focus: { match: "uterus|uterine", distance: 0.28 },
        tip: { en: "Cut the uterus slowly — the baby's head or arm is just underneath.", bn: "ধীরে জরায়ু কাটুন — শিশুর মাথা বা হাত ঠিক নিচেই থাকে।" },
      },
      {
        title: { en: "Deliver the baby", bn: "শিশুকে বের করা" },
        text: {
          en: "A hand is slipped below the baby's head and it is lifted out, followed by the shoulders and body, with gentle pressure on the top of the uterus. The mouth and nose are suctioned, the cord is clamped and cut, and oxytocin is given to make the uterus contract.",
          bn: "শিশুর মাথার নিচে হাত ঢুকিয়ে তুলে আনা হয়, তারপর কাঁধ ও শরীর, জরায়ুর উপরে হালকা চাপ দিয়ে। মুখ ও নাক সাকশন করা হয়, নাড়ি ক্ল্যাম্প করে কাটা হয় এবং জরায়ু সংকুচিত করতে অক্সিটোসিন দেওয়া হয়।",
        },
        instrument: { en: "Cord clamps, oxytocin 5–10 IU", bn: "কর্ড ক্ল্যাম্প, অক্সিটোসিন ৫–১০ IU" },
        highlight: "uterus|uterine",
        focus: { match: "uterus|uterine", distance: 0.3 },
        tip: { en: "Skin to baby is usually under 5 minutes in an emergency.", bn: "জরুরি অবস্থায় চামড়া কাটা থেকে শিশু জন্ম সাধারণত ৫ মিনিটের কম।" },
      },
      {
        title: { en: "Deliver the placenta and repair", bn: "প্লাসেন্টা বের করা ও মেরামত" },
        text: {
          en: "The placenta is delivered by gentle traction on the cord. The uterus is checked for remnants, then closed in one or two layers with a continuous absorbable stitch. The ovaries and tubes are inspected.",
          bn: "নাড়িতে আলতো টান দিয়ে প্লাসেন্টা বের করা হয়। জরায়ুতে অবশিষ্টাংশ আছে কিনা দেখে এক বা দুই স্তরে একটানা শোষণযোগ্য সুতায় সেলাই করা হয়। ডিম্বাশয় ও নালী পরীক্ষা করা হয়।",
        },
        instrument: { en: "Vicryl 1, sponge forceps", bn: "ভিক্রিল ১, স্পঞ্জ ফরসেপ" },
        highlight: "uterus|uterine|ovary|fallopian",
        focus: { match: "uterus|uterine", distance: 0.3 },
      },
      {
        title: { en: "Close the abdomen", bn: "পেট বন্ধ করা" },
        text: {
          en: "The bleeding is checked, swabs are counted and the layers are closed: peritoneum (often left), rectus sheath, fat if thick, and skin with a subcuticular stitch or staples. Skin-to-skin contact with the baby starts in theatre.",
          bn: "রক্তক্ষরণ দেখা হয়, সোয়াব গোনা হয় এবং স্তর বন্ধ হয়: পেরিটোনিয়াম (অনেক সময় রাখা হয়), রেক্টাস শিথ, চর্বি মোটা হলে, আর চামড়া সাবকিউটিকুলার সেলাই বা স্ট্যাপলে। থিয়েটারেই শিশুর সাথে চামড়ার সংস্পর্শ শুরু হয়।",
        },
        instrument: { en: "Vicryl 1, Monocryl 3-0", bn: "ভিক্রিল ১, মনোক্রিল ৩-০" },
        plan: { anchor: "uterus|uterine", lines: [[[-0.07, -0.025], [0, -0.04], [0.07, -0.025]]] },
      },
    ],
  },
  {
    id: "hysterectomy",
    category: "gynae",
    name: { en: "Total abdominal hysterectomy", bn: "টোটাল অ্যাবডোমিনাল হিস্টেরেক্টমি" },
    summary: {
      en: "Removal of the uterus and cervix through an abdominal incision.",
      bn: "পেটের কাটার মধ্য দিয়ে জরায়ু ও সার্ভিক্স অপসারণ।",
    },
    body: "female",
    difficulty: 3,
    duration: { en: "1.5–2.5 hours", bn: "১.৫–২.৫ ঘণ্টা" },
    anaesthesia: { en: "General", bn: "জেনারেল" },
    indications: { en: "Large fibroids, heavy bleeding unresponsive to treatment, prolapse, cancer.", bn: "বড় ফাইব্রয়েড, চিকিৎসায় না কমা অতিরিক্ত রক্তস্রাব, প্রল্যাপ্স, ক্যান্সার।" },
    risks: { en: "Bleeding, ureter or bladder injury, infection, early menopause if ovaries are removed.", bn: "রক্তক্ষরণ, ইউরেটার বা মূত্রথলিতে আঘাত, সংক্রমণ, ডিম্বাশয় কাটলে আগাম মেনোপজ।" },
    show: ["reproductive", "urinary", "cardiovascular", "skeletal"],
    focus: { match: "uterus|uterine", distance: 0.5 },
    steps: [
      {
        title: { en: "Open the abdomen", bn: "পেট খোলা" },
        text: {
          en: "A low transverse or midline incision is made. The bowel is packed away upwards and the uterus, tubes and ovaries are examined.",
          bn: "নিচু আড়াআড়ি বা মাঝ বরাবর কাটা হয়। অন্ত্র উপরে সরিয়ে প্যাক করা হয় এবং জরায়ু, নালী ও ডিম্বাশয় পরীক্ষা করা হয়।",
        },
        instrument: { en: "Scalpel, self-retaining retractor", bn: "স্ক্যালপেল, সেলফ-রিটেইনিং রিট্র্যাক্টর" },
        plan: { anchor: "uterus|uterine", lines: [[[-0.07, -0.025], [0, -0.04], [0.07, -0.025]]] },
        highlight: "uterus|uterine|ovary",
        focus: { match: "uterus|uterine", distance: 0.5 },
      },
      {
        title: { en: "Divide the round ligaments", bn: "রাউন্ড লিগামেন্ট কাটা" },
        text: {
          en: "The uterus is lifted with clamps on each side. The round ligaments are clamped, cut and tied, and the broad ligament is opened to expose the pelvic side wall and the ureter.",
          bn: "দুই দিকে ক্ল্যাম্প দিয়ে জরায়ু তুলে ধরা হয়। রাউন্ড লিগামেন্ট ক্ল্যাম্প করে কেটে বাঁধা হয় এবং ব্রড লিগামেন্ট খুলে শ্রোণীর পাশের দেয়াল ও ইউরেটার উন্মুক্ত করা হয়।",
        },
        instrument: { en: "Kocher clamps, Vicryl 0", bn: "কখার ক্ল্যাম্প, ভিক্রিল ০" },
        highlight: "round ligament|broad ligament|uterus|ureter",
        focus: { match: "uterus|uterine", distance: 0.35 },
      },
      {
        title: { en: "Deal with the ovaries", bn: "ডিম্বাশয়ের ব্যবস্থা" },
        text: {
          en: "If the ovaries are kept, the utero-ovarian ligament and tube are clamped and divided. If they are to be removed, the infundibulopelvic ligament carrying the ovarian vessels is tied, always after the ureter has been identified.",
          bn: "ডিম্বাশয় রাখলে ইউটেরো-ওভারিয়ান লিগামেন্ট ও নালী ক্ল্যাম্প করে কাটা হয়। ফেলে দিতে হলে ডিম্বাশয়ের রক্তনালী বহনকারী ইনফান্ডিবুলোপেলভিক লিগামেন্ট বাঁধা হয় — সবসময় ইউরেটার শনাক্ত করার পর।",
        },
        instrument: { en: "Heaney clamps, ligatures", bn: "হিনি ক্ল্যাম্প, লাইগেচার" },
        highlight: "ovary|fallopian|suspensory|ureter",
        focus: { match: "ovary|fallopian", distance: 0.3 },
      },
      {
        title: { en: "Push the bladder down", bn: "মূত্রথলি নিচে নামানো" },
        text: {
          en: "The peritoneum in front of the uterus is cut and the bladder is gently pushed down off the cervix, so that it is far out of harm's way during the next steps.",
          bn: "জরায়ুর সামনের পেরিটোনিয়াম কেটে মূত্রথলি সার্ভিক্স থেকে আলতো করে নিচে নামানো হয়, যাতে পরের ধাপে সেটি নিরাপদ দূরত্বে থাকে।",
        },
        instrument: { en: "Scissors, swab on forceps", bn: "কাঁচি, ফরসেপে সোয়াব" },
        highlight: "bladder|uterus|cervix",
        focus: { match: "bladder|uterus", distance: 0.3 },
      },
      {
        title: { en: "Clamp the uterine arteries", bn: "জরায়ুর ধমনী ক্ল্যাম্প" },
        text: {
          en: "The uterine arteries are clamped, cut and tied right against the uterus at the level of the cervix. The ureter passes under the artery 1–2 cm away — 'water under the bridge' — and this is the commonest place for it to be injured.",
          bn: "জরায়ুর ধমনী সার্ভিক্সের স্তরে জরায়ুর গা ঘেঁষে ক্ল্যাম্প করে কেটে বাঁধা হয়। ইউরেটার ধমনীর নিচ দিয়ে ১–২ সেমি দূরে যায় — 'ব্রিজের নিচে পানি' — আর এখানেই সবচেয়ে বেশি আঘাত লাগে।",
        },
        instrument: { en: "Heaney clamps, Vicryl 1", bn: "হিনি ক্ল্যাম্প, ভিক্রিল ১" },
        highlight: "uterine artery|ureter|cervix|uterus",
        focus: { match: "uterus|uterine|cervix", distance: 0.28 },
        tip: { en: "Clamp close to the uterus and look at the ureter before cutting.", bn: "জরায়ুর কাছে ক্ল্যাম্প করুন এবং কাটার আগে ইউরেটার দেখে নিন।" },
      },
      {
        title: { en: "Free and remove the uterus", bn: "জরায়ু আলাদা করে বের করা" },
        text: {
          en: "The cardinal and uterosacral ligaments are divided, the cervix is cut away from the top of the vagina and the uterus is lifted out. The top of the vagina (vault) is closed with stitches.",
          bn: "কার্ডিনাল ও ইউটেরোস্যাক্রাল লিগামেন্ট কাটা হয়, যোনির উপর থেকে সার্ভিক্স আলাদা করা হয় এবং জরায়ু তুলে বের করা হয়। যোনির উপরের অংশ (ভল্ট) সেলাইয়ে বন্ধ করা হয়।",
        },
        instrument: { en: "Scalpel, Vicryl 0 vault stitches", bn: "স্ক্যালপেল, ভিক্রিল ০ ভল্ট সেলাই" },
        highlight: "uterus|uterine|cervix|vagina",
        focus: { match: "uterus|uterine|cervix", distance: 0.35 },
      },
    ],
  },
  {
    id: "craniotomy",
    category: "neuro",
    name: { en: "Craniotomy (tumour removal)", bn: "ক্র্যানিওটমি (টিউমার অপসারণ)" },
    summary: {
      en: "A window of skull bone is temporarily lifted to reach and remove a brain tumour.",
      bn: "মস্তিষ্কের টিউমারে পৌঁছাতে খুলির হাড়ের একটি জানালা সাময়িকভাবে তুলে ফেলা।",
    },
    body: "male",
    difficulty: 3,
    duration: { en: "3–6 hours", bn: "৩–৬ ঘণ্টা" },
    anaesthesia: { en: "General (sometimes awake)", bn: "জেনারেল (কখনো জাগ্রত)" },
    indications: { en: "Brain tumour such as meningioma or glioma, blood clot, aneurysm clipping.", bn: "মেনিনজিওমা বা গ্লায়োমার মতো মস্তিষ্কের টিউমার, রক্তের জমাট, অ্যানিউরিজম ক্লিপিং।" },
    risks: { en: "Bleeding, seizures, stroke, weakness or speech problems, infection.", bn: "রক্তক্ষরণ, খিঁচুনি, স্ট্রোক, দুর্বলতা বা কথা বলায় সমস্যা, সংক্রমণ।" },
    show: ["nervous", "skeletal", "cardiovascular"],
    focus: { match: "frontal bone|parietal bone", distance: 0.5 },
    steps: [
      {
        title: { en: "Position and plan", bn: "অবস্থান ও পরিকল্পনা" },
        text: {
          en: "The head is held in a three-pin frame. A navigation system, based on the MRI scan, lets the surgeon see on a screen exactly where the instrument tip is inside the head. The incision is planned to be behind the hairline.",
          bn: "মাথা তিন-পিনের ফ্রেমে ধরে রাখা হয়। MRI-ভিত্তিক নেভিগেশন সিস্টেম স্ক্রিনে দেখায় যন্ত্রের মাথা মাথার ভেতরে ঠিক কোথায়। কাটা চুলের রেখার পেছনে পরিকল্পনা করা হয়।",
        },
        instrument: { en: "Mayfield head clamp, neuronavigation", bn: "মেফিল্ড হেড ক্ল্যাম্প, নিউরোনেভিগেশন" },
        plan: { anchor: "frontal bone|parietal bone", lines: [[[-0.07, 0.0], [-0.05, 0.04], [0, 0.06], [0.05, 0.04], [0.07, 0.0]]] },
        highlight: "frontal bone|parietal bone",
        focus: { match: "frontal bone|parietal bone", distance: 0.5 },
      },
      {
        title: { en: "Scalp flap", bn: "স্ক্যাল্প ফ্ল্যাপ" },
        text: {
          en: "The scalp is cut down to the bone and folded back as a flap. Small clips on the edges stop the bleeding, because the scalp has a very rich blood supply.",
          bn: "স্ক্যাল্প হাড় পর্যন্ত কেটে ফ্ল্যাপ হিসেবে উল্টে দেওয়া হয়। কিনারায় ছোট ক্লিপ রক্ত থামায়, কারণ স্ক্যাল্পে রক্তসরবরাহ খুব বেশি।",
        },
        instrument: { en: "Scalpel, Raney clips", bn: "স্ক্যালপেল, রেনি ক্লিপ" },
        highlight: "frontal bone|parietal bone|temporal bone",
        focus: { match: "frontal bone|parietal bone", distance: 0.4 },
      },
      {
        title: { en: "Lift the bone flap", bn: "হাড়ের ফ্ল্যাপ তোলা" },
        text: {
          en: "Burr holes are drilled, then joined with a craniotome — a drill with a foot that stops at the dura — to cut a window of bone, which is lifted off and kept safe.",
          bn: "বার হোল ড্রিল করা হয়, তারপর ক্র্যানিওটোম — ডুরা পর্যন্ত গিয়ে থেমে যাওয়া পা-যুক্ত ড্রিল — দিয়ে সংযুক্ত করে হাড়ের জানালা কেটে তুলে নিরাপদে রাখা হয়।",
        },
        instrument: { en: "Perforator drill, craniotome", bn: "পারফোরেটর ড্রিল, ক্র্যানিওটোম" },
        highlight: "frontal bone|parietal bone",
        focus: { match: "frontal bone|parietal bone", distance: 0.3 },
      },
      {
        title: { en: "Open the dura and operate", bn: "ডুরা খুলে অপারেশন" },
        text: {
          en: "The tough membrane over the brain (dura) is opened. Under an operating microscope the surgeon finds a safe corridor, separates the tumour from healthy brain and removes it piece by piece, while monitors watch nerve function.",
          bn: "মস্তিষ্কের উপর শক্ত পর্দা (ডুরা) খোলা হয়। অপারেটিং মাইক্রোস্কোপের নিচে সার্জন নিরাপদ পথ খুঁজে টিউমারকে সুস্থ মস্তিষ্ক থেকে আলাদা করে টুকরো টুকরো করে বের করেন, আর মনিটর স্নায়ুর কার্যক্ষমতা লক্ষ রাখে।",
        },
        instrument: { en: "Microscope, bipolar, suction (CUSA)", bn: "মাইক্রোস্কোপ, বাইপোলার, সাকশন (CUSA)" },
        highlight: "cerebral|gyrus|frontal lobe|cortex|brain",
        focus: { match: "gyrus|frontal|cerebr", distance: 0.35 },
        tip: { en: "In 'awake craniotomy' the patient talks and moves during surgery so speech areas are not damaged.", bn: "'অ্যাওয়েক ক্র্যানিওটমি'-তে রোগী কথা বলেন ও নড়েন, যাতে ভাষার অংশ ক্ষতিগ্রস্ত না হয়।" },
      },
      {
        title: { en: "Close", bn: "বন্ধ করা" },
        text: {
          en: "The dura is closed watertight, the bone flap is fixed back with small titanium plates and screws, and the scalp is stitched or stapled in two layers.",
          bn: "ডুরা পানিরোধীভাবে বন্ধ হয়, হাড়ের ফ্ল্যাপ ছোট টাইটানিয়াম প্লেট ও স্ক্রু দিয়ে আটকানো হয় এবং স্ক্যাল্প দুই স্তরে সেলাই বা স্ট্যাপল করা হয়।",
        },
        instrument: { en: "Titanium plates, 3-0 Vicryl", bn: "টাইটানিয়াম প্লেট, ৩-০ ভিক্রিল" },
        plan: { anchor: "frontal bone|parietal bone", lines: [[[-0.07, 0.0], [-0.05, 0.04], [0, 0.06], [0.05, 0.04], [0.07, 0.0]]] },
      },
    ],
  },
  {
    id: "tkr",
    category: "ortho",
    name: { en: "Total knee replacement", bn: "টোটাল নী রিপ্লেসমেন্ট" },
    summary: {
      en: "The worn joint surfaces of the knee are cut off and replaced by metal and plastic implants.",
      bn: "হাঁটুর ক্ষয়ে যাওয়া জোড়ার তল কেটে ধাতু ও প্লাস্টিকের ইমপ্লান্ট বসানো।",
    },
    body: "any",
    difficulty: 2,
    duration: { en: "1–2 hours", bn: "১–২ ঘণ্টা" },
    anaesthesia: { en: "Spinal or general", bn: "স্পাইনাল বা জেনারেল" },
    indications: { en: "Severe osteoarthritis with pain and stiffness not helped by drugs or physiotherapy.", bn: "ওষুধ বা ফিজিওথেরাপিতে না কমা ব্যথা ও শক্ত হয়ে যাওয়াসহ গুরুতর অস্টিওআর্থ্রাইটিস।" },
    risks: { en: "Infection, blood clots, stiffness, loosening of the implant, nerve or vessel injury.", bn: "সংক্রমণ, রক্ত জমাট, শক্ত হয়ে যাওয়া, ইমপ্লান্ট ঢিলা হওয়া, স্নায়ু বা রক্তনালীতে আঘাত।" },
    show: ["skeletal"],
    focus: { match: "^right patella", distance: 0.5 },
    steps: [
      {
        title: { en: "Approach the joint", bn: "জোড়ায় পৌঁছানো" },
        text: {
          en: "With the leg in a tourniquet, a 15-cm midline incision is made over the knee. The joint capsule is opened beside the kneecap (medial parapatellar approach) and the patella is flipped to the side.",
          bn: "পায়ে টর্নিকেট বেঁধে হাঁটুর উপর মাঝ বরাবর ১৫ সেমি কাটা হয়। হাঁটুর বাটির পাশে জোড়ার ক্যাপসুল খোলা হয় (মিডিয়াল প্যারাপ্যাটেলার পদ্ধতি) এবং প্যাটেলা একদিকে উল্টে দেওয়া হয়।",
        },
        instrument: { en: "Scalpel, tourniquet", bn: "স্ক্যালপেল, টর্নিকেট" },
        plan: { anchor: "^right patella", lines: [[[0, 0.09], [0, -0.09]]] },
        highlight: "^right patella|right patellar ligament",
        focus: { match: "^right patella", distance: 0.35 },
      },
      {
        title: { en: "Cut the femur", bn: "ঊর্বাস্থি কাটা" },
        text: {
          en: "A rod is passed into the femur to align the cutting guide. The worn end of the thigh bone is cut with an oscillating saw at a set angle (about 5–7° valgus), taking off only 8–10 mm of bone.",
          bn: "কাটার গাইড ঠিক করতে ঊর্বাস্থির ভেতরে রড ঢোকানো হয়। উরুর হাড়ের ক্ষয়ে যাওয়া প্রান্ত নির্দিষ্ট কোণে (প্রায় ৫–৭° ভ্যালগাস) অসিলেটিং করাত দিয়ে কাটা হয়, মাত্র ৮–১০ মিমি হাড় বাদ যায়।",
        },
        instrument: { en: "Oscillating saw, cutting jig", bn: "অসিলেটিং করাত, কাটিং জিগ" },
        highlight: "^right femur|femur",
        focus: { match: "^right femur", distance: 0.4 },
      },
      {
        title: { en: "Cut the tibia", bn: "টিবিয়া কাটা" },
        text: {
          en: "The top of the shin bone is cut flat, at 90° to its long axis, with a similar guide. The knee is checked to be balanced: the gap should be equal and rectangular both when the knee is straight and when it is bent.",
          bn: "শিনের হাড়ের মাথা একই ধরনের গাইড দিয়ে লম্বা অক্ষের সাথে ৯০° কোণে সমতল করে কাটা হয়। হাঁটু সোজা ও ভাঁজ — দুই অবস্থায়ই ফাঁক সমান ও আয়তাকার কিনা দেখা হয়।",
        },
        instrument: { en: "Oscillating saw, tibial guide", bn: "অসিলেটিং করাত, টিবিয়াল গাইড" },
        highlight: "^right tibia|tibia",
        focus: { match: "^right tibia", distance: 0.4 },
      },
      {
        title: { en: "Trial and balance", bn: "ট্রায়াল ও ভারসাম্য" },
        text: {
          en: "Trial implants are fitted. The surgeon bends and straightens the knee, checks the ligaments for stability and the kneecap for smooth tracking, and adjusts the cuts or releases tight tissue until the knee is perfect.",
          bn: "ট্রায়াল ইমপ্লান্ট বসানো হয়। সার্জন হাঁটু ভাঁজ-সোজা করে লিগামেন্টের স্থিতি ও হাঁটুর বাটির মসৃণ চলন দেখেন এবং হাঁটু ঠিক না হওয়া পর্যন্ত কাট বদলান বা টান টিস্যু ছেড়ে দেন।",
        },
        instrument: { en: "Trial components", bn: "ট্রায়াল কম্পোনেন্ট" },
        highlight: "femur|tibia|patella|collateral|cruciate",
        focus: { match: "^right patella", distance: 0.4 },
        tip: { en: "Good balance matters more than perfect alignment of the metal.", bn: "ধাতুর নিখুঁত সারিবদ্ধতার চেয়ে ভালো ভারসাম্য বেশি জরুরি।" },
      },
      {
        title: { en: "Cement the implants", bn: "ইমপ্লান্ট সিমেন্ট করা" },
        text: {
          en: "The bone is washed and dried. Bone cement is applied and the metal femoral and tibial components are pressed on, followed by the polyethylene spacer. After the cement hardens the tourniquet is released, bleeding is controlled and the wound is closed in layers.",
          bn: "হাড় ধুয়ে শুকানো হয়। বোন সিমেন্ট লাগিয়ে ধাতুর ফিমোরাল ও টিবিয়াল কম্পোনেন্ট চেপে বসানো হয়, তার পর পলিইথিলিন স্পেসার। সিমেন্ট শক্ত হলে টর্নিকেট খুলে রক্তক্ষরণ থামিয়ে স্তরে স্তরে সেলাই করা হয়।",
        },
        instrument: { en: "Bone cement, implants", bn: "বোন সিমেন্ট, ইমপ্লান্ট" },
        highlight: "femur|tibia|patella",
        focus: { match: "^right patella", distance: 0.45 },
        tip: { en: "Most patients stand on the day of surgery and walk with a frame within 24 hours.", bn: "অধিকাংশ রোগী অপারেশনের দিনই দাঁড়ান ও ২৪ ঘণ্টার মধ্যে ফ্রেম ধরে হাঁটেন।" },
      },
    ],
  },
];

export const SURGERY_BY_ID = Object.fromEntries(SURGERIES.map((s) => [s.id, s])) as Record<string, Surgery>;
