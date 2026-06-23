// Lightweight WebAudio ringtone (no asset files needed).
// Plays a soft repeating two-tone bell pattern until stopped.

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let timer: number | null = null;
let started = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function beep(freq: number, durMs: number, when: number) {
  const c = getCtx();
  if (!c || !gain) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + when);
  g.gain.linearRampToValueAtTime(0.6, c.currentTime + when + 0.02);
  g.gain.linearRampToValueAtTime(0, c.currentTime + when + durMs / 1000);
  o.connect(g).connect(gain);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + durMs / 1000 + 0.02);
}

export function startRingtone(variant: "incoming" | "outgoing" = "incoming") {
  if (started) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  gain = c.createGain();
  gain.gain.value = 0.25;
  gain.connect(c.destination);
  started = true;

  const ring = () => {
    if (!started) return;
    if (variant === "incoming") {
      beep(880, 250, 0);
      beep(660, 250, 0.3);
      beep(880, 250, 0.6);
      beep(660, 250, 0.9);
    } else {
      beep(520, 350, 0);
      beep(440, 450, 0.4);
    }
  };
  ring();
  timer = window.setInterval(ring, variant === "incoming" ? 1800 : 2400);
}

export function stopRingtone() {
  started = false;
  if (timer) { window.clearInterval(timer); timer = null; }
  try { gain?.disconnect(); } catch {}
  gain = null;
}
