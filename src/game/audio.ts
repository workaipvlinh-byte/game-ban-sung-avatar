// Âm thanh của game, chỉ phát ở trang stage.
// Nhạc nền: có file public/assets/nhac/nhac-nen.mp3 thì phát file đó, chưa có thì dùng nhạc DJ tự tạo bằng code (không dính bản quyền).
// MC nói thì nhạc nhỏ xuống. Phát bằng <audio> vì LIVE Studio có thể chặn Web Audio phát trực tiếp.
// Hiệu ứng: tiếng bắn, tiếng sơn văng, tiếng quà, mưa sơn. Muốn tiếng thật: bỏ file mp3 cùng tên vào public/assets/sfx/ (ban.mp3, splat.mp3, qua.mp3, muason.mp3).
import { IS_STAGE } from '../live/page';
import { voice } from '../live/voice';

const RATE = 32000;
const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Nhạc DJ 128 BPM: trống 4 phách, vỗ tay, hi-hat, bass nảy, hợp âm giật (8 ô nhịp lặp) */
export async function renderDJ(): Promise<AudioBuffer> {
  const bpm = 128;
  const beat = 60 / bpm;
  const bars = 8;
  const len = beat * 4 * bars;
  const ctx = new OfflineAudioContext(1, Math.ceil((len + 0.01) * RATE), RATE);
  const out = ctx.createGain();
  out.connect(ctx.destination);
  const noise = ctx.createBuffer(1, RATE, RATE);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const kick = (t: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.32);
  };
  const hiss = (t: number, dur: number, vol: number, hp: number) => {
    const sNode = ctx.createBufferSource();
    sNode.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    sNode.connect(f);
    f.connect(g);
    g.connect(out);
    sNode.start(t);
    sNode.stop(t + dur + 0.02);
  };
  const synth = (f: number, t: number, dur: number, vol: number, cutoff: number) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp);
    lp.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  };
  // Am - F - C - G
  const roots = [57, 53, 48, 55];
  const triads = [[69, 72, 76], [69, 72, 77], [67, 72, 76], [67, 71, 74]];
  for (let b = 0; b < bars; b++) {
    const t0 = b * beat * 4;
    const ch = b % 4;
    for (let i = 0; i < 4; i++) {
      const t = t0 + i * beat;
      kick(t);
      hiss(t + beat / 2, 0.08, 0.25, 7000); // hi-hat giữa phách
      if (i % 2 === 1) hiss(t, 0.18, 0.45, 1200); // vỗ tay phách 2, 4
      synth(freq(roots[ch] - 12), t + beat / 2, beat * 0.45, 0.35, 600); // bass nảy
      if (i % 2 === 0 || b % 2 === 1) for (const n of triads[ch]) synth(freq(n), t + (i % 2 ? beat * 0.75 : 0), beat * 0.3, 0.07, 2600);
    }
    if (b === bars - 1) for (let k = 0; k < 8; k++) hiss(t0 + beat * 2 + (k * beat) / 4, 0.1, 0.15 + k * 0.04, 3000); // dồn trống cuối vòng
  }
  const buf = await ctx.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.92 / peak;
  return buf;
}

/** AudioBuffer (mono) -> file WAV 16-bit */
function toWav(buf: AudioBuffer): Blob {
  const d = buf.getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + d.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  out.setUint32(4, 36 + d.length * 2, true);
  str(8, 'WAVEfmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, d.length * 2, true);
  for (let i = 0; i < d.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 0x7fff, true);
  return new Blob([out], { type: 'audio/wav' });
}

class Music {
  private el: HTMLAudioElement | null = null;
  on = true;
  level = 1; // 0..2, chỉnh ở trang điều khiển

  start() {
    if (!IS_STAGE || this.el) return;
    const el = new Audio('/assets/nhac/nhac-nen.mp3');
    el.loop = true;
    el.volume = 0;
    this.el = el;
    // chưa có file nhạc: dựng nhạc DJ bằng code
    el.addEventListener(
      'error',
      () =>
        void renderDJ()
          .then((buf) => (el.src = URL.createObjectURL(toWav(buf))))
          .catch((err) => console.warn('Không dựng được nhạc nền:', err)),
      { once: true },
    );
    const tryPlay = () => this.on && el.paused && el.src && el.play().catch(() => {});
    setInterval(tryPlay, 2000); // trình duyệt chặn tự phát thì thử lại
    window.addEventListener('pointerdown', tryPlay);
    setInterval(() => {
      const target = this.on && voice.enabled ? Math.min(1, (voice.busy ? 0.18 : 0.45) * this.level) : 0;
      el.volume = Math.max(0, Math.min(1, el.volume + (target - el.volume) * 0.3));
      if (!this.on && el.volume < 0.01) el.pause();
    }, 100);
  }
}

export type SfxName = 'ban' | 'splat' | 'qua' | 'muason';

class Sfx {
  volume = 0.5; // 0..1
  private ctx: AudioContext | null = null;
  private files: Partial<Record<SfxName, HTMLAudioElement>> = {};

  load() {
    if (!IS_STAGE) return;
    for (const n of ['ban', 'splat', 'qua', 'muason'] as SfxName[]) {
      const a = new Audio(`/assets/sfx/${n}.mp3`);
      a.preload = 'auto';
      a.addEventListener('canplaythrough', () => (this.files[n] = a), { once: true });
    }
  }

  play(name: SfxName) {
    if (!IS_STAGE || this.volume <= 0 || !voice.enabled) return;
    const file = this.files[name];
    if (file) {
      const a = file.cloneNode() as HTMLAudioElement;
      a.volume = this.volume;
      void a.play().catch(() => {});
      return;
    }
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      SYNTH[name](this.ctx, this.volume);
    } catch {
      // trình duyệt không cho phát tiếng: bỏ qua
    }
  }
}

function noiseBuf(ctx: BaseAudioContext, secs: number) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function tone(ctx: AudioContext, type: OscillatorType, f0: number, f1: number, at: number, dur: number, vol: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}
function hiss(ctx: AudioContext, at: number, dur: number, vol: number, type: BiquadFilterType, f: number) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf(ctx, dur);
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  s.connect(fl).connect(g).connect(ctx.destination);
  s.start(at);
}

const SYNTH: Record<SfxName, (ctx: AudioContext, v: number) => void> = {
  // súng sơn: "pụp" hơi nén + xì
  ban: (c, v) => {
    // súng sơn: "tách" cò + "phụp" hơi nén bật bi sơn + "xì" xả hơi
    const t = c.currentTime;
    hiss(c, t, 0.02, 0.6 * v, 'highpass', 4000); // tách
    tone(c, 'sine', 210, 70, t + 0.005, 0.09, 0.7 * v); // phụp (thân)
    hiss(c, t + 0.005, 0.07, 0.9 * v, 'bandpass', 900); // phụp (hơi)
    hiss(c, t + 0.04, 0.32, 0.22 * v, 'highpass', 2500); // xì
  },
  // sơn văng lên tường: "bẹp" ướt
  splat: (c, v) => {
    const t = c.currentTime;
    // bi sơn vỡ trên tường: "bộp" + nước văng
    tone(c, 'sine', 140, 45, t, 0.12, 0.6 * v);
    hiss(c, t, 0.06, 0.8 * v, 'bandpass', 1400);
    hiss(c, t + 0.03, 0.22, 0.35 * v, 'lowpass', 2200);
  },
  // quà tới: 3 nốt đi lên
  qua: (c, v) => {
    const t = c.currentTime;
    [72, 76, 79, 84].forEach((m, i) => tone(c, 'triangle', freq(m), freq(m), t + i * 0.09, 0.3, 0.25 * v));
  },
  // đầy tim: còi hú đi lên
  muason: (c, v) => {
    const t = c.currentTime;
    tone(c, 'sawtooth', 200, 1200, t, 0.8, 0.12 * v);
    tone(c, 'sawtooth', 300, 1800, t + 0.1, 0.8, 0.08 * v);
  },
};

export const music = new Music();
export const sfx = new Sfx();
