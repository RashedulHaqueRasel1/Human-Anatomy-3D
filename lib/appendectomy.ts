import type { InstrumentKind } from "./instruments";
import type { Tool } from "./lab";

/**
 * Open appendicectomy through a gridiron (McBurney) incision — step script for
 * the guided mode. Validation lives in the guided controller; this file only
 * describes the procedure.
 */

export type StepId =
  | "landmark"
  | "skin"
  | "eo"
  | "io"
  | "ta"
  | "retract"
  | "deliver"
  | "identify"
  | "clamp"
  | "ligate"
  | "excise"
  | "close";

export type GuidedStep = {
  id: StepId;
  title: string;
  bn: string;
  instruction: string;
  bnInstruction: string;
  tool: Tool;
  instrument: InstrumentKind | null;
  /** Real-world detail shown under the instruction. */
  note?: string;
};

export const APPENDECTOMY: GuidedStep[] = [
  {
    id: "landmark",
    title: "Locate McBurney's point",
    bn: "McBurney's point খুঁজুন",
    instruction:
      "The blue rings mark the right anterior superior iliac spine (ASIS) and the umbilicus. McBurney's point lies one-third of the way from the ASIS to the umbilicus. Click it on the skin.",
    bnInstruction: "নীল দাগ দুটো ডান ASIS আর নাভি। ASIS থেকে নাভির দিকে এক-তৃতীয়াংশ দূরে McBurney's point — চামড়ার উপর সেখানে ক্লিক করুন।",
    tool: "explore",
    instrument: null,
    note: "It overlies the usual position of the base of the appendix.",
  },
  {
    id: "skin",
    title: "Skin incision",
    bn: "চামড়া কাটা",
    instruction:
      "With the No. 10 blade at about 35°, make a 5–6 cm gridiron incision along the purple skin marking, through skin and subcutaneous fat, in one smooth stroke.",
    bnInstruction: "১০ নম্বর ব্লেড ৩৫° কোণে ধরে বেগুনি দাগ বরাবর এক টানে ৫–৬ সেমি কাটুন — চামড়া আর নিচের চর্বি পর্যন্ত।",
    tool: "scalpel",
    instrument: "scalpel",
    note: "The gridiron incision runs perpendicular to the spino-umbilical line, centred on McBurney's point.",
  },
  {
    id: "eo",
    title: "External oblique aponeurosis",
    bn: "এক্সটার্নাল অবলিক কাটা",
    instruction: "Incise the external oblique aponeurosis in the line of its fibres, inside the skin opening.",
    bnInstruction: "চামড়ার ফাঁকের ভেতরে এক্সটার্নাল অবলিক পেশীর আঁশ বরাবর কাটুন।",
    tool: "scalpel",
    instrument: "scalpel",
    note: "Its fibres run downwards and medially, like hands in the pockets.",
  },
  {
    id: "io",
    title: "Split the internal oblique",
    bn: "ইন্টারনাল অবলিক আলাদা করুন",
    instruction: "Split the internal oblique muscle along its fibres in the depth of the wound.",
    bnInstruction: "ক্ষতের গভীরে ইন্টারনাল অবলিক পেশী আঁশ বরাবর আলাদা করুন।",
    tool: "scalpel",
    instrument: "scalpel",
    note: "A muscle-splitting approach — the muscles are separated, not divided across, which reduces hernia risk.",
  },
  {
    id: "ta",
    title: "Split the transversus abdominis",
    bn: "ট্রান্সভার্সাস অ্যাবডোমিনিস",
    instruction: "Split the transversus abdominis, the deepest muscle layer, to reach the peritoneum.",
    bnInstruction: "সবচেয়ে গভীর পেশী স্তর ট্রান্সভার্সাস অ্যাবডোমিনিস আলাদা করুন — নিচে পেরিটোনিয়াম।",
    tool: "scalpel",
    instrument: "scalpel",
  },
  {
    id: "retract",
    title: "Retract and open the peritoneum",
    bn: "রিট্র্যাক্টর দিয়ে ক্ষত খুলুন",
    instruction:
      "Drag across the wound with the Langenbeck retractors to open it to at least 4 cm. The peritoneum is then picked up between two clips and opened.",
    bnInstruction: "ল্যাঙ্গেনবেক রিট্র্যাক্টর দিয়ে ক্ষতের উপর টেনে অন্তত ৪ সেমি খুলুন। এরপর পেরিটোনিয়াম তুলে কাটা হয়।",
    tool: "retractor",
    instrument: "retractor",
    note: "Lift the peritoneum before opening it so the bowel underneath is not injured.",
  },
  {
    id: "deliver",
    title: "Deliver the caecum",
    bn: "সিকাম বের করে আনুন",
    instruction:
      "Grasp the bowel in the wound with Babcock forceps and draw the caecum and appendix up into the wound.",
    bnInstruction: "ব্যাবকক ফরসেপ দিয়ে ক্ষতের ভেতরের অন্ত্র ধরে সিকাম আর অ্যাপেন্ডিক্স ক্ষতের মুখে তুলে আনুন।",
    tool: "forceps",
    instrument: "babcock",
    note: "Babcock forceps are atraumatic — they hold the bowel without crushing it.",
  },
  {
    id: "identify",
    title: "Identify the appendix",
    bn: "অ্যাপেন্ডিক্স চিনুন",
    instruction: "Follow the taeniae coli down the caecum to where they converge — that is the base of the appendix. Click the appendix.",
    bnInstruction: "সিকামের টিনিয়া কোলাই অনুসরণ করুন — যেখানে তিনটি মিলেছে সেখানেই অ্যাপেন্ডিক্সের গোড়া। অ্যাপেন্ডিক্সে ক্লিক করুন।",
    tool: "explore",
    instrument: null,
  },
  {
    id: "clamp",
    title: "Clamp the base",
    bn: "গোড়ায় ক্ল্যাম্প দিন",
    instruction: "Crush the appendix close to its base with an artery forceps (Kelly clamp). Click on the appendix near its base.",
    bnInstruction: "আর্টারি ফরসেপ (কেলি ক্ল্যাম্প) দিয়ে অ্যাপেন্ডিক্সের গোড়ার কাছে চেপে ধরুন — গোড়ার কাছে ক্লিক করুন।",
    tool: "clamp",
    instrument: "clamp",
    note: "The mesoappendix with the appendicular artery is clamped, divided and tied first.",
  },
  {
    id: "ligate",
    title: "Ligate the base",
    bn: "গোড়া বাঁধুন",
    instruction: "Tie an absorbable ligature (Vicryl 2-0) around the crushed base of the appendix. Click at the base.",
    bnInstruction: "অ্যাপেন্ডিক্সের চাপা গোড়ায় শোষণযোগ্য সুতা (ভিক্রিল ২-০) দিয়ে বাঁধুন — গোড়ায় ক্লিক করুন।",
    tool: "suture",
    instrument: "needle",
  },
  {
    id: "excise",
    title: "Excise the appendix",
    bn: "অ্যাপেন্ডিক্স কেটে ফেলুন",
    instruction: "Cut across the appendix between the ligature and the clamp with the scalpel.",
    bnInstruction: "সুতার বাঁধন আর ক্ল্যাম্পের মাঝখানে স্ক্যালপেল দিয়ে অ্যাপেন্ডিক্স কেটে ফেলুন।",
    tool: "scalpel",
    instrument: "scalpel",
    note: "The specimen goes to histopathology; the stump may be buried with a purse-string suture.",
  },
  {
    id: "close",
    title: "Close the wound",
    bn: "সেলাই করে বন্ধ করুন",
    instruction: "With the needle holder, sew along the whole length of the skin incision to close the wound with interrupted sutures.",
    bnInstruction: "নিডল হোল্ডার দিয়ে পুরো কাটা জায়গা বরাবর টেনে আলাদা আলাদা সেলাই দিয়ে ক্ষত বন্ধ করুন।",
    tool: "suture",
    instrument: "needle",
    note: "Each muscle layer is closed in turn, then the skin.",
  },
];

/** Expected muscle/skin layer for each cutting step. */
export const LAYER_FOR: Partial<Record<StepId, RegExp>> = {
  skin: /^skin$/i,
  eo: /right external oblique/i,
  io: /right internal oblique/i,
  ta: /right transversus abdominis/i,
};
