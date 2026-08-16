// buildProjects — guided, step-by-step projects for the Build Panel.
//
// A project scaffolds real files into the open folder and walks the learner
// through `steps`. Each step targets ONE file, states a plain-English task,
// offers example code lines on demand, and declares `checks` the verifier
// (engine/buildVerifier.js) runs against the learner's actual code.
//
// Steps are CUMULATIVE: the file keeps growing, so output checks use
// `match: 'contains'` — earlier prints stay in the file.
//
// This is the schema the plan (docs/build-panel.md) defines; lesson
// projects (data/projects.js) can migrate onto it later.

const buildProjects = [
  {
    id: 'quiz-engine',
    title: 'Quiz Engine',
    language: 'javascript',
    summary: 'Build a quiz scorer that validates answers, fixes case bugs, and awards partial credit.',
    brief: 'Model questions as data, score submissions, make scoring case-insensitive, and add partial credit.',
    concepts: ['arrays', 'objects', 'functions', 'conditionals', 'loops'],
    scaffold: [
      {
        file: 'quiz.js',
        content: `const quizTitle = "JavaScript Basics";
const questions = [
  { prompt: "Which keyword declares a constant?", answer: "const" },
  // TODO: add a question whose answer is "array"
];

console.log("Quiz: " + quizTitle);
console.log("Questions: " + 0); // TODO: print the real count
`,
      },
    ],
    steps: [
      {
        id: 'quiz-1-model',
        title: 'Create the answer model',
        file: 'quiz.js',
        task: 'Add a second question to `questions` — a structure that stores an ordered list, answer `"array"` — then make the Questions line print the real count using the data.',
        examples: [
          { label: 'Add the question', code: '  { prompt: "Which structure stores an ordered list?", answer: "array" },' },
          { label: 'Use the data', code: 'console.log("Questions: " + questions.length);' },
        ],
        hints: [
          'Each question is an object with prompt and answer properties.',
          'questions.length reports how many items the array holds.',
        ],
        checks: [
          { id: 'two-questions', type: 'fileCount', file: 'quiz.js', pattern: '\\{ prompt:', atLeast: 2 },
          { id: 'uses-data', type: 'fileContains', file: 'quiz.js', pattern: 'questions\\.length' },
          { id: 'prints-count', type: 'runOutput', file: 'quiz.js', expect: 'Questions: 2', match: 'contains' },
        ],
        solution: `const quizTitle = "JavaScript Basics";
const questions = [
  { prompt: "Which keyword declares a constant?", answer: "const" },
  { prompt: "Which structure stores an ordered list?", answer: "array" },
];

console.log("Quiz: " + quizTitle);
console.log("Questions: " + questions.length);
`,
      },
      {
        id: 'quiz-2-score',
        title: 'Score submitted answers',
        file: 'quiz.js',
        task: 'Add a `scoreQuiz(items, answers)` function that counts how many submitted answers match the question answers, then print the score for `["const", "object"]` — expect `Score: 1/2`.',
        examples: [
          { label: 'The scoring loop', code: `function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index] === items[index].answer) score += 1;
  }
  return score;
}` },
          { label: 'Run it', code: 'console.log("Score: " + scoreQuiz(questions, ["const", "object"]) + "/2");' },
        ],
        hints: [
          'Loop over the indexes of items.',
          'Increase score only when answers[index] equals items[index].answer.',
        ],
        checks: [
          { id: 'has-score-fn', type: 'hasFunction', file: 'quiz.js', name: 'scoreQuiz' },
          { id: 'prints-score', type: 'runOutput', file: 'quiz.js', expect: 'Score: 1/2', match: 'contains' },
        ],
        solution: `const quizTitle = "JavaScript Basics";
const questions = [
  { prompt: "Which keyword declares a constant?", answer: "const" },
  { prompt: "Which structure stores an ordered list?", answer: "array" },
];
const submitted = ["const", "object"];

function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index] === items[index].answer) score += 1;
  }
  return score;
}

console.log("Quiz: " + quizTitle);
console.log("Questions: " + questions.length);
console.log("Score: " + scoreQuiz(questions, submitted) + "/2");
`,
      },
      {
        id: 'quiz-3-case',
        title: 'Make scoring case-insensitive',
        file: 'quiz.js',
        task: 'A capitalized answer like `"CONST"` is marked wrong even though it is correct. Normalize both sides of the comparison so case no longer matters, then print the case-friendly score for `["CONST", "array"]` — expect `Case-friendly score: 2/2`.',
        examples: [
          { label: 'Normalize both sides', code: 'if (answers[index].toLowerCase() === items[index].answer.toLowerCase()) score += 1;' },
          { label: 'Run it', code: 'console.log("Case-friendly score: " + scoreQuiz(questions, ["CONST", "array"]) + "/2");' },
        ],
        hints: [
          'Right now only the submitted answer is compared as typed.',
          'Call .toLowerCase() on BOTH sides before comparing.',
        ],
        checks: [
          { id: 'normalizes', type: 'fileContains', file: 'quiz.js', pattern: 'toLowerCase' },
          { id: 'case-score', type: 'runOutput', file: 'quiz.js', expect: 'Case-friendly score: 2/2', match: 'contains' },
        ],
        solution: `const quizTitle = "JavaScript Basics";
const questions = [
  { prompt: "Which keyword declares a constant?", answer: "const" },
  { prompt: "Which structure stores an ordered list?", answer: "array" },
];
const submitted = ["const", "object"];

function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index].toLowerCase() === items[index].answer.toLowerCase()) score += 1;
  }
  return score;
}

console.log("Quiz: " + quizTitle);
console.log("Questions: " + questions.length);
console.log("Score: " + scoreQuiz(questions, submitted) + "/2");
console.log("Case-friendly score: " + scoreQuiz(questions, ["CONST", "array"]) + "/2");
`,
      },
      {
        id: 'quiz-4-credit',
        title: 'Add partial credit',
        file: 'quiz.js',
        task: 'Give every question a `hint` property, add a third question (answer `"function"`, hint `"function"`), and award half a point when an answer matches a hint instead of the exact answer. Replace the old Score and Case-friendly demo lines — they crash now that there are three questions — and print the final score and review flag for `["const", "list", "method"]` — expect `Final score: 1.5/3` and `Review needed: true`.',
        examples: [
          { label: 'Half a point for a hint', code: 'else if (answers[index].toLowerCase() === items[index].hint.toLowerCase()) score += 0.5;' },
          { label: 'Run it', code: 'console.log("Final score: " + scoreQuiz(questions, ["const", "list", "method"]) + "/3");\nconsole.log("Review needed: " + (scoreQuiz(questions, ["const", "list", "method"]) < 2));' },
        ],
        hints: [
          'The hint check must only run when the exact match failed — use else if.',
          'Give the three questions hint values "keyword", "list", and "function".',
          'The old Score and Case-friendly demo lines only pass 2 answers — with 3 questions they crash. Replace them with the final prints.',
        ],
        checks: [
          { id: 'has-hints', type: 'fileCount', file: 'quiz.js', pattern: 'hint:', atLeast: 3 },
          { id: 'half-point', type: 'fileContains', file: 'quiz.js', pattern: '0\\.5' },
          { id: 'final-score', type: 'runOutput', file: 'quiz.js', expect: 'Final score: 1.5/3', match: 'contains' },
        ],
        solution: `const quizTitle = "JavaScript Basics";
const questions = [
  { prompt: "Which keyword declares a constant?", answer: "const", hint: "keyword" },
  { prompt: "Which structure stores an ordered list?", answer: "array", hint: "list" },
  { prompt: "What do you call a reusable block of code?", answer: "function", hint: "function" },
];
const submitted = ["const", "list", "method"];

function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index].toLowerCase() === items[index].answer.toLowerCase()) score += 1;
    else if (answers[index].toLowerCase() === items[index].hint.toLowerCase()) score += 0.5;
  }
  return score;
}

console.log("Quiz: " + quizTitle);
console.log("Questions: " + questions.length);
console.log("Final score: " + scoreQuiz(questions, submitted) + "/3");
console.log("Review needed: " + (scoreQuiz(questions, submitted) < 2));
`,
      },
    ],
    reflectionPrompt: 'Why is each question stored as an object rather than three parallel arrays?',
  },
  {
    id: 'study-log',
    title: 'Study Log',
    language: 'python',
    summary: 'Build a study log that sums minutes, filters by subject, and reports hours against a goal.',
    brief: 'Record sessions, total the time, total one subject, then convert everything to hours and check a goal.',
    concepts: ['lists', 'dictionaries', 'functions', 'loops', 'conditionals'],
    scaffold: [
      {
        file: 'study_log.py',
        content: `log_name = "Week 1"
sessions = [
    {"subject": "Python", "minutes": 30},
    # TODO: add a Math session lasting 20 minutes
]

print("Study log:", log_name)
print("Sessions:", 0)  # TODO: use the list
`,
      },
    ],
    steps: [
      {
        id: 'study-1-log',
        title: 'Record study sessions',
        file: 'study_log.py',
        task: 'Add a second session dictionary for Math (20 minutes) and make the Sessions line print the real count using the list — expect `Sessions: 2`.',
        examples: [
          { label: 'Add the session', code: '    {"subject": "Math", "minutes": 20},' },
          { label: 'Use the data', code: 'print("Sessions:", len(sessions))' },
        ],
        hints: [
          'One dictionary holds one session.',
          'len(sessions) counts the entries in the list.',
        ],
        checks: [
          { id: 'two-sessions', type: 'fileCount', file: 'study_log.py', pattern: '"subject":', atLeast: 2 },
          { id: 'uses-data', type: 'fileContains', file: 'study_log.py', pattern: 'len\\(sessions\\)' },
          { id: 'prints-count', type: 'runOutput', file: 'study_log.py', expect: 'Sessions: 2', match: 'contains' },
        ],
        solution: `log_name = "Week 1"
sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
]

print("Study log:", log_name)
print("Sessions:", len(sessions))
`,
      },
      {
        id: 'study-2-total',
        title: 'Total the study time',
        file: 'study_log.py',
        task: 'Add a third session (Python, 25 minutes), write a `total_minutes(entries)` function that sums every session duration, and print the total — expect `Total minutes: 75`.',
        examples: [
          { label: 'The summing loop', code: `def total_minutes(entries):
    total = 0
    for entry in entries:
        total += entry["minutes"]
    return total` },
          { label: 'Run it', code: 'print("Total minutes:", total_minutes(sessions))' },
        ],
        hints: [
          'Create a running total before the loop.',
          'Add entry["minutes"] for each entry.',
        ],
        checks: [
          { id: 'has-total-fn', type: 'hasFunction', file: 'study_log.py', name: 'total_minutes' },
          { id: 'prints-total', type: 'runOutput', file: 'study_log.py', expect: 'Total minutes: 75', match: 'contains' },
        ],
        solution: `log_name = "Week 1"
sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
    {"subject": "Python", "minutes": 25},
]

def total_minutes(entries):
    total = 0
    for entry in entries:
        total += entry["minutes"]
    return total

print("Study log:", log_name)
print("Sessions:", len(sessions))
print("Total minutes:", total_minutes(sessions))
`,
      },
      {
        id: 'study-3-subject',
        title: 'Total one subject',
        file: 'study_log.py',
        task: 'Add a `minutes_for_subject(entries, subject)` function that sums only the sessions for one subject, then print the Python total — expect `Python minutes: 55`.',
        examples: [
          { label: 'Filter by subject', code: `def minutes_for_subject(entries, subject):
    total = 0
    for entry in entries:
        if entry["subject"] == subject:
            total += entry["minutes"]
    return total` },
          { label: 'Run it', code: 'print("Python minutes:", minutes_for_subject(sessions, "Python"))' },
        ],
        hints: [
          'Compare entry["subject"] with the subject argument.',
          'Only add minutes when they are equal.',
        ],
        checks: [
          { id: 'has-subject-fn', type: 'hasFunction', file: 'study_log.py', name: 'minutes_for_subject' },
          { id: 'prints-subject', type: 'runOutput', file: 'study_log.py', expect: 'Python minutes: 55', match: 'contains' },
        ],
        solution: `log_name = "Week 1"
sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
    {"subject": "Python", "minutes": 25},
]

def total_minutes(entries):
    total = 0
    for entry in entries:
        total += entry["minutes"]
    return total

def minutes_for_subject(entries, subject):
    total = 0
    for entry in entries:
        if entry["subject"] == subject:
            total += entry["minutes"]
    return total

print("Study log:", log_name)
print("Sessions:", len(sessions))
print("Total minutes:", total_minutes(sessions))
print("Python minutes:", minutes_for_subject(sessions, "Python"))
`,
      },
      {
        id: 'study-4-hours',
        title: 'Report hours and goals',
        file: 'study_log.py',
        task: 'Add a Writing session (50 minutes), write `hours_studied(entries)` that converts total minutes to hours rounded to one decimal, then print the hours and whether the 2-hour goal was reached — expect `Hours studied: 2.1` and `Goal reached: True`.',
        examples: [
          { label: 'Convert to hours', code: 'def hours_studied(entries):\n    return round(total_minutes(entries) / 60, 1)' },
          { label: 'Run it', code: 'hours = hours_studied(sessions)\nprint("Hours studied:", hours)\nprint("Goal reached:", hours >= 2)' },
        ],
        hints: [
          'Divide total_minutes(entries) by 60.',
          'round(value, 1) keeps one decimal place.',
        ],
        checks: [
          { id: 'has-hours-fn', type: 'hasFunction', file: 'study_log.py', name: 'hours_studied' },
          { id: 'rounds', type: 'fileContains', file: 'study_log.py', pattern: 'round\\(' },
          { id: 'goal-reached', type: 'runOutput', file: 'study_log.py', expect: 'Goal reached: True', match: 'contains' },
        ],
        solution: `log_name = "Week 1"
sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
    {"subject": "Python", "minutes": 25},
    {"subject": "Writing", "minutes": 50},
]

def total_minutes(entries):
    total = 0
    for entry in entries:
        total += entry["minutes"]
    return total

def minutes_for_subject(entries, subject):
    total = 0
    for entry in entries:
        if entry["subject"] == subject:
            total += entry["minutes"]
    return total

def hours_studied(entries):
    return round(total_minutes(entries) / 60, 1)

hours = hours_studied(sessions)
print("Study log:", log_name)
print("Sessions:", len(sessions))
print("Total minutes:", total_minutes(sessions))
print("Python minutes:", minutes_for_subject(sessions, "Python"))
print("Hours studied:", hours)
print("Goal reached:", hours >= 2)
`,
      },
    ],
    reflectionPrompt: 'Why is each study session a dictionary instead of three separate lists?',
  },
  {
    id: 'countdown-timer',
    title: 'Countdown Timer',
    language: 'python',
    summary: 'Build a launch countdown that prints T-minus seconds and reports when the launch is complete.',
    brief: 'Count down from a number, wrap the countdown in a function, add T-minus formatting, and report the launch.',
    concepts: ['loops', 'functions', 'strings', 'booleans'],
    scaffold: [
      {
        file: 'countdown.py',
        content: `mission = "Countdown to launch"
start = 5

print(mission)
# TODO: count down from \`start\` to 1, printing each number

print("Blast off!")
`,
      },
    ],
    steps: [
      {
        id: 'countdown-1-loop',
        title: 'Print the countdown',
        file: 'countdown.py',
        task: 'Count down from `start` to 1 — a loop that visits each number backwards — printing each one, so the run prints `5`, `4`, `3`, `2`, `1` before "Blast off!".',
        examples: [
          { label: 'Count backwards', code: 'for number in range(start, 0, -1):\n    print(number)' },
        ],
        hints: [
          'range(start, 0, -1) visits start, start-1, … down to 1.',
          'Print each number inside the loop.',
        ],
        checks: [
          { id: 'has-loop', type: 'fileContains', file: 'countdown.py', pattern: 'range\\(' },
          { id: 'blast-off', type: 'runOutput', file: 'countdown.py', expect: 'Blast off!', match: 'contains' },
        ],
        solution: `mission = "Countdown to launch"
start = 5

print(mission)
for number in range(start, 0, -1):
    print(number)

print("Blast off!")
`,
      },
      {
        id: 'countdown-2-function',
        title: 'Wrap it in a function',
        file: 'countdown.py',
        task: 'Move the countdown into a `countdown(seconds)` function and call it with `start` — the run still prints `5` down to `1`, then "Blast off!".',
        examples: [
          { label: 'The function', code: 'def countdown(seconds):\n    for number in range(seconds, 0, -1):\n        print(number)' },
          { label: 'Call it', code: 'countdown(start)' },
        ],
        hints: [
          'A function takes the starting number as a parameter.',
          'Replace the loop you wrote with a call to countdown(start).',
        ],
        checks: [
          { id: 'has-countdown-fn', type: 'hasFunction', file: 'countdown.py', name: 'countdown' },
          { id: 'blast-off', type: 'runOutput', file: 'countdown.py', expect: 'Blast off!', match: 'contains' },
        ],
        solution: `mission = "Countdown to launch"
start = 5

def countdown(seconds):
    for number in range(seconds, 0, -1):
        print(number)

print(mission)
countdown(start)
print("Blast off!")
`,
      },
      {
        id: 'countdown-3-tminus',
        title: 'Add T-minus formatting',
        file: 'countdown.py',
        task: 'Make `countdown` print each number as `T-minus N` — e.g. `T-minus 5` — before "Blast off!".',
        examples: [
          { label: 'Format the line', code: 'print("T-minus " + str(number))' },
        ],
        hints: [
          'Convert the number to text with str() before concatenating.',
          'The last countdown line is T-minus 1.',
        ],
        checks: [
          { id: 'tminus', type: 'fileContains', file: 'countdown.py', pattern: 'T-minus' },
          { id: 'tminus-last', type: 'runOutput', file: 'countdown.py', expect: 'T-minus 1', match: 'contains' },
        ],
        solution: `mission = "Countdown to launch"
start = 5

def countdown(seconds):
    for number in range(seconds, 0, -1):
        print("T-minus " + str(number))

print(mission)
countdown(start)
print("Blast off!")
`,
      },
      {
        id: 'countdown-4-report',
        title: 'Report the launch',
        file: 'countdown.py',
        task: 'Add a `launch_report(seconds)` function that prints how many seconds were counted and whether the launch succeeded, then call it — expect `Countdown: 5 seconds` and `Launch complete: True`.',
        examples: [
          { label: 'The report', code: 'def launch_report(seconds):\n    print("Countdown: " + str(seconds) + " seconds")\n    print("Launch complete: " + str(seconds > 0))' },
          { label: 'Run it', code: 'launch_report(start)' },
        ],
        hints: [
          'seconds > 0 is True when there was time to count down.',
          'str(seconds > 0) prints "True" or "False".',
        ],
        checks: [
          { id: 'has-report-fn', type: 'hasFunction', file: 'countdown.py', name: 'launch_report' },
          { id: 'launch-done', type: 'runOutput', file: 'countdown.py', expect: 'Launch complete: True', match: 'contains' },
        ],
        solution: `mission = "Countdown to launch"
start = 5

def countdown(seconds):
    for number in range(seconds, 0, -1):
        print("T-minus " + str(number))

def launch_report(seconds):
    print("Countdown: " + str(seconds) + " seconds")
    print("Launch complete: " + str(seconds > 0))

print(mission)
countdown(start)
print("Blast off!")
launch_report(start)
`,
      },
    ],
    reflectionPrompt: 'Why does range(start, 0, -1) stop before 0?',
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    language: 'javascript',
    summary: 'Build the classic FizzBuzz starter: swap multiples of 3, 5, and 15 for words, then count them.',
    brief: 'Print the Fizz/Buzz rules for 1–15, extract a function, run to a custom limit, then count the words.',
    concepts: ['loops', 'functions', 'conditionals', 'modulo'],
    scaffold: [
      {
        file: 'fizzbuzz.js',
        content: `const limit = 15;

// TODO: print 1..limit, replacing multiples of 3 with "Fizz",
// multiples of 5 with "Buzz", and multiples of both with "FizzBuzz".
`,
      },
    ],
    steps: [
      {
        id: 'fizzbuzz-1-rules',
        title: 'Print the FizzBuzz rules',
        file: 'fizzbuzz.js',
        task: 'Loop from 1 to `limit` and print each number — except multiples of 3 print `Fizz`, multiples of 5 print `Buzz`, and multiples of both print `FizzBuzz`.',
        examples: [
          { label: 'The loop', code: 'for (let n = 1; n <= limit; n += 1) {\n  if (n % 15 === 0) console.log("FizzBuzz");\n  else if (n % 3 === 0) console.log("Fizz");\n  else if (n % 5 === 0) console.log("Buzz");\n  else console.log(n);\n}' },
        ],
        hints: [
          'Check the 15 case FIRST — a multiple of 15 is also a multiple of 3 and 5.',
          'n % 3 === 0 means n divides evenly by 3.',
        ],
        checks: [
          { id: 'has-modulo', type: 'fileContains', file: 'fizzbuzz.js', pattern: '% 3' },
          { id: 'prints-fizzbuzz', type: 'runOutput', file: 'fizzbuzz.js', expect: 'FizzBuzz', match: 'contains' },
        ],
        solution: `const limit = 15;

for (let n = 1; n <= limit; n += 1) {
  if (n % 15 === 0) console.log("FizzBuzz");
  else if (n % 3 === 0) console.log("Fizz");
  else if (n % 5 === 0) console.log("Buzz");
  else console.log(n);
}
`,
      },
      {
        id: 'fizzbuzz-2-function',
        title: 'Extract the rule function',
        file: 'fizzbuzz.js',
        task: 'Write a `fizzbuzz(n)` function that returns the word for one number (or the number as a string), then use it in the loop.',
        examples: [
          { label: 'The function', code: 'function fizzbuzz(n) {\n  if (n % 15 === 0) return "FizzBuzz";\n  if (n % 3 === 0) return "Fizz";\n  if (n % 5 === 0) return "Buzz";\n  return String(n);\n}' },
          { label: 'Use it in the loop', code: 'for (let n = 1; n <= limit; n += 1) {\n  console.log(fizzbuzz(n));\n}' },
        ],
        hints: [
          'A function makes the rule reusable and testable.',
          'return String(n) keeps numbers as text.',
        ],
        checks: [
          { id: 'has-fizzbuzz-fn', type: 'hasFunction', file: 'fizzbuzz.js', name: 'fizzbuzz' },
          { id: 'prints-fizzbuzz', type: 'runOutput', file: 'fizzbuzz.js', expect: 'FizzBuzz', match: 'contains' },
        ],
        solution: `const limit = 15;

function fizzbuzz(n) {
  if (n % 15 === 0) return "FizzBuzz";
  if (n % 3 === 0) return "Fizz";
  if (n % 5 === 0) return "Buzz";
  return String(n);
}

for (let n = 1; n <= limit; n += 1) {
  console.log(fizzbuzz(n));
}
`,
      },
      {
        id: 'fizzbuzz-3-limit',
        title: 'Run to a custom limit',
        file: 'fizzbuzz.js',
        task: 'Wrap the loop in a `fizzbuzzUpTo(limit)` function and call it with `20`, so the run prints past 15 — expect `19` in the output.',
        examples: [
          { label: 'The wrapper', code: 'function fizzbuzzUpTo(limit) {\n  for (let n = 1; n <= limit; n += 1) {\n    console.log(fizzbuzz(n));\n  }\n}' },
          { label: 'Run it', code: 'fizzbuzzUpTo(20);' },
        ],
        hints: [
          'The loop body is now just console.log(fizzbuzz(n)).',
          '20 is a multiple of 5, so the run ends with Buzz.',
        ],
        checks: [
          { id: 'has-up-to-fn', type: 'hasFunction', file: 'fizzbuzz.js', name: 'fizzbuzzUpTo' },
          { id: 'prints-19', type: 'runOutput', file: 'fizzbuzz.js', expect: '19', match: 'contains' },
        ],
        solution: `const limit = 15;

function fizzbuzz(n) {
  if (n % 15 === 0) return "FizzBuzz";
  if (n % 3 === 0) return "Fizz";
  if (n % 5 === 0) return "Buzz";
  return String(n);
}

function fizzbuzzUpTo(limit) {
  for (let n = 1; n <= limit; n += 1) {
    console.log(fizzbuzz(n));
  }
}

fizzbuzzUpTo(20);
`,
      },
      {
        id: 'fizzbuzz-4-count',
        title: 'Count the words',
        file: 'fizzbuzz.js',
        task: 'Make `fizzbuzzUpTo` count how many times each word appears and print the totals after the loop — for 1–20 expect `Fizz count: 5`, `Buzz count: 3`, and `FizzBuzz count: 1`.',
        examples: [
          { label: 'Count as you go', code: 'let fizz = 0;\nlet buzz = 0;\nlet fizzbuzzCount = 0;\nfor (let n = 1; n <= limit; n += 1) {\n  const word = fizzbuzz(n);\n  if (word === "Fizz") fizz += 1;\n  else if (word === "Buzz") buzz += 1;\n  else if (word === "FizzBuzz") fizzbuzzCount += 1;\n  console.log(word);\n}' },
          { label: 'Print the totals', code: 'console.log("Fizz count: " + fizz);\nconsole.log("Buzz count: " + buzz);\nconsole.log("FizzBuzz count: " + fizzbuzzCount);' },
        ],
        hints: [
          'Track a counter variable for each word, incremented when it prints.',
          '15 is the only FizzBuzz in 1–20.',
        ],
        checks: [
          { id: 'has-counts', type: 'fileContains', file: 'fizzbuzz.js', pattern: 'Fizz count' },
          { id: 'fizzbuzz-total', type: 'runOutput', file: 'fizzbuzz.js', expect: 'FizzBuzz count: 1', match: 'contains' },
        ],
        solution: `const limit = 15;

function fizzbuzz(n) {
  if (n % 15 === 0) return "FizzBuzz";
  if (n % 3 === 0) return "Fizz";
  if (n % 5 === 0) return "Buzz";
  return String(n);
}

function fizzbuzzUpTo(limit) {
  let fizz = 0;
  let buzz = 0;
  let fizzbuzzCount = 0;
  for (let n = 1; n <= limit; n += 1) {
    const word = fizzbuzz(n);
    if (word === "Fizz") fizz += 1;
    else if (word === "Buzz") buzz += 1;
    else if (word === "FizzBuzz") fizzbuzzCount += 1;
    console.log(word);
  }
  console.log("Fizz count: " + fizz);
  console.log("Buzz count: " + buzz);
  console.log("FizzBuzz count: " + fizzbuzzCount);
}

fizzbuzzUpTo(20);
`,
      },
    ],
    reflectionPrompt: 'Why check n % 15 === 0 before n % 3 === 0?',
  },
  {
    id: 'temperature-converter',
    title: 'Temperature Converter',
    language: 'python',
    summary: 'Build a temperature converter that turns Celsius into Fahrenheit (and back) with a single convert function.',
    brief: 'Convert C→F with the formula, extract functions, add the reverse direction, then route both through one function.',
    concepts: ['functions', 'arithmetic', 'conditionals', 'floats'],
    scaffold: [
      {
        file: 'temperature.py',
        content: `celsius = 100
# TODO: convert \`celsius\` to Fahrenheit and print the result.
`,
      },
    ],
    steps: [
      {
        id: 'temp-1-convert',
        title: 'Convert Celsius to Fahrenheit',
        file: 'temperature.py',
        task: 'Compute the Fahrenheit value with the formula `celsius * 9 / 5 + 32` and print it — expect `212.0 F`.',
        examples: [
          { label: 'The conversion', code: 'fahrenheit = celsius * 9 / 5 + 32\nprint(str(fahrenheit) + " F")' },
        ],
        hints: [
          'The formula for F is C times 9 divided by 5, plus 32.',
          'str(fahrenheit) turns the number into text so you can add " F".',
        ],
        checks: [
          { id: 'has-formula', type: 'fileContains', file: 'temperature.py', pattern: '9 / 5' },
          { id: 'prints-f', type: 'runOutput', file: 'temperature.py', expect: '212.0 F', match: 'contains' },
        ],
        solution: `celsius = 100
fahrenheit = celsius * 9 / 5 + 32
print(str(fahrenheit) + " F")
`,
      },
      {
        id: 'temp-2-function',
        title: 'Extract the conversion function',
        file: 'temperature.py',
        task: 'Write `celsius_to_fahrenheit(c)` that returns the converted value, then print the conversion for each temperature in `[0, 100, 37]` — expect `98.6 F` in the output.',
        examples: [
          { label: 'The function', code: 'def celsius_to_fahrenheit(c):\n    return c * 9 / 5 + 32' },
          { label: 'Run it', code: 'for temp in [0, 100, 37]:\n    print(str(celsius_to_fahrenheit(temp)) + " F")' },
        ],
        hints: [
          'return sends the value back instead of printing it.',
          '37°C is roughly body temperature — 98.6°F.',
        ],
        checks: [
          { id: 'has-c2f-fn', type: 'hasFunction', file: 'temperature.py', name: 'celsius_to_fahrenheit' },
          { id: 'prints-body', type: 'runOutput', file: 'temperature.py', expect: '98.6 F', match: 'contains' },
        ],
        solution: `def celsius_to_fahrenheit(c):
    return c * 9 / 5 + 32

for temp in [0, 100, 37]:
    print(str(celsius_to_fahrenheit(temp)) + " F")
`,
      },
      {
        id: 'temp-3-reverse',
        title: 'Add the reverse direction',
        file: 'temperature.py',
        task: 'Add `fahrenheit_to_celsius(f)` using `(f - 32) * 5 / 9` and print the round-trip check for 212°F — expect `100.0 C`.',
        examples: [
          { label: 'The reverse', code: 'def fahrenheit_to_celsius(f):\n    return (f - 32) * 5 / 9' },
          { label: 'Run it', code: 'print(str(fahrenheit_to_celsius(212)) + " C")' },
        ],
        hints: [
          'Subtract 32 first, then multiply by 5 and divide by 9.',
          '212°F is exactly 100°C — the boiling point of water.',
        ],
        checks: [
          { id: 'has-f2c-fn', type: 'hasFunction', file: 'temperature.py', name: 'fahrenheit_to_celsius' },
          { id: 'prints-c', type: 'runOutput', file: 'temperature.py', expect: '100.0 C', match: 'contains' },
        ],
        solution: `def celsius_to_fahrenheit(c):
    return c * 9 / 5 + 32

def fahrenheit_to_celsius(f):
    return (f - 32) * 5 / 9

print(str(fahrenheit_to_celsius(212)) + " C")
`,
      },
      {
        id: 'temp-4-router',
        title: 'Route through one function',
        file: 'temperature.py',
        task: 'Write `convert(value, unit)` that returns the converted number for `"C"` or `"F"`, then print both directions — expect `212 F is 100.0 C` in the output.',
        examples: [
          { label: 'The router', code: 'def convert(value, unit):\n    if unit == "C":\n        return celsius_to_fahrenheit(value)\n    if unit == "F":\n        return fahrenheit_to_celsius(value)\n    return None' },
          { label: 'Run it', code: 'print("212 F is " + str(convert(212, "F")) + " C")\nprint("100 C is " + str(convert(100, "C")) + " F")' },
        ],
        hints: [
          'Compare unit against "C" and "F" to pick the right conversion.',
          'Reuse the two functions you already wrote.',
        ],
        checks: [
          { id: 'has-router-fn', type: 'hasFunction', file: 'temperature.py', name: 'convert' },
          { id: 'prints-pair', type: 'runOutput', file: 'temperature.py', expect: '212 F is 100.0 C', match: 'contains' },
        ],
        solution: `def celsius_to_fahrenheit(c):
    return c * 9 / 5 + 32

def fahrenheit_to_celsius(f):
    return (f - 32) * 5 / 9

def convert(value, unit):
    if unit == "C":
        return celsius_to_fahrenheit(value)
    if unit == "F":
        return fahrenheit_to_celsius(value)
    return None

print("212 F is " + str(convert(212, "F")) + " C")
print("100 C is " + str(convert(100, "C")) + " F")
`,
      },
    ],
    reflectionPrompt: 'Why does 100 * 9 / 5 + 32 print as 212.0 instead of 212?',
  },
  {
    id: 'palindrome-checker',
    title: 'Palindrome Checker',
    language: 'javascript',
    summary: 'Build a palindrome checker that reverses words, ignores capitals, and handles whole phrases.',
    brief: 'Compare a word to its reverse, extract a function, ignore case, then strip spaces from phrases.',
    concepts: ['strings', 'functions', 'arrays', 'booleans'],
    scaffold: [
      {
        file: 'palindrome.js',
        content: `const word = "racecar";
// TODO: print whether \`word\` is a palindrome —
// a word that reads the same forwards and backwards.
`,
      },
    ],
    steps: [
      {
        id: 'pal-1-reverse',
        title: 'Compare a word to its reverse',
        file: 'palindrome.js',
        task: 'Build the reversed form of `word` — split it into characters, reverse, and join — then print whether it matches — expect `racecar is a palindrome: true`.',
        examples: [
          { label: 'Reverse the word', code: 'const reversed = word.split("").reverse().join("");' },
          { label: 'Print the verdict', code: 'console.log(word + " is a palindrome: " + (word === reversed));' },
        ],
        hints: [
          'split("") turns the string into an array of characters.',
          'A palindrome equals its own reverse.',
        ],
        checks: [
          { id: 'uses-split', type: 'fileContains', file: 'palindrome.js', pattern: 'split' },
          { id: 'pal-verdict', type: 'runOutput', file: 'palindrome.js', expect: 'racecar is a palindrome: true', match: 'contains' },
        ],
        solution: `const word = "racecar";
const reversed = word.split("").reverse().join("");
console.log(word + " is a palindrome: " + (word === reversed));
`,
      },
      {
        id: 'pal-2-function',
        title: 'Extract the checker function',
        file: 'palindrome.js',
        task: 'Write `isPalindrome(word)` that returns true when a word reads the same backwards, then check `"racecar"` and `"hello"` — expect `hello is a palindrome: false`.',
        examples: [
          { label: 'The function', code: 'function isPalindrome(word) {\n  const reversed = word.split("").reverse().join("");\n  return word === reversed;\n}' },
          { label: 'Run it', code: 'console.log("racecar is a palindrome: " + isPalindrome("racecar"));\nconsole.log("hello is a palindrome: " + isPalindrome("hello"));' },
        ],
        hints: [
          'return the comparison instead of printing it.',
          'isPalindrome("hello") should be false.',
        ],
        checks: [
          { id: 'has-pal-fn', type: 'hasFunction', file: 'palindrome.js', name: 'isPalindrome' },
          { id: 'pal-false', type: 'runOutput', file: 'palindrome.js', expect: 'hello is a palindrome: false', match: 'contains' },
        ],
        solution: `function isPalindrome(word) {
  const reversed = word.split("").reverse().join("");
  return word === reversed;
}

console.log("racecar is a palindrome: " + isPalindrome("racecar"));
console.log("hello is a palindrome: " + isPalindrome("hello"));
`,
      },
      {
        id: 'pal-3-case',
        title: 'Ignore capital letters',
        file: 'palindrome.js',
        task: 'Make `isPalindrome` ignore case — `"Racecar"` should count as a palindrome — expect `Racecar is a palindrome: true`.',
        examples: [
          { label: 'Normalize before comparing', code: 'const normal = word.toLowerCase();\nconst reversed = normal.split("").reverse().join("");\nreturn normal === reversed;' },
        ],
        hints: [
          'Lowercase the word ONCE, before reversing.',
          'Then both sides of the comparison are lowercase.',
        ],
        checks: [
          { id: 'uses-lowercase', type: 'fileContains', file: 'palindrome.js', pattern: 'toLowerCase' },
          { id: 'pal-case', type: 'runOutput', file: 'palindrome.js', expect: 'Racecar is a palindrome: true', match: 'contains' },
        ],
        solution: `function isPalindrome(word) {
  const normal = word.toLowerCase();
  const reversed = normal.split("").reverse().join("");
  return normal === reversed;
}

console.log("racecar is a palindrome: " + isPalindrome("racecar"));
console.log("Racecar is a palindrome: " + isPalindrome("Racecar"));
console.log("hello is a palindrome: " + isPalindrome("hello"));
`,
      },
      {
        id: 'pal-4-phrases',
        title: 'Handle whole phrases',
        file: 'palindrome.js',
        task: 'Make `isPalindrome` ignore spaces, so `"never odd or even"` counts as a palindrome — print the verdict and expect `never odd or even is a palindrome: true`.',
        examples: [
          { label: 'Strip the spaces', code: 'const cleaned = text.toLowerCase().replace(/\\s/g, "");' },
        ],
        hints: [
          'Remove every space before reversing.',
          'The regular expression /\\s/g matches every whitespace character.',
        ],
        checks: [
          { id: 'strips-spaces', type: 'fileContains', file: 'palindrome.js', pattern: '\\\\s' },
          { id: 'pal-phrase', type: 'runOutput', file: 'palindrome.js', expect: 'never odd or even is a palindrome: true', match: 'contains' },
        ],
        solution: `function isPalindrome(text) {
  const cleaned = text.toLowerCase().replace(/\\s/g, "");
  const reversed = cleaned.split("").reverse().join("");
  return cleaned === reversed;
}

console.log("racecar is a palindrome: " + isPalindrome("racecar"));
console.log("Racecar is a palindrome: " + isPalindrome("Racecar"));
console.log("never odd or even is a palindrome: " + isPalindrome("never odd or even"));
`,
      },
    ],
    reflectionPrompt: 'Why must you split a string before you can reverse it?',
  },
  {
    id: 'realtime-chat',
    title: 'Realtime Chat',
    language: 'javascript',
    summary: 'Build a WebSocket chat server with the ws package and a demo client that sends and receives live messages.',
    brief: 'Serve an HTTP endpoint, attach WebSockets, broadcast JSON messages to every client, and verify the round-trip with a demo client.',
    concepts: ['http', 'websockets', 'events', 'json', 'modules', 'npm'],
    // NOTE: no `setup` — this project deliberately teaches the npm commands,
    // so the learner types `npm init -y` and `npm install ws` in the Terminal
    // (see the first step).
    scaffold: [
      {
        file: 'server.js',
        content: `const http = require('http');
const WebSocket = require('ws');

// TODO: collect connected clients in a Set
const clients = new Set();

function startChatServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Chat server is running');
  });

  // TODO: attach a WebSocket.Server({ server }) and handle connections

  // TODO: listen on 3000 and print "Chat server listening on http://localhost:3000"

  return server;
}

module.exports = { startChatServer };

if (require.main === module) {
  const server = startChatServer();
  // TODO: close the server once it is listening so the direct run finishes
}
`,
      },
      {
        file: 'demo.js',
        content: `// Demo client — run this to see the chat round-trip:
//   node demo.js
const WebSocket = require('ws');
const { startChatServer } = require('./server.js');

const server = startChatServer();
server.on('listening', () => {
  const ws = new WebSocket('ws://localhost:3000');
  ws.on('open', () => {
    console.log('Demo client connected');
    // TODO: send a JSON message like { author: "demo", text: "hello from demo" }
    // TODO: print the message text when it comes back
    setTimeout(() => process.exit(0), 1500);
  });
});
`,
      },
    ],
    steps: [
      {
        id: 'chat-0-scaffold',
        title: 'Scaffold the project with npm',
        file: 'package.json',
        task: 'In the Terminal panel, run `npm init -y` and then `npm install ws`. If the build lives in a subfolder, `cd` into it first — the Terminal opens in your project folder. This creates package.json and installs the WebSocket package. Then press Check step.',
        examples: [
          { label: 'In the Terminal', code: `cd realtime-chat
npm init -y
npm install ws` },
          { label: 'Verify the install', code: `npm ls ws --depth=0` },
        ],
        hints: [
          'npm init -y writes a package.json with all-default answers.',
          'npm install ws adds ws to package.json and installs it into node_modules.',
          'npm ls ws confirms the package is installed — the step checks this for you.',
        ],
        checks: [
          { id: 'has-package-json', type: 'fileExists', file: 'package.json' },
          { id: 'ws-installed', type: 'runCommand', command: 'npm ls ws --depth=0', expect: 'ws', match: 'contains' },
        ],
      },
      {
        id: 'chat-1-http',
        title: 'Serve the chat over HTTP',
        file: 'server.js',
        task: 'Make `startChatServer()` listen on port 3000 and print `Chat server listening on http://localhost:3000`. Then finish the direct-run block at the bottom so `node server.js` prints that line and closes — expect the line, then it exits cleanly.',
        examples: [
          { label: 'Listen', code: `server.listen(3000, () => {
  console.log('Chat server listening on http://localhost:3000');
});` },
          { label: 'Direct run closes', code: `if (require.main === module) {
  const server = startChatServer();
  server.on('listening', () => server.close());
}` },
        ],
        hints: [
          'server.listen(3000, callback) starts the server and runs the callback when it is ready.',
          'server.close() once it is listening lets the process exit so the check sees the output.',
          'The HTTP response handler is already in the scaffold — you only add the listen part.',
        ],
        checks: [
          { id: 'listens', type: 'fileContains', file: 'server.js', pattern: 'server.listen(3000', mode: 'string' },
          { id: 'listens-output', type: 'runOutput', file: 'server.js', expect: 'Chat server listening on http://localhost:3000', match: 'contains' },
        ],
        solution: `const http = require('http');
const WebSocket = require('ws');

const clients = new Set();

function startChatServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Chat server is running');
  });

  server.listen(3000, () => {
    console.log('Chat server listening on http://localhost:3000');
  });
  return server;
}

module.exports = { startChatServer };

if (require.main === module) {
  const server = startChatServer();
  server.on('listening', () => server.close());
}
`,
      },
      {
        id: 'chat-2-ws',
        title: 'Add WebSockets',
        file: 'server.js',
        task: 'Attach a WebSocket server with `new WebSocket.Server({ server })`. On every `connection`, add the client to the `clients` Set and print `Client connected`. Run `node demo.js` — expect `Demo client connected` (the demo client connects over WebSocket).',
        examples: [
          { label: 'WebSocket server', code: `const wss = new WebSocket.Server({ server });` },
          { label: 'Track connections', code: `wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');
});` },
        ],
        hints: [
          'ws is the npm package — require it at the top (the build installs it for you).',
          'clients is the Set declared at module scope.',
          'The demo client lives in demo.js — run it to connect.',
        ],
        checks: [
          { id: 'uses-ws', type: 'fileContains', file: 'server.js', pattern: 'WebSocket.Server', mode: 'string' },
          { id: 'tracks-clients', type: 'fileContains', file: 'server.js', pattern: 'clients.add', mode: 'string' },
          { id: 'demo-connects', type: 'runOutput', file: 'demo.js', expect: 'Demo client connected', match: 'contains' },
        ],
        solution: `const http = require('http');
const WebSocket = require('ws');

const clients = new Set();

function startChatServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Chat server is running');
  });

  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected');
  });

  server.listen(3000, () => {
    console.log('Chat server listening on http://localhost:3000');
  });
  return server;
}

module.exports = { startChatServer };

if (require.main === module) {
  const server = startChatServer();
  server.on('listening', () => server.close());
}
`,
      },
      {
        id: 'chat-3-broadcast',
        title: 'Broadcast messages',
        file: 'server.js',
        task: 'Teach the server to talk. Add a `broadcast(data)` helper that sends a message to every client in `clients`, and handle `message` events by parsing the JSON, logging `Broadcast: <text>`, and sending it to everyone. Then finish demo.js: send `{ author: "demo", text: "hello from demo" }` on connect and print `Client received: hello from demo` when it comes back. Run `node demo.js` and expect both lines.',
        examples: [
          { label: 'Broadcast helper', code: `function broadcast(data) {
  for (const client of clients) {
    client.send(data);
  }
}` },
          { label: 'Handle messages', code: `ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Broadcast: ' + msg.text);
  broadcast(data);
});` },
          { label: 'Demo client', code: `ws.on('open', () => {
  console.log('Demo client connected');
  ws.send(JSON.stringify({ author: 'demo', text: 'hello from demo' }));
});
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Client received: ' + msg.text);
  process.exit(0);
});` },
        ],
        hints: [
          'data from ws.on("message") is a Buffer — JSON.parse(data) handles it.',
          'Broadcast to EVERY client, including the sender, so the demo client hears its own message.',
          'process.exit(0) after the round-trip keeps the run clean and verifiable.',
        ],
        checks: [
          { id: 'has-broadcast', type: 'hasFunction', file: 'server.js', name: 'broadcast' },
          { id: 'parses-json', type: 'fileContains', file: 'server.js', pattern: 'JSON.parse', mode: 'string' },
          { id: 'demo-sends', type: 'fileContains', file: 'demo.js', pattern: 'ws.send', mode: 'string' },
          { id: 'round-trip', type: 'runOutput', file: 'demo.js', expect: 'Client received: hello from demo', match: 'contains' },
        ],
        solution: `const http = require('http');
const WebSocket = require('ws');

const clients = new Set();

function broadcast(data) {
  for (const client of clients) {
    client.send(data);
  }
}

function startChatServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Chat server is running');
  });

  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected');
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      console.log('Broadcast: ' + msg.text);
      broadcast(data);
    });
  });

  server.listen(3000, () => {
    console.log('Chat server listening on http://localhost:3000');
  });
  return server;
}

module.exports = { startChatServer };

if (require.main === module) {
  const server = startChatServer();
  server.on('listening', () => server.close());
}
`,
      },
    ],
    reflectionPrompt: 'Why does broadcasting to all clients — including the sender — make the demo round-trip work?',
  },
  {
    id: 'notes-api',
    title: 'Notes API',
    language: 'javascript',
    summary: 'Build a REST API with Express — list, create, and delete notes over JSON.',
    brief: 'Serve the notes list, accept new notes with JSON bodies, and delete by id — all exercised by a demo client.',
    concepts: ['express', 'rest', 'json', 'http', 'routing', 'npm'],
    // NOTE: no `setup` — the learner types `npm init -y` and `npm install
    // express` themselves in the Terminal (see the first step).
    scaffold: [
      {
        file: 'server.js',
        content: `const express = require('express');

const notes = [
  { id: 1, title: 'Learn Express', done: false },
];

function createNotesApp() {
  const app = express();
  // TODO: app.use(express.json());

  // TODO: GET /api/notes — respond with res.json(notes)

  return app;
}

module.exports = { createNotesApp };

if (require.main === module) {
  // TODO: start the app on 3000, print "Notes API listening on http://localhost:3000",
  // then close after a short delay so the direct run finishes
}
`,
      },
      {
        file: 'client.js',
        content: `// Demo client — run this to exercise the API end to end:
//   node client.js
const { createNotesApp } = require('./server.js');

const server = createNotesApp().listen(0, async () => {
  const port = server.address().port;
  // TODO: POST a note, GET the list, print what you got
  server.close();
  process.exit(0);
});
`,
      },
    ],
    steps: [
      {
        id: 'notes-0-scaffold',
        title: 'Scaffold the project with npm',
        file: 'package.json',
        task: 'In the Terminal panel, run `npm init -y` and then `npm install express`. If the build lives in a subfolder, `cd` into it first. This creates package.json and installs Express. Then press Check step.',
        examples: [
          { label: 'In the Terminal', code: `cd notes-api
npm init -y
npm install express` },
          { label: 'Verify the install', code: `npm ls express --depth=0` },
        ],
        hints: [
          'npm init -y writes a package.json with all-default answers.',
          'npm install express adds Express to package.json and node_modules.',
          'npm ls express confirms the install — the step checks this for you.',
        ],
        checks: [
          { id: 'has-package-json', type: 'fileExists', file: 'package.json' },
          { id: 'express-installed', type: 'runCommand', command: 'npm ls express --depth=0', expect: 'express', match: 'contains' },
        ],
      },
      {
        id: 'notes-1-get',
        title: 'Serve the notes list',
        file: 'server.js',
        task: 'Add `GET /api/notes` that responds with `res.json(notes)`, then finish the direct-run block: start the app on port 3000, print `Notes API listening on http://localhost:3000`, and close after a short delay. Run `node server.js` and expect that line.',
        examples: [
          { label: 'The GET route', code: `app.get('/api/notes', (req, res) => {
  res.json(notes);
});` },
          { label: 'Direct run', code: `if (require.main === module) {
  const server = createNotesApp().listen(3000, () => {
    console.log('Notes API listening on http://localhost:3000');
  });
  server.on('listening', () => setTimeout(() => server.close(), 500));
}` },
        ],
        hints: [
          'express() creates the app; app.get(path, handler) defines a route.',
          'res.json(data) sends the response as JSON.',
          'setTimeout(() => server.close(), 500) lets the check see the output, then exits cleanly.',
        ],
        checks: [
          { id: 'has-get-route', type: 'fileContains', file: 'server.js', pattern: "app.get('/api/notes'", mode: 'string' },
          { id: 'sends-json', type: 'fileContains', file: 'server.js', pattern: 'res.json', mode: 'string' },
          { id: 'listens', type: 'runOutput', file: 'server.js', expect: 'Notes API listening on http://localhost:3000', match: 'contains' },
        ],
        solution: `const express = require('express');

const notes = [
  { id: 1, title: 'Learn Express', done: false },
];

function createNotesApp() {
  const app = express();

  app.get('/api/notes', (req, res) => {
    res.json(notes);
  });

  return app;
}

module.exports = { createNotesApp };

if (require.main === module) {
  const server = createNotesApp().listen(3000, () => {
    console.log('Notes API listening on http://localhost:3000');
  });
  server.on('listening', () => setTimeout(() => server.close(), 500));
}
`,
      },
      {
        id: 'notes-2-post',
        title: 'Create notes with POST',
        file: 'server.js',
        task: 'Parse JSON request bodies with `app.use(express.json())` and add `POST /api/notes` — give the note a fresh id, push it into `notes`, and reply `201` with the created note. Then complete client.js to POST `{ title: "Buy milk" }` and print `Created: Buy milk`. Run `node client.js` and expect that line.',
        examples: [
          { label: 'JSON body parsing', code: `app.use(express.json());` },
          { label: 'The POST route', code: `app.post('/api/notes', (req, res) => {
  const note = { id: notes.length + 1, title: req.body.title, done: false };
  notes.push(note);
  res.status(201).json(note);
});` },
          { label: 'Demo client', code: `const res = await fetch(\`http://localhost:\${port}/api/notes\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Buy milk' }),
});
const created = await res.json();
console.log('Created: ' + created.title);` },
        ],
        hints: [
          'express.json() must come before your routes.',
          'req.body is only populated when the body was parsed.',
          'The client runs the server in-process on an ephemeral port (port 0).',
        ],
        checks: [
          { id: 'json-body', type: 'fileContains', file: 'server.js', pattern: 'express.json', mode: 'string' },
          { id: 'has-post-route', type: 'fileContains', file: 'server.js', pattern: "app.post('/api/notes'", mode: 'string' },
          { id: 'demo-creates', type: 'runOutput', file: 'client.js', expect: 'Created: Buy milk', match: 'contains' },
        ],
        solution: `const express = require('express');

const notes = [
  { id: 1, title: 'Learn Express', done: false },
];

function createNotesApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/notes', (req, res) => {
    res.json(notes);
  });

  app.post('/api/notes', (req, res) => {
    const note = { id: notes.length + 1, title: req.body.title, done: false };
    notes.push(note);
    res.status(201).json(note);
  });

  return app;
}

module.exports = { createNotesApp };

if (require.main === module) {
  const server = createNotesApp().listen(3000, () => {
    console.log('Notes API listening on http://localhost:3000');
  });
  server.on('listening', () => setTimeout(() => server.close(), 500));
}
`,
      },
      {
        id: 'notes-3-delete',
        title: 'Delete notes by id',
        file: 'server.js',
        task: 'Add `DELETE /api/notes/:id` — remove the note and reply `204`, or `404` when it does not exist. Then extend client.js: create two notes, delete one, and print `Notes left: 2`. Run `node client.js` and expect it.',
        examples: [
          { label: 'The DELETE route', code: `app.delete('/api/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  notes.splice(index, 1);
  res.status(204).end();
});` },
          { label: 'Demo client', code: `async function post(port, title) {
  const res = await fetch(\`http://localhost:\${port}/api/notes\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return res.json();
}

const a = await post(port, 'Buy milk');
await post(port, 'Walk dog');
await fetch(\`http://localhost:\${port}/api/notes/\${a.id}\`, { method: 'DELETE' });
const list = await fetch(\`http://localhost:\${port}/api/notes\`).then((r) => r.json());
console.log('Notes left: ' + list.length);` },
        ],
        hints: [
          ':id is a route parameter — req.params.id is a string, so Number(...) it.',
          '204 means "no content" — end the response with res.status(204).end().',
          'The demo starts with one seeded note, so 2 created − 1 deleted leaves 2.',
        ],
        checks: [
          { id: 'has-delete-route', type: 'fileContains', file: 'server.js', pattern: "app.delete('/api/notes/:id'", mode: 'string' },
          { id: 'not-found', type: 'fileContains', file: 'server.js', pattern: '404', mode: 'string' },
          { id: 'demo-deletes', type: 'runOutput', file: 'client.js', expect: 'Notes left: 2', match: 'contains' },
        ],
        solution: `const express = require('express');

const notes = [
  { id: 1, title: 'Learn Express', done: false },
];

function createNotesApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/notes', (req, res) => {
    res.json(notes);
  });

  app.post('/api/notes', (req, res) => {
    const note = { id: notes.length + 1, title: req.body.title, done: false };
    notes.push(note);
    res.status(201).json(note);
  });

  app.delete('/api/notes/:id', (req, res) => {
    const id = Number(req.params.id);
    const index = notes.findIndex((n) => n.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    notes.splice(index, 1);
    res.status(204).end();
  });

  return app;
}

module.exports = { createNotesApp };

if (require.main === module) {
  const server = createNotesApp().listen(3000, () => {
    console.log('Notes API listening on http://localhost:3000');
  });
  server.on('listening', () => setTimeout(() => server.close(), 500));
}
`,
      },
    ],
    reflectionPrompt: 'Why is each note stored as an object with an id, and why must the DELETE route handle a missing id?',
  },
];

// ---------------------------------------------------------------------------
// AI-generated projects (Build with AI)
//
// The learner types "build a calculator" and Gemini designs a project on the
// spot (see engine/aiService.js → generateBuildProjectWithAI). Generated
// projects are registered here and persisted to localStorage so an in-progress
// session survives a restart; they flow through the exact same pipeline as the
// hand-written samples above (findBuildProject resolves them, listBuildProjects
// shows them, evaluateStep verifies their checks).
//
// sanitizeGeneratedProject() is the trust boundary: it re-checks the AI's shape,
// forces every step onto a sane relative file path, caps sizes, and DROPS any
// check that doesn't hold against the AI's own step solution — an unverifiable
// check would brick the build, so better to skip it.
//
// Builds may be MULTI-FILE: the scaffold can carry several files (e.g. an LMS
// with server.js + models/lesson.js + package.json) and each step targets one
// of them. Steps may also declare `setup` shell commands (run in the project
// folder the first time the step becomes current — e.g. `npm install express`)
// and a project-level `setup` runs once when the build starts.

const GENERATED_STORAGE_KEY = 'seec0de.generatedBuildProjects';
const MAX_GENERATED_PROJECTS = 10;
const RUNNABLE_LANGUAGES = ['python', 'javascript', 'typescript', 'c', 'cpp'];
const CHECK_TYPES = new Set(['fileExists', 'fileContains', 'fileCount', 'fileMissing', 'hasFunction', 'runOutput', 'runPasses', 'runCommand']);

let generatedProjects = null; // [{ project }] newest first; lazy-loaded

function loadGeneratedProjects() {
  if (generatedProjects) return generatedProjects;
  try {
    const raw = localStorage.getItem(GENERATED_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    generatedProjects = Array.isArray(arr) ? arr : [];
  } catch {
    generatedProjects = [];
  }
  return generatedProjects;
}

function persistGeneratedProjects() {
  try {
    localStorage.setItem(GENERATED_STORAGE_KEY, JSON.stringify(generatedProjects.slice(0, MAX_GENERATED_PROJECTS)));
  } catch {
    // storage full / private mode — the in-memory registry still works
  }
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asStringArray(value, cap = 5) {
  if (!Array.isArray(value)) return [];
  return value.map((x) => asString(x)).filter(Boolean).slice(0, cap);
}

// Mirrors buildVerifier.countMatches so the sanity pass below can evaluate
// content checks without importing engine code into the data layer.
function countMatches(content, pattern, mode) {
  if (mode === 'string') return content.includes(pattern) ? 1 : 0;
  try {
    return (content.match(new RegExp(pattern, 'g')) || []).length;
  } catch {
    return -1;
  }
}

function checkPassesAgainst(check, content) {
  switch (check.type) {
    case 'fileExists':
      return content != null;
    case 'fileContains': {
      if (content == null) return false;
      return countMatches(content, check.pattern, check.mode) >= (check.count ?? 1);
    }
    case 'fileCount': {
      if (content == null) return false;
      const n = countMatches(content, check.pattern, check.mode);
      return (check.atLeast == null || n >= check.atLeast) && (check.atMost == null || n <= check.atMost);
    }
    case 'fileMissing': {
      if (content == null) return true;
      return countMatches(content, check.pattern, check.mode) === 0;
    }
    case 'hasFunction': {
      if (content == null) return false;
      return new RegExp(`(?:function\\s+|def\\s+)${check.name}\\b`).test(content);
    }
    default:
      return true; // output checks can't be verified statically — kept as-is
  }
}

// Simple relative file paths only: no drive letters, no `..`, no leading
// slashes, no spaces/shell metacharacters, max 2 path segments deep.
function sanitizeFilePath(value, fallback) {
  const raw = asString(value) || fallback;
  const cleaned = raw.replace(/\\/g, '/').replace(/^\/+/g, '').replace(/\/+/g, '/');
  if (!cleaned || cleaned === '.' || cleaned === '..' || /^\.\.\//.test(cleaned)) return fallback;
  if (/[\s'"`$&|;<>(){}*?]/.test(cleaned)) return fallback;
  const parts = cleaned.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..')) return fallback;
  if (parts.length > 2) return fallback;
  return cleaned;
}

function sanitizeCheck(check, defaultFile) {
  const file = sanitizeFilePath(check.file, defaultFile);
  const out = {
    id: asString(check.id) || `${check.type}-${Math.random().toString(36).slice(2, 7)}`,
    type: check.type,
    file,
  };
  switch (check.type) {
    case 'fileContains':
      out.pattern = asString(check.pattern);
      if (check.mode === 'string') out.mode = 'string';
      if (typeof check.count === 'number') out.count = check.count;
      break;
    case 'fileCount':
      out.pattern = asString(check.pattern);
      if (typeof check.atLeast === 'number') out.atLeast = check.atLeast;
      if (typeof check.atMost === 'number') out.atMost = check.atMost;
      break;
    case 'fileMissing':
      out.pattern = asString(check.pattern);
      break;
    case 'hasFunction':
      out.name = asString(check.name);
      break;
    case 'runOutput':
      out.expect = asString(check.expect);
      if (check.match === 'exact' || check.match === 'contains') out.match = check.match;
      break;
    case 'runCommand':
      out.command = asString(check.command).slice(0, 300);
      out.expect = asString(check.expect);
      if (check.match === 'exact' || check.match === 'contains') out.match = check.match;
      break;
    default:
      break; // runPasses needs nothing extra
  }
  return out;
}

// Shell setup commands, capped: plain short strings only (no newlines that
// could smuggle a second command past the UI copy).
function sanitizeSetupCommands(value, cap = 4) {
  if (!Array.isArray(value)) return [];
  return value
    .map((c) => asString(c))
    .filter((c) => c && c.length <= 200 && !/\r|\n/.test(c))
    .slice(0, cap);
}

function sanitizeStep(rawStep, projectId, index, scaffoldFiles) {
  // A step may target any scaffold file, or introduce a brand-new file of its
  // own (the learner creates it). Either way it must be a simple relative path.
  const file = sanitizeFilePath(rawStep.file, scaffoldFiles[0] || 'main.py');
  const solution = asString(rawStep.solution);
  const rawChecks = (Array.isArray(rawStep.checks) ? rawStep.checks : [])
    .filter((c) => c && typeof c === 'object' && CHECK_TYPES.has(c.type))
    .slice(0, 6)
    // Every content check targets the step's file. runCommand checks carry
    // their own command; output checks attach to whatever the learner runs.
    .map((c) => ({ ...sanitizeCheck(c, file), file }));

  // Sanity pass: a check that can't pass against the AI's own solution would
  // brick the step for the learner, so drop it. runOutput expects must appear
  // verbatim in the solution source; content checks must evaluate true.
  // runCommand checks can't be verified statically — kept as long as they
  // carry a command and an expect string.
  const kept = rawChecks.filter((check) => {
    if (check.type === 'runCommand') {
      // `expect` may legitimately be '' ("command exits cleanly" semantics).
      return check.command && typeof check.expect === 'string';
    }
    if (!solution) return check.type === 'fileExists' || check.type === 'runOutput' || check.type === 'runPasses';
    if (check.type === 'runOutput') {
      const expect = check.expect || '';
      return expect.length > 0 && solution.includes(expect);
    }
    if (check.type === 'runPasses') return true;
    return checkPassesAgainst(check, solution);
  });

  // Floor: never leave a step with zero gates — at least the file must exist.
  if (kept.length === 0) kept.push({ id: `${projectId}-s${index}-exists`, type: 'fileExists', file });

  return {
    id: `${projectId}-s${index}`,
    title: asString(rawStep.title) || `Step ${index + 1}`,
    file,
    task: asString(rawStep.task) || 'Complete this step.',
    examples: (Array.isArray(rawStep.examples) ? rawStep.examples : [])
      .filter((e) => e && typeof e === 'object')
      .slice(0, 3)
      .map((e) => ({ label: asString(e.label) || 'Example', code: asString(e.code) })),
    hints: asStringArray(rawStep.hints, 4),
    setup: sanitizeSetupCommands(rawStep.setup, 3),
    checks: kept,
    solution,
  };
}

function titleFromPrompt(prompt) {
  const clean = prompt.trim().replace(/\s+/g, ' ').replace(/^build\s+/i, '').replace(/^(a|an|the)\s+/i, '');
  const words = clean.split(' ').filter(Boolean);
  const title = words.slice(0, 4).join(' ');
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : 'Custom Project';
}

/**
 * Validate + normalise a raw Gemini response into a build-project object that
 * the verifier can run. Throws a friendly error when the response is unusable.
 */
export function sanitizeGeneratedProject(raw, prompt) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Gemini returned an empty response — try again.');
  }

  const id = `gen_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const language = RUNNABLE_LANGUAGES.includes(raw.language) ? raw.language : 'python';
  const defaultFile = `main.${language === 'python' ? 'py' : 'js'}`;

  const scaffold = (Array.isArray(raw.scaffold) ? raw.scaffold : [])
    .filter((s) => s && typeof s === 'object')
    .slice(0, 6)
    .map((s) => ({ file: sanitizeFilePath(s.file, defaultFile), content: asString(s.content) }))
    .filter((s) => s.file && s.content);

  // Dedupe file names, keeping the first occurrence.
  const seen = new Set();
  const uniqueScaffold = [];
  for (const s of scaffold) {
    if (!seen.has(s.file)) { seen.add(s.file); uniqueScaffold.push(s); }
  }
  if (uniqueScaffold.length === 0) {
    uniqueScaffold.push({ file: defaultFile, content: `# ${titleFromPrompt(prompt)} — build it with the steps below.\n` });
  }
  const scaffoldFiles = uniqueScaffold.map((s) => s.file);

  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .filter((s) => s && typeof s === 'object')
    .slice(0, 8)
    .map((s, i) => sanitizeStep(s, id, i, scaffoldFiles));

  if (steps.length === 0) {
    throw new Error("Gemini didn't produce any steps — try again with a clearer request.");
  }

  const title = asString(raw.title) || titleFromPrompt(prompt);

  return {
    id,
    title,
    language,
    summary: asString(raw.summary) || `${title} — a guided build.`,
    brief: asString(raw.brief) || asString(raw.summary) || '',
    concepts: asStringArray(raw.concepts, 6),
    scaffold: uniqueScaffold,
    setup: sanitizeSetupCommands(raw.setup, 4),
    steps,
    reflectionPrompt: asString(raw.reflectionPrompt),
    generated: true,
    prompt: asString(prompt),
  };
}

/** Register a generated project (newest first, capped). Returns it. */
export function registerGeneratedProject(project) {
  const list = loadGeneratedProjects();
  list.unshift(project);
  generatedProjects = list.slice(0, MAX_GENERATED_PROJECTS);
  persistGeneratedProjects();
  return project;
}

export function listGeneratedProjects() {
  return loadGeneratedProjects();
}

/** Remove a generated project. Returns true if it existed. */
export function deleteGeneratedProject(projectId) {
  const list = loadGeneratedProjects();
  const next = list.filter((p) => p.id !== projectId);
  if (next.length === list.length) return false;
  generatedProjects = next;
  persistGeneratedProjects();
  return true;
}

export function listBuildProjects() {
  return [...loadGeneratedProjects(), ...buildProjects];
}

export function findBuildProject(projectId) {
  return (
    loadGeneratedProjects().find((project) => project.id === projectId)
    || buildProjects.find((project) => project.id === projectId)
    || null
  );
}

export default buildProjects;
