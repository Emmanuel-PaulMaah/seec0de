import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Plus, RefreshCw, FolderPlus, X, Check, Pencil, Trash2 } from 'lucide-react';
import { basename, dirname, joinPath } from '../engine/fileLanguage';

// A small recursive file tree. Keeps state per-folder (open/closed + entries)
// in a flat map keyed by absolute path, so we don't re-fetch on every render.
//
// Props:
//   rootPath          string | null
//   onPickFolder      () => Promise<void>     -- triggers main process dialog
//   onCloseFolder     () => void
//   onOpenFile        (path: string) => void  -- opens file in editor
//   onDeleteFile      (path: string) => void  -- closes a deleted editor tab
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
  onDeleteFile,
  activeFilePath,
  refreshKey,
}) {
  const [tree, setTree] = useState({});      // path -> { entries, open }
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(null); // null | 'file' | 'folder'
  const [draftName, setDraftName] = useState('');
  const [selectedDir, setSelectedDir] = useState(rootPath);
  const [deleting, setDeleting] = useState(null); // { path, name, parentPath } | null
  const [renaming, setRenaming] = useState(null); // { path, name, parentPath } | null
  const [renameDraft, setRenameDraft] = useState('');
  const renameRef = useRef(null);
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
      setSelectedDir(null);
      return;
    }
    setSelectedDir(rootPath);
    setDeleting(null);
    setTree({ [rootPath]: { entries: null, open: true } });
    loadDir(rootPath);
  }, [rootPath, refreshKey, loadDir]);

  // Auto-focus the inline name input when it appears so the user can
  // type immediately without a second click.
  useEffect(() => {
    if (creating && draftRef.current) draftRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

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
    // One inline name creates inside whichever folder is selected in the tree.
    if (/[\\/]/.test(name)) {
      setError('Name cannot contain "/" or "\\". Select a folder, then create the item there.');
      return;
    }
    try {
      const parentPath = selectedDir || rootPath;
      const target = joinPath(parentPath, name);
      if (creating === NEW_FILE) {
        await window.seecode.fs.createFile(target);
      } else {
        await window.seecode.fs.createDir(target);
      }
      await loadDir(parentPath);
      setTree((prev) => ({
        ...prev,
        [parentPath]: { ...prev[parentPath], open: true },
      }));
      cancelCreate();
      if (creating === NEW_FILE) onOpenFile?.(target);
    } catch (err) {
      setError(err.message || 'Failed to create.');
    }
  }, [rootPath, selectedDir, creating, draftName, loadDir, cancelCreate, onOpenFile]);

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

  const startRename = useCallback((entryPath, entryName, isDir) => {
    setError(null);

    const slash = Math.max(entryPath.lastIndexOf('/'), entryPath.lastIndexOf('\\'));
    const parentPath = slash >+ 0 ? entryPath.slice(0, slash) : rootPath;

    setRenaming({ path: entryPath, name: entryName, parentPath, isDir });
    setRenameDraft(entryName);
  }, [rootPath]);

  const cancelRename = useCallback(() => {
    setRenaming(null);
    setRenameDraft('');
  }, []);

  const commitRename = useCallback(async () => {
    if (!renaming) return;

    const nextName = renameDraft.trim();

    if (!nextName || nextName === renaming.name) {
      cancelRename();
      return;
    }

    if (/[\\/]/.test(nextName)) {
      setError('Name cannot contain "/" or "\\".');
      return;
    }

    try {
      const nextPath = joinPath(renaming.parentPath, nextName);

      await window.seecode.fs.rename(renaming.path, nextPath);

      await loadDir(renaming.parentPath);

      if (renaming.isDir && (
        selectedDir === renaming.path
        || selectedDir?.startsWith(`${renaming.path}\\`)
        || selectedDir?.startsWith(`${renaming.path}/`)
      )) {
        setSelectedDir(`${nextPath}${selectedDir.slice(renaming.path.length)}`);
      }

      if (activeFilePath === renaming.path) {
        onOpenFile?.(nextPath);
      }

      cancelRename();
    } catch (err) {
      setError(err.message || 'Failed to rename.');
    }
  }, [renaming, renameDraft, cancelRename, loadDir, activeFilePath, onOpenFile, selectedDir]);

  const requestDelete = useCallback((filePath, fileName) => {
    setError(null);
    setDeleting({ path: filePath, name: fileName, parentPath: dirname(filePath) || rootPath });
  }, [rootPath]);

  const cancelDelete = useCallback(() => setDeleting(null), []);

  const commitDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await window.seecode.fs.delete(deleting.path);
      onDeleteFile?.(deleting.path);
      await loadDir(deleting.parentPath);
      setDeleting(null);
    } catch (err) {
      setError(err.message || 'Failed to delete file.');
    }
  }, [deleting, loadDir, onDeleteFile]);

  const onRenameKey = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      commitRename();
    }
  }, [commitRename, cancelRename]);

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
        <button
          type="button"
          style={{ ...styles.headerLabel, ...(selectedDir === rootPath ? styles.headerLabelSelected : {}) }}
          title="Select project root as the creation target"
          onClick={() => setSelectedDir(rootPath)}
        >
          {basename(rootPath) || rootPath}
        </button>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} onClick={() => startCreate(NEW_FILE)} title={`New file in ${basename(selectedDir) || 'project root'}`}>
            <Plus size={12} />
          </button>
          <button style={styles.iconBtn} onClick={() => startCreate(NEW_FOLDER)} title={`New folder in ${basename(selectedDir) || 'project root'}`}>
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
        <div>
          <div style={styles.draftTarget}>Creating in {selectedDir === rootPath ? 'project root' : basename(selectedDir)}</div>
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
        </div>
      )}

      {deleting && (
        <div style={styles.deleteConfirm} role="alert">
          <span style={styles.deleteText}>Move “{deleting.name}” to the Recycle Bin?</span>
          <button type="button" style={styles.deleteBtn} onClick={commitDelete}>Delete</button>
          <button type="button" style={styles.draftCancel} onClick={cancelDelete} aria-label="Cancel delete"><X size={11} /></button>
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
          selectedDir={selectedDir}
          onSelectDir={setSelectedDir}
          onRequestDelete={requestDelete}
          activeFilePath={activeFilePath}
          isRoot
          renaming={renaming}
          renameDraft={renameDraft}
          renameRef={renameRef}
          onRenameDraftChange={setRenameDraft}
          onRenameKey={onRenameKey}
          onRenameBlur={commitRename}
          onStartRename={startRename}
        />
      </div>
    </div>
  );
}

function TreeNode({ path, name, isDir, depth, tree, onToggleDir, onOpenFile, activeFilePath, selectedDir, onSelectDir, onRequestDelete, isRoot, renaming, renameDraft, renameRef, onRenameDraftChange, onRenameKey, onRenameBlur, onStartRename }) {
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
            selectedDir={selectedDir}
            onSelectDir={onSelectDir}
            onRequestDelete={onRequestDelete}
            renaming={renaming}
            renameDraft={renameDraft}
            renameRef={renameRef}
            onRenameDraftChange={onRenameDraftChange}
            onRenameKey={onRenameKey}
            onRenameBlur={onRenameBlur}
            onStartRename={onStartRename}
          />
        ))}
      </>
    );
  }

  const isActive = !isDir && path === activeFilePath;
  const isSelectedDir = isDir && path === selectedDir;
  const isRenaming = renaming?.path === path;

  return (
    <div>
      <button
        style={{
          ...styles.row,
          ...(isActive ? styles.rowActive : {}),
          ...(isSelectedDir ? styles.rowSelected : {}),
          paddingLeft: 8 + depth * 12,
        }}
        onClick={() => {
          if (isDir) {
            onSelectDir(path);
            onToggleDir(path);
          } else {
            onOpenFile(path);
          }
        }}
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
        {isRenaming ? (
  <input
    ref={renameRef}
    value={renameDraft}
    onChange={(e) => onRenameDraftChange(e.target.value)}
    onKeyDown={onRenameKey}
    onBlur={onRenameBlur}
    onClick={(e) => e.stopPropagation()}
    style={styles.renameInput}
  />
) : (
  <span style={styles.name}>{name}</span>
)}

{!isRenaming && (
  <span style={styles.rowActions}>
    <span
      role="button"
      tabIndex={0}
      title="Rename"
      style={styles.rowAction}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onStartRename(path, name, isDir);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onStartRename(path, name, isDir);
        }
      }}
    >
      <Pencil size={11} />
    </span>
    {!isDir && (
      <span
        role="button"
        tabIndex={0}
        title="Delete file"
        aria-label={`Delete ${name}`}
        style={styles.rowAction}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRequestDelete(path, name);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onRequestDelete(path, name);
          }
        }}
      >
        <Trash2 size={11} />
      </span>
    )}
  </span>
)}
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
          selectedDir={selectedDir}
          onSelectDir={onSelectDir}
          onRequestDelete={onRequestDelete}
          renaming={renaming}
          renameDraft={renameDraft}
          renameRef={renameRef}
          onRenameDraftChange={onRenameDraftChange}
          onRenameKey={onRenameKey}
          onRenameBlur={onRenameBlur}
          onStartRename={onStartRename}
        />
      ))}
    </div>
  );
}

const styles = {
  panel: {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-secondary)',
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
    minWidth: 0,
    padding: '2px 4px',
    border: 'none',
    borderRadius: 3,
    background: 'transparent',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'var(--text-secondary)',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerLabelSelected: {
    background: 'var(--accent-soft)',
    color: 'var(--text-primary)',
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

  rowActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
    opacity: 0.75,
    flexShrink: 0,
  },

  rowAction: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: 3,
    color: 'var(--text-muted)',
  },

  renameInput: {
    flex: 1,
    minWidth: 0,
    background: 'var(--bg-input)',
    border: '1px solid var(--border-focus)',
    borderRadius: 3,
    color: 'var(--text-primary)',
    fontSize: 12,
    padding: '2px 5px',
    outline: 'none',
    fontFamily: 'inherit',
  },

  draftRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 8px',
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
  },
  draftTarget: {
    padding: '5px 8px 0',
    background: 'var(--bg-elevated)',
    color: 'var(--text-muted)',
    fontSize: 10,
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
  deleteConfirm: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 8px',
    background: 'var(--danger-soft)',
    borderBottom: '1px solid var(--border)',
  },
  deleteText: {
    flex: 1,
    minWidth: 0,
    color: 'var(--text-secondary)',
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  deleteBtn: {
    padding: '3px 7px',
    border: '1px solid var(--danger)',
    borderRadius: 3,
    background: 'var(--danger)',
    color: '#fff',
    fontSize: 10.5,
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
    color: 'var(--text-on-accent)',
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
  rowSelected: {
    background: 'var(--accent-soft)',
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
