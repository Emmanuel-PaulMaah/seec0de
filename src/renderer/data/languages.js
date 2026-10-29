const LANGUAGES = {
  python: {
    label: 'Python',
    blurb: 'Python is a general-purpose, high-level programming language known for readable syntax. It is used for web backends, automation, data science, and AI.',
    group: 'backend',
  },
  javascript: {
    label: 'JavaScript',
    blurb: 'JavaScript is the language of the web. It runs in browsers and on servers with Node.js, powering interactive pages, APIs, and full-stack applications.',
    group: 'frontend',
  },
  typescript: {
    label: 'TypeScript',
    blurb: 'TypeScript is a typed superset of JavaScript. It catches many errors before runtime and helps teams maintain larger codebases.',
    group: 'frontend',
  },
  react: {
    label: 'React',
    blurb: 'React is a JavaScript library for building user interfaces from reusable components. It manages state and updates the page as data changes.',
    group: 'frontend',
  },
  html: {
    label: 'HTML',
    blurb: 'HTML is the markup language that structures content on the web. It defines headings, links, forms, media, and the semantic meaning of a page.',
    group: 'frontend',
  },
  css: {
    label: 'CSS',
    blurb: 'CSS is the stylesheet language that controls layout, color, typography, and responsive design on the web.',
    group: 'frontend',
  },
  http: {
    label: 'HTTP & Web APIs',
    blurb: 'HTTP is the protocol every web app speaks. This course covers how a request is built, what status codes mean, how CORS and cookies work in the browser, and how to make clients survive timeouts, retries and untrusted webhooks.',
    group: 'backend',
  },
  git: {
    label: 'Git & GitHub',
    blurb: 'Git is a distributed version control system. It tracks code changes, supports branching and collaboration, and lets you recover earlier work.',
    group: 'tools',
  },
  nodejs: {
    label: 'Node.js',
    blurb: 'Node.js is a JavaScript runtime for building server-side and command-line applications. It uses an event-driven, non-blocking model.',
    group: 'backend',
  },
  mongodb: {
    label: 'MongoDB',
    blurb: 'MongoDB is a document database that stores flexible JSON-like records. It is used for applications that need fast iteration and horizontal scaling.',
    group: 'backend',
  },
  express: {
    label: 'Express',
    blurb: 'Express is a minimal web framework for Node.js. It provides routing and middleware for building APIs and web servers.',
    group: 'backend',
  },
  sql: {
    label: 'SQL & PostgreSQL',
    blurb: 'SQL is the standard language for querying and changing relational databases. It is used to model relationships, filter data, and keep transactions consistent.',
    group: 'backend',
  },
  nextjs: {
    label: 'Next.js',
    blurb: 'Next.js is a React framework for production applications. It adds routing, server rendering, data fetching, and performance-focused defaults.',
    group: 'frontend',
  },
  auth: {
    label: 'Auth & Sessions',
    blurb: 'Authentication is the practice of proving who a user is. It covers passwords, sessions, tokens, identity providers, and access control.',
    group: 'tools',
  },
  docker: {
    label: 'Docker & Deployment',
    blurb: 'Docker packages applications and their dependencies into containers, so the same environment can run on a laptop, a server, or in production.',
    group: 'tools',
  },
  testing: {
    label: 'Testing',
    blurb: 'Testing is the practice of checking that code behaves correctly. It ranges from fast unit tests to integration and end-to-end checks.',
    group: 'quality',
  },
  security: {
    label: 'Web Security',
    blurb: 'Web security is the practice of assuming requests are hostile. It covers validation, injection, browser defences, secret handling and the dependency supply chain.',
    group: 'quality',
  },
  performance: {
    label: 'Performance & Caching',
    blurb: 'Performance engineering is the work of making pages and APIs feel fast. It covers Core Web Vitals, bundle size, HTTP caching, CDNs and query efficiency.',
    group: 'quality',
  },
  systemdesign: {
    label: 'System Design',
    blurb: 'System design is how separate services, data stores and clients cooperate. It covers API contracts, idempotency, queues, caching, rate limits and scaling decisions.',
    group: 'architecture',
  },
  cicd: {
    label: 'CI/CD & Release',
    blurb: 'CI/CD is the automation that tests, builds and ships software. It covers pipelines, artifacts, migrations, zero-downtime deploys, flags and rollbacks.',
    group: 'quality',
  },
  observability: {
    label: 'Observability',
    blurb: 'Observability is the ability to understand a running system from the outside. It covers structured logs, metrics, traces, SLOs and production debugging.',
    group: 'quality',
  },
  accessibility: {
    label: 'Accessibility',
    blurb: 'Accessibility engineering makes interfaces usable with a keyboard, a screen reader and reduced motion. It covers semantics, ARIA, focus, contrast and testing.',
    group: 'architecture',
  },
};

export function languageLabel(language) {
  return LANGUAGES[language]?.label || language || '';
}

export function languageBlurb(language) {
  return LANGUAGES[language]?.blurb || '';
}

export function languageGroup(language) {
  return LANGUAGES[language]?.group || 'quality';
}

export function languagesByGroup(group) {
  return Object.entries(LANGUAGES)
    .filter(([, info]) => info.group === group)
    .map(([key]) => key);
}

export const COURSE_GROUPS = [
  {
    id: 'web-frontend',
    name: 'Web Frontend',
    description: 'Foundational web technologies and frameworks',
    languages: ['html', 'css', 'javascript', 'typescript', 'react', 'nextjs'],
    icon: 'Palette',
  },
  {
    id: 'backend-services',
    name: 'Backend Services',
    description: 'Server-side languages, APIs and databases',
    languages: ['http', 'python', 'nodejs', 'mongodb', 'express', 'sql'],
    icon: 'Server',
  },
  {
    id: 'developer-tools',
    name: 'Developer Tools',
    languages: ['git', 'docker', 'auth'],
    icon: 'Tools',
  },
  {
    id: 'quality-engineering',
    name: 'Quality Engineering',
    description: 'Testing, security and production readiness',
    languages: ['testing', 'security', 'performance', 'cicd', 'observability'],
    icon: 'Shield',
  },
  {
    id: 'software-architecture',
    name: 'Software Architecture',
    description: 'How systems and interfaces fit together',
    languages: ['systemdesign', 'accessibility'],
    icon: 'Layout',
  },
];

export function groupForLanguage(language) {
  return languageGroup(language);
}

export function languagesInGroup(group) {
  return languagesByGroup(group);
}
