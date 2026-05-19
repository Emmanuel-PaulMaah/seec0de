import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Plus, RefreshCw, FolderPlus, X, Check } from 'lucide-react';
import { basename, joinPath } from '../engine/fileLanguage';

// A small recursive file tree. Keeps state per-folder (open/closed + entries)
// in a flat map keyed by absolute path, so we don't re-fetch on every render.
//
// Props:
//   rootPath          string | null
//   onPickFolder      () => Promise<void>     -- triggers main process dialog
//   onCloseFolder     () => void
//   onOpenFile        (path: string) => void  -- opens file in editor
//   activeFilePath    string | null           -- highlighted in the tree
//   refreshKey        number                  -- bump to force a refresh

// What kind of inline-input row we're showing under the header. Electron
// disables `window.prompt()` by default (it returns null and the call
// looks dead), so we render our own input instead of relying on it.
const NEW_FILE   = 'file';
const NEW_FOLDER = 'folder';

export default function FileExplorer({
  rootPath,
  onPickFolder,
  onCloseFolder,
  onOpenFile,
  activeFilePath,
  refreshKey,
}) {
  const [tree, setTree] = useState({});      // path -> { entries, open }
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(null); // null | 'file' | 'folder'
  const [draftName, setDraftName] = useState('');
  const draftRef = useRef(null);

  const loadDir = useCallback(async (dirPath) => {
    try {
      const entries = await window.seecode.fs.readDir(dirPath);
      setTree((prev) => ({
        ...prev,
        [dirPath]: { entries, open: prev[dirPath]?.open ?? true },
      }));
    } catch (err) {
      setError(`Couldn't read ${dirPath}: ${err.message}`);
    }
  }, []);

  // Load root whenever it changes or refresh is requested.
  useEffect(() => {
    if (!rootPath) {
      setTree({});
      return;
    }
    setTree({ [rootPath]: { entries: null, open: true } });
    loadDir(rootPath);
  }, [rootPath, refreshKey, loadDir]);

  // Auto-focus the inline name input when it appears so the user can
  // type immediately without a second click.
  useEffect(() => {
    if (creating && draftRef.current) draftRef.current.focus();
  }, [creating]);

  const toggleDir = useCallback(async (dirPath) => {
    const node = tree[dirPath];
    if (!node || !node.entries) {
      await loadDir(dirPath);
      setTree((prev) => ({ ...prev, [dirPath]: { ...prev[dirPath], open: true } }));
      return;
    }
    setTree((prev) => ({
      ...prev,
      [dirPath]: { ...prev[dirPath], open: !prev[dirPath].open },
    }));
  }, [tree, loadDir]);

  const startCreate = useCallback((kind) => {
    setError(null);
    setDraftName('');
    setCreating(kind);
  }, []);

  const cancelCreate = useCallback(() => {
    setCreating(null);
    setDraftName('');
  }, []);

  const commitCreate = useCallback(async () => {
    if (!rootPath || !creating) return;
    const name = draftName.trim();
    if (!name) { cancelCreate(); return; }
    // Disallow path separators — keep new entries at the root for simplicity.
    if (/[\\/]/.test(name)) {
      setError('Name cannot contain "/" or "\\". Create nested items by opening a folder first.');
      return;
    }
    try {
      const target = joinPath(rootPath, name);
      if (creating === NEW_FILE) {
        await window.seecode.fs.createFile(target);
      } else {
        await window.seecode.fs.createDir(target);
      }
      await loadDir(rootPath);
      cancelCreate();
      if (creating === NEW_FILE) onOpenFile?.(target);
    } catch (err) {
      setError(err.message || 'Failed to create.');
    }
  }, [rootPath, creating, draftName, loadDir, cancelCreate, onOpenFile]);

  const onDraftKey = useCallback((e) => {
    if (e.key === 'Enter')      { e.preventDefault(); commitCreate(); }
    else if (e.key === 'Escape'){ e.preventDefault(); cancelCreate(); }
  }, [commitCreate, cancelCreate]);

  const handleRefresh = useCallback(() => {
    if (rootPath) {
      setError(null);
      loadDir(rootPath);
    }
  }, [rootPath, loadDir]);

  if (!rootPath) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.headerLabel}>Files</span>
        </div>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No folder open.</p>
          <button style={styles.primaryBtn} onClick={onPickFolder}>
            Open folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerLabel} title={rootPath}>{basename(rootPath) || rootPath}</span>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} onClick={() => startCreate(NEW_FILE)} title="New file">
            <Plus size={12} />
          </button>
          <button style={styles.iconBtn} onClick={() => startCreate(NEW_FOLDER)} title="New folder">
            <FolderPlus size={12} />
          </button>
          <button style={styles.iconBtn} onClick={handleRefresh} title="Refresh">
            <RefreshCw size={12} />
          </button>
          <button style={styles.iconBtn} onClick={onCloseFolder} title="Close folder">
            <X size={12} />
          </button>
        </div>
      </div>

      {creating && (
        <div style={styles.draftRow}>
          {creating === NEW_FOLDER
            ? <Folder size={13} style={styles.draftIcon} />
            : <File size={13} style={styles.draftIcon} />}
          <input
            ref={draftRef}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={onDraftKey}
            onBlur={commitCreate}
            placeholder={creating === NEW_FOLDER ? 'new-folder' : 'new-file.py'}
            style={styles.draftInput}
            aria-label={creating === NEW_FOLDER ? 'New folder name' : 'New file name'}
          />
          <button style={styles.draftConfirm} onMouseDown={(e) => e.preventDefault()} onClick={commitCreate} title="Create (Enter)">
            <Check size={11} />
          </button>
          <button style={styles.draftCancel} onMouseDown={(e) => e.preventDefault()} onClick={cancelCreate} title="Cancel (Esc)">
            <X size={11} />
          </button>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.tree}>
        <TreeNode
          path={rootPath}
          name={basename(rootPath) || rootPath}
          isDir
          depth={0}
          tree={tree}
          onToggleDir={toggleDir}
          onOpenFile={onOpenFile}
          activeFilePath={activeFilePath}
          isRoot
        />
      </div>
    </div>
  );
}

function TreeNode({ path, name, isDir, depth, tree, onToggleDir, onOpenFile, activeFilePath, isRoot }) {
  const node = isDir ? tree[path] : null;
  const open = !!node?.open;
  const entries = node?.entries;

  if (isRoot) {
    // The root just renders its children directly — we already show its name in the header.
    if (!entries) return <div style={styles.loading}>Loading…</div>;
    return (
      <>
        {entries.map((entry) => (
          <TreeNode
            key={entry.path}
            path={entry.path}
            name={entry.name}
            isDir={entry.isDir}
            depth={0}
            tree={tree}
            onToggleDir={onToggleDir}
            onOpenFile={onOpenFile}
            activeFilePath={activeFilePath}
          />
        ))}
      </>
    );
  }

  const isActive = !isDir && path === activeFilePath;

  return (
    <div>
      <button
        style={{
          ...styles.row,
          ...(isActive ? styles.rowActive : {}),
          paddingLeft: 8 + depth * 12,
        }}
        onClick={() => (isDir ? onToggleDir(path) : onOpenFile(path))}
        title={path}
      >
        {isDir ? (
          open ? <ChevronDown size={12} style={styles.chev} /> : <ChevronRight size={12} style={styles.chev} />
        ) : (
          <span style={styles.chev} />
        )}
        {isDir ? (
          open ? <FolderOpen size={13} style={styles.icon} /> : <Folder size={13} style={styles.icon} />
        ) : (
          <File size={13} style={styles.icon} />
        )}
        <span style={styles.name}>{name}</span>
      </button>
      {isDir && open && entries && entries.map((entry) => (
        <TreeNode
          key={entry.path}
          path={entry.path}
          name={entry.name}
          isDir={entry.isDir}
          depth={depth + 1}
          tree={tree}
          onToggleDir={onToggleDir}
          onOpenFile={onOpenFile}
          activeFilePath={activeFilePath}
        />
      ))}
    </div>
  );
}

const styles = {
  panel: {
    width: 240,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-tertiary)',
  },
  headerLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'var(--text-secondary)',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerActions: {
    display: 'flex',
    gap: 2,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: 3,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  draftRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 8px',
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
  },
  draftIcon: {
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  draftInput: {
    flex: 1,
    minWidth: 0,
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 3,
    color: 'var(--text-primary)',
    fontSize: 12,
    padding: '3px 6px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  draftConfirm: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    padding: 3,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  draftCancel: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: 3,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  emptyState: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-start',
  },
  emptyText: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  primaryBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 3,
    color: '#fff',
    fontSize: 12,
    padding: '6px 12px',
    fontWeight: 600,
  },
  tree: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 0',
  },
  loading: {
    padding: 8,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  error: {
    padding: 8,
    fontSize: 11,
    color: '#e06c75',
    background: 'rgba(224, 108, 117, 0.08)',
    borderBottom: '1px solid var(--border)',
  },
  row: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 12,
    padding: '3px 8px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rowActive: {
    background: 'rgba(0, 122, 204, 0.16)',
    color: '#fff',
  },
  chev: {
    width: 12,
    height: 12,
    flexShrink: 0,
    color: 'var(--text-muted)',
  },
  icon: {
    flexShrink: 0,
    color: 'var(--text-secondary)',
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
