import fs from "fs";
import path from "path";
import sharp from "sharp";

// 1. High-fidelity Medical Favicon SVG (512x512)
// Designed to match the Anatomy Lab 3D branding:
// - Teal-to-Cyan gradient squircle (mirroring header icon: from-teal-400 to-cyan-600)
// - Subtle premium inner rim lighting for contrast in dark & light browser tabs
// - Crisp, tactile medical cross with gentle 3D elevation and rounded ergonomics
// - Subtle vitals heartbeat pulse rhythm subtly accentuating the horizontal bar
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Background Gradient: Vibrant Teal to Deep Cyan -->
    <linearGradient id="medBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <!-- Inner Rim Highlight for depth on dark/light tabs -->
    <linearGradient id="rimHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Cross Gradient: Pure crisp white with subtle top-to-bottom depth -->
    <linearGradient id="crossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f0fdfa"/>
    </linearGradient>

    <!-- Cross Elevation Shadow -->
    <filter id="crossShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#083344" flood-opacity="0.38"/>
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#083344" flood-opacity="0.2"/>
    </filter>

    <!-- Pulse Line Glow -->
    <filter id="pulseGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#06b6d4" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Squircle Base (Curvature matching Apple & Modern Web App icons) -->
  <rect x="24" y="24" width="464" height="464" rx="108" ry="108" fill="url(#medBg)"/>

  <!-- Subtle Top Light Reflection -->
  <path d="M 24 132 C 24 72 72 24 132 24 L 380 24 C 440 24 488 72 488 132 C 488 180 380 240 256 240 C 132 240 24 180 24 132 Z" fill="#ffffff" opacity="0.08"/>

  <!-- Rim Highlight Border -->
  <rect x="25" y="25" width="462" height="462" rx="107" ry="107" fill="none" stroke="url(#rimHighlight)" stroke-width="5"/>

  <!-- Medical Cross with Shadow -->
  <g filter="url(#crossShadow)">
    <!-- Vertical Arm -->
    <rect x="208" y="112" width="96" height="288" rx="24" fill="url(#crossGrad)"/>
    <!-- Horizontal Arm -->
    <rect x="112" y="208" width="288" height="96" rx="24" fill="url(#crossGrad)"/>
  </g>

  <!-- Vital Heartbeat ECG Rhythm integrated across center (Teal/Cyan pulse) -->
  <path d="M 144 256 L 200 256 L 216 230 L 236 286 L 260 216 L 284 276 L 300 256 L 368 256"
        fill="none"
        stroke="#0d9488"
        stroke-width="12"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.85"
        filter="url(#pulseGlow)"/>
</svg>
`;

// Helper to assemble standard Windows .ico file containing PNG frames
function createIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // image type: 1 = ICO
  header.writeUInt16LE(count, 4); // count

  let offset = 6 + count * 16;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count (32-bit RGBA)
    entry.writeUInt32LE(buf.length, 8); // bytes in resource
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buf.length;
  }
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function main() {
  const rootDir = process.cwd();
  const appDir = path.join(rootDir, "app");
  const publicDir = path.join(rootDir, "public");

  console.log("Generating Medical Anatomy Favicons...");

  // Write SVG icons
  const appIconSvg = path.join(appDir, "icon.svg");
  const pubIconSvg = path.join(publicDir, "icon.svg");
  const pubFavSvg = path.join(publicDir, "favicon.svg");

  fs.writeFileSync(appIconSvg, svgContent, "utf8");
  fs.writeFileSync(pubIconSvg, svgContent, "utf8");
  fs.writeFileSync(pubFavSvg, svgContent, "utf8");
  console.log("Created SVG icons: app/icon.svg, public/icon.svg, public/favicon.svg");

  // Render PNG buffers at standard resolutions
  const svgBuffer = Buffer.from(svgContent);
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const png180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  const png192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  // Write Apple Touch Icon
  const appAppleIcon = path.join(appDir, "apple-icon.png");
  const pubAppleIcon = path.join(publicDir, "apple-touch-icon.png");
  fs.writeFileSync(appAppleIcon, png180);
  fs.writeFileSync(pubAppleIcon, png180);
  console.log("Created Apple icons: app/apple-icon.png, public/apple-touch-icon.png");

  // Write standard PNG icons
  fs.writeFileSync(path.join(publicDir, "icon-192.png"), png192);
  fs.writeFileSync(path.join(publicDir, "icon-512.png"), png512);

  // Generate multi-resolution .ico (16x16, 32x32, 48x48)
  const icoBuffer = createIco([png16, png32, png48], [16, 32, 48]);
  const appFaviconIco = path.join(appDir, "favicon.ico");
  const pubFaviconIco = path.join(publicDir, "favicon.ico");
  fs.writeFileSync(appFaviconIco, icoBuffer);
  fs.writeFileSync(pubFaviconIco, icoBuffer);
  console.log("Replaced app/favicon.ico and created public/favicon.ico with multi-res medical favicon!");

  console.log("All favicons generated successfully!");
}

main().catch((err) => {
  console.error("Error generating favicons:", err);
  process.exit(1);
});
