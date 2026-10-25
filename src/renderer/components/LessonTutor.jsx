import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { askLessonTutor } from '../engine/aiService';

const STARTERS = [
  'Explain this lesson in simpler terms.',
  'Give me an example that is not from this lesson.',
  'Why does this concept matter?',
  'Connect this to something I already know.',
];

const EXERCISE_STARTERS = [
  'Explain the concept behind this exercise.',
  'Give me a different example of this concept.',
  'Why does this concept matter in real code?',
  'What should I understand before trying the exercise?',
];

export default function LessonTutor({
  lesson,
  code = '',
  language = 'javascript',
  status = 'idle',
  verification = null,
  coaching = [],
  runOutput = null,
  restricted = false,
  revealedHints = 0,
  onClose,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const lessonIdRef = useRef(lesson?.id);
  const scopeRef = useRef(restricted);
  const starters = restricted ? EXERCISE_STARTERS : STARTERS;

  useEffect(() => {
    if (lessonIdRef.current === lesson?.id) return;
    lessonIdRef.current = lesson?.id;
    setMessages([]);
    setInput('');
    setError(null);
  }, [lesson?.id]);

  useEffect(() => {
    if (scopeRef.current === restricted) return;
    scopeRef.current = restricted;
    setMessages([]);
    setInput('');
    setError(null);
  }, [restricted]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, loading, error]);

  const send = async (override) => {
    const question = String(override ?? input).trim();
    if (!question || loading) return;
    const next = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const answer = await askLessonTutor({
        lesson,
        code,
        language,
        status,
        verification,
        coaching,
        runOutput,
        messages,
        question,
        restricted,
        revealedHints,
      });
      setMessages([...next, { role: 'assistant', content: answer }]);
    } catch (err) {
      setError(err?.message || 'The tutor could not answer. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <section className="lesson-tutor" aria-label="Lesson tutor">
      <header className="lesson-tutor__header">
        <div>
          <span className="lesson-tutor__eyebrow"><Sparkles size={11} /> Lesson tutor</span>
          <span className="lesson-tutor__context">{lesson?.title || 'Current lesson'}</span>
        </div>
        <div className="lesson-tutor__header-actions">
          {messages.length > 0 && (
            <button type="button" className="lesson-tutor__ghost" onClick={() => { setMessages([]); setError(null); }}>
              Clear
            </button>
          )}
          <button type="button" className="lesson-tutor__icon" onClick={onClose} aria-label="Close tutor">
            <X size={14} />
          </button>
        </div>
      </header>

      {restricted && (
        <div className="lesson-tutor__scope">
          {Array.isArray(lesson?.hints) && lesson.hints.length > 0
            ? 'Concept help only. Exercise hints and debugging stay in the lesson.'
            : 'Concept help only. The tutor will not write the exercise for you.'}
        </div>
      )}

      <div className="lesson-tutor__messages" aria-live="polite">
        {messages.length === 0 && !loading && (
          <div className="lesson-tutor__empty">
            <p>
              {restricted
                ? 'Ask about the idea behind this exercise. Use the lesson hint button when you want the next nudge.'
                : 'Ask about this lesson, the concept, or a different example.'}
            </p>
            <div className="lesson-tutor__starters">
              {starters.map((starter) => (
                <button key={starter} type="button" className="lesson-tutor__starter" onClick={() => send(starter)}>
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`lesson-tutor__message lesson-tutor__message--${message.role}`}
          >
            {message.content}
          </div>
        ))}

        {loading && (
          <div className="lesson-tutor__thinking">
            <Loader2 size={12} className="upgrade-spin" /> Reading your code…
          </div>
        )}

        {error && (
          <div className="lesson-tutor__error" role="alert">{error}</div>
        )}
        <div ref={endRef} />
      </div>

      <div className="lesson-tutor__composer">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={restricted ? 'Ask about the concept, not the exercise…' : 'Ask for a clearer explanation or a different example…'}
          rows={2}
          disabled={loading}
          aria-label="Ask the lesson tutor"
        />
        <button
          type="button"
          className="lesson-tutor__send"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          aria-label="Send question"
        >
          {loading ? <Loader2 size={14} className="upgrade-spin" /> : <Send size={14} />}
        </button>
      </div>
    </section>
  );
}
