// lessonVerifier — checks a runner result against a lesson's expected output.
//
// Lessons in `data/lessons/index.js` declare an `expectedOutput` plus a
// `matchType`:
//   - "exact"    → stdout (normalised) must equal expectedOutput (normalised)
//   - "contains" → stdout must contain expectedOutput as a substring
//   - "regex"    → expectedOutput is treated as a JS regex pattern
//
// Normalisation: trim leading/trailing whitespace, convert \r\n → \n.
// That way "hello\n" matches "hello" and Windows line endings don't sink
// otherwise-correct lessons.
//
// Returns `{ pass, expected, actual, reason }`. `reason` is a short human
// string the UI shows when a check fails. `expected` and `actual` are
// the *normalised* strings so the UI can render a diff-friendly view.

function normalise(text) {
  if (text == null) return '';
  return String(text).replace(/\r\n/g, '\n').replace(/\s+$/g, '').replace(/^\s+/g, '');
}

export function verifyLessonOutput(runnerOutput, lesson) {
  if (!lesson) {
    return { pass: false, expected: '', actual: '', reason: 'No lesson active.' };
  }
  const expectedRaw = lesson.expectedOutput || '';
  const matchType   = lesson.matchType || 'exact';

  // Runner errors short-circuit. If the program crashed, the user needs
  // to fix that before output matching can mean anything.
  if (runnerOutput?.exitCode !== 0 || (runnerOutput?.stderr || '').trim()) {
    return {
      pass: false,
      expected: normalise(expectedRaw),
      actual:   normalise(runnerOutput?.stdout || ''),
      reason:   'Your code didn\'t run cleanly — check the error in the Console, then try again.',
    };
  }

  const expected = normalise(expectedRaw);
  const actual   = normalise(runnerOutput?.stdout || '');

  let pass = false;
  if (matchType === 'contains') {
    pass = actual.includes(expected);
  } else if (matchType === 'regex') {
    try {
      pass = new RegExp(expected).test(actual);
    } catch {
      pass = false;
    }
  } else {
    pass = actual === expected;
  }

  return {
    pass,
    expected,
    actual,
    reason: pass ? '' : 'Your output didn\'t match what the lesson expected.',
  };
}

// Flatten all lessons across all tracks into one ordered list so the
// "next lesson" button can step through them in curriculum order.
export function flattenLessons(lessonsData) {
  const out = [];
  (lessonsData?.tracks || []).forEach((track) => {
    (track.lessons || []).forEach((lesson) => {
      out.push({ ...lesson, trackId: track.id, language: track.language });
    });
  });
  return out;
}

export function nextLessonAfter(lessonsData, currentId) {
  const all = flattenLessons(lessonsData);
  const idx = all.findIndex((l) => l.id === currentId);
  if (idx < 0 || idx >= all.length - 1) return null;
  return all[idx + 1];
}
