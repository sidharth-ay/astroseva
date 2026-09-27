"use client";

/**
 * Pure sine-tone healing sound engine (Web Audio API, no files).
 * Single active tone at a time; full cleanup on stop/unmount.
 */

interface ActiveTone {
  ctx: AudioContext;
  osc: OscillatorNode;
  gain: GainNode;
  hz: number;
}

let active: ActiveTone | null = null;
let volume = 0.2;

export function setHealingVolume(v: number) {
  volume = Math.min(0.5, Math.max(0.05, v));
  if (active) {
    active.gain.gain.setTargetAtTime(volume, active.ctx.currentTime, 0.3);
  }
}

export function getHealingVolume() {
  return volume;
}

export function getPlayingHz(): number | null {
  return active ? active.hz : null;
}

function teardown(tone: ActiveTone) {
  try {
    const t = tone.ctx.currentTime;
    tone.gain.gain.cancelScheduledValues(t);
    tone.gain.gain.setTargetAtTime(0, t, 0.3);
    window.setTimeout(() => {
      try {
        tone.osc.stop();
      } catch { /* already stopped */ }
      tone.osc.disconnect();
      tone.gain.disconnect();
      if (tone.ctx.state !== "closed") {
        tone.ctx.close().catch(() => undefined);
      }
    }, 1100);
  } catch { /* ignore */ }
}

export function stopHealingTone() {
  if (!active) return;
  const tone = active;
  active = null;
  teardown(tone);
}

export function playHealingTone(hz: number): boolean {
  try {
    // Stop any previous tone first — one at a time.
    stopHealingTone();

    const AC: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;

    const ctx = new AC();
    // iOS/Safari may start suspended until a user gesture resumes it.
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    // Soft fade-in (~1.5s) — no clicks.
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    active = { ctx, osc, gain, hz };
    return true;
  } catch {
    return false;
  }
}
