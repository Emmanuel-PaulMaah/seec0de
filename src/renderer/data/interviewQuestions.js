import { languageLabel } from './languages';

const LANGUAGE_PROFILES = {
  python: {
    topics: [
      'mutable and immutable objects',
      'list comprehensions and generators',
      'exceptions and context managers',
      'virtual environments and dependencies',
      'the GIL and concurrency',
      'type hints and dataclasses',
    ],
  },
  javascript: {
    topics: [
      'closures and lexical scope',
      'the event loop and microtasks',
      'promises and async/await',
      'prototypes and classes',
      'reference equality and immutability',
      'module boundaries and bundling',
    ],
  },
  typescript: {
    topics: [
      'structural typing',
      'unknown versus any',
      'generics and reusable types',
      'discriminated unions',
      'strict null checks',
      'module and declaration boundaries',
    ],
  },
  react: {
    topics: [
      'component composition',
      'state colocation',
      'effects and cleanup',
      'context versus prop drilling',
      'memoization and render performance',
      'controlled forms',
    ],
  },
  html: {
    topics: [
      'semantic landmarks',
      'building accessible forms',
      'structuring accessible tables',
      'media elements and captions',
      'document structure and headings',
      'progressive enhancement',
    ],
  },
  css: {
    topics: [
      'box model calculations',
      'choosing between flexbox and grid',
      'specificity and cascade conflicts',
      'responsive units and breakpoints',
      'custom properties for theming',
      'stacking contexts and containment',
    ],
  },
  git: {
    topics: [
      'merge versus rebase',
      'branches and remotes',
      'conflict resolution',
      'commit history hygiene',
      'tags and releases',
      'recovering lost commits',
    ],
  },
  nodejs: {
    topics: [
      'the event loop and libuv',
      'streams and backpressure',
      'module resolution',
      'async error handling',
      'worker threads and clustering',
      'HTTP server lifecycle',
    ],
  },
  mongodb: {
    topics: [
      'documents versus relational rows',
      'indexes and query plans',
      'aggregation pipelines',
      'schema design and embedding',
      'transactions and consistency',
      'connection pooling',
    ],
  },
  express: {
    topics: [
      'routing and middleware order',
      'request validation',
      'error-handling middleware',
      'authentication middleware',
      'REST resource design',
      'production hardening',
    ],
  },
  sql: {
    topics: [
      'joins and relationships',
      'indexes and query plans',
      'transactions and isolation',
      'normalization versus denormalization',
      'window functions',
      'migrations and safe schema changes',
    ],
  },
  nextjs: {
    topics: [
      'server and client components',
      'routing and layouts',
      'data fetching and caching',
      'server actions and mutations',
      'rendering strategies',
      'streaming and loading states',
    ],
  },
  auth: {
    topics: [
      'password hashing and salting',
      'session cookies versus tokens',
      'OAuth and identity providers',
      'authorization and roles',
      'token expiry and refresh',
      'CSRF and session fixation',
    ],
  },
  docker: {
    topics: [
      'images versus containers',
      'multi-stage builds',
      'volumes and persistence',
      'networking between services',
      'compose for local development',
      'image size and security',
    ],
  },
  testing: {
    topics: [
      'unit versus integration tests',
      'test doubles and mocking',
      'test data and fixtures',
      'flaky tests',
      'end-to-end test scope',
      'coverage versus confidence',
    ],
  },
};

const LEVEL_TEMPLATES = {
  junior: [
    (label, topic) => `Explain ${topic} in ${label} and give an example of when it matters.`,
    (label, topic) => `What is a common beginner mistake related to ${topic} in ${label}, and how would you avoid it?`,
    (label, topic) => `A teammate is new to ${label}. How would you explain ${topic} to them?`,
    (label, topic) => `Walk me through a small ${label} example that uses ${topic}.`,
    (label, topic) => `If ${topic} caused a bug in your ${label} code, what would you check first?`,
  ],
  mid: [
    (label, topic) => `What trade-offs do you consider when working with ${topic} in ${label}?`,
    (label, topic) => `How would you review a ${label} change that touches ${topic}?`,
    (label, topic) => `How would you test and debug a ${label} issue related to ${topic}?`,
    (label, topic) => `Describe a time ${topic} affected the design of a ${label} project.`,
    (label, topic) => `How would you explain ${topic} to a product manager working on a ${label} feature?`,
  ],
  senior: [
    (label, topic) => `How would you set conventions for ${topic} across a large ${label} codebase?`,
    (label, topic) => `A production ${label} incident traces back to ${topic}. Walk me through the response and prevention.`,
    (label, topic) => `How do you mentor engineers on ${topic} in ${label} without over-engineering?`,
    (label, topic) => `What technical debt can build up around ${topic} in ${label}, and how do you manage it?`,
    (label, topic) => `How would you evaluate whether a ${label} team is using ${topic} effectively?`,
  ],
};

const LEVEL_OFFSET = { junior: 0, mid: 2, senior: 4 };
const LEVEL_CATEGORY = {
  junior: 'Fundamentals',
  mid: 'Applied practice',
  senior: 'Judgement',
};

const FALLBACK_TOPICS = [
  'core syntax and data structures',
  'debugging and error handling',
  'testing and maintainability',
  'performance and scaling',
  'code organization and tooling',
  'security and production readiness',
];

function profileFor(language) {
  const label = languageLabel(language);
  return {
    label,
    topics: LANGUAGE_PROFILES[language]?.topics || FALLBACK_TOPICS,
  };
}

function buildQuestions(language, level) {
  const profile = profileFor(language);
  const templates = LEVEL_TEMPLATES[level] || LEVEL_TEMPLATES.mid;
  const offset = LEVEL_OFFSET[level] ?? 0;
  return templates.map((template, index) => {
    const topic = profile.topics[(index + offset) % profile.topics.length];
    return {
      id: `${language}-${level}-${index}`,
      level,
      category: `${profile.label} · ${LEVEL_CATEGORY[level] || LEVEL_CATEGORY.mid}`,
      prompt: template(profile.label, topic),
      hint: `Name a concrete example, one trade-off, and one failure mode involving ${topic}.`,
    };
  });
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function questionsFor(language = 'javascript', level = 'mid', count = 3) {
  const matching = buildQuestions(language, level);
  const adjacentLevels = Object.keys(LEVEL_TEMPLATES)
    .filter((item) => item !== level)
    .flatMap((item) => buildQuestions(language, item));
  const picked = [...shuffle(matching), ...shuffle(adjacentLevels)];
  return picked.slice(0, Math.max(1, Math.min(count, picked.length)));
}

export const INTERVIEW_LEVELS = [
  { id: 'junior', label: 'Junior' },
  { id: 'mid', label: 'Mid-level' },
  { id: 'senior', label: 'Senior' },
];
