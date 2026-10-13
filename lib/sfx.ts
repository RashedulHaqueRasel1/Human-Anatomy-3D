/**
 * Small synthesized sound effects (no audio files): the soft hiss of a blade
 * through tissue, the ratchet of a clamp and the snip of a cut ligature.
 */

let ctx: AudioContext | null = null;
let muted = false;
let noise: AudioBuffer | null = null;
let cut: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;

function audio() {
  if (muted || typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

export const sfx = {
  setMuted(m: boolean) {
    muted = m;
    if (m) this.cutEnd();
  },

  cutStart() {
    const a = audio();
    if (!a || cut) return;
    const src = a.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = a.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.9;
    const gain = a.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(a.destination);
    src.start();
    cut = { src, gain, filter };
  },

  /** speed: cursor speed in px per event — louder and brighter when cutting faster. */
  cutMove(speed: number) {
    if (!cut || !ctx) return;
    const s = Math.min(1, speed / 25);
    cut.gain.gain.setTargetAtTime(0.02 + s * 0.07, ctx.currentTime, 0.03);
    cut.filter.frequency.setTargetAtTime(1800 + s * 2200, ctx.currentTime, 0.05);
    cut.gain.gain.setTargetAtTime(0.0, ctx.currentTime + 0.12, 0.08);
  },

  cutEnd() {
    if (!cut || !ctx) return;
    const c = cut;
    cut = null;
    c.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    c.src.stop(ctx.currentTime + 0.3);
  },

  /** Ratchet clicks of a ring-handled instrument locking. */
  ratchet() {
    const a = audio();
    if (!a) return;
    for (let i = 0; i < 3; i++) {
      const t = a.currentTime + i * 0.055;
      const o = a.createOscillator();
      o.type = "square";
      o.frequency.value = 3200 - i * 250;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.04);
    }
  },

  snip() {
    const a = audio();
    if (!a || !noise) return;
    const src = a.createBufferSource();
    src.buffer = noise;
    const f = a.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 3500;
    const g = a.createGain();
    const t = a.currentTime;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
    src.stop(t + 0.1);
  },

  success() {
    const a = audio();
    if (!a) return;
    [660, 880].forEach((freq, i) => {
      const t = a.currentTime + i * 0.09;
      const o = a.createOscillator();
      o.frequency.value = freq;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
  },
};
