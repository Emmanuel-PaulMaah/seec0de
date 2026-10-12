// useSpeech — text-to-speech for lessons and explanations via the Web
// Speech API (UI audit 2026-10-08, "Speak"). Free, built into Chromium,
// works offline; natural-sounding voices can come later via a Pro TTS API.
//
// A module-level store guarantees exactly one utterance is ever in flight:
// every SpeakButton in the app agrees on what is speaking, and starting a
// new reading stops the previous one.

import { useEffect, useState } from 'react';

const VOICE_KEY = 'seec0de.speak.voiceURI';
const RATE_KEY = 'seec0de.speak.rate';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const store = {
  speaking: false,
  paused: false,
  activeText: null,   // full text currently being read
  activeSentence: -1, // index into splitSentences(activeText), for highlighting
  voices: [],
  voiceURI: (typeof localStorage !== 'undefined' && localStorage.getItem(VOICE_KEY)) || '',
  rate: Number((typeof localStorage !== 'undefined' && localStorage.getItem(RATE_KEY))) || 1,
  listeners: new Set(),
};

function emit() {
  store.listeners.forEach((listener) => listener());
}

// Split into sentences while keeping their terminators, so the spoken
// chunks and the highlighted chunks are the same strings.
export function splitSentences(text) {
  if (!text) return [];
  const parts = String(text).match(/[^.!?]+[.!?]*\s*/g) || [String(text)];
  return parts.map((part) => part.trim()).filter(Boolean);
}

// Chrome pauses speechSynthesis after ~15 s unless resume() is pinged.
let keepAlive = null;
function startKeepAlive() {
  if (keepAlive || !supported) return;
  keepAlive = setInterval(() => {
    if (store.speaking && !store.paused) window.speechSynthesis.resume();
  }, 10000);
}
function stopKeepAlive() {
  clearInterval(keepAlive);
  keepAlive = null;
}

export function stopSpeech() {
  if (supported) window.speechSynthesis.cancel();
  stopKeepAlive();
  store.speaking = false;
  store.paused = false;
  store.activeText = null;
  store.activeSentence = -1;
  emit();
}

// Used by SpeakButton's unmount cleanup: only stop if this button's own
// text is what's speaking — some other panel's reading keeps going.
export function stopSpeechIfActive(text) {
  if (store.activeText === text) stopSpeech();
}

function chosenVoice() {
  return store.voices.find((voice) => voice.voiceURI === store.voiceURI) || null;
}

export function speak(text) {
  if (!supported || !text) return;
  stopSpeech();
  const sentences = splitSentences(text);
  if (sentences.length === 0) return;
  store.speaking = true;
  store.activeText = text;
  startKeepAlive();
  emit();

  const step = (index) => {
    if (!store.speaking || store.activeText !== text) return; // cancelled
    if (index >= sentences.length) { stopSpeech(); return; }
    store.activeSentence = index;
    emit();
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    const voice = chosenVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = store.rate;
    // onend fires on cancel too — the activeText guard tells them apart.
    utterance.onend = () => {
      if (store.speaking && store.activeText === text) step(index + 1);
    };
    utterance.onerror = () => {
      if (store.activeText === text) stopSpeech();
    };
    window.speechSynthesis.speak(utterance);
  };
  step(0);
}

export function toggleSpeech(text) {
  if (!store.speaking) { speak(text); return; }
  if (store.paused) {
    window.speechSynthesis.resume();
    store.paused = false;
  } else {
    window.speechSynthesis.pause();
    store.paused = true;
  }
  emit();
}

export function setSpeechVoice(voiceURI) {
  store.voiceURI = voiceURI;
  if (typeof localStorage !== 'undefined') localStorage.setItem(VOICE_KEY, voiceURI);
  emit();
}

export function setSpeechRate(rate) {
  const next = Math.max(0.5, Math.min(2, rate));
  store.rate = next;
  if (typeof localStorage !== 'undefined') localStorage.setItem(RATE_KEY, String(next));
  emit();
}

if (supported) {
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length && voices.length !== store.voices.length) {
      store.voices = voices;
      emit();
    }
  };
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function useSpeech() {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    store.listeners.add(listener);
    return () => store.listeners.delete(listener);
  }, []);

  return {
    supported,
    speaking: store.speaking,
    paused: store.paused,
    activeText: store.activeText,
    activeSentence: store.activeSentence,
    voices: store.voices,
    voiceURI: store.voiceURI,
    rate: store.rate,
    speak,
    stop: stopSpeech,
    toggle: toggleSpeech,
    setVoice: setSpeechVoice,
    setRate: setSpeechRate,
  };
}
