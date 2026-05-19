import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Eye, Terminal as TermIcon, RefreshCw,
  ChevronLeft, ChevronRight, Trash2, Code2, FileCode2,
} from 'lucide-react';

// LivePreviewPanel — the right-side "what does my code do?" surface.
//
// Two views:
//   • Preview  — sandboxed iframe rendering HTML/CSS/JS as the user types.
//                Inspired by FreeCodeCamp / CodeSandbox: changes appear live
//                with a 250ms debounce; manual refresh forces a remount.
//   • Console  — captures console.log/warn/error from the iframe via
//                postMessage, plus stdout/stderr from the runner service
//                (Python, C, C++, Node). One unified output surface so
//                the bottom terminal can stay reserved for shell commands.
//
// Pedagogy notes:
//   - For HTML/CSS/JS, "Run" is implicit — the iframe is always live. The
//     learner sees cause→effect immediately, the FCC pattern.
//   - For Python/C/C++, "Run" stays explicit (it has to spawn a process)
//     and we auto-flip to the Console tab when output arrives.
//   - The pseudocode tab gets its own friendly placeholder, since
//     "rendering" pseudocode doesn't make sense.

// CSS used to live here but standalone CSS has no DOM to apply to, so we
// were injecting a fake demo document (Heading One / button / list) under
// the user's styles. That demo competes with the user's actual project
// and confuses people editing real .css files — so CSS now falls through
// to the placeholder ("pair with HTML"), same as Java/Go/Rust.
const PREVIEWABLE = new Set(['html', 'javascript']);
const RUNNABLE    = new Set(['javascript', 'typescript', 'python', 'c', 'cpp']);
const DEBOUNCE_MS = 250;
const MAX_LOG_ENTRIES = 200;

// Injected at the top of every previewed document so console.* in the
// iframe lands back in our parent UI. Stringified so srcDoc carries it.
const CONSOLE_CAPTURE = `(function(){
  function safe(v){
    try {
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (typeof v === 'function') return v.toString();
      if (typeof v === 'object') {
        try { return JSON.stringify(v, null, 2); }
        catch { return String(v); }
      }
      return String(v);
    } catch (e) { return '<unprintable>'; }
  }
  function send(level, args){
    try {
      parent.postMessage({
        __seecode: true, kind: 'console', level: level,
        args: Array.prototype.slice.call(args).map(safe),
      }, '*');
    } catch(e){}
  }
  ['log','info','warn','error','debug'].forEach(function(level){
    var orig = console[level];
    console[level] = function(){ send(level, arguments); if (orig) orig.apply(console, arguments); };
  });
  window.addEventListener('error', function(e){
    send('error', [(e.message || 'Error') + (e.lineno ? ' (line ' + e.lineno + ')' : '')]);
  });
  window.addEventListener('unhandledrejection', function(e){
    send('error', ['Unhandled promise rejection: ' + safe(e.reason)]);
  });
})();`.trim();

function buildSrcDoc(language, code) {
  const stub = `<script>${CONSOLE_CAPTURE}<\/script>`;
  if (!code) return null;

  if (language === 'html') {
    if (/<head[^>]*>/i.test(code)) {
      return code.replace(/<head([^>]*)>/i, `<head$1>${stub}`);
    }
    if (/<html[^>]*>/i.test(code)) {
      return code.replace(/<html([^>]*)>/i, `<html$1><head>${stub}</head>`);
    }
    return `<!DOCTYPE html><html><head>${stub}</head><body>${code}</body></html>`;
  }

  if (language === 'javascript') {
    return `<!DOCTYPE html><html><head>${stub}<style>
      body{font:14px Inter,system-ui,sans-serif;color:#333;background:#fff;padding:20px;margin:0}
    </style></head><body><script>
      try { ${code}\n }
      catch(__e){ console.error(__e && __e.message ? __e.message : String(__e)); }
    <\/script></body></html>`;
  }

  return null;
}

function languageLabel(l) {
  return ({
    python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
    c: 'C', cpp: 'C++', html: 'HTML', css: 'CSS', plaintext: 'Pseudocode',
  })[l] || l || 'this code';
}

export default function LivePreviewPanel({
  visible,
  onToggle,
  code = '',
  language = 'plaintext',
  filename = null,
  runnerOutput = null,
  runLoading = false,
}) {
  const previewable = PREVIEWABLE.has(language);
  const runnable    = RUNNABLE.has(language);

  const [view, setView] = useState('preview');
  const [consoleEntries, setConsoleEntries] = useState([]);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const idRef = useRef(0);
  const debounceRef = useRef(null);
  const lastRunnerRef = useRef(null);

  // Debounce live updates while typing.
  useEffect(() => {
    if (!previewable) { setDebouncedCode(code); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedCode(code), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [code, previewable]);

  // Capture console messages from the iframe.
  useEffect(() => {
    const onMessage = (e) => {
      const data = e.data;
      if (!data || data.__seecode !== true || data.kind !== 'console') return;
      setConsoleEntries((prev) => {
        const id = ++idRef.current;
        const next = [...prev, { id, ts: Date.now(), level: data.level, args: data.args || [] }];
        return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // When the language changes (different file/tab), drop old console output.
  useEffect(() => {
    setConsoleEntries([]);
  }, [language, filename]);

  // When the language changes to one that can't be previewed, swing the
  // user to the Console view — that's where Run output will land.
  useEffect(() => {
    if (!previewable && runnable) setView('console');
    if (!previewable && !runnable) setView('preview'); // shows placeholder
    if (previewable) setView((v) => (v === 'console' && consoleEntries.length === 0 ? 'preview' : v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Push runner result into the console view as a structured set of entries.
  useEffect(() => {
    if (!runnerOutput || runnerOutput === lastRunnerRef.current) return;
    lastRunnerRef.current = runnerOutput;
    setConsoleEntries((prev) => {
      const out = [...prev];
      const push = (level, text) => {
        if (!text) return;
        out.push({ id: ++idRef.current, ts: Date.now(), level, args: [text] });
      };
      if (runnerOutput.command) push('meta', `$ ${runnerOutput.command}`);
      if (runnerOutput.stdout) push('stdout', runnerOutput.stdout.replace(/\n$/, ''));
      if (runnerOutput.stderr) push('stderr', runnerOutput.stderr.replace(/\n$/, ''));
      const ms = runnerOutput.durationMs ?? 0;
      const ok = runnerOutput.exitCode === 0;
      push(ok ? 'meta' : 'stderr', `${ok ? '✓' : '✗'} exit ${runnerOutput.exitCode ?? '?'} · ${ms}ms`);
      return out.length > MAX_LOG_ENTRIES ? out.slice(-MAX_LOG_ENTRIES) : out;
    });
    setView('console');
  }, [runnerOutput]);

  const srcDoc = useMemo(
    () => (previewable ? buildSrcDoc(language, debouncedCode) : null),
    [language, debouncedCode, previewable]
  );

  const handleRefresh = useCallback(() => {
    setDebouncedCode(code);
    setRefreshNonce((n) => n + 1);
  }, [code]);

  // ---- collapsed rail (32 px) ------------------------------------------
  if (!visible) {
    return (
      <button
        type="button"
        style={styles.rail}
        onClick={onToggle}
        title="Show live preview"
        aria-label="Show live preview"
      >
        <ChevronLeft size={12} />
        <Eye size={14} style={{ marginTop: 6 }} />
        <span style={styles.railText}>PREVIEW</span>
      </button>
    );
  }

  // ---- expanded panel --------------------------------------------------
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(view === 'preview' ? styles.tabActive : {}) }}
            onClick={() => setView('preview')}
            title="Visual preview"
          >
            <Eye size={12} />
            <span style={{ marginLeft: 6 }}>Preview</span>
          </button>
          <button
            style={{ ...styles.tab, ...(view === 'console' ? styles.tabActive : {}) }}
            onClick={() => setView('console')}
            title="Console output (logs, runner output)"
          >
            <TermIcon size={12} />
            <span style={{ marginLeft: 6 }}>Console</span>
            {consoleEntries.length > 0 && (
              <span style={styles.tabBadge}>{consoleEntries.length}</span>
            )}
          </button>
        </div>

        <div style={styles.headerActions}>
          {view === 'console' && consoleEntries.length > 0 && (
            <button
              type="button"
              style={styles.iconBtn}
              onClick={() => setConsoleEntries([])}
              title="Clear console"
              aria-label="Clear console"
            >
              <Trash2 size={12} />
            </button>
          )}
          {view === 'preview' && previewable && (
            <button
              type="button"
              style={styles.iconBtn}
              onClick={handleRefresh}
              title="Refresh preview"
              aria-label="Refresh preview"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            type="button"
            style={styles.iconBtn}
            onClick={onToggle}
            title="Hide preview"
            aria-label="Hide preview"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {view === 'preview' && (
          previewable ? (
            <iframe
              key={refreshNonce}
              title="Live preview"
              style={styles.iframe}
              srcDoc={srcDoc || ''}
              sandbox="allow-scripts allow-modals allow-forms"
            />
          ) : (
            <PlaceholderView
              language={language}
              runnable={runnable}
              runLoading={runLoading}
            />
          )
        )}

        {view === 'console' && (
          <ConsoleView entries={consoleEntries} language={language} />
        )}
      </div>

      {view === 'preview' && previewable && (
        <div style={styles.statusBar}>
          <span style={styles.statusDot} />
          <span>Live · updates as you type</span>
          {filename && <span style={styles.statusFile}>{filename}</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PlaceholderView({ language, runnable, runLoading }) {
  const isPseudo = language === 'plaintext';
  return (
    <div style={styles.placeholder}>
      {isPseudo ? <Code2 size={28} color="var(--text-muted)" /> : <FileCode2 size={28} color="var(--text-muted)" />}
      <h3 style={styles.placeholderTitle}>
        {isPseudo
          ? 'Pseudocode is the lesson'
          : runnable
            ? (runLoading ? `Running ${languageLabel(language)}…` : `Ready to run ${languageLabel(language)}`)
            : 'Live preview not available'}
      </h3>
      <p style={styles.placeholderText}>
        {isPseudo && (<>
          Switch to a <b>language tab</b> to see the same algorithm rendered in
          syntax — and, for HTML/CSS/JS, watch it run live here.
        </>)}
        {!isPseudo && runnable && (<>
          Press <b>Run</b> in the editor toolbar above. Output will land in the
          <b> Console</b> tab.
        </>)}
        {!isPseudo && !runnable && language === 'css' && (<>
          CSS needs a document to style. Open an <b>HTML file</b> that
          links to this stylesheet and you'll see your styles applied
          live. The file itself is fully editable here.
        </>)}
        {!isPseudo && !runnable && language !== 'css' && (<>
          Live preview supports HTML and JavaScript out of the box.
          Other languages (Java, Go, Rust, C#…) can still be edited — they
          just don't render here.
        </>)}
      </p>
    </div>
  );
}

function ConsoleView({ entries, language }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div style={styles.consoleEmpty}>
        <TermIcon size={20} color="var(--text-muted)" />
        <span style={styles.consoleEmptyTitle}>Console is quiet.</span>
        <span style={styles.consoleEmptyHint}>
          {language === 'javascript' || language === 'html'
            ? <>Anything you <code style={styles.kbd}>console.log()</code> in the preview lands here.</>
            : <>Click <b>Run</b> to execute and see output here.</>}
        </span>
      </div>
    );
  }

  return (
    <div style={styles.consoleScroll} ref={scrollRef}>
      {entries.map((e) => (
        <div key={e.id} style={{ ...styles.consoleLine, ...(levelStyles[e.level] || {}) }}>
          <span style={styles.consoleLevel}>{levelLabel(e.level)}</span>
          <pre style={styles.consoleArgs}>{e.args.join(' ')}</pre>
        </div>
      ))}
    </div>
  );
}

function levelLabel(level) {
  switch (level) {
    case 'log':    return 'log';
    case 'info':   return 'info';
    case 'debug':  return 'dbg';
    case 'warn':   return 'warn';
    case 'error':  return 'err';
    case 'stdout': return 'out';
    case 'stderr': return 'err';
    case 'meta':   return '·';
    default:       return level;
  }
}

const levelStyles = {
  warn:   { color: '#f0b429' },
  error:  { color: 'var(--danger)' },
  stderr: { color: 'var(--danger)' },
  meta:   { color: 'var(--text-muted)' },
};

// ---------------------------------------------------------------------------
// styles

const styles = {
  rail: {
    width: 32,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingTop: 14,
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--motion-fast) var(--ease-out), color var(--motion-fast) var(--ease-out)',
  },
  railText: {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'var(--text-muted)',
    marginTop: 8,
  },

  panel: {
    width: 440,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    borderLeft: '1px solid var(--border)',
    minWidth: 0,
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'stretch',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    minHeight: 36,
  },
  tabs: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '8px 14px',
    whiteSpace: 'nowrap',
    transition: 'color var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out)',
  },
  tabActive: {
    color: 'var(--text-primary)',
    borderBottomColor: 'var(--text-primary)',
    background: 'var(--bg-primary)',
  },
  tabBadge: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-strong)',
    fontSize: 10,
    fontWeight: 500,
    padding: '0 6px',
    borderRadius: 999,
    marginLeft: 6,
    minWidth: 18,
    textAlign: 'center',
  },

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    paddingRight: 6,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: 6,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  iframe: {
    flex: 1,
    border: 'none',
    background: '#ffffff',
    width: '100%',
    height: '100%',
  },

  placeholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
    gap: 6,
    color: 'var(--text-muted)',
    background: 'var(--bg-primary)',
  },
  placeholderTitle: {
    fontSize: 14,
    color: 'var(--text-primary)',
    fontWeight: 600,
    margin: '8px 0 0',
  },
  placeholderText: {
    fontSize: 12.5,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    maxWidth: 320,
    margin: 0,
  },

  consoleEmpty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 12,
    lineHeight: 1.6,
    gap: 6,
    background: 'var(--bg-input)',
  },
  consoleEmptyTitle: {
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    marginTop: 6,
  },
  consoleEmptyHint: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    maxWidth: 280,
  },
  kbd: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '0px 5px',
    fontSize: 10.5,
    color: 'var(--text-primary)',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
  },
  consoleScroll: {
    flex: 1,
    overflow: 'auto',
    background: 'var(--bg-input)',
    fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
    padding: '4px 0',
  },
  consoleLine: {
    display: 'flex',
    gap: 10,
    padding: '4px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: 12,
    lineHeight: 1.5,
  },
  consoleLevel: {
    color: 'var(--text-muted)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: 2,
    minWidth: 32,
    flexShrink: 0,
  },
  consoleArgs: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontFamily: 'inherit',
    fontSize: 12,
  },

  statusBar: {
    height: 22,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--text-secondary)',
  },
  statusFile: {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: 10,
  },
};
