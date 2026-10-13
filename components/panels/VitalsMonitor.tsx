"use client";

import { useEffect, useRef } from "react";

const gauss = (x: number, c: number, w: number, a: number) => a * Math.exp(-((x - c) * (x - c)) / (2 * w * w));

/** One ECG beat (P, QRS, T) as a function of the beat phase 0..1. */
function ecg(ph: number) {
  return (
    gauss(ph, 0.12, 0.025, 0.14) + // P: atria
    gauss(ph, 0.265, 0.008, -0.16) + // Q
    gauss(ph, 0.29, 0.01, 1.0) + // R: ventricles contract
    gauss(ph, 0.32, 0.01, -0.28) + // S
    gauss(ph, 0.55, 0.045, 0.3) // T: ventricles relax
  );
}

const RATE = 120; // samples a second
const SAMPLES = 360; // 3 seconds on screen

/**
 * A live ECG trace and breathing trace that follow the heart-rate and breathing sliders.
 * Drawn on a plain canvas so it costs next to nothing next to the 3D scene.
 */
export function VitalsMonitor({
  bpm,
  breathRate,
  speed,
  labels,
}: {
  bpm: number;
  breathRate: number;
  /** 0 when paused. */
  speed: number;
  labels: { hr: string; rr: string; bp: string; co: string; perMin: string };
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ bpm, breathRate, speed });
  useEffect(() => {
    live.current = { bpm, breathRate, speed };
  });

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    const heart = new Float32Array(SAMPLES);
    const breath = new Float32Array(SAMPLES);
    let hp = 0;
    let bp = 0;
    let bpmNow = live.current.bpm;
    let brNow = live.current.breathRate;
    let last = performance.now();
    let acc = 0;
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { bpm: tb, breathRate: tr, speed: sp } = live.current;
      bpmNow += (tb - bpmNow) * (1 - Math.exp(-dt * 2.5));
      brNow += (tr - brNow) * (1 - Math.exp(-dt * 2.5));
      acc += dt * RATE;
      while (acc >= 1) {
        acc -= 1;
        hp = (hp + (sp * bpmNow) / 60 / RATE) % 1;
        bp = (bp + (sp * brNow) / 60 / RATE) % 1;
        heart.copyWithin(0, 1);
        breath.copyWithin(0, 1);
        heart[SAMPLES - 1] = ecg(hp);
        breath[SAMPLES - 1] = 0.5 - 0.5 * Math.cos(2 * Math.PI * bp);
      }

      ctx.clearRect(0, 0, w, h);
      const mid = h * 0.38;
      const draw = (data: Float32Array, y0: number, amp: number, color: string) => {
        ctx.beginPath();
        for (let i = 0; i < SAMPLES; i++) {
          const x = (i / (SAMPLES - 1)) * w;
          const y = y0 - data[i] * amp;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.stroke();
      };
      draw(heart, mid, h * 0.3, "#fb7185");
      draw(breath, h - 8, h * 0.22, "#38bdf8");
      // bright head of the sweep
      const hy = mid - heart[SAMPLES - 1] * h * 0.3;
      ctx.fillStyle = "#fecdd3";
      ctx.beginPath();
      ctx.arc(w - 2, hy, 2.4, 0, Math.PI * 2);
      ctx.fill();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // illustrative values that follow the sliders (resting 72 bpm → ≈ 5 L/min, 120/75)
  const stroke = 70 + Math.max(0, bpm - 72) * 0.35 - Math.max(0, 72 - bpm) * 0.4;
  const output = (bpm * stroke) / 1000;
  const sys = Math.round(112 + (bpm - 72) * 0.45);
  const dia = Math.round(74 + (bpm - 72) * 0.08);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-black/30">
      <canvas ref={canvas} className="block h-[88px] w-full" />
      <div className="grid grid-cols-4 divide-x divide-white/[0.06] border-t border-white/[0.06] text-center">
        <Stat label={labels.hr} value={String(Math.round(bpm))} unit={labels.perMin} tone="text-rose-300" />
        <Stat label={labels.rr} value={String(Math.round(breathRate))} unit={labels.perMin} tone="text-sky-300" />
        <Stat label={labels.bp} value={`${sys}/${dia}`} unit="mmHg" tone="text-amber-200" />
        <Stat label={labels.co} value={output.toFixed(1)} unit="L/min" tone="text-emerald-300" />
      </div>
    </div>
  );
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: string }) {
  return (
    <div className="px-1 py-1.5">
      <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-mono text-[13px] font-semibold leading-tight ${tone}`}>{value}</div>
      <div className="text-[9px] text-slate-500">{unit}</div>
    </div>
  );
}
