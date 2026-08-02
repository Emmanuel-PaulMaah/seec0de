const projects = [
  {
    id: 'js-project-quiz-engine',
    title: 'Quiz Engine',
    language: 'javascript',
    summary: 'Build and extend a small quiz scorer.',
    brief: 'Represent answers as data, score them with a function, fix a comparison bug, and add partial credit.',
    concepts: ['arrays', 'objects', 'functions', 'conditionals', 'loops'],
    checkpoints: [
      {
        id: 'js-project-quiz-engine-plan', title: 'Create the answer model', phase: 'plan',
        task: 'Complete the question data and print the quiz title and question count.',
        starterCode: `const quizTitle = "JavaScript Basics";
const questions = [
  { prompt: "Which keyword declares a constant?", answer: "const" },
  // TODO: add a question whose answer is "array"
];

console.log("Quiz: " + quizTitle);
console.log("Questions: " + 0); // TODO: use the data`,
        expectedOutput: `Quiz: JavaScript Basics
Questions: 2`, matchType: 'exact',
        hints: ['Each question is an object with prompt and answer properties.', 'The length property reports the number of array items.'],
        solution: `const quizTitle = "JavaScript Basics";
const questions = [
  { prompt: "Which keyword declares a constant?", answer: "const" },
  { prompt: "Which structure stores an ordered list?", answer: "array" },
];

console.log("Quiz: " + quizTitle);
console.log("Questions: " + questions.length);`,
        reflectionPrompt: 'Why is the correct answer stored beside each prompt rather than in a separate array?'
      },
      {
        id: 'js-project-quiz-engine-build', title: 'Score submitted answers', phase: 'build',
        task: 'Complete the named scoreQuiz function so it counts correct answers, then print the result.',
        starterCode: `const questions = [
  { prompt: "Constant keyword?", answer: "const" },
  { prompt: "Ordered list?", answer: "array" },
];
const submitted = ["const", "object"];

function scoreQuiz(items, answers) {
  let score = 0;
  // TODO: compare each submitted answer with the matching item
  return score;
}

console.log("Score: " + scoreQuiz(questions, submitted) + "/2");`,
        expectedOutput: `Score: 1/2`, matchType: 'exact',
        hints: ['Loop over the indexes of items.', 'Increase score only when answers[index] equals items[index].answer.'],
        solution: `const questions = [
  { prompt: "Constant keyword?", answer: "const" },
  { prompt: "Ordered list?", answer: "array" },
];
const submitted = ["const", "object"];

function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index] === items[index].answer) score += 1;
  }
  return score;
}

console.log("Score: " + scoreQuiz(questions, submitted) + "/2");`,
        reflectionPrompt: 'What would happen if the submitted array had fewer entries than the questions array?'
      },
      {
        id: 'js-project-quiz-engine-debug', title: 'Fix case-insensitive scoring', phase: 'debug',
        task: 'Diagnose why a differently capitalized correct answer is rejected and fix the scoring logic.',
        starterCode: `const questions = [
  { prompt: "Constant keyword?", answer: "const" },
  { prompt: "Ordered list?", answer: "array" },
];
const submitted = ["CONST", "array"];

function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index] === items[index].answer.toLowerCase()) score += 1;
  }
  return score;
}

console.log("Case-friendly score: " + scoreQuiz(questions, submitted) + "/2");`,
        expectedOutput: `Case-friendly score: 2/2`, matchType: 'exact',
        hints: ['Inspect which side of the comparison is normalized.', 'Call toLowerCase on both compared strings.'],
        solution: `const questions = [
  { prompt: "Constant keyword?", answer: "const" },
  { prompt: "Ordered list?", answer: "array" },
];
const submitted = ["CONST", "array"];

function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index].toLowerCase() === items[index].answer.toLowerCase()) score += 1;
  }
  return score;
}

console.log("Case-friendly score: " + scoreQuiz(questions, submitted) + "/2");`,
        reflectionPrompt: 'Which comparison caused the capitalized answer to be marked wrong?'
      },
      {
        id: 'js-project-quiz-engine-modify', title: 'Add partial credit', phase: 'modify',
        task: 'Change scoring so an answer matching a question hint earns 0.5 points while an exact answer earns 1.',
        starterCode: `const questions = [
  { prompt: "Constant keyword?", answer: "const", hint: "keyword" },
  { prompt: "Ordered list?", answer: "array", hint: "list" },
  { prompt: "Reusable action?", answer: "function", hint: "function" },
];
const submitted = ["const", "list", "method"];

function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index] === items[index].answer) score += 1;
    // TODO: award half a point for a hint match
  }
  return score;
}

const score = scoreQuiz(questions, submitted);
console.log("Final score: " + score + "/3");
console.log("Review needed: " + (score < 2));`,
        expectedOutput: `Final score: 1.5/3
Review needed: true`, matchType: 'exact',
        hints: ['Only test the hint when the exact-answer condition was false.', 'An else if branch prevents awarding both full and partial credit.'],
        solution: `const questions = [
  { prompt: "Constant keyword?", answer: "const", hint: "keyword" },
  { prompt: "Ordered list?", answer: "array", hint: "list" },
  { prompt: "Reusable action?", answer: "function", hint: "function" },
];
const submitted = ["const", "list", "method"];

function scoreQuiz(items, answers) {
  let score = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (answers[index] === items[index].answer) score += 1;
    else if (answers[index] === items[index].hint) score += 0.5;
  }
  return score;
}

const score = scoreQuiz(questions, submitted);
console.log("Final score: " + score + "/3");
console.log("Review needed: " + (score < 2));`,
        reflectionPrompt: 'Why must the hint check use else if instead of a separate if?'
      }
    ]
  },
  {
    id: 'js-project-inventory-report', title: 'Inventory Report', language: 'javascript',
    summary: 'Turn product records into a useful stock report.',
    brief: 'Model inventory, calculate stock value, repair a low-stock rule, and account for reserved units.',
    concepts: ['arrays', 'objects', 'functions', 'arithmetic', 'filtering'],
    checkpoints: [
      {
        id: 'js-project-inventory-report-plan', title: 'Model the stock', phase: 'plan', task: 'Add the missing product and print both item records with readable quantities.',
        starterCode: `const inventory = [
  { name: "Notebook", price: 4, quantity: 3 },
  // TODO: add Pencil, price 2, quantity 5
];

console.log(inventory[0].name + ": " + inventory[0].quantity);
// TODO: print the second product`,
        expectedOutput: `Notebook: 3
Pencil: 5`, matchType: 'exact',
        hints: ['Use the same object properties as the first product.', 'The second array item has index 1.'],
        solution: `const inventory = [
  { name: "Notebook", price: 4, quantity: 3 },
  { name: "Pencil", price: 2, quantity: 5 },
];

console.log(inventory[0].name + ": " + inventory[0].quantity);
console.log(inventory[1].name + ": " + inventory[1].quantity);`,
        reflectionPrompt: 'Why is each product represented by an object instead of three separate values?'
      },
      {
        id: 'js-project-inventory-report-build', title: 'Calculate inventory value', phase: 'build', task: 'Implement totalValue to sum price times quantity for every product.',
        starterCode: `const inventory = [
  { name: "Notebook", price: 4, quantity: 3 },
  { name: "Pencil", price: 2, quantity: 5 },
];

function totalValue(products) {
  // TODO: calculate and return the complete value
  return 0;
}

console.log("Inventory value: $" + totalValue(inventory));`,
        expectedOutput: `Inventory value: $22`, matchType: 'exact',
        hints: ['Start a total at zero and loop through products.', 'Add product.price multiplied by product.quantity.'],
        solution: `const inventory = [
  { name: "Notebook", price: 4, quantity: 3 },
  { name: "Pencil", price: 2, quantity: 5 },
];

function totalValue(products) {
  let total = 0;
  for (const product of products) {
    total += product.price * product.quantity;
  }
  return total;
}

console.log("Inventory value: $" + totalValue(inventory));`,
        reflectionPrompt: 'Why is multiplication performed before adding to the running total?'
      },
      {
        id: 'js-project-inventory-report-debug', title: 'Repair the low-stock rule', phase: 'debug', task: 'Fix the boundary bug so products at the reorder level are included in the low-stock report.',
        starterCode: `const inventory = [
  { name: "Notebook", price: 4, quantity: 3 },
  { name: "Pencil", price: 2, quantity: 5 },
  { name: "Marker", price: 3, quantity: 2 },
];

function lowStockNames(products, reorderLevel) {
  const names = [];
  for (const product of products) {
    if (product.quantity < reorderLevel) names.push(product.name);
  }
  return names;
}

console.log("Reorder: " + lowStockNames(inventory, 3).join(", "));`,
        expectedOutput: `Reorder: Notebook, Marker`, matchType: 'exact',
        hints: ['Notebook is exactly at the boundary.', 'Use the comparison operator that means less than or equal to.'],
        solution: `const inventory = [
  { name: "Notebook", price: 4, quantity: 3 },
  { name: "Pencil", price: 2, quantity: 5 },
  { name: "Marker", price: 3, quantity: 2 },
];

function lowStockNames(products, reorderLevel) {
  const names = [];
  for (const product of products) {
    if (product.quantity <= reorderLevel) names.push(product.name);
  }
  return names;
}

console.log("Reorder: " + lowStockNames(inventory, 3).join(", "));`,
        reflectionPrompt: 'Which boundary value exposed the difference between < and <=?'
      },
      {
        id: 'js-project-inventory-report-modify', title: 'Account for reservations', phase: 'modify', task: 'Report sellable units after reservations and flag items with at most two sellable units.',
        starterCode: `const inventory = [
  { name: "Notebook", quantity: 5, reserved: 2 },
  { name: "Pencil", quantity: 6, reserved: 1 },
  { name: "Marker", quantity: 2, reserved: 0 },
];

function availableUnits(product) {
  // TODO: return units that can actually be sold
}

console.log("Available stock:");
for (const product of inventory) {
  const available = availableUnits(product);
  // TODO: append " LOW" when available is 2 or fewer
  console.log(product.name + ": " + available);
}`, expectedOutput: `Available stock:
Notebook: 3
Pencil: 5
Marker: 2 LOW`, matchType: 'exact',
        hints: ['Subtract reserved from quantity in availableUnits.', 'Build a suffix using available <= 2.'],
        solution: `const inventory = [
  { name: "Notebook", quantity: 5, reserved: 2 },
  { name: "Pencil", quantity: 6, reserved: 1 },
  { name: "Marker", quantity: 2, reserved: 0 },
];

function availableUnits(product) {
  return product.quantity - product.reserved;
}

console.log("Available stock:");
for (const product of inventory) {
  const available = availableUnits(product);
  const warning = available <= 2 ? " LOW" : "";
  console.log(product.name + ": " + available + warning);
}`, reflectionPrompt: 'Why should the warning use available units rather than total quantity?'
      }
    ]
  },
  {
    id: 'py-project-study-log', title: 'Study Log', language: 'python',
    summary: 'Summarize focused study sessions.',
    brief: 'Store sessions, total minutes, fix subject filtering, and convert the report to hours with a goal check.',
    concepts: ['lists', 'dictionaries', 'functions', 'loops', 'conditionals'],
    checkpoints: [
      {
        id: 'py-project-study-log-plan', title: 'Record study sessions', phase: 'plan', task: 'Complete the second session and print the log name and session count.',
        starterCode: `log_name = "Week 1"
sessions = [
    {"subject": "Python", "minutes": 30},
    # TODO: add a Math session lasting 20 minutes
]

print("Study log:", log_name)
print("Sessions:", 0)  # TODO: use the list`, expectedOutput: `Study log: Week 1
Sessions: 2`, matchType: 'exact',
        hints: ['A second dictionary belongs inside the list.', 'len(sessions) gives the number of records.'],
        solution: `log_name = "Week 1"
sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
]

print("Study log:", log_name)
print("Sessions:", len(sessions))`, reflectionPrompt: 'What advantage does a dictionary give each study session?'
      },
      {
        id: 'py-project-study-log-build', title: 'Total the study time', phase: 'build', task: 'Implement total_minutes and use it to print the combined study time.',
        starterCode: `sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
    {"subject": "Python", "minutes": 25},
]

def total_minutes(entries):
    # TODO: add every session duration
    return 0

print("Total minutes:", total_minutes(sessions))`, expectedOutput: `Total minutes: 75`, matchType: 'exact',
        hints: ['Create a running total before the loop.', 'Add entry["minutes"] for each entry.'],
        solution: `sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
    {"subject": "Python", "minutes": 25},
]

def total_minutes(entries):
    total = 0
    for entry in entries:
        total += entry["minutes"]
    return total

print("Total minutes:", total_minutes(sessions))`, reflectionPrompt: 'Why is total initialized before the loop rather than inside it?'
      },
      {
        id: 'py-project-study-log-debug', title: 'Fix subject totals', phase: 'debug', task: 'Diagnose and fix the condition that incorrectly totals sessions from other subjects.',
        starterCode: `sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
    {"subject": "Python", "minutes": 25},
]

def minutes_for_subject(entries, subject):
    total = 0
    for entry in entries:
        if entry["subject"] != subject:
            total += entry["minutes"]
    return total

print("Python minutes:", minutes_for_subject(sessions, "Python"))`, expectedOutput: `Python minutes: 55`, matchType: 'exact',
        hints: ['Read the condition as an English sentence.', 'The duration should be added when the subjects are equal.'],
        solution: `sessions = [
    {"subject": "Python", "minutes": 30},
    {"subject": "Math", "minutes": 20},
    {"subject": "Python", "minutes": 25},
]

def minutes_for_subject(entries, subject):
    total = 0
    for entry in entries:
        if entry["subject"] == subject:
            total += entry["minutes"]
    return total

print("Python minutes:", minutes_for_subject(sessions, "Python"))`, reflectionPrompt: 'How did the != operator change which sessions were counted?'
      },
      {
        id: 'py-project-study-log-modify', title: 'Report hours and goal progress', phase: 'modify', task: 'Convert total minutes to hours rounded to one decimal and report whether the 2-hour goal was reached.',
        starterCode: `sessions = [
    {"subject": "Python", "minutes": 50},
    {"subject": "Math", "minutes": 35},
    {"subject": "Writing", "minutes": 40},
]

def total_minutes(entries):
    total = 0
    for entry in entries:
        total += entry["minutes"]
    return total

def hours_studied(entries):
    # TODO: convert minutes and round to one decimal place
    return 0

hours = hours_studied(sessions)
print("Hours studied:", hours)
# TODO: print whether hours meets the 2-hour goal`, expectedOutput: `Hours studied: 2.1
Goal reached: True`, matchType: 'exact',
        hints: ['Divide total_minutes(entries) by 60.', 'round(value, 1) keeps one decimal; compare hours with 2.'],
        solution: `sessions = [
    {"subject": "Python", "minutes": 50},
    {"subject": "Math", "minutes": 35},
    {"subject": "Writing", "minutes": 40},
]

def total_minutes(entries):
    total = 0
    for entry in entries:
        total += entry["minutes"]
    return total

def hours_studied(entries):
    return round(total_minutes(entries) / 60, 1)

hours = hours_studied(sessions)
print("Hours studied:", hours)
print("Goal reached:", hours >= 2)`, reflectionPrompt: 'What information is lost when study hours are rounded to one decimal place?'
      }
    ]
  },
  {
    id: 'py-project-text-analyzer', title: 'Text Analyzer', language: 'python',
    summary: 'Measure and classify a fixed piece of text.',
    brief: 'Prepare text data, count words, debug normalization, and add unique-word frequency reporting.',
    concepts: ['strings', 'lists', 'functions', 'loops', 'dictionaries'],
    checkpoints: [
      {
        id: 'py-project-text-analyzer-plan', title: 'Prepare words', phase: 'plan', task: 'Split the sentence into words and print the original text and its word count.',
        starterCode: `text = "Code grows with practice"
# TODO: create words by splitting text
words = []

print("Text:", text)
print("Word count:", 0)  # TODO: use words`, expectedOutput: `Text: Code grows with practice
Word count: 4`, matchType: 'exact',
        hints: ['Strings have a split method that separates on spaces.', 'Use len on the resulting list.'],
        solution: `text = "Code grows with practice"
words = text.split()

print("Text:", text)
print("Word count:", len(words))`, reflectionPrompt: 'Why is a list of words easier to count than the original string?'
      },
      {
        id: 'py-project-text-analyzer-build', title: 'Count long words', phase: 'build', task: 'Implement count_long_words to count words whose length is at least the supplied minimum.',
        starterCode: `text = "Code grows with steady practice"
words = text.split()

def count_long_words(items, minimum):
    # TODO: count words at least minimum characters long
    return 0

print("Words with 5+ letters:", count_long_words(words, 5))`, expectedOutput: `Words with 5+ letters: 3`, matchType: 'exact',
        hints: ['Loop through items with a count starting at zero.', 'Use len(word) >= minimum.'],
        solution: `text = "Code grows with steady practice"
words = text.split()

def count_long_words(items, minimum):
    count = 0
    for word in items:
        if len(word) >= minimum:
            count += 1
    return count

print("Words with 5+ letters:", count_long_words(words, 5))`, reflectionPrompt: 'Why does the rule use >= rather than > for the minimum length?'
      },
      {
        id: 'py-project-text-analyzer-debug', title: 'Fix repeated-word detection', phase: 'debug', task: 'Diagnose why Code and code are treated as different words and fix the normalization.',
        starterCode: `text = "Code grows when code gets tested"

def count_word(source, target):
    count = 0
    for word in source.split():
        if word == target.lower():
            count += 1
    return count

print("Uses of code:", count_word(text, "code"))`, expectedOutput: `Uses of code: 2`, matchType: 'exact',
        hints: ['Only the target is currently normalized.', 'Lowercase each word before comparing it.'],
        solution: `text = "Code grows when code gets tested"

def count_word(source, target):
    count = 0
    for word in source.split():
        if word.lower() == target.lower():
            count += 1
    return count

print("Uses of code:", count_word(text, "code"))`, reflectionPrompt: 'Which value retained capitalization and caused the missed match?'
      },
      {
        id: 'py-project-text-analyzer-modify', title: 'Add a frequency report', phase: 'modify', task: 'Ignore case, count every unique word, and print an alphabetical frequency report.',
        starterCode: `text = "Practice makes code and practice builds code"

def word_frequencies(source):
    counts = {}
    for word in source.lower().split():
        # TODO: increase this word's count, starting at zero
        pass
    return counts

frequencies = word_frequencies(text)
print("Unique words:", 0)  # TODO: report dictionary size
for word in sorted(frequencies):
    # TODO: print word and count
    pass`, expectedOutput: `Unique words: 5
and: 1
builds: 1
code: 2
makes: 1
practice: 2`, matchType: 'exact',
        hints: ['counts.get(word, 0) supplies zero for a new word.', 'Use len(frequencies), then print word + ": " + str(frequencies[word]).'],
        solution: `text = "Practice makes code and practice builds code"

def word_frequencies(source):
    counts = {}
    for word in source.lower().split():
        counts[word] = counts.get(word, 0) + 1
    return counts

frequencies = word_frequencies(text)
print("Unique words:", len(frequencies))
for word in sorted(frequencies):
    print(word + ": " + str(frequencies[word]))`, reflectionPrompt: 'Why is alphabetical sorting useful even though the dictionary already stores every count?'
      }
    ]
  },
  {
    id: 'ts-project-progress-tracker', title: 'Progress Tracker', language: 'typescript',
    summary: 'Build a typed report for course progress.',
    brief: 'Model course records, calculate completion, repair optional data handling, and summarize several courses.',
    concepts: ['interfaces', 'typed arrays', 'functions', 'optional properties', 'aggregation'],
    checkpoints: [
      {
        id: 'ts-project-progress-tracker-plan', title: 'Model a course record', phase: 'plan',
        task: 'Define the Course interface, type the record, and print its title and lesson count.',
        starterCode: `// Define Course with title: string and lessons: number.\nconst course = { title: "TypeScript Foundations", lessons: 10 };\nconsole.log(course.title);\nconsole.log("Lessons: " + course.lessons);`,
        expectedOutput: `TypeScript Foundations\nLessons: 10`, matchType: 'exact',
        hints: ['Declare the interface before the object.', 'Annotate course with the interface name.'],
        solution: `interface Course {\n  title: string;\n  lessons: number;\n}\nconst course: Course = { title: "TypeScript Foundations", lessons: 10 };\nconsole.log(course.title);\nconsole.log("Lessons: " + course.lessons);`,
        reflectionPrompt: 'What invalid object would the Course interface reject?'
      },
      {
        id: 'ts-project-progress-tracker-build', title: 'Calculate completion', phase: 'build',
        task: 'Type and implement percentComplete, then print the rounded completion percentage.',
        starterCode: `interface Progress { completed: number; total: number }\n\nfunction percentComplete(progress) {\n  // Return the rounded percentage.\n}\n\nconsole.log("Complete: " + percentComplete({ completed: 7, total: 10 }) + "%");`,
        expectedOutput: 'Complete: 70%', matchType: 'exact',
        hints: ['The parameter uses Progress and the function returns number.', 'Divide completed by total, multiply by 100, then use Math.round.'],
        solution: `interface Progress { completed: number; total: number }\n\nfunction percentComplete(progress: Progress): number {\n  return Math.round((progress.completed / progress.total) * 100);\n}\n\nconsole.log("Complete: " + percentComplete({ completed: 7, total: 10 }) + "%");`,
        reflectionPrompt: 'Why does the function accept a Progress object instead of two unrelated arguments?'
      },
      {
        id: 'ts-project-progress-tracker-debug', title: 'Repair the optional mentor', phase: 'debug',
        task: 'Fix the contract and formatter so a course without a mentor prints a safe fallback.',
        starterCode: `interface Course { title: string; mentor: string }\nconst course: Course = { title: "Safe Programs" };\nconsole.log(course.title + " — " + course.mentor.toUpperCase());`,
        expectedOutput: 'Safe Programs — self-guided', matchType: 'exact',
        hints: ['The mentor property is not always present.', 'Optional chaining and nullish coalescing can safely format it.'],
        solution: `interface Course { title: string; mentor?: string }\nconst course: Course = { title: "Safe Programs" };\nconsole.log(course.title + " — " + (course.mentor?.toUpperCase() ?? "self-guided"));`,
        reflectionPrompt: 'Which two values can nullish coalescing replace?'
      },
      {
        id: 'ts-project-progress-tracker-modify', title: 'Summarize the dashboard', phase: 'modify',
        task: 'Complete dashboardSummary so it reports course count and total completed lessons.',
        starterCode: `interface CourseProgress { title: string; completed: number; total: number }\nconst courses: CourseProgress[] = [\n  { title: "Foundations", completed: 10, total: 10 },\n  { title: "Safe Programs", completed: 3, total: 5 },\n];\n\nfunction dashboardSummary(items: CourseProgress[]): string {\n  // Calculate the completed lesson total.\n  return "";\n}\nconsole.log(dashboardSummary(courses));`,
        expectedOutput: '2 courses, 13 lessons complete', matchType: 'exact',
        hints: ['Use reduce to add each completed value.', 'items.length is the course count.'],
        solution: `interface CourseProgress { title: string; completed: number; total: number }\nconst courses: CourseProgress[] = [\n  { title: "Foundations", completed: 10, total: 10 },\n  { title: "Safe Programs", completed: 3, total: 5 },\n];\n\nfunction dashboardSummary(items: CourseProgress[]): string {\n  const completed = items.reduce((total, course) => total + course.completed, 0);\n  return \`${'${items.length}'} courses, ${'${completed}'} lessons complete\`;\n}\nconsole.log(dashboardSummary(courses));`,
        reflectionPrompt: 'Which part of the summary would change if a third course were added?'
      }
    ]
  },
  {
    id: 'ts-project-command-result', title: 'Command Result Reporter', language: 'typescript',
    summary: 'Model successful and failed commands without unsafe state combinations.',
    brief: 'Design a discriminated union, format both states, fix unsafe access, and aggregate a command history.',
    concepts: ['literal types', 'discriminated unions', 'narrowing', 'exhaustive states', 'typed arrays'],
    checkpoints: [
      {
        id: 'ts-project-command-result-plan', title: 'Define command states', phase: 'plan',
        task: 'Define CommandResult as a success or failure state and print both status tags.',
        starterCode: `// A success has output; a failure has message.\n// Define CommandResult with a shared status tag.\nconst results = [\n  { status: "success", output: "built" },\n  { status: "failure", message: "offline" },\n];\nfor (const result of results) console.log(result.status);`,
        expectedOutput: `success\nfailure`, matchType: 'exact',
        hints: ['Use literal status values in two object types joined by |.', 'Annotate results as CommandResult[].'],
        solution: `type CommandResult =\n  | { status: "success"; output: string }\n  | { status: "failure"; message: string };\nconst results: CommandResult[] = [\n  { status: "success", output: "built" },\n  { status: "failure", message: "offline" },\n];\nfor (const result of results) console.log(result.status);`,
        reflectionPrompt: 'Why can a failure result not accidentally omit its error message?'
      },
      {
        id: 'ts-project-command-result-build', title: 'Format every state', phase: 'build',
        task: 'Implement the typed formatResult function by narrowing on status.',
        starterCode: `type CommandResult =\n  | { status: "success"; output: string }\n  | { status: "failure"; message: string };\n\nfunction formatResult(result: CommandResult): string {\n  // Return OK: output or ERROR: message.\n  return "";\n}\nconsole.log(formatResult({ status: "success", output: "built" }));\nconsole.log(formatResult({ status: "failure", message: "offline" }));`,
        expectedOutput: `OK: built\nERROR: offline`, matchType: 'exact',
        hints: ['Compare result.status with "success".', 'Each branch gains access to its state-specific property.'],
        solution: `type CommandResult =\n  | { status: "success"; output: string }\n  | { status: "failure"; message: string };\n\nfunction formatResult(result: CommandResult): string {\n  if (result.status === "success") return \`OK: ${'${result.output}'}\`;\n  return \`ERROR: ${'${result.message}'}\`;\n}\nconsole.log(formatResult({ status: "success", output: "built" }));\nconsole.log(formatResult({ status: "failure", message: "offline" }));`,
        reflectionPrompt: 'How does checking status change what TypeScript knows about result?'
      },
      {
        id: 'ts-project-command-result-debug', title: 'Fix unsafe result access', phase: 'debug',
        task: 'Repair the formatter that reads output even when the result is a failure.',
        starterCode: `type CommandResult =\n  | { status: "success"; output: string }\n  | { status: "failure"; message: string };\nfunction summary(result: CommandResult): string {\n  return result.output.toUpperCase();\n}\nconsole.log(summary({ status: "failure", message: "timeout" }));`,
        expectedOutput: 'FAILED: timeout', matchType: 'exact',
        hints: ['Narrow before reading a state-specific property.', 'Return output only in the success branch.'],
        solution: `type CommandResult =\n  | { status: "success"; output: string }\n  | { status: "failure"; message: string };\nfunction summary(result: CommandResult): string {\n  if (result.status === "success") return result.output.toUpperCase();\n  return \`FAILED: ${'${result.message}'}\`;\n}\nconsole.log(summary({ status: "failure", message: "timeout" }));`,
        reflectionPrompt: 'What runtime crash did the original type error predict?'
      },
      {
        id: 'ts-project-command-result-modify', title: 'Summarize command history', phase: 'modify',
        task: 'Count successful and failed results and print one history summary.',
        starterCode: `type CommandResult =\n  | { status: "success"; output: string }\n  | { status: "failure"; message: string };\nconst history: CommandResult[] = [\n  { status: "success", output: "built" },\n  { status: "failure", message: "offline" },\n  { status: "success", output: "tested" },\n];\n// Count each state and print the summary.`,
        expectedOutput: 'Success: 2, Failed: 1', matchType: 'exact',
        hints: ['Filter by each status tag.', 'The resulting arrays provide their counts through length.'],
        solution: `type CommandResult =\n  | { status: "success"; output: string }\n  | { status: "failure"; message: string };\nconst history: CommandResult[] = [\n  { status: "success", output: "built" },\n  { status: "failure", message: "offline" },\n  { status: "success", output: "tested" },\n];\nconst succeeded = history.filter(result => result.status === "success").length;\nconst failed = history.filter(result => result.status === "failure").length;\nconsole.log(\`Success: ${'${succeeded}'}, Failed: ${'${failed}'}\`);`,
        reflectionPrompt: 'Why does the status tag make filtering this history straightforward?'
      }
    ]
  }
];

export function projectCheckpoint(project, checkpoint, checkpointIndex) {
  return {
    ...checkpoint,
    kind: 'project-checkpoint',
    language: project.language,
    projectId: project.id,
    projectTitle: project.title,
    checkpointIndex,
    summary: `${checkpoint.phase} checkpoint for ${project.title}`,
    concept: checkpoint.phase,
  };
}

export function flattenProjectCheckpoints() {
  return projects.flatMap((project) => (project.checkpoints || []).map(
    (checkpoint, checkpointIndex) => projectCheckpoint(project, checkpoint, checkpointIndex)
  ));
}

export function findProjectCheckpoint(checkpointId) {
  return flattenProjectCheckpoints().find((checkpoint) => checkpoint.id === checkpointId) || null;
}

export function nextProjectCheckpoint(checkpointId) {
  const checkpoints = flattenProjectCheckpoints();
  const currentIndex = checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
  if (currentIndex < 0) return null;
  const next = checkpoints[currentIndex + 1];
  return next?.projectId === checkpoints[currentIndex].projectId ? next : null;
}

export default projects;
