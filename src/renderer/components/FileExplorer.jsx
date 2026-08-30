import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import { Folder, FolderOpen, File, Plus, RefreshCw, FolderPlus, X, Check, Pencil, Trash2, Copy, Scissors, Clipboard } from 'lucide-react';
import { basename, dirname, joinPath } from '../engine/fileLanguage';
import { FileTree, FileTreeFolder, FileTreeFile } from './motion/file-tree';

// Migrated to beUI FileTree — declarative tree with spring animations,
// keyboard navigation, and a shared-layout hover pill. Context menu,
// create/rename/delete overlays remain as before.

const NEW_FILE   = 'file';
const NEW_FOLDER = 'folder';

// Map file extensions to lucide icons with color
function iconForFile(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const colorMap = {
    js: 'text-yellow-400', jsx: 'text-sky-400', ts: 'text-blue-400', tsx: 'text-sky-400',
    py: 'text-green-400', rb: 'text-red-400', go: 'text-cyan-400', rs: 'text-orange-400',
    css: 'text-violet-400', html: 'text-orange-300', json: 'text-amber-400',
    md: 'text-muted-foreground', txt: 'text-muted-foreground',
  };
  const cls = colorMap[ext] || 'text-muted-foreground';
  return <File size={14} className={cls} />;
}

export default function FileExplorer({
  rootPath,
  onPickFolder,
  onCloseFolder,
  onOpenFile,
  onDeleteFile,
  activeFilePath,
  refreshKey,
}) {
  const [tree, setTree] = useState({});
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [selectedDir, setSelectedDir] = useState(rootPath);
  const [deleting, setDeleting] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameRef = useRef(null);
  const draftRef = useRef(null);

  // ---- context menu ---------------------------------------------------
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);
  const [hoveredPath, setHoveredPath] = useState(null);

  const clearSelection = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handler);
    };
  }, [contextMenu]);

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

  useEffect(() => {
    if (!rootPath) {
      setTree({});
      setSelectedDir(null);
      clearSelection();
      return;
    }
    setSelectedDir(rootPath);
    setDeleting(null);
    clearSelection();
    setTree({ [rootPath]: { entries: null, open: true } });
    loadDir(rootPath);
  }, [rootPath, refreshKey, loadDir, clearSelection]);

  useEffect(() => {
    if (creating && draftRef.current) draftRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  useEffect(() => {
    const onKey = (e) => {
      if (creating || renaming || deleting) return;
      if (e.key === 'Escape' && contextMenu) {
        e.preventDefault();
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [creating, renaming, deleting, contextMenu]);

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

  // ---- beUI FileTree expanded state -----------------------------------
  const expandedIds = useMemo(() => {
    const ids = [];
    for (const [path, node] of Object.entries(tree)) {
      if (node.open) ids.push(path);
    }
    return ids;
  }, [tree]);

  const handleExpandedChange = useCallback((nextExpanded) => {
    // Find newly expanded dirs that need loading
    for (const id of nextExpanded) {
      if (!tree[id]?.entries) {
        loadDir(id);
      }
    }
    setTree((prev) => {
      const next = { ...prev };
      for (const [path, node] of Object.entries(next)) {
        if (node) {
          next[path] = { ...node, open: nextExpanded.includes(path) };
        }
      }
      return next;
    });
  }, [tree, loadDir]);

  // ---- create ---------------------------------------------------------
  const startCreate = useCallback((kind, targetDir) => {
    setError(null);
    setDraftName('');
    setCreating(kind);
    if (targetDir) setSelectedDir(targetDir);
  }, []);

  const cancelCreate = useCallback(() => {
    setCreating(null);
    setDraftName('');
  }, []);

  const commitCreate = useCallback(async () => {
    if (!rootPath || !creating) return;
    const name = draftName.trim();
    if (!name) { cancelCreate(); return; }
    if (/[\\\/]/.test(name)) {
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

  // ---- rename ---------------------------------------------------------
  const startRename = useCallback((entryPath, entryName, isDir) => {
    setError(null);
    const slash = Math.max(entryPath.lastIndexOf('/'), entryPath.lastIndexOf('\\'));
    const parentPath = slash >= 0 ? entryPath.slice(0, slash) : rootPath;
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
    if (/[\\\/]/.test(nextName)) {
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

  const onRenameKey = useCallback((e) => {
    if (e.key === 'Enter')      { e.preventDefault(); commitRename(); }
    else if (e.key === 'Escape'){ e.preventDefault(); cancelRename(); }
  }, [commitRename, cancelRename]);

  // ---- delete ---------------------------------------------------------
  const requestDelete = useCallback((path, name, isDir, parentPath) => {
    setError(null);
    setDeleting({ items: [{ path, name, isDir, parentPath }] });
  }, []);

  const cancelDelete = useCallback(() => setDeleting(null), []);

  const commitDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      const parentsToReload = new Set();
      for (const item of deleting.items) {
        await window.seecode.fs.delete(item.path);
        if (!item.isDir) onDeleteFile?.(item.path);
        parentsToReload.add(item.parentPath);
      }
      await Promise.all(Array.from(parentsToReload).map((dir) => loadDir(dir)));
      setDeleting(null);
    } catch (err) {
      setError(err.message || 'Failed to delete.');
    }
  }, [deleting, loadDir, onDeleteFile]);

  // ---- copy path ------------------------------------------------------
  const copyPath = useCallback(async (path) => {
    try { await navigator.clipboard.writeText(path); } catch { /* clipboard blocked */ }
  }, []);

  const copyRelativePath = useCallback(async (path) => {
    if (!rootPath) return;
    const rel = path.startsWith(rootPath) ? path.slice(rootPath.length + 1) : path;
    try { await navigator.clipboard.writeText(rel); } catch { /* clipboard blocked */ }
  }, [rootPath]);

  // ---- context menu handler -------------------------------------------
  const openContextMenu = useCallback((e, path, name, isDir) => {
    e.preventDefault();
    e.stopPropagation();
    const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    const parentPath = slash >= 0 ? path.slice(0, slash) : rootPath;
    setContextMenu({ x: e.clientX, y: e.clientY, path, name, isDir, parentPath });
  }, [rootPath]);

  // ---- build declarative tree for beUI FileTree ----------------------
  const fileTreeChildren = useMemo(() => {
    if (!rootPath || !tree[rootPath]?.entries) return null;

    function buildNodes(dirPath, depth) {
      const entries = tree[dirPath]?.entries;
      if (!entries) return [];
      return entries.map((entry) => {
        if (entry.isDir) {
          const children = tree[entry.path]?.open ? buildNodes(entry.path, depth + 1) : [];
          return (
            <FileTreeFolder
              key={entry.path}
              value={entry.path}
              name={entry.name}
              icon={tree[entry.path]?.open
                ? <FolderOpen size={14} className="text-foreground" />
                : <Folder size={14} className="text-muted-foreground" />}
            >
              {children}
            </FileTreeFolder>
          );
        }
        const isRenaming = renaming?.path === entry.path;
        return (
          <FileTreeFile
            key={entry.path}
            value={entry.path}
            name={entry.name}
            icon={iconForFile(entry.name)}
            className={entry.path === activeFilePath ? 'bg-[var(--active-row-bg)]! text-[var(--text-on-accent)]!' : ''}
          />
        );
      });
    }

    return buildNodes(rootPath, 0);
  }, [rootPath, tree, activeFilePath, renaming]);

  // ---- render ---------------------------------------------------------

  if (!rootPath) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.headerLabel}>Files</span>
        </div>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No folder open.</p>
          <button className="ui-primary-button" style={styles.primaryBtn} onClick={onPickFolder}>
            Open folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerLabel}>
          {basename(rootPath) || rootPath}
        </span>
        <div style={styles.headerActions}>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={() => startCreate(NEW_FILE)} title={`New file in ${basename(selectedDir) || 'project root'}`}>
            <Plus size={12} />
          </button>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={() => startCreate(NEW_FOLDER)} title={`New folder in ${basename(selectedDir) || 'project root'}`}>
            <FolderPlus size={12} />
          </button>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={handleRefresh} title="Refresh">
            <RefreshCw size={12} />
          </button>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={onCloseFolder} title="Close folder">
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
          <span style={styles.deleteText}>
            {deleting.items.length === 1
              ? `Move "${deleting.items[0].name}" to the Recycle Bin?`
              : `Move ${deleting.items.length} items to the Recycle Bin?`}
          </span>
          <button type="button" style={styles.deleteBtn} onClick={commitDelete}>Delete</button>
          <button type="button" style={styles.draftCancel} onClick={cancelDelete} aria-label="Cancel delete"><X size={11} /></button>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {/* beUI FileTree — spring-animated, keyboard-navigable */}
      <div
        style={styles.tree}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            setContextMenu({
              x: e.clientX, y: e.clientY,
              path: rootPath, name: basename(rootPath) || rootPath,
              isDir: true, parentPath: rootPath, isBackground: true,
            });
          }
        }}
      >
        {fileTreeChildren ? (
          <FileTree
            value={activeFilePath || null}
            onValueChange={(path) => {
              // Only open files, not directories (dirs toggle via expand)
              const node = tree[path];
              if (!node) onOpenFile?.(path);
            }}
            expandedIds={expandedIds}
            onExpandedChange={handleExpandedChange}
            ariaLabel="Project files"
            classNames={{
              item: 'rounded-md',
            }}
          >
            {fileTreeChildren}
          </FileTree>
        ) : (
          <div style={styles.loading}>Loading…</div>
        )}
      </div>

      {/* ---- Context menu (VS Code style) ---- */}
      {contextMenu && (
        <ContextMenu
          ref={contextMenuRef}
          x={contextMenu.x}
          y={contextMenu.y}
          isDir={contextMenu.isDir}
          isBackground={contextMenu.isBackground}
          menuPath={contextMenu.path}
          menuName={contextMenu.name}
          parentPath={contextMenu.parentPath}
          onClose={() => setContextMenu(null)}
          onNewFile={(dir) => { setContextMenu(null); startCreate(NEW_FILE, dir); }}
          onNewFolder={(dir) => { setContextMenu(null); startCreate(NEW_FOLDER, dir); }}
          onRename={() => {
            setContextMenu(null);
            startRename(contextMenu.path, contextMenu.name, contextMenu.isDir);
          }}
          onDelete={() => {
            setContextMenu(null);
            requestDelete(contextMenu.path, contextMenu.name, contextMenu.isDir, contextMenu.parentPath);
          }}
          onCopyPath={() => { setContextMenu(null); copyPath(contextMenu.path); }}
          onCopyRelativePath={() => { setContextMenu(null); copyRelativePath(contextMenu.path); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContextMenu — floating right-click menu
// ---------------------------------------------------------------------------

const ContextMenu = forwardRef(function ContextMenu({
  x, y, isDir, isBackground, menuPath, menuName, parentPath,
  onClose, onNewFile, onNewFolder, onRename, onDelete,
  onCopyPath, onCopyRelativePath,
}, ref) {
  const items = [];
  if (isDir) {
    items.push({ label: 'New File…', icon: <File size={12} />, action: () => onNewFile(menuPath) });
    items.push({ label: 'New Folder…', icon: <FolderPlus size={12} />, action: () => onNewFolder(menuPath) });
    items.push({ type: 'separator' });
  }
  if (!isBackground) {
    items.push({ label: 'Rename', icon: <Pencil size={12} />, action: onRename, shortcut: 'F2' });
    items.push({ label: 'Delete', icon: <Trash2 size={12} />, action: onDelete });
    items.push({ type: 'separator' });
  }
  items.push({ label: 'Copy Path', icon: <Copy size={12} />, action: onCopyPath });
  if (!isBackground) {
    items.push({ label: 'Copy Relative Path', icon: <Copy size={12} />, action: onCopyRelativePath });
  }

  const menuWidth = 220;
  const menuHeight = items.length * 28;
  const finalX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const finalY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return (
    <div ref={ref} style={{ ...styles.contextMenu, left: finalX, top: finalY }}>
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={`sep-${i}`} style={styles.contextSeparator} />;
        }
        return (
          <button
            key={item.label}
            type="button"
            style={styles.contextItem}
            onClick={(e) => { e.stopPropagation(); item.action(); }}
          >
            <span style={styles.contextIcon}>{item.icon}</span>
            <span style={styles.contextLabel}>{item.label}</span>
            {item.shortcut && <span style={styles.contextShortcut}>{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
});

// ---------------------------------------------------------------------------
// styles
// ---------------------------------------------------------------------------

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
    height: 'var(--panel-header-height)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-2) 0 var(--space-3)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
  },
  headerLabel: {
    minWidth: 0,
    minHeight: 'var(--control-compact)',
    padding: '0 var(--space-1)',
    border: 'none',
    borderRadius: 3,
    background: 'transparent',
    fontSize: 'var(--text-sm)',
    letterSpacing: 0.2,
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
    width: 'var(--control-compact)',
    height: 'var(--control-compact)',
    padding: 0,
    borderRadius: 'var(--radius-control)',
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
    color: 'var(--text-on-accent)',
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
    minHeight: 'var(--control-standard)',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius-group)',
    color: 'var(--text-on-accent)',
    fontSize: 'var(--text-sm)',
    padding: '0 var(--space-3)',
    fontWeight: 600,
  },
  tree: {
    flex: 1,
    overflow: 'auto',
    padding: '4px',
  },
  loading: {
    padding: 8,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  error: {
    padding: 8,
    fontSize: 11,
    color: 'var(--danger-text)',
    background: 'rgba(224, 108, 117, 0.08)',
    borderBottom: '1px solid var(--border)',
  },

  // ---- context menu ---------------------------------------------------
  contextMenu: {
    position: 'fixed',
    zIndex: 1000,
    minWidth: 200,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)',
    borderRadius: 6,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    padding: '4px 0',
    animation: 'seec0de-fade-in 0.1s ease-out',
  },
  contextSeparator: {
    height: 1,
    margin: '4px 0',
    background: 'var(--border)',
  },
  contextItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '5px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 12,
    textAlign: 'left',
    cursor: 'pointer',
  },
  contextIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  contextLabel: {
    flex: 1,
  },
  contextShortcut: {
    color: 'var(--text-muted)',
    fontSize: 11,
    marginLeft: 'auto',
  },
};
