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
  writingChallenge({
    id: 'ts-fix-optional-email', language: 'typescript', challengeType: 'fix',
    title: 'Repair the optional email', concept: 'optional properties and fallbacks',
    summary: 'Fix an object contract that incorrectly requires missing data.',
    task: 'Make email optional and safely print the fallback when it is absent.',
    starterCode: `type User = { name: string; email: string };\nconst user: User = { name: "Ada" };\nconsole.log(user.email.toLowerCase());`,
    expectedOutput: 'no email', hints: ['Add `?` to the property name.', 'Use nullish coalescing before calling string methods.'],
    solution: `type User = { name: string; email?: string };\nconst user: User = { name: "Ada" };\nconsole.log(user.email?.toLowerCase() ?? "no email");`,
  }),
  writingChallenge({
    id: 'ts-parsons-result', language: 'typescript', challengeType: 'parsons',
    title: 'Rebuild a result formatter', concept: 'discriminated unions',
    summary: 'Order a tagged union and its narrowing function.',
    task: 'Rewrite the scrambled lines into a valid union and formatter, then print Success: 3.',
    starterCode: `//   return result.status === "ok" ? \`Success: ${'${result.value}'}\` : \`Error: ${'${result.message}'}\`;\n// type Result = { status: "ok"; value: number } | { status: "error"; message: string };\n// }\n// function format(result: Result): string {\n// console.log(format({ status: "ok", value: 3 }));`,
    expectedOutput: 'Success: 3', hints: ['Define the type before the function.', 'The return statement belongs inside the function body.'],
    solution: `type Result = { status: "ok"; value: number } | { status: "error"; message: string };\nfunction format(result: Result): string {\n  return result.status === "ok" ? \`Success: ${'${result.value}'}\` : \`Error: ${'${result.message}'}\`;\n}\nconsole.log(format({ status: "ok", value: 3 }));`,
  }),
  writingChallenge({
    id: 'ts-faded-filter', language: 'typescript', challengeType: 'faded',
    title: 'Complete the typed filter', concept: 'typed arrays and functions',
    summary: 'Restore a function contract and filtering condition.',
    task: 'Fill the missing types and predicate so only passing scores are printed.',
    starterCode: `function passing(scores: /* TODO */): /* TODO */ {\n  return scores.filter(score => /* TODO */);\n}\nconsole.log(passing([45, 70, 80]).join(","));`,
    expectedOutput: '70,80', hints: ['Both collection types are `number[]`.', 'A passing score is at least 60.'],
    solution: `function passing(scores: number[]): number[] {\n  return scores.filter(score => score >= 60);\n}\nconsole.log(passing([45, 70, 80]).join(","));`,
  }),
  writingChallenge({
    id: 'ts-output-course-report', language: 'typescript', challengeType: 'output-first',
    title: 'Produce the course report', concept: 'interfaces and transformations',
    summary: 'Design a typed record and transformation from required output.',
    task: 'Define a Course interface and use the provided records to produce the two-line report.',
    starterCode: `// Define Course: name, completed, and total.\nconst courses = [\n  { name: "Types", completed: 4, total: 5 },\n  { name: "Functions", completed: 3, total: 3 },\n];\n// Print one progress line per course.`,
    expectedOutput: `Types: 4/5\nFunctions: 3/3`, hints: ['Annotate courses as `Course[]`.', 'Use a loop and a template string.'],
    solution: `interface Course { name: string; completed: number; total: number }\nconst courses: Course[] = [\n  { name: "Types", completed: 4, total: 5 },\n  { name: "Functions", completed: 3, total: 3 },\n];\nfor (const course of courses) {\n  console.log(\`${'${course.name}'}: ${'${course.completed}'}/${'${course.total}'}\`);\n}`,
  }),
  writingChallenge({
    id: 'ts-two-solutions-lookup', language: 'typescript', challengeType: 'two-solutions',
    title: 'Look up a learner safely', concept: 'optional results and narrowing',
    summary: 'Handle an optional lookup result with two safe patterns.',
    task: 'Find learner 2 and print their name. Use an explicit check, then compare it with optional chaining in the solution.',
    starterCode: `type Learner = { id: number; name: string };\nconst learners: Learner[] = [{ id: 1, name: "Ada" }, { id: 2, name: "Bo" }];\nconst learner = learners.find(item => item.id === 2);\n// Safely print the name or "Not found".`,
    expectedOutput: 'Bo', hints: ['The result of find can be undefined.', 'An if statement can narrow the result.'],
    solution: `type Learner = { id: number; name: string };\nconst learners: Learner[] = [{ id: 1, name: "Ada" }, { id: 2, name: "Bo" }];\nconst learner = learners.find(item => item.id === 2);\nif (learner) console.log(learner.name);\nelse console.log("Not found");\n// Equivalent: console.log(learner?.name ?? "Not found");`,
  }),
  writingChallenge({
    id: 'ts-capstone-task-summary', language: 'typescript', challengeType: 'micro-capstone',
    title: 'Build a task summary', concept: 'typed records, filtering, and aggregation',
    summary: 'Combine interfaces, arrays, functions, and optional values.',
    task: 'Type the task records, count completed tasks, and print the owner fallback for each task.',
    starterCode: `const tasks = [\n  { title: "Types", done: true, owner: "Ada" },\n  { title: "Functions", done: false },\n  { title: "Unions", done: true, owner: "Bo" },\n];\n// Print the completed count, then title: owner for each task.`,
    expectedOutput: `Completed: 2\nTypes: Ada\nFunctions: unassigned\nUnions: Bo`, hints: ['Define owner as optional.', 'Filter tasks where done is true.', 'Use `??` for the owner fallback.'],
    solution: `interface Task { title: string; done: boolean; owner?: string }\nconst tasks: Task[] = [\n  { title: "Types", done: true, owner: "Ada" },\n  { title: "Functions", done: false },\n  { title: "Unions", done: true, owner: "Bo" },\n];\nconsole.log(\`Completed: ${'${tasks.filter(task => task.done).length}'}\`);\nfor (const task of tasks) console.log(\`${'${task.title}'}: ${'${task.owner ?? "unassigned"}'}\`);`,
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
