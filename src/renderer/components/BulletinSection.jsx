import React, { useState, useEffect } from 'react';
import { Code2, ExternalLink, Lightbulb } from 'lucide-react';
import { Loader } from './motion/loader';

// BulletinSection — daily digest sourced from Wikipedia's Computer
// Programming portal.
//
// Sections:
//   1. Featured Article — random pick from Portal:Computer programming/Selected articles
//   2. Did You Know     — a second random pick from the same curated list
//
// All data fetched once on mount. Falls back silently if any fetch fails.

const TODAY = new Date();
const YYYY = TODAY.getFullYear();
const MM = String(TODAY.getMonth() + 1).padStart(2, '0');
const DD = String(TODAY.getDate()).padStart(2, '0');
const ISO_DATE = `${YYYY}-${MM}-${DD}`;

// ---- Curated list from Portal:Computer_programming/Selected articles ----
// Each entry is a Wikipedia article title that has been hand-picked as
// a "selected article" on the portal. We shuffle daily and pick a few
// so the bulletin feels fresh each day.
const PORTAL_ARTICLES = [
  'Ada_(programming_language)', 'Algorithm', 'Analytical Engine',
  'Artificial_intelligence', 'Assembly_language', 'BASIC',
  'C_(programming_language)', 'C%2B%2B', 'Compiler',
  'Computer_architecture', 'Computer_graphics', 'Computer_program',
  'Computer_programming', 'Erlang_(programming_language)',
  'Fortran', 'Go_(programming_language)', 'Haskell',
  'Java_(programming_language)', 'JavaScript', 'Julia_(programming_language)',
  'Kotlin_(programming_language)', 'Lisp_(programming_language)',
  'Lua_(programming_language)', 'Machine_learning',
  'Margaret_Hamilton_(software_engineer)', 'Node.js',
  'Object-oriented_programming', 'Parallel_computing',
  'PHP', 'Python_(programming_language)', 'Ruby_(programming_language)',
  'Rust_(programming_language)', 'Scala_(programming_language)',
  'SQL', 'Swift_(programming_language)',
  'TypeScript', 'Unix', 'World_Wide_Web',
  'Linus_Torvalds', 'Ada_Lovelace', 'Grace_Hopper',
];

// Seed-based daily shuffle so the same articles appear all day but
// change each day.
function dailyShuffle(arr) {
  const a = [...arr];
  // Simple seeded PRNG (xorshift32) using the date as seed
  let seed = YYYY * 10000 + Number(MM) * 100 + Number(DD);
  for (let i = a.length - 1; i > 0; i--) {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    const j = Math.abs(seed) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/\[[\d]+\]/g, '')
    .trim();
}

function firstSentence(text) {
  if (!text) return '';
  // Cut at first period followed by space or end, but keep it reasonable
  const match = text.match(/^(.+?\.(?:\s|$))/);
  if (match) return match[1].trim();
  return text.slice(0, 240);
}

// ---- Wikipedia API helpers ---------------------------------------------

async function fetchArticleSummary(title) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || title.replace(/_/g, ' '),
      description: stripHtml(data.description || ''),
      extract: firstSentence(stripHtml(data.extract || '')),
      url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${title}`,
      thumbnail: data.thumbnail?.source || null,
    };
  } catch {
    return null;
  }
}

// ---- Card --------------------------------------------------------------
//
// The anchor wraps the whole card, so the entire surface is the target and the
// external-link glyph is a passive hint rather than a second hit area. Tone is a
// modifier class (see global.css) so no colour lives in the component.

function BulletinCard({ tone, icon, label, article }) {
  if (!article) return null;

  return (
    <a
      className={`bulletin-card bulletin-card-${tone}`}
      href={article.url}
      target="_blank"
      rel="noreferrer"
    >
      <span className="bulletin-card-top">
        <span className="bulletin-card-icon" aria-hidden="true">{icon}</span>
        <span className="bulletin-card-label">{label}</span>
        <ExternalLink className="bulletin-card-go" size={12} aria-hidden="true" />
      </span>

      <span className="bulletin-card-title">
        {article.title}
        <span className="sr-only"> — opens on Wikipedia in a new tab</span>
      </span>

      {article.description ? (
        <span className="bulletin-card-desc">{article.description}</span>
      ) : null}

      <span className="bulletin-card-text">{article.extract}</span>
    </a>
  );
}

// ---- Main component ----------------------------------------------------

export default function BulletinSection() {
  const [featured, setFeatured] = useState(null);
  const [didYouKnow, setDidYouKnow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Daily-shuffled article list: pick 2 — one for "Featured", one for "Did You Know"
      const shuffled = dailyShuffle(PORTAL_ARTICLES);
      const [featTitle, dykTitle] = shuffled;

      const [featArticle, dykArticle] = await Promise.all([
        fetchArticleSummary(featTitle),
        fetchArticleSummary(dykTitle),
      ]);

      if (cancelled) return;

      if (featArticle) setFeatured(featArticle);
      if (dykArticle) setDidYouKnow(dykArticle);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const hasContent = featured || didYouKnow;
  if (!loading && !hasContent) return null;

  return (
    <section className="bulletin-section" aria-labelledby="bulletin-heading">
      <header className="bulletin-header">
        <span className="bulletin-mark" aria-hidden="true" />
        <h2 className="bulletin-title" id="bulletin-heading">Today's Bulletin</h2>
        <time className="bulletin-date" dateTime={ISO_DATE}>
          {TODAY.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </time>
      </header>

      {loading ? (
        <div className="bulletin-loading">
          <Loader size={13} variant="dots" />
          <span>Loading today's digest…</span>
        </div>
      ) : (
        <div className="bulletin-grid">
          <BulletinCard
            tone="accent"
            icon={<Code2 size={12} />}
            label="Featured Article"
            article={featured}
          />
          <BulletinCard
            tone="keyword"
            icon={<Lightbulb size={12} />}
            label="Did You Know"
            article={didYouKnow}
          />
        </div>
      )}
    </section>
  );
}
