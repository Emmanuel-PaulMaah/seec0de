import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import { Folder, FolderOpen, File, Plus, RefreshCw, FolderPlus, X, Check, Pencil, Trash2, Copy, Scissors, Clipboard, FileCode, FileText } from 'lucide-react';
import { basename, dirname, joinPath } from '../engine/fileLanguage';
import { FileTree, FileTreeFolder, FileTreeFile } from './motion/file-tree';
import { MorphingSearch } from './motion/morphing-search';

// Migrated to beUI FileTree — declarative tree with spring animations,
// keyboard navigation, and a shared-layout hover pill. Context menu,
// create/rename/delete overlays remain as before.

const NEW_FILE   = 'file';
const NEW_FOLDER = 'folder';

// Map file extensions to lucide icons
function iconForFile(name) {
  return <File size={14} style={{ color: 'var(--text-muted)' }} />;
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

  const searchItems = useMemo(() => {
    const items = [];
    const iconMap = {
      js: FileCode, jsx: FileCode, ts: FileCode, tsx: FileCode,
      py: FileCode, rb: FileCode, go: FileCode, rs: FileCode,
      css: FileText, html: FileText, json: FileText,
      md: FileText, txt: FileText,
    };
    for (const [dirPath, node] of Object.entries(tree)) {
      if (!node?.entries) continue;
      for (const entry of node.entries) {
        if (entry.isDir) continue;
        const ext = (entry.name.split('.').pop() || '').toLowerCase();
        items.push({
          id: entry.path,
          title: entry.name,
          description: dirPath === rootPath ? '' : basename(dirPath),
          keywords: [ext, basename(dirPath)],
          icon: iconMap[ext] || File,
          onSelect: () => onOpenFile?.(entry.path),
        });
      }
    }
    return items;
  }, [tree, rootPath, onOpenFile]);

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
      setError(`Couldn't open this folder — ${err.message || 'it may have been moved or deleted.'}`);
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
      setError("File names can't have / or \\ — pick a folder first, then create inside it.");
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
      setError(err.message || 'Could not create this file.');
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
      setError("File names can't have / or \\ characters.");
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
      setError(err.message || 'Could not rename this file.');
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
      setError(err.message || 'Could not delete this file.');
    }
  }, [deleting, loadDir, onDeleteFile]);

  // ---- copy path ------------------------------------------------------
  const [copyNotice, setCopyNotice] = useState('');
  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  const announceCopy = useCallback((message) => {
    setCopyNotice(message);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyNotice(''), 1500);
  }, []);

  const copyPath = useCallback(async (path) => {
    try {
      await navigator.clipboard.writeText(path);
      announceCopy('Path copied to clipboard.');
    } catch { /* clipboard blocked */ }
  }, [announceCopy]);

  const copyRelativePath = useCallback(async (path) => {
    if (!rootPath) return;
    const rel = path.startsWith(rootPath) ? path.slice(rootPath.length + 1) : path;
    try {
      await navigator.clipboard.writeText(rel);
      announceCopy('Relative path copied to clipboard.');
    } catch { /* clipboard blocked */ }
  }, [rootPath, announceCopy]);

  // ---- context menu handler -------------------------------------------
  const openContextMenu = useCallback((e, path, name, isDir) => {
    e.preventDefault();
    e.stopPropagation();
    const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    const parentPath = slash >= 0 ? path.slice(0, slash) : rootPath;
    // Keyboard-opened context menus (Shift+F10 / ContextMenu key) report
    // 0,0 — anchor to the row under the event instead of the top-left corner.
    const rect = e.currentTarget?.getBoundingClientRect?.();
    const x = e.clientX || (rect ? rect.left + 16 : 0);
    const y = e.clientY || (rect ? rect.top + rect.height / 2 : 0);
    setContextMenu({ x, y, path, name, isDir, parentPath });
  }, [rootPath]);

  // Set of all known directory paths from loaded entries. Used by the
  // FileTree onValueChange handler to distinguish folders from files —
  // without this, clicking a folder that is *rendered* (because its
  // parent was loaded) but whose own entries haven't been loaded yet
  // would fall through to onOpenFile, which tries to readDir as a file
  // and shows an error in CodePanel.
  const knownDirs = useMemo(() => {
    const dirs = new Set();
    for (const node of Object.values(tree)) {
      if (node?.entries) {
        for (const entry of node.entries) {
          if (entry.isDir) dirs.add(entry.path);
        }
      }
    }
    return dirs;
  }, [tree]);

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
  }, [rootPath, tree, activeFilePath]);

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

  // F2 renames the active file while focus is inside the explorer.
  const onPanelKeyDown = (e) => {
    if (e.key !== 'F2' || creating || renaming || !activeFilePath?.startsWith(rootPath)) return;
    e.preventDefault();
    startRename(activeFilePath, basename(activeFilePath), false);
  };

  return (
    <div style={styles.panel} onKeyDown={onPanelKeyDown}>
      <div style={styles.header}>
        <span style={styles.headerLabel}>
          {basename(rootPath) || rootPath}
        </span>
        <div style={styles.headerActions}>
          {searchItems.length > 0 && (
            <MorphingSearch
              items={searchItems}
              placeholder="Search files…"
              shortcut="f"
              iconOnly
              emptyMessage="No matching files."
            />
          )}
          <button className="ui-icon-button" style={styles.iconBtn} onClick={() => startCreate(NEW_FILE)} title={`New file in ${basename(selectedDir) || 'project root'}`} aria-label={`New file in ${basename(selectedDir) || 'project root'}`}>
            <Plus size={12} />
          </button>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={() => startCreate(NEW_FOLDER)} title={`New folder in ${basename(selectedDir) || 'project root'}`} aria-label={`New folder in ${basename(selectedDir) || 'project root'}`}>
            <FolderPlus size={12} />
          </button>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={handleRefresh} title="Refresh" aria-label="Refresh file tree">
            <RefreshCw size={12} />
          </button>
          <button className="ui-icon-button" style={styles.iconBtn} onClick={onCloseFolder} title="Close folder" aria-label="Close folder">
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
          <button style={styles.draftConfirm} onMouseDown={(e) => e.preventDefault()} onClick={commitCreate} title="Create (Enter)" aria-label="Create">
            <Check size={11} />
          </button>
          <button style={styles.draftCancel} onMouseDown={(e) => e.preventDefault()} onClick={cancelCreate} title="Cancel (Esc)" aria-label="Cancel">
            <X size={11} />
          </button>
          </div>
        </div>
      )}

      {renaming && (
        <div>
          <div style={styles.draftTarget}>Renaming {renaming.name}</div>
          <div style={styles.draftRow}>
          {renaming.isDir
            ? <Folder size={13} style={styles.draftIcon} />
            : <File size={13} style={styles.draftIcon} />}
          <input
            ref={renameRef}
            type="text"
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={onRenameKey}
            onBlur={commitRename}
            style={styles.draftInput}
            aria-label={`New name for ${renaming.name}`}
          />
          <button style={styles.draftConfirm} onMouseDown={(e) => e.preventDefault()} onClick={commitRename} title="Rename (Enter)" aria-label="Confirm rename">
            <Check size={11} />
          </button>
          <button style={styles.draftCancel} onMouseDown={(e) => e.preventDefault()} onClick={cancelRename} title="Cancel (Esc)" aria-label="Cancel rename">
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

      {/* Clipboard feedback: no visual toast exists for copy path, so announce
          it to screen readers via a persistent (visually hidden) live region. */}
      <div role="status" aria-live="polite" style={styles.srOnly}>{copyNotice}</div>

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
              // Only open files, not directories (dirs toggle via expand).
              // knownDirs covers every directory we've seen in *any* loaded
              // parent's entries — including folders that are rendered but
              // haven't had loadDir called for them yet.
              if (knownDirs.has(path)) return;
              onOpenFile?.(path);
            }}
            expandedIds={expandedIds}
            onExpandedChange={handleExpandedChange}
            onRowContextMenu={(e, item) => openContextMenu(e, item.value, item.name, item.isDir)}
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
  const innerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const setRefs = (node) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  // Keyboard contract: the menu opens with focus on its first item, Arrow
  // keys / Home / End rove between items, Esc closes, and focus returns to
  // whatever opened the menu (the tree row, when keyboard-invoked).
  useEffect(() => {
    const container = innerRef.current;
    if (!container) return undefined;
    const previouslyFocused = document.activeElement;
    const buttons = () => Array.from(container.querySelectorAll('button'));
    buttons()[0]?.focus();
    const onKey = (e) => {
      const list = buttons();
      if (list.length === 0) return;
      const idx = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(idx + 1) % list.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(idx <= 0 ? list.length - 1 : idx - 1)]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1]?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
      } else if (e.key === 'Tab') {
        // Standard menu behaviour: Tab dismisses and moves on.
        onCloseRef.current?.();
      }
    };
    container.addEventListener('keydown', onKey);
    return () => {
      container.removeEventListener('keydown', onKey);
      const active = document.activeElement;
      const stranded = !active || active === document.body || container.contains(active);
      if (previouslyFocused instanceof HTMLElement
        && document.contains(previouslyFocused)
        && stranded) {
        previouslyFocused.focus();
      }
    };
  }, []);

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
    <div ref={setRefs} role="menu" style={{ ...styles.contextMenu, left: finalX, top: finalY }}>
      {items.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={`sep-${i}`} role="separator" style={styles.contextSeparator} />;
        }
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
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
  searchRow: {
    padding: '4px 8px 2px',
    borderBottom: '1px solid var(--border)',
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
  },  error: {
    padding: 8,
    fontSize: 11,
    color: 'var(--danger-text)',
    background: 'rgba(224, 108, 117, 0.08)',
    borderBottom: '1px solid var(--border)',
  },
  srOnly: {
    // Visually hidden but kept in the a11y tree as a live region.
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    border: 0,
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
