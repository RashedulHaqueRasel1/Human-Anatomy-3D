import type { FlowRole } from "./tissue";
import type { SystemId } from "./body";

/**
 * Live-body processes. Each process says which tissues glow (and how) and
 * walks through the physiology in narrated steps (English + Bangla). A step
 * can highlight structures (by name) and move the camera to them.
 */

export type ProcessId = "circulation" | "heart" | "breathing" | "digestion" | "excretion" | "nervous" | "brain" | "exercise" | "hormones";

type Bi = { en: string; bn: string };

/**
 * A stream of glowing particles (food, bile, urine, blood…) that travels along
 * a named 3D path of the body between two named marks of that path.
 */
export type Train = {
  path: string;
  from: string;
  to: string;
  /** Colour stops along the whole path (lerped by path position). */
  colors: string[];
  count?: number;
  /** Particle radius in metres. */
  size?: number;
  /** Seconds for one particle to go from `from` to `to`. */
  period?: number;
};

export type FlowSetting = {
  role: FlowRole;
  color: string;
  /** Where the waves start. */
  origin: "heart" | "mouth" | "airway" | "brain" | "kidney" | "liver";
  /** 1 = away from the origin, -1 = towards it; "breath" follows inhale/exhale. */
  dir: 1 | -1 | "breath";
  strength: number;
  /** Wave speed in body-lengths per second relative to the heart rate (circulation) or absolute. */
  speed: number;
  freq: number;
  scale?: number;
};

export type LiveStep = {
  title: Bi;
  text: Bi;
  /** Structures to highlight (matched against English names). */
  highlight?: RegExp;
  /** Camera target: centre of the structures matching this, at this distance. */
  focus?: { match: RegExp; distance: number };
  /** Override strengths for this step (role → multiplier). */
  emphasis?: Partial<Record<FlowRole, number>>;
  /** Reverse a flow for this step (e.g. motor signals going out instead of sensory coming in). */
  dir?: Partial<Record<FlowRole, 1 | -1>>;
  /** Only these flow roles are animated in this step. */
  only?: FlowRole[];
  /** Extra systems shown solid in this step (on top of the process's own). */
  show?: SystemId[];
  /** The organ this step is about, shown as a chip. */
  organ?: Bi;
  /** One-line key facts (duration, volume, pH…). */
  facts?: Bi[];
  /** Particle streams travelling through the body. */
  trains?: Train[];
  /** Heart and breathing rates this step demonstrates (e.g. exercise); the sliders still override. */
  rates?: { bpm?: number; breathRate?: number };
  /** Rhythmic churning (stomach) or filling (bladder) of the matching structures. */
  swell?: { match: RegExp; mode: "churn" | "fill" | "squeeze"; amount: number };
};

export type LiveProcess = {
  id: ProcessId;
  icon: string;
  name: Bi;
  summary: Bi;
  /** Systems kept solid while the rest of the body fades. */
  keep: SystemId[];
  /** Kept but see-through, so what lies behind stays visible. */
  dim?: SystemId[];
  flows: FlowSetting[];
  /** Wave speed follows the heart-rate slider (circulation-type processes). */
  pulseDriven?: boolean;
  steps: LiveStep[];
};

const RED = "#ff2a2a";
const BLUE = "#3d7bff";

export const PROCESSES: LiveProcess[] = [
  {
    id: "circulation",
    icon: "❤️",
    name: { en: "Blood circulation", bn: "রক্ত সঞ্চালন" },
    summary: {
      en: "The heart beats and pushes blood in two loops: to the lungs for oxygen, and to the whole body. Red waves = oxygen-rich blood in arteries, blue waves = oxygen-poor blood returning in veins.",
      bn: "হৃৎপিণ্ড স্পন্দিত হয়ে দুটি পথে রক্ত পাঠায়: অক্সিজেনের জন্য ফুসফুসে, আর সারা শরীরে। লাল ঢেউ = ধমনীতে অক্সিজেনসমৃদ্ধ রক্ত, নীল ঢেউ = শিরা দিয়ে ফেরা অক্সিজেনহীন রক্ত।",
    },
    keep: ["cardiovascular", "respiratory"],
    dim: ["respiratory"],
    pulseDriven: true,
    flows: [
      { role: "artery", color: RED, origin: "heart", dir: 1, strength: 2.4, speed: 9, freq: 22 },
      { role: "vein", color: BLUE, origin: "heart", dir: -1, strength: 2.2, speed: 5, freq: 22 },
      { role: "pulmonaryArtery", color: BLUE, origin: "heart", dir: 1, strength: 2.4, speed: 7, freq: 60 },
      { role: "pulmonaryVein", color: RED, origin: "heart", dir: -1, strength: 2.4, speed: 7, freq: 60 },
      { role: "heart", color: "#ff3b3b", origin: "heart", dir: 1, strength: 0, speed: 0, freq: 0 },
      { role: "lung", color: "#ff6f8a", origin: "airway", dir: 1, strength: 0.35, speed: 1, freq: 8 },
    ],
    steps: [
      {
        title: { en: "1. Blood returns to the heart", bn: "১. রক্ত হৃৎপিণ্ডে ফেরে" },
        text: {
          en: "Oxygen-poor blood from the body flows back through the veins — the superior and inferior vena cava — into the right atrium. Watch the blue waves travelling towards the heart.",
          bn: "শরীর থেকে অক্সিজেনহীন রক্ত শিরা দিয়ে — ঊর্ধ্ব ও নিম্ন মহাশিরা — ডান অলিন্দে ফিরে আসে। নীল ঢেউগুলো হৃৎপিণ্ডের দিকে যাচ্ছে, দেখুন।",
        },
        highlight: /vena cava|right cardiac atrium|wall of heart/i,
        focus: { match: /vena cava|heart|atrium|ventricle/i, distance: 0.55 },
        emphasis: { vein: 1.6, artery: 0.3 },
      },
      {
        title: { en: "2. Right ventricle → lungs", bn: "২. ডান নিলয় → ফুসফুস" },
        text: {
          en: "The tricuspid valve opens, the right ventricle fills and contracts, pushing blood through the pulmonary valve into the pulmonary artery towards the lungs.",
          bn: "ট্রাইকাসপিড ভালভ খোলে, ডান নিলয় ভরে ও সংকুচিত হয় এবং পালমোনারি ভালভ দিয়ে পালমোনারি ধমনীতে রক্ত ফুসফুসের দিকে পাঠায়।",
        },
        highlight: /pulmonary (arter|trunk|valve)|right ventricle|tricuspid/i,
        focus: { match: /heart|ventricle|pulmonary/i, distance: 0.35 },
        emphasis: { pulmonaryArtery: 1.8, artery: 0.3, vein: 0.3 },
      },
      {
        title: { en: "3. Gas exchange in the lungs", bn: "৩. ফুসফুসে গ্যাস বিনিময়" },
        text: {
          en: "In millions of tiny air sacs (alveoli) the blood drops carbon dioxide and picks up oxygen, turning bright red.",
          bn: "কোটি কোটি ছোট বায়ুথলিতে (অ্যালভিওলাই) রক্ত কার্বন ডাই-অক্সাইড ছেড়ে অক্সিজেন নেয় এবং উজ্জ্বল লাল হয়।",
        },
        highlight: /lung|lobe of/i,
        focus: { match: /lung|lobe of/i, distance: 0.6 },
        emphasis: { lung: 3, artery: 0.2, vein: 0.2 },
      },
      {
        title: { en: "4. Back to the left heart", bn: "৪. আবার বাম হৃৎপিণ্ডে" },
        text: {
          en: "Oxygen-rich blood returns through the pulmonary veins into the left atrium, then through the mitral valve into the strong left ventricle.",
          bn: "অক্সিজেনসমৃদ্ধ রক্ত পালমোনারি শিরা দিয়ে বাম অলিন্দে ফেরে, তারপর মাইট্রাল ভালভ দিয়ে শক্তিশালী বাম নিলয়ে যায়।",
        },
        highlight: /pulmonary vein|left cardiac atrium|left ventricle|mitral/i,
        focus: { match: /heart|ventricle|atrium/i, distance: 0.35 },
        emphasis: { pulmonaryVein: 1.8, artery: 0.3, vein: 0.3 },
      },
      {
        title: { en: "5. Left ventricle → aorta", bn: "৫. বাম নিলয় → মহাধমনী" },
        text: {
          en: "With each beat the left ventricle squeezes about 70 ml of blood through the aortic valve into the aorta — this pressure wave is the pulse you feel at your wrist.",
          bn: "প্রতিটি স্পন্দনে বাম নিলয় প্রায় ৭০ মিলি রক্ত অ্যাওর্টিক ভালভ দিয়ে মহাধমনীতে পাঠায় — এই চাপের ঢেউই কবজিতে নাড়ি হিসেবে অনুভব করেন।",
        },
        highlight: /aorta|aortic valve|left ventricle/i,
        focus: { match: /aorta|heart/i, distance: 0.6 },
        emphasis: { artery: 1.8, vein: 0.3 },
      },
      {
        title: { en: "6. Arteries feed every organ", bn: "৬. ধমনী প্রতিটি অঙ্গে রক্ত দেয়" },
        text: {
          en: "Arteries branch to the brain, gut, kidneys and limbs. In the capillaries oxygen and food pass to the cells, and the blood starts its way back through the veins. One full loop takes about one minute.",
          bn: "ধমনী শাখা হয়ে মস্তিষ্ক, অন্ত্র, বৃক্ক ও হাত-পায়ে যায়। কৈশিক নালীতে অক্সিজেন ও খাদ্য কোষে যায়, আর রক্ত শিরা দিয়ে ফেরার পথ ধরে। পুরো একবার ঘুরতে প্রায় এক মিনিট লাগে।",
        },
        facts: [
          { en: "One loop ≈ 1 minute", bn: "একবার ঘুরতে ≈ ১ মিনিট" },
          { en: "Vessels ≈ 100,000 km long", bn: "রক্তনালী ≈ ১ লক্ষ কিমি লম্বা" },
        ],
        highlight: /artery|arteries/i,
        focus: { match: /aorta|heart/i, distance: 2.2 },
      },
      {
        title: { en: "Blood to the head and brain", bn: "মাথা ও মস্তিষ্কে রক্ত" },
        organ: { en: "Carotid arteries and jugular veins", bn: "ক্যারোটিড ধমনী ও জুগুলার শিরা" },
        text: {
          en: "The arch of the aorta gives off the brachiocephalic, left common carotid and left subclavian arteries. The two carotids climb the neck to feed the brain, which is only 2% of body weight yet takes 15–20% of the blood and 20% of the oxygen. After a few seconds without blood flow you faint. Used blood drains down the internal jugular veins.",
          bn: "মহাধমনীর বাঁক (আর্চ) থেকে ব্রাকিওসেফালিক, বাম কমন ক্যারোটিড ও বাম সাবক্ল্যাভিয়ান ধমনী বেরোয়। দুই ক্যারোটিড ঘাড় বেয়ে উঠে মস্তিষ্কে রক্ত দেয় — মস্তিষ্ক দেহের ওজনের মাত্র ২% হলেও রক্ত নেয় ১৫–২০% আর অক্সিজেন ২০%। কয়েক সেকেন্ড রক্ত না পেলেই অজ্ঞান হয়ে যায়। ব্যবহৃত রক্ত অন্তঃস্থ জুগুলার শিরা দিয়ে নামে।",
        },
        facts: [
          { en: "Brain ≈ 750 mL blood a minute", bn: "মস্তিষ্ক ≈ মিনিটে ৭৫০ মিলি রক্ত" },
          { en: "2% of weight, 20% of oxygen", bn: "ওজন ২%, অক্সিজেন ২০%" },
        ],
        highlight: /carotid|arch of aorta|brachiocephalic|jugular|subclavian/i,
        focus: { match: /carotid|arch of aorta|jugular/i, distance: 0.55 },
        emphasis: { artery: 1.8, vein: 0.8 },
      },
      {
        title: { en: "Arms and legs: the muscle pump", bn: "হাত-পা: পেশীর পাম্প" },
        organ: { en: "Iliac arteries and veins", bn: "ইলিয়াক ধমনী ও শিরা" },
        text: {
          en: "The aorta splits into the common iliac arteries that supply the pelvis and legs. Veins have to push blood uphill against gravity: one-way valves inside them stop backflow, and every time your leg muscles contract they squeeze the veins like a pump. That is why long standing makes ankles swell and walking helps.",
          bn: "মহাধমনী দুটি কমন ইলিয়াক ধমনীতে ভাগ হয়ে শ্রোণী ও পায়ে রক্ত দেয়। শিরাকে অভিকর্ষের বিরুদ্ধে উপরে রক্ত তুলতে হয়: ভেতরের একমুখী ভালভ পেছনে ফেরা আটকায়, আর পায়ের পেশী সংকুচিত হলেই শিরাকে পাম্পের মতো চেপে ধরে। তাই অনেকক্ষণ দাঁড়িয়ে থাকলে গোড়ালি ফোলে, হাঁটলে ভালো থাকে।",
        },
        facts: [
          { en: "Vein valves = one-way doors", bn: "শিরার ভালভ = একমুখী দরজা" },
          { en: "Walking = second heart", bn: "হাঁটা = দ্বিতীয় হৃৎপিণ্ড" },
        ],
        highlight: /iliac/i,
        focus: { match: /iliac/i, distance: 0.65 },
        emphasis: { vein: 1.8, artery: 1.2 },
      },
    ],
  },
  {
    id: "heart",
    icon: "🫀",
    name: { en: "The heart in detail", bn: "হৃৎপিণ্ড বিস্তারিত" },
    summary: {
      en: "A fist-sized double pump. Change the heart-rate slider and watch the beat speed up. Learn the four chambers, the four valves, the heart's own blood supply and what makes the 'lub-dub'.",
      bn: "মুঠোর সমান দ্বৈত পাম্প। হৃদস্পন্দন স্লাইডার বদলে স্পন্দন দ্রুত হতে দেখুন। চার প্রকোষ্ঠ, চার ভালভ, হৃৎপিণ্ডের নিজের রক্ত সরবরাহ আর 'লাব-ডাব' কীভাবে হয় তা জানুন।",
    },
    keep: ["cardiovascular"],
    pulseDriven: true,
    flows: [
      { role: "artery", color: RED, origin: "heart", dir: 1, strength: 1.6, speed: 9, freq: 22 },
      { role: "vein", color: BLUE, origin: "heart", dir: -1, strength: 1.6, speed: 5, freq: 22 },
      { role: "pulmonaryArtery", color: BLUE, origin: "heart", dir: 1, strength: 1.6, speed: 7, freq: 60 },
      { role: "pulmonaryVein", color: RED, origin: "heart", dir: -1, strength: 1.6, speed: 7, freq: 60 },
      { role: "heart", color: "#ff3b3b", origin: "heart", dir: 1, strength: 0, speed: 0, freq: 0 },
    ],
    steps: [
      {
        title: { en: "A pump the size of your fist", bn: "মুঠোর সমান পাম্প" },
        organ: { en: "Heart", bn: "হৃৎপিণ্ড" },
        text: {
          en: "The heart lies in the middle of the chest, tilted slightly to the left, between the lungs and behind the breastbone. It is made of special cardiac muscle that never tires. In reality it is two pumps side by side: the right side sends blood to the lungs, the left side sends it to the rest of the body.",
          bn: "হৃৎপিণ্ড বুকের মাঝখানে, বুকের হাড়ের পেছনে ও দুই ফুসফুসের মাঝে, সামান্য বাঁ দিকে হেলে থাকে। এটি কখনও না-ক্লান্ত হওয়া বিশেষ হৃদপেশীতে তৈরি। আসলে এটি পাশাপাশি দুটি পাম্প: ডান দিক রক্ত পাঠায় ফুসফুসে, বাম দিক পাঠায় সারা শরীরে।",
        },
        facts: [
          { en: "≈ 300 g, fist-sized", bn: "≈ ৩০০ গ্রাম, মুঠোর সমান" },
          { en: "≈ 100,000 beats a day", bn: "দিনে ≈ ১ লক্ষ স্পন্দন" },
          { en: "≈ 2.5 billion in a lifetime", bn: "জীবনে ≈ ২৫০ কোটি" },
        ],
        highlight: /wall of heart/i,
        focus: { match: /wall of heart|ventricle|atrium/i, distance: 0.32 },
        emphasis: { artery: 0.3, vein: 0.3, pulmonaryArtery: 0.3, pulmonaryVein: 0.3 },
      },
      {
        title: { en: "Right side: low-pressure pump", bn: "ডান দিক: কম চাপের পাম্প" },
        organ: { en: "Right atrium and right ventricle", bn: "ডান অলিন্দ ও ডান নিলয়" },
        text: {
          en: "The right atrium receives oxygen-poor blood from the two venae cavae and the coronary sinus. The tricuspid valve lets it into the right ventricle, whose thin wall only has to push blood a short way through the lungs, so it works at low pressure.",
          bn: "ডান অলিন্দ দুই মহাশিরা ও করোনারি সাইনাস থেকে অক্সিজেনহীন রক্ত নেয়। ট্রাইকাসপিড ভালভ দিয়ে তা ডান নিলয়ে যায় — এর দেয়াল পাতলা, কারণ ফুসফুসের ছোট পথে রক্ত ঠেলতে হয়, তাই চাপ কম।",
        },
        facts: [
          { en: "Pressure ≈ 25/5 mmHg", bn: "চাপ ≈ ২৫/৫ mmHg" },
          { en: "Wall ≈ 3 mm", bn: "দেয়াল ≈ ৩ মিমি" },
        ],
        highlight: /right ventricle|right cardiac atrium|tricuspid|superior vena cava|inferior vena cava|coronary sinus|pulmonary valve/i,
        focus: { match: /heart|ventricle|atrium/i, distance: 0.3 },
        emphasis: { vein: 1.6, pulmonaryArtery: 1.6, artery: 0.2 },
      },
      {
        title: { en: "Left side: the high-pressure pump", bn: "বাম দিক: উচ্চ চাপের পাম্প" },
        organ: { en: "Left atrium and left ventricle", bn: "বাম অলিন্দ ও বাম নিলয়" },
        text: {
          en: "The left ventricle must drive blood through the whole body, so its wall is three times thicker than the right. It works at five times the pressure. The thick muscle wall is what you feel as the apex beat on the left side of the chest.",
          bn: "বাম নিলয়কে পুরো শরীরে রক্ত ঠেলতে হয়, তাই এর দেয়াল ডান নিলয়ের তিন গুণ পুরু এবং পাঁচ গুণ চাপে কাজ করে। এই পুরু পেশীর স্পন্দনই বুকের বাঁ দিকে অনুভূত হয় (অ্যাপেক্স বিট)।",
        },
        facts: [
          { en: "Pressure ≈ 120/10 mmHg", bn: "চাপ ≈ ১২০/১০ mmHg" },
          { en: "Wall ≈ 10 mm", bn: "দেয়াল ≈ ১০ মিমি" },
        ],
        highlight: /left ventricle|left cardiac atrium|mitral|interventricular septum|ascending aorta|aortic/i,
        focus: { match: /heart|ventricle|atrium/i, distance: 0.3 },
        emphasis: { pulmonaryVein: 1.6, artery: 1.6, vein: 0.2 },
      },
      {
        title: { en: "Four valves: one-way doors", bn: "চারটি ভালভ: একমুখী দরজা" },
        organ: { en: "Tricuspid, pulmonary, mitral and aortic valves", bn: "ট্রাইকাসপিড, পালমোনারি, মাইট্রাল ও অ্যাওর্টিক ভালভ" },
        text: {
          en: "Four valves keep blood moving one way. The tricuspid and mitral valves (between atria and ventricles) are held shut by thin cords tied to the papillary muscles, so they cannot flip backwards. The pulmonary and aortic valves close the exits. A leaking or narrowed valve forces the heart to work harder and may make a murmur.",
          bn: "চারটি ভালভ রক্তকে এক দিকেই চলতে দেয়। অলিন্দ ও নিলয়ের মাঝের ট্রাইকাসপিড ও মাইট্রাল ভালভ প্যাপিলারি পেশীর সাথে বাঁধা সরু সুতোয় আটকে থাকে, তাই উল্টো দিকে উল্টে যেতে পারে না। পালমোনারি ও অ্যাওর্টিক ভালভ বের হওয়ার পথ বন্ধ করে। ভালভ লিক করলে বা সরু হলে হৃৎপিণ্ডকে বেশি খাটতে হয়, মার্মার শোনা যেতে পারে।",
        },
        facts: [
          { en: "'Lub' = AV valves close", bn: "'লাব' = AV ভালভ বন্ধ" },
          { en: "'Dub' = outlet valves close", bn: "'ডাব' = বহির্মুখ ভালভ বন্ধ" },
        ],
        highlight: /valve|papillary/i,
        focus: { match: /valve|papillary/i, distance: 0.22 },
        emphasis: { artery: 0.4, vein: 0.4 },
      },
      {
        title: { en: "One heartbeat: atria, then ventricles", bn: "একটি স্পন্দন: আগে অলিন্দ, পরে নিলয়" },
        organ: { en: "Cardiac cycle", bn: "হৃৎচক্র" },
        text: {
          en: "A beat starts at the pacemaker (SA node) in the right atrium. The signal spreads, the two atria squeeze and top up the ventricles (atrial systole). After a tiny delay at the AV node the ventricles contract strongly (ventricular systole) and eject blood. Then everything relaxes and the chambers refill (diastole). Use the heart-rate slider to feel how short each phase becomes.",
          bn: "স্পন্দন শুরু হয় ডান অলিন্দের পেসমেকার (SA নোড) থেকে। সংকেত ছড়িয়ে দুই অলিন্দ চেপে নিলয় ভরে দেয় (অ্যাট্রিয়াল সিস্টোল)। AV নোডে সামান্য দেরির পর নিলয় জোরে সংকুচিত হয়ে রক্ত বের করে (ভেন্ট্রিকুলার সিস্টোল)। তারপর সব শিথিল হয়ে প্রকোষ্ঠ ভরে (ডায়াস্টোল)। হৃদস্পন্দন স্লাইডার বাড়ালে প্রতিটি ধাপ কতটা ছোট হয় দেখুন।",
        },
        facts: [
          { en: "At 72 bpm one beat ≈ 0.83 s", bn: "৭২ বিপিএমে একটি স্পন্দন ≈ ০.৮৩ সে." },
          { en: "Systole ≈ 0.3 s", bn: "সিস্টোল ≈ ০.৩ সে." },
          { en: "Diastole ≈ 0.5 s", bn: "ডায়াস্টোল ≈ ০.৫ সে." },
        ],
        highlight: /wall of heart/i,
        focus: { match: /wall of heart|ventricle|atrium/i, distance: 0.3 },
        emphasis: { artery: 1.2, vein: 1.2, pulmonaryArtery: 1.2, pulmonaryVein: 1.2 },
      },
      {
        title: { en: "The heart feeds itself", bn: "হৃৎপিণ্ড নিজেকে খাওয়ায়" },
        organ: { en: "Coronary arteries and cardiac veins", bn: "করোনারি ধমনী ও কার্ডিয়াক শিরা" },
        text: {
          en: "The blood inside the chambers cannot feed the thick muscle wall. Instead the first branches of the aorta — the left and right coronary arteries — wrap around the heart and nourish it, and the cardiac veins drain into the coronary sinus. A blocked coronary artery starves part of the muscle: that is a heart attack.",
          bn: "প্রকোষ্ঠের ভেতরের রক্ত পুরু পেশীর দেয়ালকে খাওয়াতে পারে না। তাই মহাধমনীর প্রথম শাখা — বাম ও ডান করোনারি ধমনী — হৃৎপিণ্ডকে ঘিরে পুষ্টি দেয়, আর কার্ডিয়াক শিরা করোনারি সাইনাসে মিশে। করোনারি ধমনী বন্ধ হলে পেশীর কিছু অংশ অক্সিজেন পায় না — এটিই হার্ট অ্যাটাক।",
        },
        facts: [
          { en: "5% of cardiac output", bn: "কার্ডিয়াক আউটপুটের ৫%" },
          { en: "Fills mainly in diastole", bn: "প্রধানত ডায়াস্টোলে ভরে" },
        ],
        highlight: /coronary|circumflex|interventricular|cardiac vein|marginal branch|posterolateral|posterior veins/i,
        focus: { match: /coronary|circumflex|interventricular/i, distance: 0.26 },
        emphasis: { artery: 2, vein: 1.2, pulmonaryArtery: 0.3, pulmonaryVein: 0.3 },
      },
      {
        title: { en: "Output: how much the heart pumps", bn: "আউটপুট: কতটা রক্ত পাম্প হয়" },
        organ: { en: "Cardiac output", bn: "কার্ডিয়াক আউটপুট" },
        text: {
          en: "Cardiac output = heart rate × stroke volume. At rest about 70 mL leaves the left ventricle with each beat, so 72 beats give roughly 5 litres a minute — all the blood in your body passes through the heart about once a minute. Drag the heart-rate slider to see the output change.",
          bn: "কার্ডিয়াক আউটপুট = হৃদস্পন্দন × স্ট্রোক ভলিউম। বিশ্রামে প্রতি স্পন্দনে বাম নিলয় থেকে প্রায় ৭০ মিলি বের হয়, তাই ৭২ স্পন্দনে প্রায় ৫ লিটার/মিনিট — শরীরের সব রক্ত মিনিটে প্রায় একবার হৃৎপিণ্ড দিয়ে যায়। হৃদস্পন্দন স্লাইডার টেনে আউটপুট বদলাতে দেখুন।",
        },
        facts: [
          { en: "≈ 70 mL × 72 = 5 L/min", bn: "≈ ৭০ মিলি × ৭২ = ৫ লি/মিনিট" },
          { en: "≈ 7,000 L a day", bn: "দিনে ≈ ৭,০০০ লিটার" },
        ],
        highlight: /aorta|left ventricle/i,
        focus: { match: /aorta|heart/i, distance: 0.6 },
        emphasis: { artery: 1.8, vein: 0.5 },
      },
    ],
  },
  {
    id: "breathing",
    icon: "🫁",
    name: { en: "Breathing", bn: "শ্বাস-প্রশ্বাস" },
    summary: {
      en: "The diaphragm and rib muscles change the size of the chest. Air rushes in through the trachea and bronchi (cyan waves), oxygen enters the blood and carbon dioxide is breathed out.",
      bn: "মধ্যচ্ছদা ও পাঁজরের পেশী বুকের আকার বদলায়। শ্বাসনালী ও ব্রঙ্কাই দিয়ে বাতাস ঢোকে (নীলাভ ঢেউ), অক্সিজেন রক্তে যায় আর কার্বন ডাই-অক্সাইড বের হয়।",
    },
    keep: ["respiratory", "cardiovascular"],
    flows: [
      { role: "airway", color: "#38e1ff", origin: "airway", dir: "breath", strength: 2.6, speed: 0.6, freq: 55 },
      { role: "lung", color: "#5fd4ff", origin: "airway", dir: "breath", strength: 0.9, speed: 0.4, freq: 25 },
      { role: "pulmonaryArtery", color: BLUE, origin: "heart", dir: 1, strength: 1.2, speed: 6, freq: 60 },
      { role: "pulmonaryVein", color: RED, origin: "heart", dir: -1, strength: 1.2, speed: 6, freq: 60 },
    ],
    steps: [
      {
        title: { en: "1. Breathing in", bn: "১. শ্বাস নেওয়া" },
        text: {
          en: "The dome-shaped diaphragm contracts and moves down, the ribs swing up and out. The chest gets bigger, pressure inside falls and air is sucked in.",
          bn: "গম্বুজ আকৃতির মধ্যচ্ছদা সংকুচিত হয়ে নিচে নামে, পাঁজর উপরে ও বাইরে ওঠে। বুক বড় হয়, ভেতরের চাপ কমে আর বাতাস ঢুকে পড়ে।",
        },
        highlight: /diaphragm|intercostal/i,
        focus: { match: /lung|lobe of|diaphragm/i, distance: 0.7 },
      },
      {
        title: { en: "2. Through the airways", bn: "২. শ্বাসনালী দিয়ে" },
        text: {
          en: "Air passes the larynx, the trachea and divides into the right and left main bronchi, then into smaller and smaller branches.",
          bn: "বাতাস ল্যারিংক্স ও শ্বাসনালী পেরিয়ে ডান ও বাম প্রধান ব্রঙ্কাসে ভাগ হয়, তারপর আরও ছোট ছোট শাখায় যায়।",
        },
        highlight: /trachea|bronch|larynx/i,
        focus: { match: /trachea|bronch/i, distance: 0.45 },
        emphasis: { airway: 1.6 },
      },
      {
        title: { en: "3. Into the alveoli", bn: "৩. অ্যালভিওলাইতে" },
        text: {
          en: "The airways end in about 300 million alveoli. Their walls are thinner than a cell, so oxygen slips into the blood and carbon dioxide comes out.",
          bn: "শ্বাসনালী শেষ হয় প্রায় ৩০ কোটি অ্যালভিওলাইতে। এদের দেয়াল কোষের চেয়েও পাতলা, তাই অক্সিজেন সহজে রক্তে যায় আর কার্বন ডাই-অক্সাইড বের হয়।",
        },
        highlight: /lung|lobe of/i,
        focus: { match: /lung|lobe of/i, distance: 0.6 },
        emphasis: { lung: 1.8 },
      },
      {
        title: { en: "4. Breathing out", bn: "৪. শ্বাস ছাড়া" },
        text: {
          en: "The diaphragm relaxes and rises, the elastic lungs recoil and push the air — now rich in carbon dioxide — back out. At rest we breathe 12–20 times a minute.",
          bn: "মধ্যচ্ছদা শিথিল হয়ে উপরে ওঠে, স্থিতিস্থাপক ফুসফুস সংকুচিত হয়ে কার্বন ডাই-অক্সাইডপূর্ণ বাতাস বের করে দেয়। বিশ্রামে মিনিটে ১২–২০ বার শ্বাস নিই।",
        },
        facts: [
          { en: "Rest: 12–20 breaths/min", bn: "বিশ্রামে: ১২–২০ বার/মিনিট" },
          { en: "≈ 500 mL each breath", bn: "প্রতিবার ≈ ৫০০ মিলি" },
          { en: "≈ 8 L of air/min", bn: "≈ ৮ লি বাতাস/মিনিট" },
        ],
        highlight: /diaphragm/i,
        focus: { match: /lung|lobe of|diaphragm/i, distance: 0.7 },
      },
      {
        title: { en: "Three lobes right, two left", bn: "ডানে তিন, বামে দুই খণ্ড" },
        organ: { en: "Lung lobes", bn: "ফুসফুসের খণ্ড" },
        text: {
          en: "The right lung has three lobes (upper, middle, lower) and the left lung only two (upper, lower) because the heart takes up room on the left. Each lobe is supplied by its own branch of the bronchus, so surgeons can remove one lobe and leave the rest working.",
          bn: "ডান ফুসফুসে তিনটি খণ্ড (উপরের, মাঝের, নিচের), বাম ফুসফুসে দুটি (উপরের, নিচের) — কারণ বাঁ দিকে হৃৎপিণ্ড জায়গা নেয়। প্রতিটি খণ্ড ব্রঙ্কাসের নিজস্ব শাখা থেকে বাতাস পায়, তাই সার্জন একটি খণ্ড বাদ দিয়ে বাকিটা চালু রাখতে পারেন।",
        },
        facts: [
          { en: "Lung surface ≈ 70 m²", bn: "ফুসফুসের তল ≈ ৭০ বর্গমিটার" },
          { en: "Right lung is the bigger one", bn: "ডান ফুসফুস বড়" },
        ],
        highlight: /lobe of/i,
        focus: { match: /lung|lobe of/i, distance: 0.8 },
        emphasis: { lung: 1.6 },
      },
      {
        title: { en: "The brainstem sets the pace", bn: "ব্রেনস্টেম গতি ঠিক করে" },
        organ: { en: "Medulla oblongata and pons", bn: "মেডুলা অবলংগেটা ও পনস" },
        text: {
          en: "Breathing is automatic. Sensors in the neck arteries and the brainstem measure carbon dioxide and acidity in the blood. When CO₂ rises, the respiratory centre in the medulla oblongata speeds up the diaphragm and rib muscles; when it falls, breathing slows. You can hold your breath for a while, but CO₂ build-up eventually forces the next breath.",
          bn: "শ্বাস নেওয়া স্বয়ংক্রিয়। ঘাড়ের ধমনী ও ব্রেনস্টেমের সেন্সর রক্তে কার্বন ডাই-অক্সাইড ও অ্যাসিডের মাত্রা মাপে। CO₂ বাড়লে মেডুলা অবলংগেটার শ্বাস-কেন্দ্র মধ্যচ্ছদা ও পাঁজরের পেশীকে দ্রুত চালায়; কমলে শ্বাস ধীর হয়। কিছুক্ষণ দম ধরে রাখা যায়, কিন্তু CO₂ জমে শেষে পরের শ্বাস নিতেই হয়।",
        },
        facts: [
          { en: "CO₂ is the main trigger", bn: "প্রধান সংকেত CO₂" },
          { en: "Centre: medulla + pons", bn: "কেন্দ্র: মেডুলা + পনস" },
        ],
        highlight: /medulla|pons|midbrain/i,
        focus: { match: /medulla|pons/i, distance: 0.3 },
        show: ["nervous"],
      },
      {
        title: { en: "Air to the lungs: filter and warm", bn: "বাতাস ফুসফুসে: ছাঁকা ও গরম" },
        organ: { en: "Trachea and bronchi", bn: "শ্বাসনালী ও ব্রঙ্কাই" },
        text: {
          en: "The trachea is held open by C-shaped rings of cartilage. Its lining is covered in mucus and tiny hairs (cilia) that trap dust and germs and sweep them upwards, where you swallow or cough them out. The air is warmed to body temperature and humidified before it reaches the delicate alveoli.",
          bn: "শ্বাসনালী C-আকৃতির তরুণাস্থির বলয়ে খোলা থাকে। ভেতরের স্তর শ্লেষ্মা ও ক্ষুদ্র রোমে (সিলিয়া) ঢাকা — তারা ধুলো ও জীবাণু আটকে উপরে ঠেলে দেয়, সেখানে গিলে ফেলা হয় বা কাশির সাথে বের হয়। কোমল অ্যালভিওলাইতে পৌঁছানোর আগে বাতাস শরীরের তাপমাত্রায় গরম ও আর্দ্র হয়।",
        },
        facts: [
          { en: "Trachea ≈ 11 cm long", bn: "শ্বাসনালী ≈ ১১ সেমি" },
          { en: "≈ 16–20 C-shaped rings", bn: "≈ ১৬–২০টি C-বলয়" },
        ],
        highlight: /trachea|bronch/i,
        focus: { match: /trachea|bronch/i, distance: 0.38 },
        emphasis: { airway: 1.8, lung: 0.4 },
      },
    ],
  },
  {
    id: "digestion",
    icon: "🍽️",
    name: { en: "Food journey", bn: "খাবারের যাত্রা" },
    summary: {
      en: "Follow a meal from the mouth to the toilet. Glowing particles are the food itself: watch it being chewed, swallowed, churned in the stomach, digested and absorbed in the small intestine, dried in the large intestine and finally leaving the body.",
      bn: "একটি খাবারের মুখ থেকে মলত্যাগ পর্যন্ত পুরো যাত্রা অনুসরণ করুন। জ্বলজ্বলে কণাগুলোই খাবার: চিবানো, গেলা, পাকস্থলীতে মন্থন, ক্ষুদ্রান্ত্রে হজম ও শোষণ, বৃহদন্ত্রে পানি শোষণ এবং শেষে শরীর থেকে বেরিয়ে যাওয়া — সবই দেখুন।",
    },
    keep: ["digestive", "cardiovascular"],
    dim: ["cardiovascular"],
    flows: [
      { role: "gi", color: "#ffae2b", origin: "mouth", dir: 1, strength: 1.6, speed: 1.4, freq: 5, scale: 0.4 },
      { role: "liver", color: "#ff8a3d", origin: "liver", dir: 1, strength: 0.7, speed: 1.2, freq: 18 },
      { role: "vein", color: "#e8c64a", origin: "liver", dir: 1, strength: 0.0, speed: 2, freq: 25 },
    ],
    steps: [
      {
        title: { en: "The big picture", bn: "পুরো যাত্রার ছবি" },
        organ: { en: "Digestive tract", bn: "পরিপাকনালী" },
        text: {
          en: "The digestive tract is one continuous tube about 9 metres long. Food enters at the mouth, is broken down into molecules small enough to cross the gut wall, and whatever cannot be used leaves through the anus. The whole trip takes 1–3 days.",
          bn: "পরিপাকনালী প্রায় ৯ মিটার লম্বা একটানা নালী। খাবার মুখ দিয়ে ঢোকে, ছোট ছোট অণুতে ভাঙে যাতে অন্ত্রের দেয়াল পার হতে পারে, আর যা কাজে লাগে না তা পায়ু দিয়ে বেরিয়ে যায়। পুরো যাত্রায় লাগে ১–৩ দিন।",
        },
        facts: [
          { en: "Length ≈ 9 m", bn: "দৈর্ঘ্য ≈ ৯ মিটার" },
          { en: "Transit time 24–72 h", bn: "সময় ২৪–৭২ ঘণ্টা" },
        ],
        highlight: /^stomach$|^colon$|^esophagus$|^ileum$|^jejunum$|^duodenum$|^rectum$|^liver$/i,
        focus: { match: /^stomach$|^colon$|^esophagus$|^rectum$/i, distance: 1.1 },
        trains: [{ path: "gi", from: "mouth", to: "anus", colors: ["#ffb347", "#e0b84a", "#c9a24a", "#8a5a2a", "#5b3a1c"], count: 26, size: 0.0042, period: 11 }],
      },
      {
        title: { en: "1. Mouth: chewing and saliva", bn: "১. মুখ: চিবানো ও লালা" },
        organ: { en: "Mouth, teeth, salivary glands", bn: "মুখ, দাঁত, লালাগ্রন্থি" },
        text: {
          en: "Teeth cut and grind the food into small pieces. Salivary glands add saliva, which moistens the food and contains the enzyme amylase that starts breaking starch into sugar. The tongue rolls the soft ball of food — the bolus — to the back of the throat.",
          bn: "দাঁত খাবার কেটে ও পিষে ছোট টুকরো করে। লালাগ্রন্থি লালা মেশায় — এটি খাবার ভিজিয়ে দেয় এবং এতে থাকা অ্যামাইলেজ এনজাইম শর্করাকে ভাঙতে শুরু করে। জিভ নরম দলাটিকে (বোলাস) গলার পেছনে ঠেলে দেয়।",
        },
        facts: [
          { en: "Saliva ≈ 1–1.5 L a day", bn: "দিনে লালা ≈ ১–১.৫ লিটার" },
          { en: "Chew ≈ 20–30 times", bn: "২০–৩০ বার চিবানো" },
        ],
        highlight: /tooth|teeth|tongue|gingiva|salivary|parotid|submandibular/i,
        focus: { match: /tooth|teeth|gingiva/i, distance: 0.28 },
        trains: [{ path: "gi", from: "mouth", to: "throat", colors: ["#ffb347"], count: 10, size: 0.0035, period: 3.2 }],
      },
      {
        title: { en: "2. Swallowing: down the oesophagus", bn: "২. গেলা: অন্ননালী দিয়ে নিচে" },
        organ: { en: "Pharynx and oesophagus", bn: "গলবিল ও অন্ননালী" },
        text: {
          en: "Swallowing starts voluntarily and then becomes a reflex: the epiglottis covers the windpipe so food does not go the wrong way, and waves of muscle contraction (peristalsis) squeeze the bolus down the oesophagus. It reaches the stomach through a ring-shaped valve, the lower oesophageal sphincter.",
          bn: "গেলা শুরু হয় ইচ্ছায়, তারপর হয় প্রতিবর্ত ক্রিয়া: এপিগ্লটিস শ্বাসনালী ঢেকে দেয় যাতে খাবার ভুল পথে না যায়, আর পেশীর সংকোচনের ঢেউ (পেরিস্টালসিস) দলাটিকে অন্ননালী দিয়ে নিচে ঠেলে। নিচের অন্ননালী স্ফিংটার নামের বলয়-ভালভ দিয়ে খাবার পাকস্থলীতে ঢোকে।",
        },
        facts: [
          { en: "Length ≈ 25 cm", bn: "দৈর্ঘ্য ≈ ২৫ সেমি" },
          { en: "Takes ≈ 5–8 seconds", bn: "সময় ≈ ৫–৮ সেকেন্ড" },
        ],
        highlight: /esophagus/i,
        focus: { match: /esophagus/i, distance: 0.62 },
        trains: [{ path: "gi", from: "throat", to: "cardia", colors: ["#ffb347"], count: 6, size: 0.0038, period: 4.5 }],
      },
      {
        title: { en: "3. Stomach: churning in acid", bn: "৩. পাকস্থলী: অ্যাসিডে মন্থন" },
        organ: { en: "Stomach", bn: "পাকস্থলী" },
        text: {
          en: "The stomach wall squeezes and churns the food with hydrochloric acid and the enzyme pepsin, which begins digesting protein. A layer of mucus protects the wall from its own acid. After 2–4 hours the food has become a thick, creamy liquid called chyme.",
          bn: "পাকস্থলীর দেয়াল চেপে ও মন্থন করে খাবারকে হাইড্রোক্লোরিক অ্যাসিড ও পেপসিন এনজাইমের সাথে মেশায় — পেপসিন প্রোটিন ভাঙতে শুরু করে। শ্লেষ্মার স্তর পাকস্থলীর দেয়ালকে তার নিজের অ্যাসিড থেকে বাঁচায়। ২–৪ ঘণ্টায় খাবার ঘন, ক্রিমের মতো তরল কাইমে পরিণত হয়।",
        },
        facts: [
          { en: "Holds ≈ 1–1.5 L", bn: "ধারণক্ষমতা ≈ ১–১.৫ লিটার" },
          { en: "Acid pH ≈ 1.5–3.5", bn: "অ্যাসিড pH ≈ ১.৫–৩.৫" },
          { en: "2–4 hours", bn: "২–৪ ঘণ্টা" },
        ],
        highlight: /^stomach$/i,
        focus: { match: /^stomach$/i, distance: 0.34 },
        swell: { match: /^stomach$/i, mode: "churn", amount: 0.06 },
        trains: [{ path: "gi", from: "cardia", to: "pylorus", colors: ["#e8c04a", "#d8c25a"], count: 16, size: 0.0042, period: 7 }],
      },
      {
        title: { en: "4. Bile and pancreatic juice join in", bn: "৪. পিত্ত ও অগ্ন্যাশয়ের রস যোগ হয়" },
        organ: { en: "Duodenum, liver, gallbladder, pancreas", bn: "ডিওডেনাম, যকৃৎ, পিত্তথলি, অগ্ন্যাশয়" },
        text: {
          en: "Small spurts of chyme pass the pylorus into the duodenum. Here the liver's bile (stored in the gallbladder) breaks fat into tiny droplets, and the pancreas adds enzymes for protein, fat and starch plus bicarbonate to neutralise the stomach acid.",
          bn: "অল্প অল্প করে কাইম পাইলোরাস পেরিয়ে ডিওডেনামে যায়। এখানে যকৃতের পিত্ত (পিত্তথলিতে জমা থাকে) চর্বিকে ছোট ফোঁটায় ভাঙে, আর অগ্ন্যাশয় প্রোটিন, চর্বি ও শর্করার এনজাইম এবং পাকস্থলীর অ্যাসিড নিষ্ক্রিয় করার বাইকার্বোনেট যোগ করে।",
        },
        facts: [
          { en: "Bile ≈ 0.5–1 L a day", bn: "পিত্ত ≈ দিনে ০.৫–১ লিটার" },
          { en: "Duodenum ≈ 25 cm", bn: "ডিওডেনাম ≈ ২৫ সেমি" },
        ],
        highlight: /^liver$|gallbladder|pancrea|^duodenum$/i,
        focus: { match: /^duodenum$|^pancreas$|^gallbladder$/i, distance: 0.42 },
        trains: [
          { path: "gi", from: "pylorus", to: "duodenum", colors: ["#e0c24a"], count: 8, size: 0.0036, period: 4 },
          { path: "bile", from: "liver", to: "duodenum", colors: ["#6fd04a", "#a8e04a"], count: 8, size: 0.0028, period: 4 },
          { path: "pancreas", from: "pancreas", to: "duodenum", colors: ["#fff1a8"], count: 6, size: 0.0026, period: 3 },
        ],
      },
      {
        title: { en: "5. Small intestine: digestion finishes", bn: "৫. ক্ষুদ্রান্ত্র: হজম শেষ হয়" },
        organ: { en: "Jejunum and ileum", bn: "জেজুনাম ও ইলিয়াম" },
        text: {
          en: "Over about 6 metres of coiled tube, segmenting and peristaltic movements mix the chyme and move it along. Enzymes in the gut wall finish the job: carbohydrates become simple sugars, proteins become amino acids and fats become fatty acids.",
          bn: "প্রায় ৬ মিটার প্যাঁচানো নালীতে বিভাজন ও পেরিস্টালসিস চলনে কাইম মিশে এগিয়ে যায়। অন্ত্রের দেয়ালের এনজাইম কাজ শেষ করে: শর্করা হয় সরল চিনি, প্রোটিন হয় অ্যামিনো অ্যাসিড, আর চর্বি হয় ফ্যাটি অ্যাসিড।",
        },
        facts: [
          { en: "Length ≈ 6 m", bn: "দৈর্ঘ্য ≈ ৬ মিটার" },
          { en: "3–5 hours", bn: "৩–৫ ঘণ্টা" },
          { en: "≈ 90% of absorption", bn: "প্রায় ৯০% শোষণ এখানে" },
        ],
        highlight: /^jejunum$|^ileum$/i,
        focus: { match: /^jejunum$|^ileum$/i, distance: 0.46 },
        trains: [{ path: "gi", from: "duodenum", to: "ileum", colors: ["#d8c25a", "#c9a24a"], count: 22, size: 0.0036, period: 9 }],
      },
      {
        title: { en: "6. Absorption: nutrients enter the blood", bn: "৬. শোষণ: পুষ্টি রক্তে ঢোকে" },
        organ: { en: "Villi, mesenteric veins, liver", bn: "ভিলাই, মেসেন্টেরিক শিরা, যকৃৎ" },
        text: {
          en: "The inner wall is covered in millions of finger-like villi, giving a huge absorbing surface. Sugars and amino acids pass into tiny blood vessels and travel in the mesenteric veins and the portal vein to the liver, which stores, converts and filters them before they reach the rest of the body. Fats are carried by the lymph.",
          bn: "ভেতরের দেয়াল লক্ষ লক্ষ আঙুলের মতো ভিলাইয়ে ঢাকা, ফলে শোষণের তল অনেক বড়। চিনি ও অ্যামিনো অ্যাসিড ছোট রক্তনালীতে ঢুকে মেসেন্টেরিক শিরা ও পোর্টাল শিরা দিয়ে যকৃতে যায় — যকৃৎ সেগুলো জমা রাখে, রূপান্তর করে ও ছাঁকে, তারপর শরীরের বাকি অংশে পাঠায়। চর্বি যায় লসিকা দিয়ে।",
        },
        facts: [
          { en: "Surface ≈ 30 m²", bn: "শোষণ-তল ≈ ৩০ বর্গমিটার" },
          { en: "Blood → liver first", bn: "রক্ত আগে যকৃতে যায়" },
        ],
        highlight: /^liver$|superior mesenteric vein|^jejunum$|^ileum$/i,
        focus: { match: /^liver$|^ileum$|^jejunum$/i, distance: 0.7 },
        only: ["liver", "heart"],
        trains: [{ path: "portal", from: "gut", to: "liver", colors: ["#5ee08a", "#c8f06a", "#ffe066"], count: 14, size: 0.0032, period: 5 }],
      },
      {
        title: { en: "7. Large intestine: water is reclaimed", bn: "৭. বৃহদন্ত্র: পানি ফিরে নেওয়া হয়" },
        organ: { en: "Caecum and colon", bn: "সিকাম ও কোলন" },
        text: {
          en: "What is left — fibre, dead cells and water — enters the caecum and climbs the ascending colon, crosses the transverse colon and descends on the left. The colon reabsorbs water and salts, and friendly bacteria ferment fibre and make vitamin K. The contents slowly become firm stool.",
          bn: "যা বাকি থাকে — আঁশ, মৃত কোষ ও পানি — তা সিকামে ঢুকে ঊর্ধ্বগামী কোলন বেয়ে ওঠে, আড়াআড়ি কোলন পেরিয়ে বাম দিকে নেমে আসে। কোলন পানি ও লবণ ফিরে শোষণ করে, উপকারী ব্যাকটেরিয়া আঁশ গাঁজায় ও ভিটামিন K তৈরি করে। ধীরে ধীরে বর্জ্য শক্ত মলে পরিণত হয়।",
        },
        facts: [
          { en: "Length ≈ 1.5 m", bn: "দৈর্ঘ্য ≈ ১.৫ মিটার" },
          { en: "12–36 hours", bn: "১২–৩৬ ঘণ্টা" },
          { en: "Stool ≈ 75% water", bn: "মলের ≈ ৭৫% পানি" },
        ],
        highlight: /^colon$|appendix|taenia/i,
        focus: { match: /^colon$/i, distance: 0.62 },
        trains: [{ path: "gi", from: "cecum", to: "sigmoid", colors: ["#a8803a", "#7a5226"], count: 18, size: 0.0044, period: 9 }],
      },
      {
        title: { en: "8. Rectum: storage and the urge", bn: "৮. মলাশয়: জমা ও বেগ" },
        organ: { en: "Sigmoid colon and rectum", bn: "সিগময়েড কোলন ও মলাশয়" },
        text: {
          en: "The sigmoid colon pushes stool into the rectum. When the rectum stretches, its stretch receptors send a signal to the brain and you feel the urge to go. The internal anal sphincter relaxes automatically, but the external sphincter is under your control, so you can wait.",
          bn: "সিগময়েড কোলন মলকে মলাশয়ে ঠেলে দেয়। মলাশয় প্রসারিত হলে এর স্ট্রেচ রিসেপ্টর মস্তিষ্কে সংকেত পাঠায় এবং আপনি বেগ অনুভব করেন। ভেতরের স্ফিংটার নিজে থেকে শিথিল হয়, কিন্তু বাইরের স্ফিংটার আপনার নিয়ন্ত্রণে — তাই অপেক্ষা করা যায়।",
        },
        facts: [
          { en: "Rectum ≈ 12–15 cm", bn: "মলাশয় ≈ ১২–১৫ সেমি" },
          { en: "Urge at ≈ 200 mL", bn: "বেগ আসে ≈ ২০০ মিলিতে" },
        ],
        highlight: /^rectum$|anal sphincter|sigmoid/i,
        focus: { match: /^rectum$|anal sphincter/i, distance: 0.34 },
        swell: { match: /rectum/i, mode: "fill", amount: 0.1 },
        trains: [{ path: "gi", from: "sigmoid", to: "rectum", colors: ["#6b4524"], count: 9, size: 0.0046, period: 6 }],
      },
      {
        title: { en: "9. Defecation: leaving the body", bn: "৯. মলত্যাগ: শরীর থেকে বের হওয়া" },
        organ: { en: "Anal canal and sphincters", bn: "পায়ুপথ ও স্ফিংটার" },
        text: {
          en: "When you choose to go, the pelvic floor muscles and external anal sphincter relax, the rectum contracts and the abdominal muscles help to push. The stool passes through the anal canal and leaves the body. The meal's journey is complete — 1 to 3 days after the first bite.",
          bn: "আপনি যখন যেতে চান, তখন শ্রোণীতলের পেশী ও বাইরের পায়ু স্ফিংটার শিথিল হয়, মলাশয় সংকুচিত হয় এবং পেটের পেশী ঠেলতে সাহায্য করে। মল পায়ুপথ দিয়ে শরীর থেকে বেরিয়ে যায়। খাবারের যাত্রা শেষ — প্রথম কামড়ের ১ থেকে ৩ দিন পর।",
        },
        facts: [
          { en: "Anal canal ≈ 4 cm", bn: "পায়ুপথ ≈ ৪ সেমি" },
          { en: "Voluntary control", bn: "ইচ্ছাধীন নিয়ন্ত্রণ" },
        ],
        highlight: /^rectum$|anal sphincter/i,
        focus: { match: /^rectum$|anal sphincter/i, distance: 0.3 },
        swell: { match: /rectum/i, mode: "squeeze", amount: 0.12 },
        trains: [{ path: "gi", from: "rectum", to: "anus", colors: ["#5b3a1c"], count: 8, size: 0.0048, period: 4 }],
      },
    ],
  },
  {
    id: "excretion",
    icon: "💧",
    name: { en: "Blood cleaning & urine", bn: "রক্ত পরিষ্কার ও প্রস্রাব" },
    summary: {
      en: "The kidneys clean the blood. Red particles are dirty blood arriving through the renal arteries, blue particles are cleaned blood going back to the heart through the renal veins, and yellow particles are urine on its way to the bladder and out of the body.",
      bn: "বৃক্ক (কিডনি) রক্ত পরিষ্কার করে। লাল কণা = রেনাল ধমনী দিয়ে আসা অপরিষ্কার রক্ত, নীল কণা = রেনাল শিরা দিয়ে হৃৎপিণ্ডে ফেরা পরিষ্কার রক্ত, আর হলুদ কণা = প্রস্রাব, যা মূত্রথলি হয়ে শরীরের বাইরে যায়।",
    },
    keep: ["urinary", "cardiovascular"],
    dim: ["cardiovascular"],
    flows: [
      { role: "artery", color: RED, origin: "heart", dir: 1, strength: 1.2, speed: 8, freq: 22 },
      { role: "vein", color: BLUE, origin: "heart", dir: -1, strength: 1.2, speed: 5, freq: 22 },
      { role: "kidney", color: "#ffcf5a", origin: "kidney", dir: 1, strength: 1.2, speed: 2.2, freq: 36 },
      { role: "urine", color: "#ffe14d", origin: "kidney", dir: 1, strength: 2.2, speed: 1.4, freq: 40 },
      { role: "liver", color: "#8fe05a", origin: "liver", dir: 1, strength: 1.0, speed: 1.6, freq: 18 },
    ],
    steps: [
      {
        title: { en: "1. Blood arrives at the kidneys", bn: "১. রক্ত বৃক্কে পৌঁছায়" },
        organ: { en: "Renal arteries and kidneys", bn: "রেনাল ধমনী ও বৃক্ক" },
        text: {
          en: "The two kidneys sit against the back wall of the abdomen, just under the ribs. Each receives blood straight from the aorta through a renal artery. Although the kidneys are only 0.5% of body weight, they receive about a fifth of all the blood the heart pumps.",
          bn: "দুটি বৃক্ক পেটের পেছনের দেয়ালে, পাঁজরের ঠিক নিচে থাকে। প্রতিটি বৃক্ক মহাধমনী থেকে সরাসরি রেনাল ধমনী দিয়ে রক্ত পায়। দেহের ওজনের মাত্র ০.৫% হলেও হৃৎপিণ্ড যত রক্ত পাম্প করে তার প্রায় এক-পঞ্চমাংশ বৃক্ক পায়।",
        },
        facts: [
          { en: "≈ 1.2 L of blood a minute", bn: "মিনিটে ≈ ১.২ লিটার রক্ত" },
          { en: "Whole blood cleaned every ~5 min", bn: "প্রায় ৫ মিনিটে সব রক্ত একবার ছাঁকা" },
        ],
        highlight: /kidney|renal artery|aorta/i,
        focus: { match: /kidney|renal/i, distance: 0.7 },
        only: ["artery"],
        trains: [
          { path: "renalInR", from: "aorta", to: "kidney", colors: ["#ff3030"], count: 12, size: 0.0028, period: 3.2 },
          { path: "renalInL", from: "aorta", to: "kidney", colors: ["#ff3030"], count: 12, size: 0.0028, period: 3.2 },
        ],
      },
      {
        title: { en: "2. Filtering inside the kidney", bn: "২. বৃক্কের ভেতরে ছাঁকা" },
        organ: { en: "Nephrons (glomeruli and tubules)", bn: "নেফ্রন (গ্লোমেরুলাস ও নালিকা)" },
        text: {
          en: "Each kidney holds about a million tiny filters called nephrons. In the glomerulus, water, salts, sugar and waste such as urea are pushed out of the blood. The tubules then take back everything the body needs, and the leftover waste and extra water become urine.",
          bn: "প্রতিটি বৃক্কে প্রায় ১০ লক্ষ ক্ষুদ্র ছাঁকনি থাকে — নেফ্রন। গ্লোমেরুলাসে পানি, লবণ, চিনি ও ইউরিয়ার মতো বর্জ্য রক্ত থেকে বেরিয়ে আসে। এরপর নালিকা শরীরের প্রয়োজনীয় সব কিছু ফিরিয়ে নেয়, আর বাকি বর্জ্য ও বাড়তি পানি প্রস্রাব হয়।",
        },
        facts: [
          { en: "≈ 180 L filtered a day", bn: "দিনে ≈ ১৮০ লিটার ছাঁকা" },
          { en: "Only ≈ 1.5 L becomes urine", bn: "প্রস্রাব হয় মাত্র ≈ ১.৫ লিটার" },
          { en: "≈ 1 million nephrons each", bn: "প্রতিটিতে ≈ ১০ লক্ষ নেফ্রন" },
        ],
        highlight: /kidney|renal|calyx|pyramid|cortex|medulla/i,
        focus: { match: /kidney/i, distance: 0.34 },
        only: ["kidney"],
        swell: { match: /kidney/i, mode: "churn", amount: 0.018 },
      },
      {
        title: { en: "3. Cleaned blood goes back", bn: "৩. পরিষ্কার রক্ত ফিরে যায়" },
        organ: { en: "Renal veins and inferior vena cava", bn: "রেনাল শিরা ও নিম্ন মহাশিরা" },
        text: {
          en: "The cleaned blood leaves each kidney through the renal vein, joins the inferior vena cava and returns to the right side of the heart, ready to be pumped round again. The kidneys also control blood pressure, balance salt and acid, and make the hormone that tells the bone marrow to produce red cells.",
          bn: "পরিষ্কার রক্ত রেনাল শিরা দিয়ে বৃক্ক ছেড়ে নিম্ন মহাশিরায় মিশে হৃৎপিণ্ডের ডান দিকে ফেরে, আবার সারা শরীরে পাম্প হওয়ার জন্য। বৃক্ক রক্তচাপ নিয়ন্ত্রণ করে, লবণ ও অ্যাসিডের ভারসাম্য রাখে এবং অস্থিমজ্জাকে লোহিত কণিকা তৈরির সংকেত দেওয়া হরমোনও বানায়।",
        },
        facts: [
          { en: "Controls blood pressure", bn: "রক্তচাপ নিয়ন্ত্রণ" },
          { en: "Makes erythropoietin", bn: "ইরিথ্রোপোয়েটিন তৈরি" },
        ],
        highlight: /renal vein|vena cava|kidney/i,
        focus: { match: /kidney|renal|vena cava/i, distance: 0.85 },
        only: ["vein"],
        dir: { vein: -1 },
        trains: [
          { path: "renalOutR", from: "kidney", to: "heart", colors: ["#4d8bff", "#6aa0ff"], count: 14, size: 0.0028, period: 5 },
          { path: "renalOutL", from: "kidney", to: "heart", colors: ["#4d8bff", "#6aa0ff"], count: 14, size: 0.0028, period: 5 },
        ],
      },
      {
        title: { en: "4. Urine flows down the ureters", bn: "৪. প্রস্রাব ইউরেটার দিয়ে নামে" },
        organ: { en: "Renal pelvis and ureters", bn: "রেনাল পেলভিস ও ইউরেটার" },
        text: {
          en: "Urine collects in the renal pelvis and is carried down a 25-cm muscular tube, the ureter, by waves of peristalsis — not just gravity — so it flows even when you lie down or stand on your head. One drop arrives every few seconds.",
          bn: "প্রস্রাব রেনাল পেলভিসে জমে ২৫ সেমি লম্বা পেশীবহুল নালী ইউরেটার দিয়ে পেরিস্টালসিসের ঢেউয়ে নামে — শুধু অভিকর্ষে নয় — তাই শুয়ে থাকলে বা উল্টো হয়ে থাকলেও প্রস্রাব নামে। কয়েক সেকেন্ড পরপর এক ফোঁটা করে মূত্রথলিতে পৌঁছায়।",
        },
        facts: [
          { en: "Ureter ≈ 25 cm", bn: "ইউরেটার ≈ ২৫ সেমি" },
          { en: "Peristaltic waves", bn: "পেরিস্টালটিক ঢেউ" },
        ],
        highlight: /ureter|renal pelvis|calyx/i,
        focus: { match: /ureter/i, distance: 0.62 },
        only: ["urine"],
        trains: [
          { path: "urineR", from: "kidney", to: "bladder", colors: ["#ffe14d", "#ffd23a"], count: 14, size: 0.0026, period: 6 },
          { path: "urineL", from: "kidney", to: "bladder", colors: ["#ffe14d", "#ffd23a"], count: 14, size: 0.0026, period: 6 },
        ],
      },
      {
        title: { en: "5. The bladder fills", bn: "৫. মূত্রথলি ভরে ওঠে" },
        organ: { en: "Urinary bladder", bn: "মূত্রথলি" },
        text: {
          en: "The bladder is a stretchy muscular bag that stores urine. As it fills, its wall relaxes and expands with little rise in pressure. At about 200–300 mL stretch receptors tell the brain you will soon need to go; the bladder can hold up to 500 mL or more.",
          bn: "মূত্রথলি প্রসারণশীল পেশীবহুল থলি, যা প্রস্রাব জমা রাখে। ভরার সাথে সাথে দেয়াল শিথিল হয়ে চাপ প্রায় না বাড়িয়েই প্রসারিত হয়। প্রায় ২০০–৩০০ মিলিতে স্ট্রেচ রিসেপ্টর মস্তিষ্ককে জানায় শীঘ্রই যেতে হবে; থলি ৫০০ মিলি বা তার বেশিও ধরতে পারে।",
        },
        facts: [
          { en: "Capacity ≈ 400–600 mL", bn: "ধারণক্ষমতা ≈ ৪০০–৬০০ মিলি" },
          { en: "Urge at ≈ 200–300 mL", bn: "বেগ ≈ ২০০–৩০০ মিলিতে" },
        ],
        highlight: /urinary bladder/i,
        focus: { match: /urinary bladder/i, distance: 0.3 },
        only: ["urine"],
        swell: { match: /urinary bladder|fundus of urinary bladder/i, mode: "fill", amount: 0.22 },
        trains: [
          { path: "urineR", from: "ureter", to: "bladder", colors: ["#ffe14d"], count: 6, size: 0.0026, period: 5 },
          { path: "urineL", from: "ureter", to: "bladder", colors: ["#ffe14d"], count: 6, size: 0.0026, period: 5 },
        ],
      },
      {
        title: { en: "6. Urination", bn: "৬. প্রস্রাব করা" },
        organ: { en: "Bladder and urethra", bn: "মূত্রথলি ও মূত্রনালী" },
        text: {
          en: "When you decide to go, the brain tells the bladder muscle to contract and the sphincters to relax. Urine is squeezed out through the urethra, a tube about 20 cm long in men and 4 cm in women, and the bladder empties in less than a minute.",
          bn: "যখন যেতে চান, মস্তিষ্ক মূত্রথলির পেশীকে সংকুচিত হতে এবং স্ফিংটারকে শিথিল হতে বলে। প্রস্রাব মূত্রনালী দিয়ে বেরিয়ে যায় — পুরুষে প্রায় ২০ সেমি, নারীতে প্রায় ৪ সেমি লম্বা — আর থলি এক মিনিটেরও কম সময়ে খালি হয়।",
        },
        facts: [
          { en: "Urethra: ♂ 20 cm · ♀ 4 cm", bn: "মূত্রনালী: ♂ ২০ সেমি · ♀ ৪ সেমি" },
          { en: "≈ 6–8 times a day", bn: "দিনে ≈ ৬–৮ বার" },
        ],
        highlight: /urinary bladder|urethra/i,
        focus: { match: /urinary bladder|urethra/i, distance: 0.42 },
        only: ["urine"],
        swell: { match: /urinary bladder|fundus of urinary bladder/i, mode: "squeeze", amount: 0.2 },
        trains: [{ path: "urineR", from: "bladder", to: "exit", colors: ["#ffe14d"], count: 14, size: 0.003, period: 4 }],
      },
      {
        title: { en: "7. The liver: another cleaner", bn: "৭. যকৃৎ: আরেকটি পরিষ্কারক" },
        organ: { en: "Liver", bn: "যকৃৎ" },
        text: {
          en: "The liver cleans blood too. It breaks down alcohol, drugs and toxins, turns poisonous ammonia into urea (which the kidneys remove), and sends waste out in bile into the gut. The lungs breathe out carbon dioxide and the skin loses salt and water as sweat — together they keep the blood clean.",
          bn: "যকৃৎও রক্ত পরিষ্কার করে। এটি অ্যালকোহল, ওষুধ ও বিষাক্ত পদার্থ ভাঙে, বিষাক্ত অ্যামোনিয়াকে ইউরিয়ায় রূপান্তর করে (যা বৃক্ক সরায়) এবং বর্জ্য পিত্তের সাথে অন্ত্রে পাঠায়। ফুসফুস কার্বন ডাই-অক্সাইড ছাড়ে, চামড়া ঘামের সাথে লবণ ও পানি ছাড়ে — সব মিলিয়ে রক্ত পরিষ্কার থাকে।",
        },
        facts: [
          { en: "≈ 1.5 L of blood a minute", bn: "মিনিটে ≈ ১.৫ লিটার রক্ত" },
          { en: "Makes urea and bile", bn: "ইউরিয়া ও পিত্ত তৈরি" },
        ],
        highlight: /^liver$|^gallbladder$/i,
        focus: { match: /^liver$/i, distance: 0.6 },
        only: ["liver"],
        show: ["digestive"],
        trains: [{ path: "bile", from: "liver", to: "duodenum", colors: ["#6fd04a", "#a8e04a"], count: 8, size: 0.0028, period: 4 }],
      },
    ],
  },
  {
    id: "nervous",
    icon: "⚡",
    name: { en: "Nerve signals", bn: "স্নায়ু সংকেত" },
    summary: {
      en: "Nerves carry electrical impulses at up to 120 m/s. A signal travels up the spinal cord to the brain, the brain decides, and an answer travels back down to the muscles (golden waves).",
      bn: "স্নায়ু সেকেন্ডে ১২০ মিটার পর্যন্ত গতিতে বৈদ্যুতিক সংকেত বহন করে। সংকেত সুষুম্নাকাণ্ড দিয়ে মস্তিষ্কে যায়, মস্তিষ্ক সিদ্ধান্ত নেয়, আর উত্তর ফিরে পেশীতে আসে (সোনালি ঢেউ)।",
    },
    keep: ["nervous"],
    flows: [
      { role: "nerve", color: "#ffd23d", origin: "brain", dir: -1, strength: 2.6, speed: 3, freq: 30 },
      { role: "brain", color: "#ffcf5a", origin: "brain", dir: 1, strength: 1.4, speed: 2, freq: 45 },
    ],
    steps: [
      {
        title: { en: "1. A sensation", bn: "১. অনুভূতি" },
        text: {
          en: "A touch on the hand excites sensory receptors in the skin. They fire impulses along a sensory nerve towards the spinal cord.",
          bn: "হাতে স্পর্শ লাগলে চামড়ার সংবেদী রিসেপ্টর উত্তেজিত হয়। তারা সংবেদী স্নায়ু দিয়ে সুষুম্নাকাণ্ডের দিকে সংকেত পাঠায়।",
        },
        focus: { match: /spinal cord/i, distance: 1.2 },
        emphasis: { brain: 0.3 },
      },
      {
        title: { en: "2. Up the spinal cord", bn: "২. সুষুম্নাকাণ্ড দিয়ে উপরে" },
        text: {
          en: "The signal enters the spinal cord and climbs to the brain. Simple reflexes (like pulling away from heat) are answered right here, before you even feel the pain.",
          bn: "সংকেত সুষুম্নাকাণ্ডে ঢুকে মস্তিষ্কে ওঠে। সাধারণ প্রতিবর্ত (যেমন গরম থেকে হাত সরানো) এখানেই উত্তর পায় — ব্যথা টের পাওয়ার আগেই।",
        },
        highlight: /spinal cord/i,
        focus: { match: /spinal cord/i, distance: 0.9 },
        emphasis: { nerve: 1.6 },
      },
      {
        title: { en: "3. The brain feels and decides", bn: "৩. মস্তিষ্ক অনুভব করে ও সিদ্ধান্ত নেয়" },
        text: {
          en: "The thalamus relays the signal to the sensory cortex (postcentral gyrus), where you become aware of the touch. The frontal lobe decides what to do.",
          bn: "থ্যালামাস সংকেতটি সংবেদী কর্টেক্সে (পোস্টসেন্ট্রাল গাইরাস) পাঠায়, সেখানে আপনি স্পর্শ টের পান। ফ্রন্টাল লোব সিদ্ধান্ত নেয় কী করবেন।",
        },
        highlight: /thalam|postcentral|frontal|precentral/i,
        focus: { match: /gyrus|thalam|cerebr|cortex/i, distance: 0.35 },
        emphasis: { brain: 2 },
      },
      {
        title: { en: "4. A command goes back", bn: "৪. আদেশ ফিরে যায়" },
        text: {
          en: "The motor cortex (precentral gyrus) sends a command down the spinal cord and out along a motor nerve. The muscle contracts and the hand moves — all in a fraction of a second.",
          bn: "মোটর কর্টেক্স (প্রিসেন্ট্রাল গাইরাস) সুষুম্নাকাণ্ড দিয়ে নিচে আর মোটর স্নায়ু দিয়ে বাইরে আদেশ পাঠায়। পেশী সংকুচিত হয়, হাত নড়ে — সব এক সেকেন্ডেরও কম সময়ে।",
        },
        highlight: /precentral|spinal cord/i,
        focus: { match: /spinal cord/i, distance: 1.2 },
        emphasis: { nerve: 1.6 },
        facts: [
          { en: "Up to 120 m/s", bn: "সর্বোচ্চ ১২০ মি/সে." },
          { en: "≈ 86 billion neurons", bn: "≈ ৮৬ বিলিয়ন নিউরন" },
        ],
        dir: { nerve: 1 },
      },
      {
        title: { en: "Reflex arc: faster than thought", bn: "প্রতিবর্ত চাপ: চিন্তার চেয়ে দ্রুত" },
        organ: { en: "Spinal cord", bn: "সুষুম্নাকাণ্ড" },
        text: {
          en: "In a reflex (a pinprick, a hot pan) the sensory nerve connects to a motor nerve right inside the spinal cord, through just one or two synapses. The muscle pulls the hand away before the signal reaches the brain — the reflex takes about 30–50 ms, while becoming aware of pain takes about a quarter of a second.",
          bn: "প্রতিবর্তে (সুচের খোঁচা, গরম কড়াই) সংবেদী স্নায়ু সুষুম্নাকাণ্ডের ভেতরেই এক-দুটি সাইন্যাপস দিয়ে মোটর স্নায়ুর সাথে যুক্ত হয়। সংকেত মস্তিষ্কে পৌঁছানোর আগেই পেশী হাত সরিয়ে নেয় — প্রতিবর্ত লাগে প্রায় ৩০–৫০ মিলিসেকেন্ড, আর ব্যথা টের পেতে লাগে প্রায় সিকি সেকেন্ড।",
        },
        facts: [
          { en: "Reflex ≈ 30–50 ms", bn: "প্রতিবর্ত ≈ ৩০–৫০ মিলিসেকেন্ড" },
          { en: "Brain finds out afterwards", bn: "মস্তিষ্ক জানে পরে" },
        ],
        highlight: /spinal cord|central canal/i,
        focus: { match: /spinal cord/i, distance: 0.7 },
        emphasis: { nerve: 2, brain: 0.2 },
      },
      {
        title: { en: "Autonomic control of the heart", bn: "হৃৎপিণ্ডের স্বয়ংক্রিয় নিয়ন্ত্রণ" },
        organ: { en: "Brainstem → heart", bn: "ব্রেনস্টেম → হৃৎপিণ্ড" },
        text: {
          en: "Without any conscious effort the autonomic nervous system adjusts the heart. The sympathetic fibres ('fight or flight') speed it up, the vagus nerve ('rest and digest') slows it down. In the meantime the cardiovascular centre in the medulla keeps blood pressure steady from second to second.",
          bn: "সচেতন চেষ্টা ছাড়াই স্বয়ংক্রিয় স্নায়ুতন্ত্র হৃৎপিণ্ডকে নিয়ন্ত্রণ করে। সিম্প্যাথেটিক তন্তু ('লড়ো বা পালাও') গতি বাড়ায়, ভেগাস স্নায়ু ('বিশ্রাম ও হজম') গতি কমায়। এর মধ্যে মেডুলার কার্ডিওভাসকুলার কেন্দ্র মুহূর্তে মুহূর্তে রক্তচাপ স্থির রাখে।",
        },
        facts: [
          { en: "Sympathetic ↑ · vagus ↓", bn: "সিম্প্যাথেটিক ↑ · ভেগাস ↓" },
          { en: "Not under conscious control", bn: "ইচ্ছাধীন নয়" },
        ],
        highlight: /medulla|pons/i,
        focus: { match: /medulla|heart/i, distance: 1.0 },
        emphasis: { nerve: 1.2, brain: 1.2 },
        show: ["cardiovascular"],
      },
    ],
  },
  {
    id: "brain",
    icon: "🧠",
    name: { en: "Inside the brain", bn: "মস্তিষ্কের ভেতরে" },
    summary: {
      en: "Tour the brain region by region: lobes, movement control, vision, memory and emotion, balance and the fluid cushion around it. Golden waves show activity spreading across the cortex.",
      bn: "মস্তিষ্কের এক এক অংশ ঘুরে দেখুন: লোব, নড়াচড়ার নিয়ন্ত্রণ, দৃষ্টি, স্মৃতি ও আবেগ, ভারসাম্য এবং চারপাশের তরল গদি। সোনালি ঢেউ দেখায় কর্টেক্সে কর্মকাণ্ড ছড়িয়ে পড়ছে।",
    },
    keep: ["nervous"],
    flows: [
      { role: "brain", color: "#ffcf5a", origin: "brain", dir: 1, strength: 1.8, speed: 2.2, freq: 45 },
      { role: "nerve", color: "#ffd23d", origin: "brain", dir: -1, strength: 1.4, speed: 3, freq: 30 },
    ],
    steps: [
      {
        title: { en: "The big picture", bn: "পুরো মস্তিষ্ক" },
        organ: { en: "Brain", bn: "মস্তিষ্ক" },
        text: {
          en: "The adult brain weighs about 1.4 kg and contains roughly 86 billion neurons. The large cerebrum is divided into a left and right hemisphere joined by the corpus callosum. Below and behind lie the cerebellum and the brainstem, which continues down as the spinal cord.",
          bn: "প্রাপ্তবয়স্কের মস্তিষ্কের ওজন প্রায় ১.৪ কেজি, নিউরন প্রায় ৮৬ বিলিয়ন। বড় সেরিব্রামের বাম ও ডান গোলার্ধ কর্পাস ক্যালোসাম দিয়ে যুক্ত। নিচে ও পেছনে সেরিবেলাম ও ব্রেনস্টেম, যা নিচে সুষুম্নাকাণ্ড হয়ে গেছে।",
        },
        facts: [
          { en: "≈ 1.4 kg", bn: "≈ ১.৪ কেজি" },
          { en: "Uses ≈ 20% of energy", bn: "শক্তির ≈ ২০% খরচ করে" },
        ],
        highlight: /corpus callosum|cerebellum|medulla|pons|midbrain/i,
        focus: { match: /cerebell|gyrus|corpus callosum|medulla/i, distance: 0.45 },
      },
      {
        title: { en: "Frontal lobe: planning and movement", bn: "ফ্রন্টাল লোব: পরিকল্পনা ও নড়াচড়া" },
        organ: { en: "Frontal lobe, precentral gyrus", bn: "ফ্রন্টাল লোব, প্রিসেন্ট্রাল গাইরাস" },
        text: {
          en: "The frontal lobe is the front of the brain: judgement, planning and personality live here. At its back edge the precentral gyrus (primary motor cortex) sends the commands that move every muscle. The left side of the cortex controls the right side of the body, and vice versa.",
          bn: "ফ্রন্টাল লোব মস্তিষ্কের সামনের অংশ: বিচার, পরিকল্পনা ও ব্যক্তিত্ব এখানে। পেছনের কিনারায় প্রিসেন্ট্রাল গাইরাস (প্রাইমারি মোটর কর্টেক্স) প্রতিটি পেশী নাড়ানোর আদেশ পাঠায়। কর্টেক্সের বাম দিক শরীরের ডান দিক চালায়, আর ডান দিক বাম দিক।",
        },
        facts: [
          { en: "Left brain → right body", bn: "বাম মস্তিষ্ক → ডান শরীর" },
          { en: "Matures last, ≈ age 25", bn: "সবশেষে পরিণত হয়, ≈ ২৫ বছরে" },
        ],
        highlight: /frontal gyrus|precentral|orbital gyri|short gyrus/i,
        focus: { match: /frontal gyrus|precentral|orbital gyri/i, distance: 0.3 },
        emphasis: { brain: 2.2 },
      },
      {
        title: { en: "Parietal lobe: touch and space", bn: "প্যারাইটাল লোব: স্পর্শ ও স্থান" },
        organ: { en: "Postcentral gyrus, parietal lobule", bn: "পোস্টসেন্ট্রাল গাইরাস, প্যারাইটাল লোবিউল" },
        text: {
          en: "The postcentral gyrus (primary sensory cortex) receives touch, pressure, temperature and pain from the whole body, laid out as a map. Behind it the parietal lobe combines the senses to tell you where your body is in space and helps you read, calculate and reach for things.",
          bn: "পোস্টসেন্ট্রাল গাইরাস (প্রাইমারি সেনসরি কর্টেক্স) পুরো শরীরের স্পর্শ, চাপ, তাপ ও ব্যথার সংকেত মানচিত্রের মতো সাজিয়ে নেয়। এর পেছনে প্যারাইটাল লোব ইন্দ্রিয়গুলো মিলিয়ে বোঝায় শরীর কোথায় আছে, আর পড়া, হিসাব ও হাত বাড়ানোতে সাহায্য করে।",
        },
        facts: [
          { en: "Body map: the 'homunculus'", bn: "শরীরের মানচিত্র: 'হোমানকুলাস'" },
          { en: "Hands and lips take most space", bn: "হাত ও ঠোঁট বেশি জায়গা নেয়" },
        ],
        highlight: /postcentral|parietal|supramarginal|angular/i,
        focus: { match: /postcentral|parietal|supramarginal|angular/i, distance: 0.3 },
        emphasis: { brain: 2.2 },
      },
      {
        title: { en: "Temporal lobe: hearing and language", bn: "টেম্পোরাল লোব: শোনা ও ভাষা" },
        organ: { en: "Temporal gyri, insula", bn: "টেম্পোরাল গাইরাই, ইনসুলা" },
        text: {
          en: "The superior temporal gyrus receives sound from the ears. In most people the left temporal lobe — with the angular and supramarginal gyri — is the language centre that lets you understand and form words. Lower down the fusiform gyrus recognises faces.",
          bn: "সুপিরিয়র টেম্পোরাল গাইরাস কান থেকে শব্দ গ্রহণ করে। বেশিরভাগ মানুষে বাম টেম্পোরাল লোব — অ্যাংগুলার ও সুপ্রামার্জিনাল গাইরাসসহ — ভাষার কেন্দ্র, যা শব্দ বোঝা ও বলায় সাহায্য করে। নিচের ফিউসিফর্ম গাইরাস মুখ চেনে।",
        },
        facts: [
          { en: "Language: usually left side", bn: "ভাষা: সাধারণত বাম দিকে" },
          { en: "Fusiform gyrus = faces", bn: "ফিউসিফর্ম গাইরাস = মুখ চেনা" },
        ],
        highlight: /temporal gyrus|fusiform|insula|angular|supramarginal/i,
        focus: { match: /temporal gyrus|fusiform|insula/i, distance: 0.3 },
        emphasis: { brain: 2.2 },
        show: ["other"],
      },
      {
        title: { en: "Vision: eye to occipital lobe", bn: "দৃষ্টি: চোখ থেকে অক্সিপিটাল লোব" },
        organ: { en: "Optic nerve, chiasm, geniculate body, occipital lobe", bn: "অপটিক নার্ভ, কায়াজম, জেনিকুলেট বডি, অক্সিপিটাল লোব" },
        text: {
          en: "Light is focused on the retina and converted to signals that leave each eye in the optic nerve. At the optic chiasm half of the fibres cross over; the signals travel in the optic tract to the lateral geniculate body of the thalamus and then to the occipital lobe at the very back of the head, where the picture is put together.",
          bn: "আলো রেটিনায় ফোকাস হয়ে সংকেতে বদলে প্রতিটি চোখের অপটিক নার্ভ দিয়ে বেরোয়। অপটিক কায়াজমে অর্ধেক তন্তু পার হয়ে যায়; সংকেত অপটিক ট্র্যাক্ট দিয়ে থ্যালামাসের ল্যাটারাল জেনিকুলেট বডিতে, তারপর মাথার একদম পেছনের অক্সিপিটাল লোবে যায়, যেখানে ছবি তৈরি হয়।",
        },
        facts: [
          { en: "≈ 1 million fibres per eye", bn: "প্রতি চোখে ≈ ১০ লক্ষ তন্তু" },
          { en: "Image arrives upside-down", bn: "ছবি উল্টো আসে" },
        ],
        highlight: /optic|occipital|lateral geniculate|eyeball/i,
        focus: { match: /optic|occipital|geniculate/i, distance: 0.38 },
        emphasis: { nerve: 1.8, brain: 1.6 },
        show: ["other"],
      },
      {
        title: { en: "Memory and emotion", bn: "স্মৃতি ও আবেগ" },
        organ: { en: "Hippocampus, amygdala, cingulate gyrus", bn: "হিপোক্যাম্পাস, অ্যামিগডালা, সিঙ্গুলেট গাইরাস" },
        text: {
          en: "Deep in the temporal lobe the hippocampus turns experiences into lasting memories; without it you cannot form new ones. Next to it the amygdala tags events with fear or pleasure and starts the stress response. The cingulate gyrus links emotion with attention and decision.",
          bn: "টেম্পোরাল লোবের গভীরে হিপোক্যাম্পাস অভিজ্ঞতাকে স্থায়ী স্মৃতিতে রূপ দেয়; এটি ছাড়া নতুন স্মৃতি তৈরি হয় না। পাশেই অ্যামিগডালা ঘটনায় ভয় বা আনন্দের ছাপ দেয় ও চাপের প্রতিক্রিয়া শুরু করে। সিঙ্গুলেট গাইরাস আবেগের সাথে মনোযোগ ও সিদ্ধান্ত যুক্ত করে।",
        },
        facts: [
          { en: "Hippocampus = new memories", bn: "হিপোক্যাম্পাস = নতুন স্মৃতি" },
          { en: "Amygdala = fear alarm", bn: "অ্যামিগডালা = ভয়ের অ্যালার্ম" },
        ],
        highlight: /hippocampus|amygdala|cingulate|parahippocampal|fornix|mammillary/i,
        focus: { match: /hippocampus|amygdala/i, distance: 0.26 },
        emphasis: { brain: 2.4 },
      },
      {
        title: { en: "Thalamus and basal ganglia", bn: "থ্যালামাস ও বেসাল গ্যাংলিয়া" },
        organ: { en: "Thalamus, caudate, putamen, globus pallidus", bn: "থ্যালামাস, কডেট, পুটামেন, গ্লোবাস প্যালিডাস" },
        text: {
          en: "The thalamus is the relay station: nearly every sense (except smell) passes through it on the way to the cortex. The basal ganglia — caudate, putamen and globus pallidus — fine-tune movement, starting wanted movements and suppressing unwanted ones. Damage here causes tremor or stiffness, as in Parkinson's disease.",
          bn: "থ্যালামাস রিলে স্টেশন: প্রায় সব অনুভূতি (ঘ্রাণ বাদে) কর্টেক্সে যাওয়ার পথে এর মধ্য দিয়ে যায়। বেসাল গ্যাংলিয়া — কডেট, পুটামেন ও গ্লোবাস প্যালিডাস — নড়াচড়া সূক্ষ্ম করে: দরকারি নড়াচড়া শুরু করে, অপ্রয়োজনীয়টি দমায়। এখানে ক্ষতি হলে কাঁপুনি বা শক্ত ভাব হয়, যেমন পারকিনসন রোগে।",
        },
        facts: [
          { en: "Thalamus = sensory relay", bn: "থ্যালামাস = সংবেদী রিলে" },
          { en: "Parkinson's: dopamine loss", bn: "পারকিনসন: ডোপামিন কমে যায়" },
        ],
        highlight: /thalamus|caudate|putamen|globus pallidus|internal capsule/i,
        focus: { match: /thalamus|caudate|putamen/i, distance: 0.26 },
        emphasis: { brain: 2.4 },
      },
      {
        title: { en: "Cerebellum and brainstem", bn: "সেরিবেলাম ও ব্রেনস্টেম" },
        organ: { en: "Cerebellum, pons, medulla, midbrain", bn: "সেরিবেলাম, পনস, মেডুলা, মিডব্রেন" },
        text: {
          en: "The cerebellum holds more than half of all the brain's neurons. It coordinates movements and balance so that walking, writing and catching a ball are smooth. The brainstem — midbrain, pons and medulla — controls breathing, heartbeat and consciousness and carries all signals between the brain and the body.",
          bn: "সেরিবেলামে মস্তিষ্কের অর্ধেকেরও বেশি নিউরন আছে। এটি নড়াচড়া ও ভারসাম্য সমন্বয় করে, তাই হাঁটা, লেখা বা বল ধরা মসৃণ হয়। ব্রেনস্টেম — মিডব্রেন, পনস ও মেডুলা — শ্বাস, হৃদস্পন্দন ও চেতনা নিয়ন্ত্রণ করে এবং মস্তিষ্ক ও শরীরের সব সংকেত বহন করে।",
        },
        facts: [
          { en: "Cerebellum ≈ 50% of neurons", bn: "সেরিবেলাম ≈ ৫০% নিউরন" },
          { en: "Medulla = life-support centre", bn: "মেডুলা = প্রাণধারণ কেন্দ্র" },
        ],
        highlight: /cerebellum|pons|medulla|midbrain|peduncle|colliculus/i,
        focus: { match: /cerebellum|pons|medulla/i, distance: 0.3 },
        emphasis: { brain: 2, nerve: 1.2 },
      },
      {
        title: { en: "Hypothalamus and pituitary", bn: "হাইপোথ্যালামাস ও পিটুইটারি" },
        organ: { en: "Hypothalamus, pituitary, pineal body", bn: "হাইপোথ্যালামাস, পিটুইটারি, পিনিয়াল বডি" },
        text: {
          en: "The hypothalamus, the size of an almond, is the body's thermostat and hunger, thirst and sleep controller. It commands the pituitary gland just below it — the 'master gland' — which releases hormones that tell the thyroid, adrenals, ovaries and testes what to do. The pineal body makes melatonin for the sleep–wake cycle.",
          bn: "বাদামের আকারের হাইপোথ্যালামাস শরীরের থার্মোস্ট্যাট এবং খিদে, তেষ্টা ও ঘুমের নিয়ন্ত্রক। এর ঠিক নিচের পিটুইটারি গ্রন্থিকে ('মাস্টার গ্রন্থি') এটি আদেশ দেয়; পিটুইটারি হরমোন ছেড়ে থাইরয়েড, অ্যাড্রিনাল, ডিম্বাশয় ও অণ্ডকোষকে কাজ বলে। পিনিয়াল বডি ঘুম-জাগরণ চক্রের জন্য মেলাটোনিন তৈরি করে।",
        },
        facts: [
          { en: "Pituitary ≈ pea-sized", bn: "পিটুইটারি ≈ মটরদানার সমান" },
          { en: "Controls temperature ≈ 37 °C", bn: "তাপমাত্রা নিয়ন্ত্রণ ≈ ৩৭ °সে." },
        ],
        highlight: /hypothalamus|pituitary|pineal|tuber cinereum|mammillary|optic chiasm/i,
        focus: { match: /hypothalamus|pituitary|tuber cinereum/i, distance: 0.22 },
        emphasis: { brain: 2.2 },
        show: ["other"],
      },
      {
        title: { en: "Ventricles: the fluid cushion", bn: "ভেন্ট্রিকল: তরলের গদি" },
        organ: { en: "Ventricular system and choroid plexus", bn: "ভেন্ট্রিকুলার সিস্টেম ও কোরয়েড প্লেক্সাস" },
        text: {
          en: "The brain floats in cerebrospinal fluid (CSF), which cushions it against knocks and removes waste. The choroid plexus inside the lateral ventricles makes it; it then flows through the third ventricle, the cerebral aqueduct and the fourth ventricle into the space around the brain and spinal cord, and is absorbed back into the blood. If the flow is blocked, pressure builds — hydrocephalus.",
          bn: "মস্তিষ্ক সেরিব্রোস্পাইনাল ফ্লুইডে (CSF) ভাসে — এটি আঘাত থেকে বাঁচায় ও বর্জ্য সরায়। ল্যাটারাল ভেন্ট্রিকলের ভেতরের কোরয়েড প্লেক্সাস এটি তৈরি করে; তারপর তৃতীয় ভেন্ট্রিকল, সেরিব্রাল অ্যাকোয়াডাক্ট ও চতুর্থ ভেন্ট্রিকল হয়ে মস্তিষ্ক ও সুষুম্নাকাণ্ডের চারপাশে ছড়ায় এবং রক্তে ফিরে শোষিত হয়। প্রবাহ আটকে গেলে চাপ বাড়ে — হাইড্রোসেফালাস।",
        },
        facts: [
          { en: "≈ 150 mL of CSF", bn: "≈ ১৫০ মিলি CSF" },
          { en: "Renewed ≈ 3 times a day", bn: "দিনে ≈ ৩ বার নতুন হয়" },
        ],
        highlight: /ventricle|choroid plexus|cerebral aqueduct|central canal|septum pellucidum/i,
        focus: { match: /ventricle|choroid|aqueduct/i, distance: 0.26 },
        emphasis: { brain: 1.6 },
      },
    ],
  },
  {
    id: "exercise",
    icon: "🏃",
    name: { en: "Rest vs exercise", bn: "বিশ্রাম বনাম ব্যায়াম" },
    summary: {
      en: "See how the body adapts when you move: the heart beats faster, the breathing deepens, more blood goes to the muscles. Each step sets the heart rate and breathing rate for you — then use the sliders to experiment.",
      bn: "চলাফেরা করলে শরীর কীভাবে খাপ খাওয়ায় দেখুন: হৃৎপিণ্ড দ্রুত চলে, শ্বাস গভীর হয়, পেশীতে বেশি রক্ত যায়। প্রতিটি ধাপ আপনার জন্য হৃদস্পন্দন ও শ্বাসের হার ঠিক করে দেয় — তারপর স্লাইডার দিয়ে নিজে পরীক্ষা করুন।",
    },
    keep: ["cardiovascular", "respiratory"],
    pulseDriven: true,
    flows: [
      { role: "artery", color: RED, origin: "heart", dir: 1, strength: 2.4, speed: 9, freq: 22 },
      { role: "vein", color: BLUE, origin: "heart", dir: -1, strength: 2.2, speed: 5, freq: 22 },
      { role: "pulmonaryArtery", color: BLUE, origin: "heart", dir: 1, strength: 2.0, speed: 7, freq: 60 },
      { role: "pulmonaryVein", color: RED, origin: "heart", dir: -1, strength: 2.0, speed: 7, freq: 60 },
      { role: "heart", color: "#ff3b3b", origin: "heart", dir: 1, strength: 0, speed: 0, freq: 0 },
      { role: "airway", color: "#38e1ff", origin: "airway", dir: "breath", strength: 1.6, speed: 0.6, freq: 55 },
      { role: "lung", color: "#5fd4ff", origin: "airway", dir: "breath", strength: 0.6, speed: 0.4, freq: 25 },
    ],
    steps: [
      {
        title: { en: "At rest", bn: "বিশ্রামে" },
        organ: { en: "Heart and lungs at rest", bn: "বিশ্রামে হৃৎপিণ্ড ও ফুসফুস" },
        text: {
          en: "Lying or sitting quietly the heart beats about 70 times a minute, pumping 5 litres, and you take 12–16 breaths. Muscles get only about 20% of the blood; the rest goes to the organs, brain and gut.",
          bn: "চুপচাপ শুয়ে বা বসে থাকলে হৃৎপিণ্ড মিনিটে প্রায় ৭০ বার স্পন্দিত হয়ে ৫ লিটার রক্ত পাম্প করে, আর শ্বাস নেন ১২–১৬ বার। পেশী পায় মাত্র ২০% রক্ত; বাকিটা যায় অঙ্গ, মস্তিষ্ক ও অন্ত্রে।",
        },
        facts: [
          { en: "HR ≈ 70 · RR ≈ 14", bn: "হৃদস্পন্দন ≈ ৭০ · শ্বাস ≈ ১৪" },
          { en: "Cardiac output ≈ 5 L/min", bn: "আউটপুট ≈ ৫ লি/মিনিট" },
        ],
        rates: { bpm: 70, breathRate: 14 },
        highlight: /wall of heart|lobe of/i,
        focus: { match: /heart|lung|lobe of/i, distance: 0.9 },
      },
      {
        title: { en: "Warming up: a brisk walk", bn: "গা গরম: দ্রুত হাঁটা" },
        organ: { en: "Muscle pump begins", bn: "পেশীর পাম্প শুরু" },
        text: {
          en: "The working muscles need more oxygen. Nerves speed the heart and widen the vessels to the muscles. The heart rate rises to about 100 and each beat pushes out more blood. Breathing becomes deeper as well as faster.",
          bn: "কর্মরত পেশীর বেশি অক্সিজেন দরকার। স্নায়ু হৃৎপিণ্ডকে দ্রুত করে ও পেশীর রক্তনালী প্রশস্ত করে। হৃদস্পন্দন প্রায় ১০০ হয়, প্রতি স্পন্দনে বেশি রক্ত বের হয়। শ্বাস গভীর ও দ্রুত দুটোই হয়।",
        },
        facts: [
          { en: "HR ≈ 100 · RR ≈ 20", bn: "হৃদস্পন্দন ≈ ১০০ · শ্বাস ≈ ২০" },
          { en: "Output ≈ 8 L/min", bn: "আউটপুট ≈ ৮ লি/মিনিট" },
        ],
        rates: { bpm: 100, breathRate: 20 },
        highlight: /aorta|wall of heart/i,
        focus: { match: /heart|aorta/i, distance: 1.0 },
        emphasis: { artery: 1.2 },
      },
      {
        title: { en: "Hard exercise: a sprint", bn: "কঠোর ব্যায়াম: দৌড়" },
        organ: { en: "Maximal effort", bn: "সর্বোচ্চ প্রচেষ্টা" },
        text: {
          en: "At full effort muscles can use ten times more oxygen. The heart races near 160–180 beats a minute, cardiac output climbs to 20–25 litres, and blood is diverted from the gut to the muscles. Lungs move up to 100 litres of air a minute. Notice the waves speeding up in the vessels.",
          bn: "পূর্ণ শক্তিতে পেশী দশ গুণ বেশি অক্সিজেন ব্যবহার করতে পারে। হৃৎপিণ্ড মিনিটে ১৬০–১৮০ বারের কাছাকাছি দৌড়ায়, আউটপুট ২০–২৫ লিটারে ওঠে, আর অন্ত্র থেকে রক্ত পেশীতে সরে যায়। ফুসফুস মিনিটে ১০০ লিটার পর্যন্ত বাতাস নাড়ে। রক্তনালীতে ঢেউ দ্রুত হতে দেখুন।",
        },
        facts: [
          { en: "HR ≈ 160 · RR ≈ 30", bn: "হৃদস্পন্দন ≈ ১৬০ · শ্বাস ≈ ৩০" },
          { en: "Output ≈ 20–25 L/min", bn: "আউটপুট ≈ ২০–২৫ লি/মিনিট" },
          { en: "Max HR ≈ 220 − age", bn: "সর্বোচ্চ HR ≈ ২২০ − বয়স" },
        ],
        rates: { bpm: 160, breathRate: 30 },
        highlight: /wall of heart|lobe of|aorta/i,
        focus: { match: /heart|lung|lobe of/i, distance: 0.95 },
        emphasis: { artery: 1.6, vein: 1.4, airway: 1.4, lung: 1.4 },
      },
      {
        title: { en: "Why you pant", bn: "কেন হাঁপান" },
        organ: { en: "Brainstem respiratory centre", bn: "ব্রেনস্টেমের শ্বাস-কেন্দ্র" },
        text: {
          en: "Hard-working muscles produce lots of carbon dioxide and lactic acid. The blood becomes more acidic, the brainstem senses it and drives the diaphragm and rib muscles harder: that is why you pant. You breathe out the extra CO₂ through the lungs.",
          bn: "কঠোর পরিশ্রমে পেশী প্রচুর কার্বন ডাই-অক্সাইড ও ল্যাকটিক অ্যাসিড তৈরি করে। রক্ত বেশি অ্যাসিডিক হয়, ব্রেনস্টেম তা টের পায় এবং মধ্যচ্ছদা ও পাঁজরের পেশীকে জোরে চালায় — তাই হাঁপাই। বাড়তি CO₂ ফুসফুস দিয়ে বেরিয়ে যায়।",
        },
        facts: [
          { en: "CO₂ & acid ↑ → breathing ↑", bn: "CO₂ ও অ্যাসিড ↑ → শ্বাস ↑" },
          { en: "Lactic acid → muscle burn", bn: "ল্যাকটিক অ্যাসিড → পেশীতে জ্বালা" },
        ],
        rates: { bpm: 160, breathRate: 30 },
        highlight: /medulla|pons|diaphragm|trachea|bronch/i,
        focus: { match: /medulla|pons/i, distance: 0.5 },
        emphasis: { airway: 1.8, lung: 1.4 },
        show: ["nervous"],
      },
      {
        title: { en: "Recovery", bn: "পুনরুদ্ধার" },
        organ: { en: "Oxygen debt is repaid", bn: "অক্সিজেন ঋণ শোধ" },
        text: {
          en: "After you stop, the heart and breathing stay high for a while to repay the 'oxygen debt': clear lactic acid, refill energy stores and cool the body. A fit person's heart rate falls by about 20–30 beats in the first minute.",
          bn: "থামার পরও কিছুক্ষণ হৃৎপিণ্ড ও শ্বাস উঁচু থাকে 'অক্সিজেন ঋণ' শোধ করতে: ল্যাকটিক অ্যাসিড সরানো, শক্তির ভান্ডার ভরা ও শরীর ঠান্ডা করা। সুস্থ মানুষের হৃদস্পন্দন প্রথম মিনিটে প্রায় ২০–৩০ কমে।",
        },
        facts: [
          { en: "HR ≈ 90 · RR ≈ 18", bn: "হৃদস্পন্দন ≈ ৯০ · শ্বাস ≈ ১৮" },
          { en: "Recovery HR drop = fitness", bn: "দ্রুত কমা = ফিটনেস" },
        ],
        rates: { bpm: 90, breathRate: 18 },
        highlight: /wall of heart|lobe of/i,
        focus: { match: /heart|lung|lobe of/i, distance: 0.9 },
      },
      {
        title: { en: "The trained heart", bn: "অনুশীলিত হৃৎপিণ্ড" },
        organ: { en: "Athlete's heart", bn: "অ্যাথলিটের হৃৎপিণ্ড" },
        text: {
          en: "Regular exercise makes the heart muscle stronger so that each beat pumps more blood. The same output then needs fewer beats: an endurance athlete may rest at 40–50 beats a minute. That means the heart rests longer between beats and lasts better.",
          bn: "নিয়মিত ব্যায়ামে হৃদপেশী শক্তিশালী হয়, তাই প্রতি স্পন্দনে বেশি রক্ত বের হয়। একই আউটপুটে কম স্পন্দন লাগে: সহনশীলতার অ্যাথলিট বিশ্রামে মিনিটে ৪০–৫০ বার চলে। অর্থাৎ হৃৎপিণ্ড প্রতি স্পন্দনের মাঝে বেশি বিশ্রাম পায়।",
        },
        facts: [
          { en: "Resting HR ≈ 40–50", bn: "বিশ্রামে HR ≈ ৪০–৫০" },
          { en: "Stroke volume ≈ 100+ mL", bn: "স্ট্রোক ভলিউম ≈ ১০০+ মিলি" },
        ],
        rates: { bpm: 48, breathRate: 12 },
        highlight: /left ventricle|wall of heart/i,
        focus: { match: /heart|ventricle/i, distance: 0.4 },
      },
    ],
  },
  {
    id: "hormones",
    icon: "🛡️",
    name: { en: "Hormones & defence", bn: "হরমোন ও প্রতিরক্ষা" },
    summary: {
      en: "Glands send chemical messengers through the blood, and the spleen and thymus defend the body. Red and blue waves show the blood that carries hormones and immune cells to every organ.",
      bn: "গ্রন্থি রক্তের মধ্য দিয়ে রাসায়নিক বার্তা পাঠায়, আর প্লীহা ও থাইমাস শরীরকে রক্ষা করে। লাল ও নীল ঢেউ দেখায় রক্ত কীভাবে হরমোন ও রোগ-প্রতিরোধ কোষ প্রতিটি অঙ্গে বয়ে নিয়ে যায়।",
    },
    keep: ["other", "cardiovascular"],
    dim: ["cardiovascular"],
    pulseDriven: true,
    flows: [
      { role: "artery", color: RED, origin: "heart", dir: 1, strength: 1.4, speed: 8, freq: 22 },
      { role: "vein", color: BLUE, origin: "heart", dir: -1, strength: 1.4, speed: 5, freq: 22 },
      { role: "heart", color: "#ff3b3b", origin: "heart", dir: 1, strength: 0, speed: 0, freq: 0 },
    ],
    steps: [
      {
        title: { en: "Chemical messengers", bn: "রাসায়নিক বার্তাবাহক" },
        organ: { en: "Endocrine glands", bn: "অন্তঃক্ষরা গ্রন্থি" },
        text: {
          en: "Nerves act in milliseconds; hormones act more slowly but for longer. A gland releases a hormone into the blood, the blood carries it everywhere, and only cells with the matching receptor respond. The main glands are the pituitary, thyroid, adrenals, pancreas and the ovaries or testes.",
          bn: "স্নায়ু কাজ করে মিলিসেকেন্ডে; হরমোন ধীরে কিন্তু দীর্ঘ সময় কাজ করে। গ্রন্থি রক্তে হরমোন ছাড়ে, রক্ত তা সর্বত্র বয়ে নেয়, আর মিলে যাওয়া রিসেপ্টর থাকা কোষ শুধু সাড়া দেয়। প্রধান গ্রন্থি: পিটুইটারি, থাইরয়েড, অ্যাড্রিনাল, অগ্ন্যাশয় এবং ডিম্বাশয় বা অণ্ডকোষ।",
        },
        facts: [
          { en: "Nerves: ms · hormones: min–days", bn: "স্নায়ু: মিলিসেকেন্ড · হরমোন: মিনিট–দিন" },
        ],
        highlight: /pituitary|adrenal|thymus|spleen/i,
        focus: { match: /pituitary|adrenal|thymus|spleen/i, distance: 1.6 },
        emphasis: { artery: 0.8, vein: 0.8 },
      },
      {
        title: { en: "Pituitary: the master gland", bn: "পিটুইটারি: মাস্টার গ্রন্থি" },
        organ: { en: "Pituitary gland", bn: "পিটুইটারি গ্রন্থি" },
        text: {
          en: "The pea-sized pituitary hangs below the brain in a bony pocket. Taking orders from the hypothalamus it releases hormones that control growth, the thyroid, the adrenals, the sex organs, milk production and water balance in the kidneys.",
          bn: "মটরদানার সমান পিটুইটারি মস্তিষ্কের নিচে হাড়ের খাঁজে ঝোলে। হাইপোথ্যালামাসের আদেশে এটি হরমোন ছাড়ে — বৃদ্ধি, থাইরয়েড, অ্যাড্রিনাল, যৌন অঙ্গ, দুধ উৎপাদন ও বৃক্কের পানির ভারসাম্য নিয়ন্ত্রণ করে।",
        },
        facts: [
          { en: "≈ 0.5 g", bn: "≈ ০.৫ গ্রাম" },
          { en: "Growth hormone, ADH, TSH…", bn: "গ্রোথ হরমোন, ADH, TSH…" },
        ],
        highlight: /pituitary/i,
        focus: { match: /pituitary/i, distance: 0.2 },
        show: ["nervous"],
      },
      {
        title: { en: "Adrenals: fight or flight", bn: "অ্যাড্রিনাল: লড়ো বা পালাও" },
        organ: { en: "Adrenal glands", bn: "অ্যাড্রিনাল গ্রন্থি" },
        text: {
          en: "The adrenal glands sit like caps on top of the kidneys. When you are scared or excited the medulla releases adrenaline within seconds: the heart races, the airways widen and blood sugar rises. The cortex adds cortisol for longer-lasting stress and salt balance. Watch the heart rate jump.",
          bn: "অ্যাড্রিনাল গ্রন্থি বৃক্কের মাথায় টুপির মতো বসে। ভয় পেলে বা উত্তেজিত হলে মেডুলা কয়েক সেকেন্ডে অ্যাড্রেনালিন ছাড়ে: হৃৎপিণ্ড দৌড়ায়, শ্বাসনালী প্রশস্ত হয়, রক্তের শর্করা বাড়ে। কর্টেক্স দীর্ঘস্থায়ী চাপ ও লবণের ভারসাম্যের জন্য কর্টিসল যোগ করে। হৃদস্পন্দন লাফিয়ে উঠতে দেখুন।",
        },
        facts: [
          { en: "Adrenaline acts in seconds", bn: "অ্যাড্রেনালিন কাজ করে সেকেন্ডে" },
          { en: "Cortisol = long-term stress", bn: "কর্টিসল = দীর্ঘমেয়াদি চাপ" },
        ],
        rates: { bpm: 125, breathRate: 22 },
        highlight: /adrenal/i,
        focus: { match: /adrenal/i, distance: 0.3 },
        emphasis: { artery: 1.6 },
        show: ["urinary"],
      },
      {
        title: { en: "Thymus: school for T-cells", bn: "থাইমাস: টি-কোষের স্কুল" },
        organ: { en: "Thymus", bn: "থাইমাস" },
        text: {
          en: "Behind the breastbone the thymus trains T-lymphocytes — the immune cells that recognise germs — to tell friend from foe. It is largest in childhood and slowly shrinks after puberty, being replaced by fat, but the trained T-cells keep working for life.",
          bn: "বুকের হাড়ের পেছনে থাইমাস টি-লিম্ফোসাইট — জীবাণু চেনা প্রতিরক্ষা কোষ — কে বন্ধু ও শত্রু চিনতে শেখায়। শৈশবে এটি সবচেয়ে বড়, বয়ঃসন্ধির পর ধীরে ধীরে ছোট হয়ে চর্বি দিয়ে বদলে যায়, কিন্তু প্রশিক্ষিত টি-কোষ সারা জীবন কাজ করে।",
        },
        facts: [
          { en: "Biggest in childhood", bn: "শৈশবে সবচেয়ে বড়" },
          { en: "T = thymus-derived", bn: "T = থাইমাস থেকে" },
        ],
        highlight: /thymus/i,
        focus: { match: /thymus/i, distance: 0.3 },
        emphasis: { artery: 0.6, vein: 0.6 },
      },
      {
        title: { en: "Spleen: filter and reserve", bn: "প্লীহা: ছাঁকনি ও মজুত" },
        organ: { en: "Spleen", bn: "প্লীহা" },
        text: {
          en: "The spleen sits under the left ribs. Its red pulp filters the blood, removing old or damaged red blood cells and trapping germs; its white pulp is a nest of immune cells that mount a response. It also stores platelets and a little blood that can be released after bleeding. You can live without it, but infections become more dangerous.",
          bn: "প্লীহা বাম পাঁজরের নিচে থাকে। এর লাল পাল্প রক্ত ছেঁকে পুরনো বা ক্ষতিগ্রস্ত লোহিত কণিকা সরায় ও জীবাণু আটকায়; সাদা পাল্প রোগ-প্রতিরোধ কোষের ঘাঁটি। এটি প্লেটলেট ও সামান্য রক্ত জমা রাখে যা রক্তক্ষরণের পর ছাড়া যায়। প্লীহা ছাড়া বাঁচা যায়, কিন্তু সংক্রমণ বেশি ঝুঁকিপূর্ণ হয়।",
        },
        facts: [
          { en: "≈ 150 g, fist-sized", bn: "≈ ১৫০ গ্রাম" },
          { en: "Red cells live ≈ 120 days", bn: "লোহিত কণিকার আয়ু ≈ ১২০ দিন" },
        ],
        highlight: /spleen|splenic/i,
        focus: { match: /spleen/i, distance: 0.34 },
        emphasis: { artery: 1.2, vein: 1.2 },
        show: ["digestive"],
      },
    ],
  },
];

// Titles carry no hand-written numbers: the panel shows "Step n / m" and numbers the list itself.
for (const proc of PROCESSES)
  for (const st of proc.steps)
    st.title = {
      en: st.title.en.replace(/^\d+\.\s*/, ""),
      bn: st.title.bn.replace(/^[\d০-৯]+[.।]\s*/, ""),
    };

export const PROCESS_BY_ID = Object.fromEntries(PROCESSES.map((p) => [p.id, p])) as Record<ProcessId, LiveProcess>;
