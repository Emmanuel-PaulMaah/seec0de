const EXERCISE_TYPES = new Set(['drill', 'code-along']);

export const CHALLENGE_TYPES = [
  { id: 'code-along', title: 'Code-alongs', description: 'Build a small program one visible step at a time.' },
  { id: 'retrieval', title: 'Retrieval drills', description: 'Recreate a syntax or reasoning pattern from memory.' },
  { id: 'fix', title: 'Fix drills', description: 'Diagnose plausible broken code, then repair it.' },
  { id: 'parsons', title: 'Parsons problems', description: 'Recover the intended structure from scrambled lines.' },
  { id: 'faded', title: 'Faded examples', description: 'Complete a program after key parts have been removed.' },
  { id: 'output-first', title: 'Output-first builds', description: 'Choose the code that produces a required result.' },
  { id: 'explain-change', title: 'Explain and change', description: 'Read existing code, then modify its behaviour.' },
  { id: 'two-solutions', title: 'Two-solution challenges', description: 'Solve clearly, then compare another valid pattern.' },
  { id: 'micro-capstone', title: 'Micro-capstones', description: 'Combine recent concepts in a realistic small program.' },
];

const CHALLENGE_TYPE_BY_ID = Object.fromEntries(CHALLENGE_TYPES.map((type) => [type.id, type]));

function writingChallenge({
  id, language, challengeType, title, concept, task, starterCode,
  expectedOutput, hints, solution, summary,
}) {
  const activity = {
    id: `${id}-writing`,
    type: 'edit',
    title,
    instruction: task,
    successCriteria: `Print exactly:\n${expectedOutput}`,
    starterCode,
    expectedOutput,
    matchType: 'exact',
    hints,
    solution,
  };
  return {
    id,
    kind: 'exercise',
    exerciseType: 'edit',
    challengeType,
    title,
    concept,
    summary,
    task,
    successCriteria: activity.successCriteria,
    activities: [activity],
    teaching: [],
    starterCode,
    expectedOutput,
    matchType: 'exact',
    hints,
    solution,
    language,
    trackId: `${language}-writing-challenges`,
    trackName: 'Writing-first challenges',
    sourceLessonId: null,
    sourceLessonTitle: CHALLENGE_TYPE_BY_ID[challengeType].title,
  };
}

const WRITING_CHALLENGES = [
  writingChallenge({
    id: 'py-fix-average', language: 'python', challengeType: 'fix',
    title: 'Repair the average', concept: 'names and arithmetic',
    summary: 'Find the misspelled name that stops an average calculation.',
    task: 'Run the broken program, use the traceback to find the bad name, and make it print the average.',
    starterCode: `scores = [8, 10, 12]\naverage = sum(score) / len(scores)\nprint(average)`,
    expectedOutput: '10.0', hints: ['Compare every variable name with the name created on line 1.'],
    solution: `scores = [8, 10, 12]\naverage = sum(scores) / len(scores)\nprint(average)`,
  }),
  writingChallenge({
    id: 'js-fix-average', language: 'javascript', challengeType: 'fix',
    title: 'Repair the average', concept: 'array properties and arithmetic',
    summary: 'Find the property typo that breaks an average calculation.',
    task: 'Run the broken program, inspect the result, and repair it so the correct average is printed.',
    starterCode: `const scores = [8, 10, 12];\nconst total = scores.reduce((sum, score) => sum + score, 0);\nconsole.log(total / scores.lenght);`,
    expectedOutput: '10', hints: ['Check the spelling of the array property used for its item count.'],
    solution: `const scores = [8, 10, 12];\nconst total = scores.reduce((sum, score) => sum + score, 0);\nconsole.log(total / scores.length);`,
  }),
  writingChallenge({
    id: 'py-parsons-evens', language: 'python', challengeType: 'parsons',
    title: 'Rebuild the even-number loop', concept: 'loop structure',
    summary: 'Turn scrambled statements into a correctly indented loop.',
    task: 'The comments contain scrambled lines. Rewrite them in the right order and indentation to print the even values.',
    starterCode: `#     if number % 2 == 0:\n#         print(number)\n# for number in [1, 2, 3, 4, 6]:`,
    expectedOutput: `2\n4\n6`, hints: ['The for statement owns the if statement; the if statement owns print.'],
    solution: `for number in [1, 2, 3, 4, 6]:\n    if number % 2 == 0:\n        print(number)`,
  }),
  writingChallenge({
    id: 'js-parsons-evens', language: 'javascript', challengeType: 'parsons',
    title: 'Rebuild the even-number loop', concept: 'loop structure',
    summary: 'Turn scrambled statements into a correctly nested loop.',
    task: 'The comments contain scrambled lines. Rewrite them in the right order with braces to print the even values.',
    starterCode: `//     console.log(number);\n// for (const number of [1, 2, 3, 4, 6]) {\n//   if (number % 2 === 0) {\n//   }\n// }`,
    expectedOutput: `2\n4\n6`, hints: ['The if block belongs inside the for block; console.log belongs inside the if block.'],
    solution: `for (const number of [1, 2, 3, 4, 6]) {\n  if (number % 2 === 0) {\n    console.log(number);\n  }\n}`,
  }),
  writingChallenge({
    id: 'py-faded-score-label', language: 'python', challengeType: 'faded',
    title: 'Complete the score label', concept: 'functions and formatted strings',
    summary: 'Restore the missing function body and call arguments.',
    task: 'Fill the faded parts so the function returns a name and score label.',
    starterCode: `def score_label(name, score):\n    # TODO: return "name: score"\n    pass\n\nprint(score_label(# TODO))`,
    expectedOutput: 'Ada: 9', hints: ['Use an f-string in the return statement.', 'Pass "Ada" and 9 to the function.'],
    solution: `def score_label(name, score):\n    return f"{name}: {score}"\n\nprint(score_label("Ada", 9))`,
  }),
  writingChallenge({
    id: 'js-faded-score-label', language: 'javascript', challengeType: 'faded',
    title: 'Complete the score label', concept: 'functions and template strings',
    summary: 'Restore the missing return value and call arguments.',
    task: 'Fill the faded parts so the function returns a name and score label.',
    starterCode: `function scoreLabel(name, score) {\n  // TODO: return "name: score"\n}\n\nconsole.log(scoreLabel(/* TODO */));`,
    expectedOutput: 'Ada: 9', hints: ['Use a template string in the return statement.', 'Pass "Ada" and 9 to the function.'],
    solution: `function scoreLabel(name, score) {\n  return \`${'${name}'}: ${'${score}'}\`;\n}\n\nconsole.log(scoreLabel("Ada", 9));`,
  }),
  writingChallenge({
    id: 'py-output-word-count', language: 'python', challengeType: 'output-first',
    title: 'Produce the word report', concept: 'collections and counting',
    summary: 'Choose a data structure and control flow from the required output.',
    task: 'Using the provided words, write the program that produces the required two-line count report.',
    starterCode: `words = ["python", "code", "python"]\n\n# Build the report.`,
    expectedOutput: `python=2\ncode=1`, hints: ['A dictionary can map each word to its count.', 'Preserve first-seen order when printing.'],
    solution: `words = ["python", "code", "python"]\ncounts = {}\nfor word in words:\n    counts[word] = counts.get(word, 0) + 1\nfor word, count in counts.items():\n    print(f"{word}={count}")`,
  }),
  writingChallenge({
    id: 'js-output-word-count', language: 'javascript', challengeType: 'output-first',
    title: 'Produce the word report', concept: 'objects and counting',
    summary: 'Choose a data structure and control flow from the required output.',
    task: 'Using the provided words, write the program that produces the required two-line count report.',
    starterCode: `const words = ["javascript", "code", "javascript"];\n\n// Build the report.`,
    expectedOutput: `javascript=2\ncode=1`, hints: ['An object can map each word to its count.', 'Object.entries can provide each word and count.'],
    solution: `const words = ["javascript", "code", "javascript"];\nconst counts = {};\nfor (const word of words) counts[word] = (counts[word] || 0) + 1;\nfor (const [word, count] of Object.entries(counts)) console.log(\`${'${word}'}=${'${count}'}\`);`,
  }),
  writingChallenge({
    id: 'py-explain-change-range', language: 'python', challengeType: 'explain-change',
    title: 'Change the sequence', concept: 'range and expressions',
    summary: 'Read a loop, predict its values, then change the transformation.',
    task: 'Read the existing loop. Change it so it prints the first three positive even numbers instead of 0, 1, 2.',
    starterCode: `for number in range(3):\n    print(number)`,
    expectedOutput: `2\n4\n6`, hints: ['range(1, 4) produces 1, 2, 3.', 'Transform each value by multiplying by 2.'],
    solution: `for number in range(1, 4):\n    print(number * 2)`,
  }),
  writingChallenge({
    id: 'js-explain-change-range', language: 'javascript', challengeType: 'explain-change',
    title: 'Change the sequence', concept: 'indexed loops and expressions',
    summary: 'Read a loop, predict its values, then change the transformation.',
    task: 'Read the existing loop. Change it so it prints the first three positive even numbers instead of 0, 1, 2.',
    starterCode: `for (let number = 0; number < 3; number += 1) {\n  console.log(number);\n}`,
    expectedOutput: `2\n4\n6`, hints: ['Start the counter at 1.', 'Multiply the counter by 2 when printing.'],
    solution: `for (let number = 1; number <= 3; number += 1) {\n  console.log(number * 2);\n}`,
  }),
  writingChallenge({
    id: 'py-two-solutions-squares', language: 'python', challengeType: 'two-solutions',
    title: 'Filter and square', concept: 'loops and comprehensions',
    summary: 'Solve a transformation clearly and compare it with a comprehension.',
    task: 'Print the squares of the even values. Solve with a loop, then compare your code with the comprehension in the solution.',
    starterCode: `numbers = [1, 2, 3, 4]\nresults = []\n# Build results with a loop.\nprint(",".join(str(value) for value in results))`,
    expectedOutput: '4,16', hints: ['Append only when number % 2 equals 0.'],
    solution: `numbers = [1, 2, 3, 4]\n# Loop solution:\nresults = []\nfor number in numbers:\n    if number % 2 == 0:\n        results.append(number ** 2)\n# Equivalent: results = [number ** 2 for number in numbers if number % 2 == 0]\nprint(",".join(str(value) for value in results))`,
  }),
  writingChallenge({
    id: 'js-two-solutions-squares', language: 'javascript', challengeType: 'two-solutions',
    title: 'Filter and square', concept: 'loops and array methods',
    summary: 'Solve a transformation clearly and compare it with filter/map.',
    task: 'Print the squares of the even values. Solve with a loop, then compare your code with filter/map in the solution.',
    starterCode: `const numbers = [1, 2, 3, 4];\nconst results = [];\n// Build results with a loop.\nconsole.log(results.join(","));`,
    expectedOutput: '4,16', hints: ['Push only when number % 2 equals 0.'],
    solution: `const numbers = [1, 2, 3, 4];\n// Loop solution:\nconst results = [];\nfor (const number of numbers) {\n  if (number % 2 === 0) results.push(number ** 2);\n}\n// Equivalent: numbers.filter(n => n % 2 === 0).map(n => n ** 2)\nconsole.log(results.join(","));`,
  }),
  writingChallenge({
    id: 'py-capstone-grade-report', language: 'python', challengeType: 'micro-capstone',
    title: 'Build a grade report', concept: 'records, filtering, and aggregation',
    summary: 'Combine collections, conditions, and arithmetic in a small report.',
    task: 'Count passing students and print their average score with one decimal place.',
    starterCode: `students = [\n    {"name": "Ada", "score": 80},\n    {"name": "Bo", "score": 45},\n    {"name": "Cy", "score": 70},\n]\n# A passing score is at least 60.`,
    expectedOutput: `Passed: 2\nAverage: 75.0`, hints: ['First collect scores that are at least 60.', 'Average is sum divided by count.'],
    solution: `students = [\n    {"name": "Ada", "score": 80},\n    {"name": "Bo", "score": 45},\n    {"name": "Cy", "score": 70},\n]\npassing = [student["score"] for student in students if student["score"] >= 60]\nprint(f"Passed: {len(passing)}")\nprint(f"Average: {sum(passing) / len(passing):.1f}")`,
  }),
  writingChallenge({
    id: 'js-capstone-grade-report', language: 'javascript', challengeType: 'micro-capstone',
    title: 'Build a grade report', concept: 'records, filtering, and aggregation',
    summary: 'Combine arrays, conditions, and arithmetic in a small report.',
    task: 'Count passing students and print their average score with one decimal place.',
    starterCode: `const students = [\n  { name: "Ada", score: 80 },\n  { name: "Bo", score: 45 },\n  { name: "Cy", score: 70 },\n];\n// A passing score is at least 60.`,
    expectedOutput: `Passed: 2\nAverage: 75.0`, hints: ['Filter to scores that are at least 60.', 'Reduce those scores to a total.'],
    solution: `const students = [\n  { name: "Ada", score: 80 },\n  { name: "Bo", score: 45 },\n  { name: "Cy", score: 70 },\n];\nconst passing = students.filter(student => student.score >= 60);\nconst total = passing.reduce((sum, student) => sum + student.score, 0);\nconsole.log("Passed: " + passing.length);\nconsole.log("Average: " + (total / passing.length).toFixed(1));`,
  }),

];

export function flattenExercises(lessonsData) {
  const exercises = [];

  (lessonsData?.tracks || []).forEach((track) => {
    (track.lessons || []).forEach((lesson) => {
      (lesson.activities || []).forEach((activity) => {
        if (!EXERCISE_TYPES.has(activity.type) || !activity.starterCode || !activity.solution) return;
        const formatLabel = activity.type === 'code-along' ? 'Code-along' : 'Retrieval drill';
        exercises.push({
          id: activity.id,
          kind: 'exercise',
          exerciseType: activity.type,
          challengeType: activity.type === 'code-along' ? 'code-along' : 'retrieval',
          title: `${lesson.concept} · ${formatLabel}`,
          concept: lesson.concept,
          summary: activity.successCriteria || `Practise ${lesson.concept} outside the course path.`,
          task: activity.instruction,
          successCriteria: activity.successCriteria || activity.expectedOutput,
          activities: [{ ...activity }],
          teaching: [],
          starterCode: activity.starterCode,
          expectedOutput: activity.expectedOutput,
          matchType: activity.matchType || 'exact',
          hints: activity.hints || [],
          solution: activity.solution,
          language: track.language,
          trackId: track.id,
          trackName: track.name,
          sourceLessonId: lesson.id,
          sourceLessonTitle: lesson.title,
        });
      });
    });
  });

  return [...exercises, ...WRITING_CHALLENGES];
}

export function challengeTypesFor(exercises, language) {
  return CHALLENGE_TYPES.map((type) => ({
    ...type,
    count: exercises.filter((exercise) => (
      exercise.language === language && exercise.challengeType === type.id
    )).length,
  })).filter((type) => type.count > 0);
}

export function findExercise(lessonsData, exerciseId) {
  return flattenExercises(lessonsData).find((exercise) => exercise.id === exerciseId) || null;
}

export function isCourseActivity(activity) {
  return !EXERCISE_TYPES.has(activity?.type);
}
