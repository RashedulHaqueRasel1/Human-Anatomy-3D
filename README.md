# Anatomy Lab 3D

**Interactive real human anatomy, live physiology and virtual surgery practice — in your browser, for medical students.**

Explore a real 3D human body, cut it with a scalpel, watch the heart beat and the food travel through the gut, and practise 16 surgical procedures step by step. The whole interface is available in **English** and **বাংলা (Bangla)**.

> Built with Next.js, React Three Fiber and three.js. No backend, no database — everything runs in the browser.

---

## Table of contents

- [Quick start](#quick-start)
- [What can I do in the app?](#what-can-i-do-in-the-app)
  - [1. Explore & dissect](#1-explore--dissect)
  - [2. Live body](#2-live-body)
  - [3. Study an organ](#3-study-an-organ)
  - [4. Guided surgery](#4-guided-surgery)
- [Surgical instruments](#surgical-instruments)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Customising the content](#customising-the-content)
- [Rebuilding the 3D models](#rebuilding-the-3d-models)
- [Scripts](#scripts)
- [Credits & data licences](#credits--data-licences)
- [Author](#author)

---

## Quick start

**Requirements:** Node.js 20 or newer, and a browser with WebGL 2 (any recent Chrome, Edge, Firefox or Safari).

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm run dev
```

Open <http://localhost:3000>. The ready-made 3D models are already in `public/models/`, so nothing else has to be downloaded.

```bash
# production build
npm run build
npm start
```

> **Tip:** if the picture is slow on an older laptop, open the settings menu (top right) and switch quality from **High** to **Fast**. The app also lowers its resolution automatically while you orbit the camera.

---

## What can I do in the app?

The top bar has four modes. Everything works for both the **male** and the **female** body, and you can switch language (EN / বাংলা) at any time.

### 1. Explore & dissect

A free dissection table.

- **Body systems** — toggle skin, muscles, skeleton, nervous, cardiovascular, respiratory, digestive, urinary, reproductive and glands on/off.
- **Skin transparency slider** — fade the skin to see the muscles and organs below.
- **Cross-sections** — slice the body in the coronal, sagittal or axial plane.
- **Click any structure** to see its name (English + বাংলা), a description, its functions and clinical / surgical notes.
- **Tools** (bottom dock): scalpel, retractor, forceps, clamp and suture — see [Surgical instruments](#surgical-instruments).
- **Undo** (`Ctrl+Z`) puts back the last cut or removed structure.

### 2. Live body

The body is alive: the **heart beats** (atria, then ventricles) and the **lungs breathe** (the chest expands, the diaphragm moves). Pick a process and follow it step by step. Every step has a narrated explanation in English and বাংলা, key facts, a camera move to the right organ and a highlight on the structures involved.

| Process | What you will see |
|---|---|
| **Blood circulation** | Blood returns to the heart, goes to the lungs, comes back, is pumped to the brain, gut, kidneys and legs. Red waves = oxygen-rich, blue waves = oxygen-poor. |
| **The heart in detail** | Four chambers, four valves, one heartbeat (atrial → ventricular systole), the coronary arteries, cardiac output. |
| **Breathing** | Diaphragm and ribs, airways, alveoli, lung lobes, how the brainstem sets the pace. |
| **Food journey** | A meal from the mouth to the toilet: chewing, swallowing, stomach churning, bile and pancreatic juice, absorption, large intestine, rectum — shown with glowing particles travelling along the real gut path. |
| **Blood cleaning & urine** | Kidneys filter the blood; urine flows down the ureters, fills the bladder and leaves the body. The liver as a second cleaner. |
| **Nerve signals** | A sensation travels up the spinal cord, the brain decides, a command goes back; reflex arc; autonomic control of the heart. |
| **Inside the brain** | Lobes, movement and touch maps, hearing and language, vision pathway, memory and emotion, thalamus, cerebellum, hypothalamus and pituitary, the fluid-filled ventricles. |
| **Rest vs exercise** | Rest → walk → sprint → recovery → the trained heart. Each step sets the heart rate and breathing rate for you. |
| **Hormones & defence** | Pituitary, adrenals (watch the heart rate jump), thymus, spleen. |

Extra controls in this mode:

- **Live monitor** — a live ECG trace, breathing trace, blood pressure and cardiac output that follow the sliders. *(BP and output are approximate teaching values, not measurements.)*
- **Heart-rate and breathing sliders** — drag and watch the heart and lungs change smoothly.
- **Animation speed**, **Auto tour** (moves to the next step by itself), **Fade other tissues**.
- `←` / `→` keys move between steps.

### 3. Study an organ

Pick an organ or region (heart, brain, kidneys, uterus, skull, hand …). It is shown on its own and you can:

- **Pull the parts apart** (exploded view) with floating name labels,
- **Slice** through it, or **cut it open** with the scalpel,
- click any part for its details.

### 4. Guided surgery

A library of **16 procedures**. Open one and choose:

- **Tutorial** — a narrated walk-through of every step (English + বাংলা). The camera flies to the operating site, the relevant structures pulse, and the incision line is drawn on the skin. Use `←` / `→` or *Play* to auto-advance.
- **Practice** — do it yourself with the instruments. Every step is checked against what really happens in the 3D body (right layer cut? cut along the marked line? right structure clamped? wound open wide enough?). You get a timer, a mistake counter and a score.

| Category | Procedures |
|---|---|
| Abdominal | Open appendicectomy · Laparoscopic appendicectomy · Laparoscopic cholecystectomy · Inguinal hernia repair (Lichtenstein) · Sleeve gastrectomy · Right hemicolectomy · Laparoscopic splenectomy |
| Cardiothoracic | Coronary artery bypass (CABG) · Aortic valve replacement · Lung lobectomy (VATS) |
| Head & neck | Open tracheostomy |
| Urology | Kidney transplant |
| Gynaecology | Caesarean section · Total abdominal hysterectomy |
| Neurosurgery | Craniotomy (tumour removal) |
| Orthopaedics | Total knee replacement |

Each procedure page also shows the indication, risks, typical duration, anaesthesia and difficulty. Some procedures need a particular body (e.g. caesarean section uses the female body) — the app switches for you.

---

## Surgical instruments

Instruments are modelled at real size, with synthesized sound effects (no audio files).

| Tool | How to use it |
|---|---|
| **Scalpel** | Press and drag on the body. The cut opens along your stroke with a bleeding wound edge and yellow subcutaneous fat. *Full thickness* cuts skin and every muscle layer down to the organs; *One layer* lets you dissect layer by layer. |
| **Retractor** | Drag on an incision to pull its edges apart. |
| **Forceps** | Click a structure to lift it out of the body (undo puts it back). |
| **Clamp** | Click a structure to put a Kelly artery clamp on it. |
| **Suture** | Drag the needle holder along an incision to close it with interrupted stitches. |

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `1` – `6` | Select a tool in the dock order: explore, scalpel, retractor, forceps, clamp, suture (Explore mode) |
| `Ctrl` + `Z` | Undo |
| `Esc` | Clear selection / close settings |
| `←` `→` | Previous / next step (Live body and Tutorial) |
| Mouse | Drag = orbit · scroll = zoom · right-drag = pan |

---

## Tech stack

| Part | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript |
| 3D | [three.js](https://threejs.org), [React Three Fiber](https://r3f.docs.pmnd.rs), [drei](https://github.com/pmndrs/drei) |
| Picking / cutting | [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) for fast ray casting through wound openings |
| Look | [postprocessing](https://github.com/pmndrs/postprocessing) (ambient occlusion, bloom, vignette), custom tissue shader |
| Styling | Tailwind CSS 4 |
| Model pipeline | [glTF-Transform](https://gltf-transform.dev) + meshoptimizer (build-time scripts) |
| Audio | Web Audio API (synthesized) |

---

## Project structure

```text
.
├── app/                    # Next.js App Router (layout, page, global styles, icons)
├── components/
│   ├── LabClient.tsx       # client-only wrapper that loads the lab
│   ├── SurgeryLab.tsx      # main UI: mode bar, panels, dock, all state
│   ├── BodyScene.tsx       # React Three Fiber scene: lighting, camera rig, pointer input
│   ├── useProcedure.ts     # hands-on practice runner for all procedures
│   ├── useAppendectomy.ts  # staged script of the open appendicectomy
│   ├── panels/             # side panels
│   │   ├── FreePanel.tsx       # Explore & dissect
│   │   ├── LivePanel.tsx       # Live body
│   │   ├── VitalsMonitor.tsx   # live ECG / vitals monitor
│   │   ├── StudyPanel.tsx      # Study an organ
│   │   ├── GuidedPanel.tsx     # Guided surgery library
│   │   ├── SurgeryPanels.tsx   # procedure detail, tutorial and practice panels
│   │   └── InfoPanel.tsx       # structure details
│   └── ui/icons.tsx        # icon set
├── lib/
│   ├── engine.ts           # three.js runtime: picking, scalpel, retractor, forceps, live mode
│   ├── tissue.ts           # tissue shader: incisions, wound rim, flow animation
│   ├── body.ts             # body systems, colours, anatomical notes (EN + BN)
│   ├── physiology.ts       # Live body processes and narrated steps (EN + BN)
│   ├── surgeries.ts        # the 16 procedures (info + tutorial steps)
│   ├── practice.ts         # hands-on practice scripts and checks
│   ├── appendectomy.ts     # open appendicectomy step script
│   ├── instruments.ts      # procedural surgical instruments
│   ├── sfx.ts              # Web Audio sound effects
│   └── i18n.ts             # English / বাংলা UI strings
├── public/models/          # ready-to-use compressed GLB models + manifest.json (male)
│   └── female/             # female body models
├── scripts/                # build-time model pipeline and icon generator
└── raw/                    # (git-ignored) source datasets used to rebuild the models
```

---

## How it works

1. **Models** — the original BodyParts3D OBJ files are converted by `scripts/build-models.mjs` into one meshopt-compressed GLB per body system (≈ 4.5 MB total) plus a `manifest.json` that lists every structure (name, system, centre, size). The app loads this manifest and the GLB of each system.
2. **Tissue shader** (`lib/tissue.ts`) — an incision is stored as a polyline. The fragment shader opens the surface along that line, paints the wound rim and renders cut tissue on the back faces. A separate set of "flow" uniforms animates every artery / vein / airway at once in Live mode, with no per-mesh updates.
3. **Engine** (`lib/engine.ts`) — an imperative three.js runtime kept outside React for speed: it picks through wound openings with a BVH, builds smooth Hermite-curve incisions from the blade positions, animates retractors, forceps and blood droplets, drives the heartbeat and breathing, and moves particle streams along named body paths (gut, bile duct, ureters, vessels).
4. **Scene & input** (`components/BodyScene.tsx`) — pointer events are gathered and applied once per frame; the camera rig flies between views with ease-in-out motion and cancels as soon as you touch the mouse.
5. **UI & content** — panels read plain TypeScript data files (`physiology.ts`, `surgeries.ts`, `practice.ts`, `body.ts`). Adding content does not need any engine change.

---

## Customising the content

| I want to … | Edit |
|---|---|
| Add or change a Live body process or step | `lib/physiology.ts` — each step has a title, text, `facts`, a `highlight` regex (matched against structure names), a camera `focus`, and optional `rates` (heart / breathing rate), `trains` (particle streams) and `swell` |
| Add or change a surgical procedure | `lib/surgeries.ts` (info + tutorial) and `lib/practice.ts` (hands-on steps and checks) |
| Add anatomical notes shown when a structure is clicked | `lib/body.ts` (`NOTES`) |
| Translate or change interface text | `lib/i18n.ts` |
| Change structure names / colours | `lib/body.ts` and the `manifest.json` of each body |

Structure names come from `public/models/manifest.json`. Open it to see exactly which names the regular expressions can match.

---

## Rebuilding the 3D models

You only need this if you want to change the 3D data — the app already ships with the built models.

### Male body (BodyParts3D)

1. Download `BodyParts3D_3.0_obj_99.zip`, `parts_list_e.txt` and `composite_parts.txt` from <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/>.
2. Unzip everything into `raw/bodyparts3d/`.
3. Run:

```bash
node scripts/build-models.mjs
```

### Female body (Human Reference Atlas)

1. Download `3d-vh-f-united.glb` (≈ 374 MB) from <https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/assets/3d-vh-f-united.glb> into `raw/hra/`.
2. Run (needs plenty of memory):

```bash
node --max-old-space-size=8192 scripts/build-female.mjs
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Check the code with ESLint |
| `node scripts/build-models.mjs` | Rebuild the male models |
| `node scripts/build-female.mjs` | Rebuild the female models |
| `node scripts/generate-favicons.mjs` | Regenerate the app icons |

---

## Credits & data licences

- **Male 3D anatomy** — *BodyParts3D*, © The Database Center for Life Science, licensed under Creative Commons Attribution 4.0 International — <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/>
- **Female 3D anatomy** — *Human Reference Atlas (HuBMAP), 3D Reference Organs built from the NLM Visible Human Female*, CC BY 4.0 — <https://humanatlas.io/3d-reference-library>

> **Medical disclaimer:** this project is an educational simulator. The anatomy, physiology values and surgical steps are simplified for learning and must not be used for clinical decisions or as a substitute for professional training.

---

## Author

**Rashedul Haque Rasel**

- Email: [rashedulhaquerasel1@gmail.com](mailto:rashedulhaquerasel1@gmail.com)
- GitHub: [RashedulHaqueRasel1](https://github.com/RashedulHaqueRasel1/)
- Portfolio: [rashedul-haque-rasel.vercel.app](https://rashedul-haque-rasel.vercel.app)
