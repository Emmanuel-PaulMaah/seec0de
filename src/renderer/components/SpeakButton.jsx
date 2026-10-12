// SpeakButton — read a piece of lesson/explanation text aloud with the
// Web Speech API. While it plays it becomes Pause + Stop; unmounting the
// owning panel stops the reading (audit item: "Speech stops on navigation").

import React, { useEffect } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { stopSpeechIfActive, toggleSpeech, useSpeech } from '../lib/hooks/useSpeech';

export default function SpeakButton({ text, title = 'Read aloud', style }) {
  const speech = useSpeech();
  const isReadingThis = speech.speaking && speech.activeText === text;

  useEffect(() => () => stopSpeechIfActive(text), [text]);

  if (!speech.supported || !text) return null;

  if (!isReadingThis) {
    return (
      <button
        type="button"
        className="ui-icon-button"
        style={style}
        onClick={() => toggleSpeech(text)}
        title={title}
        aria-label={title}
      >
        <Volume2 size={12} />
      </button>
    );
  }

  const paused = speech.paused;
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      <button
        type="button"
        className="ui-icon-button"
        style={style}
        onClick={() => toggleSpeech(text)}
        title={paused ? 'Resume reading' : 'Pause reading'}
        aria-label={paused ? 'Resume reading' : 'Pause reading'}
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
      </button>
      <button
        type="button"
        className="ui-icon-button"
        style={style}
        onClick={() => stopSpeechIfActive(text)}
        title="Stop reading"
        aria-label="Stop reading"
      >
        <Square size={11} />
      </button>
    </span>
  );
}
