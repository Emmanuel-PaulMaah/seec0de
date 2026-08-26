import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Check, X, Code2 } from 'lucide-react';
import {
  RUNNABLE_LANGUAGES, defaultComparisonFor, commitOnboarding, createProfile, usernameExists, suggestUsername, setSettingsApiKey, getSettingsApiKey,
} from '../engine/settings';
import { ProfileFields } from './ProfileForm';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const STEPS = ['profile', 'experience', 'language', 'apikey'] as const;
type Step = typeof STEPS[number];

interface ProfileData { username: string; avatar: string | null; bio: string; languagesUsing: string[]; languagesLearning: string[]; }
const emptyProfile = (): ProfileData => ({ username: '', avatar: null, bio: '', languagesUsing: [], languagesLearning: [] });
function profileFromSettings(s: any, mode: string): ProfileData {
  if (mode !== 'setup' || !s) return emptyProfile();
  return { username: s.username || '', avatar: s.avatar || null, bio: s.bio || '', languagesUsing: s.languagesUsing || [], languagesLearning: s.languagesLearning || [] };
}

interface OnboardingModalProps { open?: boolean; initialSettings?: any; onComplete?: () => void; mode?: 'setup' | 'new-profile'; }
export default function OnboardingModal({ open, initialSettings, onComplete, mode = 'setup' }: OnboardingModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [profile, setProfile] = useState<ProfileData>(() => profileFromSettings(initialSettings, mode));
  const [experienceLevel, setExperienceLevel] = useState<string | null>(initialSettings?.experienceLevel || null);
  const [practicalLanguage, setPracticalLanguage] = useState(initialSettings?.practicalLanguage || 'python');
  const [apiKey, setApiKey] = useState(getSettingsApiKey());

  useEffect(() => {
    if (open) { setStepIdx(0); setProfile(profileFromSettings(initialSettings, mode)); setExperienceLevel(mode === 'setup' ? (initialSettings?.experienceLevel || null) : null); setPracticalLanguage(mode === 'setup' ? (initialSettings?.practicalLanguage || 'python') : 'python'); setApiKey(getSettingsApiKey()); }
  }, [open, initialSettings, mode]);

  const finish = useCallback(({ skipped = false } = {}) => {
    const comparisons = defaultComparisonFor(practicalLanguage).filter((c) => c !== practicalLanguage);
    const username = (profile.username || '').trim() || suggestUsername('learner');
    const fields = { username, avatar: profile.avatar || null, bio: (profile.bio || '').trim(), experienceLevel: experienceLevel || 'none', practicalLanguage, comparisonLanguages: comparisons, languagesUsing: Array.from(new Set([practicalLanguage, ...comparisons].filter(Boolean))), languagesLearning: profile.languagesLearning || [] };
    if (mode === 'new-profile') createProfile(fields, { activate: true }); else commitOnboarding(fields);
    if (!skipped && apiKey.trim()) setSettingsApiKey(apiKey.trim());
    onComplete?.();
  }, [profile, experienceLevel, practicalLanguage, apiKey, mode, onComplete]);

  const next = useCallback(() => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)), []);
  const back = useCallback(() => setStepIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => { if (!open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish({ skipped: true }); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [open, finish]);

  if (!open) return null;
  const step: Step = STEPS[stepIdx];
  const exceptId = mode === 'setup' ? (initialSettings?.activeProfileId || null) : null;
  const trimmedName = (profile.username || '').trim();
  const usernameError = trimmedName.length === 0 ? '' : trimmedName.length < 2 ? 'At least 2 characters.' : usernameExists(trimmedName, exceptId) ? 'That username is taken on this device.' : '';
  const canContinueProfile = trimmedName.length >= 2 && !usernameError;

  return (
    <div className="fixed inset-0 z-[1000] bg-[var(--scrim)] backdrop-blur-md flex items-center justify-center p-6 animate-[seec0de-fade-in_var(--motion-base)_var(--ease-out)]" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="w-full max-w-[520px] bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl shadow-[var(--shadow-lg)] px-7 pt-5 pb-6 animate-[seec0de-pop-in_var(--motion-slow)_var(--ease-out)]">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => <span key={s} className={cn('w-1.5 h-1.5 rounded-full transition-all duration-[var(--motion-base)]', i === stepIdx ? 'bg-[var(--accent)] w-[18px]' : 'bg-[var(--border-strong)]')} />)}
          </div>
          <button className="inline-flex items-center bg-transparent border-none text-[var(--text-muted)] text-xs px-1.5 py-1 hover:text-[var(--text-primary)]" onClick={() => finish({ skipped: true })} title="Skip onboarding (Esc)">Skip <X size={12} className="ml-1" /></button>
        </div>

        <div className="flex flex-col">
          {step === 'profile' && <StepProfile mode={mode} value={profile} onChange={setProfile} usernameError={usernameError} canContinue={canContinueProfile} onNext={next} />}
          {step === 'experience' && <StepExperience value={experienceLevel} onChange={setExperienceLevel} onBack={back} onNext={next} />}
          {step === 'language' && <StepLanguage value={practicalLanguage} onChange={setPracticalLanguage} onBack={back} onNext={next} />}
          {step === 'apikey' && <StepApiKey value={apiKey} onChange={setApiKey} onBack={back} onFinish={() => finish({ skipped: false })} onSkip={() => finish({ skipped: true })} />}
        </div>
      </div>
    </div>
  );
}

function StepProfile({ mode, value, onChange, usernameError, canContinue, onNext }: { mode: string; value: ProfileData; onChange: (p: ProfileData) => void; usernameError: string; canContinue: boolean; onNext: () => void }) {
  return (
    <>
      <Brand />
      <h1 id="onboarding-title" className="text-[22px] leading-[1.25] font-semibold text-[var(--text-primary)] tracking-tight mb-2">{mode === 'new-profile' ? 'Add a profile.' : 'Create your profile.'}</h1>
      <p className="text-[13.5px] leading-relaxed text-[var(--text-secondary)] mb-5">seec0de saves your progress to a profile on <em className="italic text-[var(--text-primary)]">this device</em>. No email, no password, nothing leaves your machine. Pick a name (add a photo & bio if you like) and you're in.</p>
      <ProfileFields values={value} onChange={onChange} usernameError={usernameError} showLanguages={false} autoFocusUsername />
      <div className="flex justify-between items-center mt-2">
        <span />
        <Button onClick={onNext} disabled={!canContinue} className={cn(!canContinue && 'opacity-70')}>Continue <ArrowRight size={14} className="ml-1.5" /></Button>
      </div>
    </>
  );
}

function StepExperience({ value, onChange, onBack, onNext }: { value: string | null; onChange: (v: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <>
      <h2 id="onboarding-title" className="text-[22px] leading-[1.25] font-semibold text-[var(--text-primary)] tracking-tight mb-2">Have you written code before?</h2>
      <p className="text-[13.5px] leading-relaxed text-[var(--text-secondary)] mb-5">This tunes how chatty the explanations are — we can start from the ground up or keep things terse. You can change your mind any time.</p>
      <fieldset className="border-none p-0 flex flex-col gap-2 mb-6">
        <legend className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2.5">Your experience</legend>
        <ChoiceCard selected={value === 'none'} onClick={() => onChange('none')} title="Not yet" desc="Start from zero. We'll explain things from the ground up." />
        <ChoiceCard selected={value === 'some'} onClick={() => onChange('some')} title="A little" desc="You know the basics. Explanations will be terser and more idiomatic." />
      </fieldset>
      <div className="flex justify-between items-center mt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!value} className={cn(!value && 'opacity-70')}>Continue <ArrowRight size={14} className="ml-1.5" /></Button>
      </div>
    </>
  );
}

function StepLanguage({ value, onChange, onBack, onNext }: { value: string; onChange: (v: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <>
      <h2 className="text-[22px] leading-[1.25] font-semibold text-[var(--text-primary)] tracking-tight mb-2">Which language will you build in?</h2>
      <p className="text-[13.5px] leading-relaxed text-[var(--text-secondary)] mb-5">Pick the one you actually want to write programs in. seec0de will run, save, and explain code in this language by default. You'll always see the algorithm in <strong className="text-[var(--algorithm)] font-semibold">pseudocode first</strong>, and a second language alongside for comparison.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 mb-3">
        {RUNNABLE_LANGUAGES.map((lang) => <ChoiceCard key={lang.id} selected={value === lang.id} onClick={() => onChange(lang.id)} title={lang.label} desc={lang.blurb} compact />)}
      </div>
      <p className="text-[11.5px] text-[var(--text-muted)] mt-1 mb-4">You can switch your language any time from the gear icon in the top bar.</p>
      <div className="flex justify-between items-center mt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Continue <ArrowRight size={14} className="ml-1.5" /></Button>
      </div>
    </>
  );
}

function StepApiKey({ value, onChange, onBack, onFinish, onSkip }: { value: string; onChange: (v: string) => void; onBack: () => void; onFinish: () => void; onSkip: () => void }) {
  const ready = value.trim().length > 8;
  return (
    <>
      <h2 className="text-[22px] leading-[1.25] font-semibold text-[var(--text-primary)] tracking-tight mb-2">Optional — paste a Gemini API key.</h2>
      <p className="text-[13.5px] leading-relaxed text-[var(--text-secondary)] mb-5">seec0de works fully offline with built-in templates, but the <em className="italic text-[var(--text-primary)]">AI Generate</em> and <em className="italic text-[var(--text-primary)]">AI Explain</em> features need a free Google AI Studio key. Skip this if you'd rather add it later.</p>
      <div className="flex gap-2 mb-2">
        <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder="AIza…  (paste here, or skip)" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-[13px] px-3 py-2.5 outline-none font-mono" autoComplete="off" spellCheck={false} />
      </div>
      <a className="text-[11.5px] text-[var(--accent)] no-underline mt-[-8px] mb-5 inline-block hover:underline" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Get a free key at aistudio.google.com →</a>
      <div className="flex justify-between items-center mt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip}>Skip for now</Button>
          <Button onClick={onFinish} disabled={!ready} className={cn(!ready && 'opacity-70')}><Check size={14} className="mr-1.5" /> Save & finish</Button>
        </div>
      </div>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <div className="w-[30px] h-[30px] rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center"><Code2 size={16} /></div>
      <span className="font-mono text-[13px] tracking-wider text-[var(--text-secondary)]">seec0de</span>
    </div>
  );
}

function ChoiceCard({ selected, onClick, title, desc, compact }: { selected: boolean; onClick: () => void; title: string; desc: string; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn('text-left bg-[var(--bg-secondary)] border rounded-lg flex flex-col gap-1 transition-all duration-[var(--motion-fast)]', compact ? 'px-3 py-2.5' : 'px-3.5 py-3', selected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)]')}>
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">{title}</span>
        {selected && <Check size={14} color="var(--accent)" />}
      </div>
      <span className="text-xs text-[var(--text-secondary)] leading-[1.45]">{desc}</span>
    </button>
  );
}
