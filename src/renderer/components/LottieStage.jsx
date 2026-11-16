import React from 'react';
import { Lottie } from 'lottie-react';
import { useReducedMotion } from 'motion/react';
import markScene from '../assets/lottie/stage-mark.json';
import keyScene from '../assets/lottie/stage-key.json';
import keyIdleScene from '../assets/lottie/stage-key-idle.json';
import keyCheckScene from '../assets/lottie/stage-key-check.json';
import keyRejectScene from '../assets/lottie/stage-key-reject.json';
import terminalScene from '../assets/lottie/stage-terminal.json';
import terminalReadyScene from '../assets/lottie/stage-terminal-ready.json';
import englishScene from '../assets/lottie/stage-english.json';
import pseudocodeScene from '../assets/lottie/stage-pseudocode.json';
import codeScene from '../assets/lottie/stage-code.json';

// The marketing thesis of the whole product, drawn: one idea, three
// representations. The stage is styled as a file preview — tab, filename,
// status line — because that is literally what seec0de shows you.
//
// The three scenes are transform-only Lottie (scale + opacity on shape layers),
// which is the most portable subset of the format: no expressions, no raster
// assets, no fonts, no third-party animation licence. Each scene assembles,
// holds, then dissolves, so the loop reads as a breath rather than a reset.
//
// The stage is deliberately dark ink in both themes. It is a code surface, not
// a panel, so it keeps one set of colours instead of being re-tinted per theme.

const STAGE_ACCENT = '#c8ff4d';
const STAGE_ALGORITHM = '#c8b6ff';
const STAGE_MUTED = 'rgba(255, 255, 255, 0.16)';

// Fixed semantic tones for the status line, because the stage keeps one dark
// palette in both themes. `busy` reuses the algorithm purple that is already
// part of the mark's language.
const TONES = {
  idle: STAGE_ACCENT,
  busy: STAGE_ALGORITHM,
  ok: '#95e59a',
  bad: '#f08c8c',
};

const SCENES = {
  mark: {
    animationData: markScene,
    file: 'seec0de.svg',
    lang: 'svg',
    status: 'drawing the mark',
  },
  // The key step is state-driven, so it has four scenes: waiting, checking,
  // rejected (the key is yanked back out) and accepted (the lock opens).
  keyIdle: {
    animationData: keyIdleScene,
    file: 'ai.key',
    lang: 'key',
    status: 'waiting for a key',
  },
  keyCheck: {
    animationData: keyCheckScene,
    file: 'ai.key',
    lang: 'key',
    status: 'checking the key',
  },
  keyReject: {
    animationData: keyRejectScene,
    file: 'ai.key',
    lang: 'key',
    status: 'key rejected',
    loop: false,
  },
  key: {
    animationData: keyScene,
    file: 'ai.key',
    lang: 'key',
    status: 'key accepted',
    loop: false,
  },
  english: {
    animationData: englishScene,
    file: 'plain-english.txt',
    lang: 'txt',
    status: 'reading the idea',
  },
  pseudocode: {
    animationData: pseudocodeScene,
    file: 'pseudocode.txt',
    lang: 'pseudo',
    status: 'drawing the logic',
  },
  code: {
    animationData: codeScene,
    file: 'main.py',
    lang: 'py',
    status: 'ready to run',
  },
  terminal: {
    animationData: terminalScene,
    file: 'toolchain.log',
    lang: 'log',
    status: 'probing runtimes',
  },
  // `loop: false` because settling is the point: the probe has finished, so the
  // artwork stops moving instead of breathing on forever.
  terminalReady: {
    animationData: terminalReadyScene,
    file: 'toolchain.log',
    lang: 'log',
    status: 'both ready',
    loop: false,
  },
};

// Which key scene matches the live validation state. The lock only opens for a
// valid key; a rejected one is pulled back out rather than unlocking anything.
export function keySceneFor({ status, typed, looksValid }) {
  if (!typed) return 'keyIdle';
  if (status === 'valid') return 'key';
  if (status && typeof status === 'object') return 'keyReject';
  if (status === 'checking') return 'keyCheck';
  return looksValid ? 'keyCheck' : 'keyReject';
}

export const STAGE_SCENE_BY_STEP = {
  profile: 'mark',
  experience: 'english',
  language: 'pseudocode',
  runtime: 'terminal',
  // Only a fallback: the modal picks the key scene from validation state via
  // keySceneFor(), so the idle lock is the honest default here.
  apikey: 'keyIdle',
};

// Settled geometry of each scene, in Lottie's 320x320 space. Only used when the
// OS asks for reduced motion: the player loads but never plays under that
// setting, which would leave the stage showing frame 0 — nothing at all. So the
// finished state is drawn directly instead.
const STATIC_BARS = {
  english: [
    { x: 48, y: 96, w: 150, h: 14, tone: 'muted' },
    { x: 48, y: 126, w: 196, h: 14, tone: 'muted' },
    { x: 48, y: 156, w: 124, h: 14, tone: 'muted' },
    { x: 48, y: 186, w: 170, h: 14, tone: 'accent' },
  ],
  pseudocode: [
    { x: 48, y: 92, w: 140, h: 10, tone: 'muted' },
    { x: 72, y: 120, w: 120, h: 10, tone: 'muted' },
    { x: 96, y: 148, w: 96, h: 10, tone: 'algorithm' },
    { x: 96, y: 176, w: 132, h: 10, tone: 'muted' },
    { x: 72, y: 205, w: 108, h: 10, tone: 'muted' },
  ],
  code: [
    { x: 48, y: 96, w: 132, h: 12, tone: 'muted' },
    { x: 48, y: 126, w: 100, h: 12, tone: 'accent' },
    { x: 48, y: 156, w: 156, h: 12, tone: 'muted' },
    { x: 48, y: 186, w: 88, h: 12, tone: 'muted' },
  ],
};

function toneColor(tone) {
  if (tone === 'accent') return STAGE_ACCENT;
  if (tone === 'algorithm') return STAGE_ALGORITHM;
  return STAGE_MUTED;
}

// The mark is strokes rather than bars, so its settled state is the glyph
// itself, drawn as plain SVG.
const STATIC_MARK = [
  [[116, 112], [84, 160], [116, 208]],
  [[182, 110], [136, 212]],
  [[204, 112], [236, 160], [204, 208]],
];

function StaticMark() {
  return (
    <svg viewBox="0 0 320 320" style={styles.staticBox} role="presentation">
      {STATIC_MARK.map((points, i) => (
        <polyline
          key={i}
          points={points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke={STAGE_ACCENT}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// Static mirrors the state: an open lock only when the key was accepted.
function StaticKey({ open, parked }) {
  const dx = parked ? -24 : 0;
  const keyTone = 'rgba(255,255,255,0.62)';
  const lockTone = 'rgba(255,255,255,0.34)';
  const holeTone = open ? STAGE_ACCENT : 'rgba(255,255,255,0.20)';
  return (
    <svg viewBox="0 0 320 320" style={styles.staticBox} role="presentation">
      <polyline
        points={open ? '184,140 184,114 236,114 236,140' : '184,152 184,126 236,126 236,152'}
        fill="none"
        stroke={lockTone}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="168" y="152" width="84" height="68" rx="12" fill="none" stroke={lockTone} strokeWidth="8" />
      <circle cx={84 + dx} cy="186" r="20" fill="none" stroke={keyTone} strokeWidth="8" />
      <rect x={100 + dx} y="181" width="64" height="10" rx="5" fill={keyTone} />
      <rect x={138 + dx} y="190" width="10" height="14" rx="3" fill={keyTone} />
      <rect x={120 + dx} y="190" width="8" height="10" rx="3" fill={keyTone} />
      <circle cx="210" cy="182" r="7" fill={holeTone} />
      <rect x="207" y="190" width="6" height="16" rx="3" fill={holeTone} />
    </svg>
  );
}

function StaticTerminal({ ready }) {
  return (
    <svg viewBox="0 0 320 320" style={styles.staticBox} role="presentation">
      <rect
        x="78"
        y={ready ? 108 : 120}
        width={ready ? 132 : 110}
        height="8"
        rx="4"
        fill="rgba(255,255,255,0.22)"
      />
      <rect x="56" y={ready ? 102 : 114} width="10" height="20" rx="2" fill={STAGE_ACCENT} />
      {ready ? (
        <>
          <polyline points="70,146 74,151 81,142" fill="none" stroke={STAGE_ACCENT} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="92" y="142" width="104" height="8" rx="4" fill="rgba(255,255,255,0.22)" />
          <polyline points="70,176 74,181 81,172" fill="none" stroke={STAGE_ACCENT} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="92" y="172" width="128" height="8" rx="4" fill="rgba(255,255,255,0.22)" />
        </>
      ) : (
        <>
          <circle cx="150" cy="160" r="4" fill={STAGE_ACCENT} opacity="0.35" />
          <circle cx="170" cy="160" r="4" fill={STAGE_ACCENT} opacity="0.65" />
          <circle cx="190" cy="160" r="4" fill={STAGE_ACCENT} />
        </>
      )}
    </svg>
  );
}

function StaticStage({ scene }) {
  if (scene === 'mark') return <StaticMark />;
  if (scene === 'key') return <StaticKey open parked={false} />;
  if (scene === 'keyCheck') return <StaticKey open={false} parked={false} />;
  if (scene === 'keyIdle' || scene === 'keyReject') { return <StaticKey open={false} parked />; }
  if (scene === 'terminal' || scene === 'terminalReady') {
    return <StaticTerminal ready={scene === 'terminalReady'} />;
  }
  const bars = STATIC_BARS[scene] || STATIC_BARS.english;
  return (
    <div style={styles.staticBox}>
      {bars.map((bar, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${(bar.x / 320) * 100}%`,
            top: `${(bar.y / 320) * 100}%`,
            width: `${(bar.w / 320) * 100}%`,
            height: `${(bar.h / 320) * 100}%`,
            transform: 'translateY(-50%)',
            borderRadius: 999,
            background: toneColor(bar.tone),
          }}
        />
      ))}
    </div>
  );
}

// `file`, `status` and `tone` override the scene defaults: the tab row reports
// what the step actually knows (chosen file, detected versions, whether the key
// validated) rather than a caption.
export default function LottieStage({ scene = 'english', file, status, tone = 'idle' }) {
  const reduced = useReducedMotion();
  const meta = SCENES[scene] || SCENES.english;
  const fileName = file || meta.file;
  const statusText = status || meta.status;
  const toneColor = TONES[tone] || TONES.idle;

  return (
    <div style={styles.stage} aria-hidden="true">
      <div style={styles.grid} />
      <div style={styles.glow} />

      <div style={styles.tabRow}>
        <span style={styles.windowDots}>
          <i style={{ ...styles.windowDot, background: 'rgba(255,255,255,0.16)' }} />
          <i style={{ ...styles.windowDot, background: 'rgba(255,255,255,0.16)' }} />
          <i style={{ ...styles.windowDot, background: STAGE_ACCENT }} />
        </span>
        <span style={styles.file}>{fileName}</span>
        <span style={styles.lang}>{meta.lang}</span>
      </div>

      <div style={styles.canvas}>
        {reduced ? (
          <StaticStage scene={scene} />
        ) : (
          <Lottie
            key={scene}
            src={meta.animationData}
            loop={meta.loop !== false}
            autoplay
            rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      <div style={styles.foot}>
        <span style={{ ...styles.footDot, background: toneColor }} />
        <span
          style={{ ...styles.footText, ...(tone === 'idle' ? null : { color: toneColor }) }}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
}

const styles = {
  stage: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    height: '100%',
    padding: '14px 16px 16px',
    background: '#0b0b0c',
    overflow: 'hidden',
  },
  // Engineering paper, barely there — it gives the flat well a horizon.
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),'
      + 'linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    maskImage: 'radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 78%)',
    WebkitMaskImage: 'radial-gradient(120% 90% at 30% 20%, #000 30%, transparent 78%)',
    pointerEvents: 'none',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    left: -60,
    bottom: -120,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(200,255,77,0.09) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  tabRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
  },
  windowDots: { display: 'inline-flex', gap: 4 },
  windowDot: { width: 6, height: 6, borderRadius: 999, display: 'block' },
  file: {
    color: 'rgba(255,255,255,0.58)',
    letterSpacing: 0.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lang: {
    marginLeft: 'auto',
    color: 'rgba(255,255,255,0.34)',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontSize: 9.5,
  },
  canvas: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 0',
    overflow: 'hidden',
  },
  staticBox: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    maxHeight: '100%',
  },
  foot: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.34)',
  },
  footDot: {
    width: 4,
    height: 4,
    flexShrink: 0,
    borderRadius: 999,
    background: STAGE_ACCENT,
    transition: 'background var(--motion-base) var(--ease-out)',
  },
  footText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'color var(--motion-base) var(--ease-out)',
  },
};
