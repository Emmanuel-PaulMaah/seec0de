import React, { useState, useEffect } from 'react';
import { Lightbulb, ExternalLink, Loader, Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { cn } from '@/lib/utils';

const TODAY = new Date();
const YYYY = TODAY.getFullYear();
const MM = String(TODAY.getMonth() + 1).padStart(2, '0');
const DD = String(TODAY.getDate()).padStart(2, '0');

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

function dailyShuffle(arr: string[]): string[] {
  const a = [...arr];
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

function stripHtml(html: string): string {
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

function firstSentence(text: string): string {
  if (!text) return '';
  const match = text.match(/^(.+\.(?:\s|$))/);
  if (match) return match[1].trim();
  return text.slice(0, 240);
}

interface Article {
  title: string;
  description: string;
  extract: string;
  url: string;
  thumbnail: string | null;
}

async function fetchArticleSummary(title: string): Promise<Article | null> {
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

function BulletinCard({
  icon,
  label,
  color,
  children,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  children: React.ReactNode;
  link?: string;
}) {
  return (
    <Card className="p-3.5 gap-2">
      <CardHeader className="p-0 flex flex-row items-center gap-[7px]">
        <span
          className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] shrink-0"
          style={{ color, background: `${color}18` }}
        >
          {icon}
        </span>
        <span className="text-[9.5px] font-bold tracking-wider uppercase" style={{ color }}>{label}</span>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[var(--text-muted)] inline-flex items-center no-underline opacity-60 hover:opacity-100 transition-opacity"
            title="Read on Wikipedia"
          >
            <ExternalLink size={10} />
          </a>
        )}
      </CardHeader>
      <CardContent className="p-0 flex flex-col gap-1">
        {children}
      </CardContent>
    </Card>
  );
}

export default function BulletinSection() {
  const [featured, setFeatured] = useState<Article | null>(null);
  const [didYouKnow, setDidYouKnow] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
    <section className="mt-7">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-[5px] h-[5px] rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)] shrink-0" />
        <span className="text-[var(--text-muted)] text-[10px] font-bold tracking-[1.4px] uppercase">Today's Bulletin</span>
        <span className="text-[var(--text-muted)] text-[10px] opacity-60 ml-auto">
          {TODAY.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3.5 text-[var(--text-muted)] text-[11px]">
          <Loader size={13} className="animate-spin" />
          <span>Loading today's digest…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {featured && (
            <BulletinCard
              icon={<Code2 size={13} />}
              label="Featured Article"
              color="var(--accent)"
              link={featured.url}
            >
              <p className="m-0 text-[var(--text-primary)] text-[12.5px] font-semibold">{featured.title}</p>
              {featured.description && (
                <p className="m-0 text-[var(--text-muted)] text-[10px] italic">{featured.description}</p>
              )}
              <p className="m-0 text-[var(--text-secondary)] text-[11px] leading-relaxed">{featured.extract}</p>
            </BulletinCard>
          )}

          {didYouKnow && (
            <BulletinCard
              icon={<Lightbulb size={13} />}
              label="Did You Know"
              color="var(--keyword)"
              link={didYouKnow.url}
            >
              <p className="m-0 text-[var(--text-primary)] text-[12.5px] font-semibold">{didYouKnow.title}</p>
              {didYouKnow.description && (
                <p className="m-0 text-[var(--text-muted)] text-[10px] italic">{didYouKnow.description}</p>
              )}
              <p className="m-0 text-[var(--text-secondary)] text-[11px] leading-relaxed">{didYouKnow.extract}</p>
            </BulletinCard>
          )}
        </div>
      )}
    </section>
  );
}
