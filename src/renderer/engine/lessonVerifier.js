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

// ---------------------------------------------------------------------------
// Source-code verification
//
// For languages like HTML that don't produce stdout (they render in the
// live preview instead), we verify by checking the editor source code
// against a list of required patterns.
//
// Lessons declare `sourceChecks` — an array of strings or regex patterns
// that must all be found in the source. Match type is governed by
// `matchType`:
//   - "source-contains"  → every entry in sourceChecks must appear as a
//                            substring (case-insensitive) in the source.
//   - "source-regex"     → every entry in sourceChecks is treated as a
//                            regex that must match.
//
// Returns `{ pass, expected, actual, reason }` — same shape as
// verifyLessonOutput so the UI can render it without changes.

export function verifyLessonSource(sourceCode, lesson) {
  if (!lesson) {
    return { pass: false, expected: '', actual: '', reason: 'No lesson active.' };
  }

  const source   = String(sourceCode || '');
  const checks   = lesson.sourceChecks || [];
  const matchType = lesson.matchType || 'source-contains';

  // If no source checks are defined, fall back to a simple content
  // check: the lesson's expectedOutput (treated as a required substring
  // of the source).
  if (checks.length === 0 && lesson.expectedOutput) {
    checks.push(lesson.expectedOutput);
  }

  if (checks.length === 0) {
    // Nothing to verify — auto-pass (teaching-only lesson).
    return { pass: true, expected: '', actual: '', reason: '' };
  }

  const failed = [];
  for (const check of checks) {
    if (matchType === 'source-regex') {
      try {
        if (!new RegExp(check, 'i').test(source)) failed.push(check);
      } catch {
        failed.push(check);
      }
    } else {
      // source-contains (default)
      if (!source.toLowerCase().includes(String(check).toLowerCase())) {
        failed.push(check);
      }
    }
  }

  const pass = failed.length === 0;
  const expected = failed.map((f) => `Must contain: ${f}`).join('\n');
  return {
    pass,
    expected,
    actual: source.slice(0, 500),
    reason: pass ? '' : `Your code is missing required content.\n${expected}`,
  };
}
