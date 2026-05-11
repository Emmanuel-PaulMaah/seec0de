// Map a file path to a Monaco language id and a friendly label.
// Used by the file explorer + code panel when opening files from disk.

const EXT_TO_LANG = {
  py:   { monaco: 'python',     label: 'Python',     run: 'python' },
  js:   { monaco: 'javascript', label: 'JavaScript', run: 'javascript' },
  mjs:  { monaco: 'javascript', label: 'JavaScript', run: 'javascript' },
  cjs:  { monaco: 'javascript', label: 'JavaScript', run: 'javascript' },
  jsx:  { monaco: 'javascript', label: 'JSX',        run: 'javascript' },
  ts:   { monaco: 'typescript', label: 'TypeScript', run: 'typescript' },
  tsx:  { monaco: 'typescript', label: 'TSX',        run: 'typescript' },
  c:    { monaco: 'c',          label: 'C',          run: 'c' },
  h:    { monaco: 'c',          label: 'C header',   run: null },
  cpp:  { monaco: 'cpp',        label: 'C++',        run: 'cpp' },
  cc:   { monaco: 'cpp',        label: 'C++',        run: 'cpp' },
  cxx:  { monaco: 'cpp',        label: 'C++',        run: 'cpp' },
  hpp:  { monaco: 'cpp',        label: 'C++ header', run: null },
  java: { monaco: 'java',       label: 'Java',       run: null },
  cs:   { monaco: 'csharp',     label: 'C#',         run: null },
  go:   { monaco: 'go',         label: 'Go',         run: null },
  rs:   { monaco: 'rust',       label: 'Rust',       run: null },
  json: { monaco: 'json',       label: 'JSON',       run: null },
  md:   { monaco: 'markdown',   label: 'Markdown',   run: null },
  html: { monaco: 'html',       label: 'HTML',       run: null },
  css:  { monaco: 'css',        label: 'CSS',        run: null },
  txt:  { monaco: 'plaintext',  label: 'Text',       run: null },
};

export function fileInfo(filePath) {
  if (!filePath) return { monaco: 'plaintext', label: 'Text', run: null };
  const dot = filePath.lastIndexOf('.');
  const ext = dot >= 0 ? filePath.slice(dot + 1).toLowerCase() : '';
  return EXT_TO_LANG[ext] || { monaco: 'plaintext', label: 'Text', run: null };
}

export function basename(filePath) {
  if (!filePath) return '';
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return idx >= 0 ? filePath.slice(idx + 1) : filePath;
}

export function dirname(filePath) {
  if (!filePath) return '';
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return idx >= 0 ? filePath.slice(0, idx) : '';
}

export function joinPath(a, b) {
  if (!a) return b;
  const sep = a.includes('\\') ? '\\' : '/';
  return a.endsWith(sep) ? a + b : a + sep + b;
}
