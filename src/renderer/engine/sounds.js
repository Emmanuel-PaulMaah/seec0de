// Lesson feedback sounds, synthesised in-browser with the Web Audio API
// so we don't need to ship audio files. `playLessonSound(true)` plays a
// bright ascending chime when a lesson is nailed; `playLessonSound(false)`
// plays a soft descending "nope" when a run fails. Muted via the
// `soundsEnabled` setting (Settings → Sounds).

import { loadSettings } from './settings';

let audioCtx = null;

function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  // Browsers can start the context suspended; resume on first play.
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Play one tone: start/end frequency, delay, duration, waveform, volume.
function tone(ctx, { frequency, endFrequency, start, duration, type = 'sine', volume = 0.2 }) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  if (endFrequency) {
    osc.frequency.exponentialRampToValueAtTime(endFrequency, t0 + duration);
  }
  // Small attack/release ramps avoid clicks at the edges.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// Positive: ascending major arpeggio (C5-E5-G5-C6) with a high sparkle.
function playPass() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((frequency, i) => {
    tone(ctx, { frequency, start: i * 0.09, duration: 0.5, type: 'sine', volume: 0.22 });
  });
  tone(ctx, { frequency: 1567.98, start: 0.36, duration: 0.7, type: 'sine', volume: 0.1 }); // G6 sparkle
}

// Negative: soft descending "nope" (E4 -> C4, then down to G3).
function playFail() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  tone(ctx, { frequency: 329.63, endFrequency: 261.63, start: 0, duration: 0.35, type: 'triangle', volume: 0.25 });
  tone(ctx, { frequency: 261.63, endFrequency: 196.0, start: 0.3, duration: 0.5, type: 'triangle', volume: 0.22 });
}

export function playLessonSound(passed) {
  if (loadSettings().soundsEnabled === false) return;
  if (passed) {
    playPass();
  } else {
    playFail();
  }
}
