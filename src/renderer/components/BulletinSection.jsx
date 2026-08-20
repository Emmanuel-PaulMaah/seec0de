import React, { useState, useEffect } from 'react';
import { Lightbulb, ExternalLink, Loader, Code2 } from 'lucide-react';

// BulletinSection — daily digest sourced from Wikipedia's Computer
// Programming portal.
//
// Sections:
//   1. Featured Article  — random pick from Portal:Computer programming/Selected articles
//   2. Did You Know      — random pick from the same curated list
//   4. Word of the Day   — Wiktionary's word of the day
//
// All data fetched once on mount. Falls back silently if any fetch fails.

const TODAY = new Date();
const YYYY = TODAY.getFullYear();
const MM = String(TODAY.getMonth() + 1).padStart(2, '0');
const DD = String(TODAY.getDate()).padStart(2, '0');

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

// ---- Card wrapper ------------------------------------------------------

function BulletinCard({ icon, label, color, children, link }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={{ ...styles.cardIcon, color, background: `${color}18` }}>{icon}</span>
        <span style={{ ...styles.cardLabel, color }}>{label}</span>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" style={styles.cardLink} title="Read on Wikipedia">
            <ExternalLink size={10} />
          </a>
        )}
      </div>
      <div style={styles.cardBody}>{children}</div>
    </div>
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
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionDot} />
        <span style={styles.sectionTitle}>Today's Bulletin</span>
        <span style={styles.sectionDate}>
          {TODAY.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {loading ? (
        <div style={styles.loadingRow}>
          <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading today's digest…</span>
        </div>
      ) : (
        <div style={styles.grid}>
          {featured && (
            <BulletinCard
              icon={<Code2 size={13} />}
              label="Featured Article"
              color="var(--accent)"
              link={featured.url}
            >
              <p style={styles.cardTitle}>{featured.title}</p>
              {featured.description && (
                <p style={styles.cardDesc}>{featured.description}</p>
              )}
              <p style={styles.cardText}>{featured.extract}</p>
            </BulletinCard>
          )}

          {didYouKnow && (
            <BulletinCard
              icon={<Lightbulb size={13} />}
              label="Did You Know"
              color="var(--keyword)"
              link={didYouKnow.url}
            >
              <p style={styles.cardTitle}>{didYouKnow.title}</p>
              {didYouKnow.description && (
                <p style={styles.cardDesc}>{didYouKnow.description}</p>
              )}
              <p style={styles.cardText}>{didYouKnow.extract}</p>
            </BulletinCard>
          )}
        </div>
      )}
    </section>
  );
}

// ---- Styles ------------------------------------------------------------

const styles = {
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 10px var(--accent)',
    flexShrink: 0,
  },
  sectionTitle: {
    color: 'var(--text-muted)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionDate: {
    color: 'var(--text-muted)',
    fontSize: 10,
    opacity: 0.6,
    marginLeft: 'auto',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 0',
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
  },
  card: {
    padding: 14,
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  cardIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 5,
    flexShrink: 0,
  },
  cardLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardLink: {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    opacity: 0.6,
    transition: 'opacity 0.15s',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardTitle: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: 12.5,
    fontWeight: 600,
  },
  cardDesc: {
    margin: 0,
    color: 'var(--text-muted)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  cardText: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: 11,
    lineHeight: 1.55,
  },
};
