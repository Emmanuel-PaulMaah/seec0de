import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Loader2, Mic, RotateCcw, SkipForward, Sparkles } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { askInterviewCoach } from '../engine/aiService';
import { INTERVIEW_LEVELS, questionsFor } from '../data/interviewQuestions';
import { languageLabel } from '../data/languages';

const FALLBACK_FEEDBACK = {
  score: 3,
  strengths: ['You gave a complete answer with enough detail to discuss.'],
  improvements: ['Add one concrete example from your own work.', 'Name one trade-off before you conclude.'],
  followUp: 'Can you walk me through one specific example in more detail?',
};

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function InterviewModal({ open, onClose, language = 'javascript' }) {
  const [stage, setStage] = useState('setup');
  const [level, setLevel] = useState('mid');
  const [count, setCount] = useState(3);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setStage('setup');
    setLevel('mid');
    setCount(3);
    setQuestions([]);
    setIndex(0);
    setAnswer('');
    setFeedback(null);
    setResults([]);
    setBusy(false);
    setError(null);
    setElapsed(0);
    startedRef.current = 0;
  }, [open, language]);

  useEffect(() => {
    if (!open || stage === 'setup' || stage === 'summary') return undefined;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [open, stage]);

  const start = () => {
    const picked = questionsFor(language, level, count);
    startedRef.current = Date.now();
    setElapsed(0);
    setQuestions(picked);
    setIndex(0);
    setResults(picked.map(() => null));
    setAnswer('');
    setFeedback(null);
    setError(null);
    setStage('question');
  };

  const question = questions[index] || null;

  const submit = async () => {
    if (!question || !answer.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await askInterviewCoach({
        language,
        level,
        question: question.prompt,
        answer: answer.trim(),
      });
      setFeedback(result);
      setResults((previous) => previous.map((item, itemIndex) => (itemIndex === index ? result : item)));
    } catch (err) {
      setFeedback(FALLBACK_FEEDBACK);
      setResults((previous) => previous.map((item, itemIndex) => (itemIndex === index ? FALLBACK_FEEDBACK : item)));
      setError(`${err?.message || 'AI feedback is unavailable.'} Showing a general rubric instead.`);
    } finally {
      setBusy(false);
      setStage('feedback');
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setStage('summary');
      return;
    }
    setIndex((value) => value + 1);
    setAnswer('');
    setFeedback(null);
    setError(null);
    setStage('question');
  };

  const skip = () => {
    if (index + 1 >= questions.length) {
      setStage('summary');
      return;
    }
    setIndex((value) => value + 1);
    setAnswer('');
    setFeedback(null);
    setError(null);
  };

  const restart = () => {
    setStage('setup');
    setQuestions([]);
    setIndex(0);
    setAnswer('');
    setFeedback(null);
    setResults([]);
    setError(null);
    setElapsed(0);
    startedRef.current = 0;
  };

  const evaluated = results.filter(Boolean);
  const average = evaluated.length
    ? (evaluated.reduce((sum, result) => sum + result.score, 0) / evaluated.length).toFixed(1)
    : '—';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="interview-dialog"
      title="Interview practice"
      description={`${languageLabel(language)} · realistic questions with structured feedback.`}
      footer={<button type="button" className="upgrade-secondary-btn" onClick={onClose}>Close</button>}
    >
      {stage === 'setup' && (
        <div className="interview-setup">
          <div className="interview-setup-row">
            <span className="interview-label">Level</span>
            <div className="interview-segment">
              {INTERVIEW_LEVELS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={level === item.id ? 'is-active' : ''}
                  onClick={() => setLevel(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="interview-setup-row">
            <span className="interview-label">Questions</span>
            <div className="interview-segment">
              {[3, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={count === value ? 'is-active' : ''}
                  onClick={() => setCount(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="interview-brief">
            <Mic size={17} />
            <p>Answer as you would out loud. You will get a score, strengths, improvements, and a follow-up question. No timer pressure — the clock is just for reflection.</p>
          </div>
          <button type="button" className="interview-primary" onClick={start}>
            Start practice <ArrowRight size={14} />
          </button>
        </div>
      )}

      {stage === 'question' && question && (
        <div className="interview-session">
          <div className="interview-session-top">
            <span>Question {index + 1} of {questions.length}</span>
            <span className="interview-timer"><Clock3 size={12} /> {formatTime(elapsed)}</span>
          </div>
          <span className="interview-category">{question.category} · {level}</span>
          <p className="interview-question">{question.prompt}</p>
          <details className="interview-hint">
            <summary>Show a hint</summary>
            <p>{question.hint}</p>
          </details>
          <label className="interview-label" htmlFor="interview-answer">Your answer</label>
          <textarea
            id="interview-answer"
            className="interview-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Structure your answer: context, what you did, why, and the result…"
            rows={7}
            disabled={busy}
          />
          {error && <p className="interview-error" role="alert">{error}</p>}
          <div className="interview-actions">
            <button type="button" className="interview-ghost" onClick={skip} disabled={busy}>
              <SkipForward size={13} /> Skip
            </button>
            <button type="button" className="interview-primary" onClick={submit} disabled={busy || !answer.trim()}>
              {busy ? <Loader2 size={13} className="upgrade-spin" /> : <Sparkles size={13} />}
              {busy ? 'Reading answer…' : 'Get feedback'}
            </button>
          </div>
        </div>
      )}

      {stage === 'feedback' && feedback && question && (
        <div className="interview-session">
          <div className="interview-session-top">
            <span>Feedback</span>
            <span className="interview-timer"><Clock3 size={12} /> {formatTime(elapsed)}</span>
          </div>
          <div className="interview-score">
            <strong>{feedback.score}</strong><span>/5</span>
          </div>
          <div className="interview-feedback-block">
            <span className="interview-feedback-title"><CheckCircle2 size={13} /> What worked</span>
            <ul>{feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="interview-feedback-block">
            <span className="interview-feedback-title"><Sparkles size={13} /> What to sharpen</span>
            <ul>{feedback.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          {feedback.followUp && (
            <div className="interview-followup">
              <span>Likely follow-up</span>
              <p>{feedback.followUp}</p>
            </div>
          )}
          {error && <p className="interview-error" role="alert">{error}</p>}
          <div className="interview-actions">
            <button type="button" className="interview-ghost" onClick={restart}>Restart</button>
            <button type="button" className="interview-primary" onClick={next}>
              {index + 1 >= questions.length ? 'See summary' : 'Next question'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {stage === 'summary' && (
        <div className="interview-summary">
          <div className="interview-summary-score">
            <span>Average score</span>
            <strong>{average}<small>{evaluated.length ? '/5' : ''}</small></strong>
            <span>{evaluated.length} of {questions.length} answers evaluated · {formatTime(elapsed)}</span>
          </div>
          <div className="interview-summary-list">
            {questions.map((item, itemIndex) => (
              <div key={item.id} className="interview-summary-row">
                <span>{itemIndex + 1}. {item.prompt}</span>
                <strong>{results[itemIndex]?.score ?? '—'}</strong>
              </div>
            ))}
          </div>
          <div className="interview-actions">
            <button type="button" className="interview-ghost" onClick={restart}>
              <RotateCcw size={13} /> Practice again
            </button>
            <button type="button" className="interview-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
