const LANGUAGES = {
  python: {
    label: 'Python',
    blurb: 'Python is a general-purpose, high-level programming language known for readable syntax. It is used for web backends, automation, data science, and AI.',
  },
  javascript: {
    label: 'JavaScript',
    blurb: 'JavaScript is the language of the web. It runs in browsers and on servers with Node.js, powering interactive pages, APIs, and full-stack applications.',
  },
  typescript: {
    label: 'TypeScript',
    blurb: 'TypeScript is a typed superset of JavaScript. It catches many errors before runtime and helps teams maintain larger codebases.',
  },
  react: {
    label: 'React',
    blurb: 'React is a JavaScript library for building user interfaces from reusable components. It manages state and updates the page as data changes.',
  },
  html: {
    label: 'HTML',
    blurb: 'HTML is the markup language that structures content on the web. It defines headings, links, forms, media, and the semantic meaning of a page.',
  },
  css: {
    label: 'CSS',
    blurb: 'CSS is the stylesheet language that controls layout, color, typography, and responsive design on the web.',
  },
  git: {
    label: 'Git & GitHub',
    blurb: 'Git is a distributed version control system. It tracks code changes, supports branching and collaboration, and lets you recover earlier work.',
  },
  nodejs: {
    label: 'Node.js',
    blurb: 'Node.js is a JavaScript runtime for building server-side and command-line applications. It uses an event-driven, non-blocking model.',
  },
  mongodb: {
    label: 'MongoDB',
    blurb: 'MongoDB is a document database that stores flexible JSON-like records. It is used for applications that need fast iteration and horizontal scaling.',
  },
  express: {
    label: 'Express',
    blurb: 'Express is a minimal web framework for Node.js. It provides routing and middleware for building APIs and web servers.',
  },
  sql: {
    label: 'SQL & PostgreSQL',
    blurb: 'SQL is the standard language for querying and changing relational databases. It is used to model relationships, filter data, and keep transactions consistent.',
  },
  nextjs: {
    label: 'Next.js',
    blurb: 'Next.js is a React framework for production applications. It adds routing, server rendering, data fetching, and performance-focused defaults.',
  },
  auth: {
    label: 'Auth & Sessions',
    blurb: 'Authentication is the practice of proving who a user is. It covers passwords, sessions, tokens, identity providers, and access control.',
  },
  docker: {
    label: 'Docker & Deployment',
    blurb: 'Docker packages applications and their dependencies into containers, so the same environment can run on a laptop, a server, or in production.',
  },
  testing: {
    label: 'Testing',
    blurb: 'Testing is the practice of checking that code behaves correctly. It ranges from fast unit tests to integration and end-to-end checks.',
  },
  security: {
    label: 'Web Security',
    blurb: 'Web security is the practice of assuming requests are hostile. It covers validation, injection, browser defences, secret handling and the dependency supply chain.',
  },
  performance: {
    label: 'Performance & Caching',
    blurb: 'Performance engineering is the work of making pages and APIs feel fast. It covers Core Web Vitals, bundle size, HTTP caching, CDNs and query efficiency.',
  },
  systemdesign: {
    label: 'System Design',
    blurb: 'System design is how separate services, data stores and clients cooperate. It covers API contracts, idempotency, queues, caching, rate limits and scaling decisions.',
  },
  cicd: {
    label: 'CI/CD & Release',
    blurb: 'CI/CD is the automation that tests, builds and ships software. It covers pipelines, artifacts, migrations, zero-downtime deploys, flags and rollbacks.',
  },
  observability: {
    label: 'Observability',
    blurb: 'Observability is the ability to understand a running system from the outside. It covers structured logs, metrics, traces, SLOs and production debugging.',
  },
  accessibility: {
    label: 'Accessibility',
    blurb: 'Accessibility engineering makes interfaces usable with a keyboard, a screen reader and reduced motion. It covers semantics, ARIA, focus, contrast and testing.',
  },
};

export function languageLabel(language) {
  return LANGUAGES[language]?.label || language || '';
}

export function languageBlurb(language) {
  return LANGUAGES[language]?.blurb || '';
}
