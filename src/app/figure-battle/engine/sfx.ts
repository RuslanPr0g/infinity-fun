/**
 * Procedural sound effects: every sound is synthesized on first use, no audio files needed.
 * The AudioContext is created on the first user gesture (browser autoplay rules).
 */

const RATE = 44100;
const UI_VOICES = 8;
const WORLD_VOICES = 28;
const TAU = Math.PI * 2;

/** Minimum seconds between two plays of the same sound (keeps 4x speed battles from turning to mush). */
const MIN_GAP: Record<string, number> = {
  hit: 0.035, shot: 0.05, death: 0.03, boom: 0.07, heal: 0.09, zap: 0.06,
  launch: 0.08, cleave: 0.08, place: 0.025, remove: 0.03, hover: 0.03, charge: 0.06,
};

type Buf = Float32Array;

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

function buf(dur: number): Buf {
  return new Float32Array(Math.floor(dur * RATE));
}

/** wave: 0 sine, 1 triangle, 2 square, 3 saw. Frequency glides f0 -> f1 (exponential). */
function tone(b: Buf, start: number, dur: number, f0: number, f1: number, vol: number,
  wave = 0, attack = 0.004, decay = 8, vibrato = 0): void {
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  const ratio = f1 / f0;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx >= b.length) {
      break;
    }
    const t = i / RATE;
    let f = f0 * Math.pow(ratio, t / dur);
    if (vibrato > 0) {
      f *= 1 + vibrato * Math.sin(TAU * 7 * t);
    }
    ph = (ph + f / RATE) % 1;
    let w: number;
    switch (wave) {
      case 0:
        w = Math.sin(TAU * ph);
        break;
      case 1:
        w = 4 * Math.abs(ph - 0.5) - 1;
        break;
      case 2:
        w = ph < 0.5 ? 0.6 : -0.6;
        break;
      default:
        w = (2 * ph - 1) * 0.7;
    }
    const env = Math.min(1, t / attack) * Math.exp(-decay * t) * Math.min(1, (dur - t) / 0.006);
    b[idx] += w * env * vol;
  }
}

/** Filtered noise. lp/hp are cutoff frequencies in Hz (0 = off); lpEnd sweeps the lowpass. */
function noise(b: Buf, start: number, dur: number, vol: number, lp: number, hp: number,
  attack = 0.002, decay = 10, lpEnd = -1): void {
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  let yLp = 0;
  let yHp = 0;
  if (lpEnd < 0) {
    lpEnd = lp;
  }
  const ah = 1 - Math.exp((-TAU * hp) / RATE);
  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx >= b.length) {
      break;
    }
    const t = i / RATE;
    let x = rand(-1, 1);
    if (lp > 0) {
      const fc = lp + (lpEnd - lp) * (t / dur);
      yLp += (1 - Math.exp((-TAU * fc) / RATE)) * (x - yLp);
      x = yLp;
    }
    if (hp > 0) {
      yHp += ah * (x - yHp);
      x -= yHp;
    }
    const env = Math.min(1, t / attack) * Math.exp(-decay * t) * Math.min(1, (dur - t) / 0.006);
    b[idx] += x * env * vol;
  }
}

function finish(b: Buf): Buf {
  let peak = 0.0001;
  for (const v of b) {
    peak = Math.max(peak, Math.abs(v));
  }
  const g = peak > 0.9 ? 0.9 / peak : 1;
  for (let i = 0; i < b.length; i++) {
    let v = Math.max(-1, Math.min(1, b[i] * g));
    v = v * (1.5 - 0.5 * v * v); // soft saturation for warmth
    b[i] = Math.max(-1, Math.min(1, v)) * 0.977;
  }
  return b;
}

function buildAll(): Map<string, Buf> {
  const out = new Map<string, Buf>();
  const add = (name: string, b: Buf): void => {
    out.set(name, finish(b));
  };
  let b: Buf;

  // UI
  b = buf(0.06);
  tone(b, 0, 0.06, 1500, 900, 0.5, 1, 0.001, 55);
  noise(b, 0, 0.012, 0.25, 6000, 1500, 0.0005, 200);
  add('click', b);

  b = buf(0.03);
  tone(b, 0, 0.03, 2400, 2200, 0.18, 0, 0.001, 120);
  add('hover', b);

  b = buf(0.16);
  tone(b, 0, 0.07, 180, 170, 0.45, 2, 0.002, 20);
  tone(b, 0.08, 0.08, 140, 130, 0.45, 2, 0.002, 20);
  add('error', b);

  b = buf(0.5);
  tone(b, 0, 0.08, 988, 988, 0.4, 2, 0.001, 12);
  tone(b, 0.07, 0.43, 1319, 1319, 0.45, 2, 0.001, 7);
  tone(b, 0.07, 0.43, 2638, 2638, 0.12, 0, 0.001, 9);
  add('coin', b);

  b = buf(0.9);
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    tone(b, i * 0.06, 0.6, f, f, 0.32, 1, 0.003, 5);
    tone(b, i * 0.06, 0.5, f * 2, f * 2, 0.08, 0, 0.003, 7);
  });
  noise(b, 0.25, 0.6, 0.06, 0, 6000, 0.05, 5);
  add('unlock', b);

  b = buf(0.5);
  tone(b, 0, 0.5, 1568, 1568, 0.35, 0, 0.002, 7);
  tone(b, 0, 0.5, 3136, 3136, 0.12, 0, 0.002, 10);
  tone(b, 0, 0.5, 2349, 2349, 0.1, 0, 0.002, 9);
  add('star', b);

  b = buf(0.35);
  noise(b, 0, 0.35, 0.3, 400, 0, 0.12, 6, 3000);
  add('whoosh', b);

  // Deployment
  b = buf(0.09);
  tone(b, 0, 0.09, 320, 760, 0.55, 0, 0.002, 30);
  noise(b, 0, 0.01, 0.15, 4000, 0, 0.0005, 300);
  add('place', b);

  b = buf(0.1);
  tone(b, 0, 0.1, 620, 180, 0.45, 1, 0.002, 25);
  add('remove', b);

  // Battle
  b = buf(0.14);
  tone(b, 0, 0.14, 170, 55, 0.7, 0, 0.001, 28);
  noise(b, 0, 0.05, 0.45, 2500, 200, 0.0005, 70);
  add('hit', b);

  b = buf(0.35);
  noise(b, 0, 0.35, 0.8, 9000, 900, 0.0003, 22);
  tone(b, 0, 0.04, 2600, 1200, 0.25, 0, 0.0005, 60);
  noise(b, 0.02, 0.33, 0.25, 1200, 0, 0.01, 9);
  add('shot', b);

  b = buf(0.22);
  tone(b, 0, 0.22, 110, 45, 0.8, 0, 0.002, 14);
  noise(b, 0, 0.12, 0.4, 900, 0, 0.001, 25);
  add('launch', b);

  b = buf(1.1);
  noise(b, 0, 1.1, 1.0, 2200, 0, 0.002, 4.5, 250);
  tone(b, 0, 0.6, 75, 32, 0.9, 0, 0.002, 6);
  noise(b, 0, 0.04, 0.5, 8000, 1500, 0.0005, 80);
  add('boom', b);

  b = buf(0.4);
  tone(b, 0, 0.4, 880, 880, 0.25, 0, 0.02, 7);
  tone(b, 0.05, 0.35, 1318.5, 1318.5, 0.22, 0, 0.02, 7);
  tone(b, 0.1, 0.3, 1760, 1760, 0.12, 0, 0.02, 8);
  add('heal', b);

  b = buf(0.1);
  tone(b, 0, 0.1, 1400, 700, 0.25, 2, 0.001, 25, 0.08);
  add('zap', b);

  b = buf(0.3);
  noise(b, 0, 0.3, 0.6, 600, 0, 0.08, 9, 5000);
  tone(b, 0.05, 0.2, 140, 60, 0.6, 0, 0.002, 18);
  add('cleave', b);

  b = buf(0.25);
  tone(b, 0, 0.25, 520, 130, 0.45, 1, 0.001, 14);
  noise(b, 0, 0.18, 0.5, 7000, 1200, 0.0005, 22);
  add('death', b);

  b = buf(0.2);
  tone(b, 0, 0.2, 300, 900, 0.4, 3, 0.002, 10);
  noise(b, 0, 0.15, 0.3, 3000, 400, 0.01, 15);
  add('charge', b);

  // Stingers
  b = buf(1.1);
  [261.63, 329.63, 392.0].forEach((f, i) => {
    tone(b, i * 0.09, 0.9 - i * 0.09, f, f, 0.3, 3, 0.01, 2.5);
    tone(b, i * 0.09, 0.9 - i * 0.09, f * 0.5, f * 0.5, 0.2, 1, 0.01, 2.5);
  });
  tone(b, 0.27, 0.8, 523.25, 523.25, 0.32, 3, 0.02, 2.2);
  noise(b, 0, 0.3, 0.2, 300, 0, 0.002, 12);
  add('start', b);

  b = buf(1.8);
  const vic = [523.25, 659.25, 783.99, 1046.5];
  vic.forEach((f, i) => tone(b, i * 0.11, 0.25, f, f, 0.35, 2, 0.003, 9));
  for (const f of vic) {
    tone(b, 0.48, 1.3, f, f, 0.18, 1, 0.01, 2.2);
    tone(b, 0.48, 1.3, f * 2, f * 2, 0.05, 0, 0.01, 3);
  }
  add('victory', b);

  b = buf(1.6);
  [392.0, 311.13, 261.63].forEach((f, i) => {
    tone(b, i * 0.22, i < 2 ? 0.6 : 1.2, f, f * 0.985, 0.32, 3, 0.01, 3, 0.004);
  });
  tone(b, 0.44, 1.1, 130.81, 130.81, 0.3, 1, 0.01, 2.5);
  add('defeat', b);

  return out;
}

export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private last = new Map<string, number>();
  private uiActive = 0;
  private worldActive = 0;

  /** Call from a user gesture. Creates the context and synthesizes everything once. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      return;
    }
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);
    for (const [name, data] of buildAll()) {
      const ab = ctx.createBuffer(1, data.length, RATE);
      ab.getChannelData(0).set(data);
      this.buffers.set(name, ab);
    }
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  /** pan: null for UI sounds, otherwise -1..1. */
  play(name: string, pan: number | null = null, volDb = 0, pitch = 1, spread = 0.06): void {
    const ctx = this.ctx;
    const buffer = this.buffers.get(name);
    if (this.muted || !ctx || !this.master || !buffer || ctx.state !== 'running') {
      return;
    }
    const now = ctx.currentTime;
    const gap = MIN_GAP[name];
    if (gap !== undefined && now - (this.last.get(name) ?? -1) < gap) {
      return;
    }
    const world = pan !== null;
    if (world ? this.worldActive >= WORLD_VOICES : this.uiActive >= UI_VOICES) {
      return;
    }
    this.last.set(name, now);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch * rand(1 - spread, 1 + spread);
    const gain = ctx.createGain();
    gain.gain.value = Math.pow(10, volDb / 20);
    src.connect(gain);
    let panner: StereoPannerNode | null = null;
    if (world && ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.value = pan * 0.8;
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    if (world) {
      this.worldActive++;
    } else {
      this.uiActive++;
    }
    src.onended = () => {
      if (world) {
        this.worldActive--;
      } else {
        this.uiActive--;
      }
      src.disconnect();
      gain.disconnect();
      panner?.disconnect();
    };
    src.start();
  }
}
