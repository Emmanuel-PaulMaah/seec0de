import React, { useEffect, useRef } from 'react';
import { ArrowRight, Code2, GraduationCap, Sparkles, BookOpen, Zap, Terminal } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import BulletinSection from './BulletinSection';

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } } };
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } } };

interface HomeScreenProps {
  username?: string;
  hasActiveLesson?: boolean;
  postcardCount?: number;
  onOpenWorkspace?: () => void;
  onOpenLearnMode?: () => void;
  onOpenPostcards?: () => void;
  hideWordmark?: boolean;
}

export default function HomeScreen({
  username,
  hasActiveLesson,
  postcardCount = 0,
  onOpenWorkspace,
  onOpenLearnMode,
  onOpenPostcards,
  hideWordmark,
}: HomeScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="home-screen relative flex-1 min-h-0 overflow-y-auto overflow-x-clip bg-[var(--bg-primary)] isolate">
      {/* Ambient background gradient */}
      <motion.div
        className="absolute inset-0 z-[-2]"
        initial={prefersReduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'var(--accent)' }}
          animate={prefersReduced ? {} : { scale: [1, 1.05, 1], x: [0, 10, 0], y: [0, -8, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[5%] w-[40vw] h-[40vw] rounded-full opacity-10 blur-[100px]"
          style={{ background: 'var(--algorithm)' }}
          animate={prefersReduced ? {} : { scale: [1, 1.08, 1], x: [0, -12, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 z-[-1] opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        aria-hidden="true"
      />

      <section
        className="home-content relative mx-auto px-8 py-16 max-w-[900px]"
        aria-labelledby="home-heading"
      >
        <motion.div variants={prefersReduced ? {} : stagger} initial="hidden" animate="visible">
          {/* Badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-[var(--text-secondary)] mb-6">
            <Sparkles size={12} className="text-[var(--accent)]" />
            <span>Your coding home</span>
          </motion.div>

          {/* Hero heading */}
          <motion.h1
            variants={fadeUp}
            ref={headingRef}
            tabIndex={-1}
            id="home-heading"
            className="text-[var(--text-primary)] font-bold leading-[0.95] tracking-[-0.04em] mb-4"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
          >
            {username ? (
              <>Welcome back, <span className="text-[var(--accent)]">{username}.</span></>
            ) : (
              <>Welcome to <span className="text-[var(--accent)]">seec0de</span>.</>
            )}
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-[520px] text-[var(--text-secondary)] text-[15px] leading-relaxed mb-10">
            Learn with a guide or open the full workspace. Your drafts and progress stay where you left them.
          </motion.p>

          {/* Action cards */}
          <motion.div variants={fadeUp} className="home-launch-grid grid grid-cols-2 gap-4 mb-12">
            <LaunchCard
              icon={<GraduationCap size={20} />}
              badge="Guided path"
              title={hasActiveLesson ? 'Continue learning' : 'Start learning'}
              text="Lessons, activities, feedback, and saved progress."
              onClick={onOpenLearnMode}
              accent
            />
            <LaunchCard
              icon={<Code2 size={20} />}
              badge="Build freely"
              title="Open Workspace"
              text="Files, editor, terminal, runner, and explanations."
              onClick={onOpenWorkspace}
            />
          </motion.div>

          {/* Quick stats row */}
          <motion.div variants={fadeUp} className="flex gap-4 mb-12">
            <StatCard icon={<BookOpen size={16} />} label="Courses" value="Learn" onClick={onOpenLearnMode} />
            <StatCard icon={<Zap size={16} />} label="Workspace" value="Build" onClick={onOpenWorkspace} />
            {postcardCount > 0 && (
              <StatCard icon={<Terminal size={16} />} label="Postcards" value={String(postcardCount)} onClick={onOpenPostcards} />
            )}
          </motion.div>

          <motion.div variants={fadeIn}>
            <BulletinSection />
          </motion.div>

          {/* Community badge */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 mt-6 py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 backdrop-blur-sm">
            <motion.span
              className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
              animate={prefersReduced ? {} : { scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-xs text-[var(--text-muted)]">Community features coming soon</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Bottom wordmark */}
      {!hideWordmark && (
        <motion.div
          className="home-wordmark absolute left-1/2 bottom-0 z-[-1] -translate-x-1/2 translate-y-[30%] text-[var(--text-primary)] opacity-[0.03] font-bold whitespace-nowrap select-none pointer-events-none"
          style={{ fontSize: 'clamp(120px, 23vw, 360px)', letterSpacing: '-0.095em', lineHeight: 0.78 }}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ duration: 2, delay: 0.5 }}
        >
          seec0de
        </motion.div>
      )}
    </main>
  );
}

function LaunchCard({ icon, badge, title, text, onClick, accent = false }: {
  icon: React.ReactNode;
  badge: string;
  title: string;
  text: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`home-launch-card group relative overflow-hidden text-left rounded-2xl border p-6 transition-shadow duration-300 ${
        accent
          ? 'border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/5 to-transparent hover:border-[var(--accent)]/60 hover:shadow-lg hover:shadow-[var(--accent)]/10'
          : 'border-[var(--border)] bg-[var(--bg-elevated)]/50 hover:border-[var(--accent)]/30 hover:shadow-lg hover:shadow-black/5'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${accent ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{badge}</span>
      </div>
      <h3 className="text-[var(--text-primary)] text-lg font-semibold mb-1.5">{title}</h3>
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">{text}</p>
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${accent ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} group-hover:gap-2.5 transition-all duration-300`}>
        Get started <ArrowRight size={12} />
      </span>
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${accent ? 'bg-gradient-to-t from-[var(--accent)]/5 to-transparent' : ''}`} />
    </motion.button>
  );
}

function StatCard({ icon, label, value, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/30 hover:bg-[var(--bg-elevated)]/60 transition-colors cursor-pointer text-left"
      onClick={onClick}
    >
      <span className="text-[var(--text-muted)]">{icon}</span>
      <div>
        <div className="text-xs text-[var(--text-muted)]">{label}</div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{value}</div>
      </div>
    </motion.button>
  );
}
