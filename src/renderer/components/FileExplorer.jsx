import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Plus, RefreshCw, FolderPlus, X, Check, Pencil, Trash2, Copy, Scissors, Clipboard } from 'lucide-react';
import { basename, dirname, joinPath } from '../engine/fileLanguage';

// A small recursive file tree. Keeps state per-folder (open/closed + entries)
// in a flat map keyed by absolute path, so we don't re-fetch on every render.
//
// VS Code-style: right-click any file/folder for a context menu with
// Rename, Copy Path, Delete, New File, New Folder, etc.

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
  const [contextMenu, setContextMenu] = useState(null); // { x, y, path, name, isDir, parentPath }
  const contextMenuRef = useRef(null);
  const [hoveredPath, setHoveredPath] = useState(null);

  const clearSelection = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    // Delay so the opening click doesn't immediately close it
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

  // F2 renames the context-menu target (or clears menu on Escape)
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
    try {
      await navigator.clipboard.writeText(path);
    } catch { /* clipboard blocked */ }
  }, []);

  const copyRelativePath = useCallback(async (path) => {
    if (!rootPath) return;
    const rel = path.startsWith(rootPath) ? path.slice(rootPath.length + 1) : path;
    try {
      await navigator.clipboard.writeText(rel);
    } catch { /* clipboard blocked */ }
  }, [rootPath]);

  // ---- context menu handler -------------------------------------------
  const openContextMenu = useCallback((e, path, name, isDir) => {
    e.preventDefault();
    e.stopPropagation();
    const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    const parentPath = slash >= 0 ? path.slice(0, slash) : rootPath;
    setContextMenu({ x: e.clientX, y: e.clientY, path, name, isDir, parentPath });
  }, [rootPath]);

  // ---- drag & drop (move) ---------------------------------------------

  const [draggingPaths, setDraggingPaths] = useState(null);
  const [dropTargetPath, setDropTargetPath] = useState(null);

  const { visiblePaths, pathInfo } = useMemo(() => {
    const paths = [];
    const info = new Map();
    const walk = (dirPath) => {
      const entries = tree[dirPath]?.entries;
      if (!entries) return;
      for (const entry of entries) {
        paths.push(entry.path);
        info.set(entry.path, { name: entry.name, isDir: entry.isDir, parentPath: dirPath });
        if (entry.isDir && tree[entry.path]?.open) walk(entry.path);
      }
    };
    if (rootPath) walk(rootPath);
    return { visiblePaths: paths, pathInfo: info };
  }, [tree, rootPath]);

  const isValidDropTarget = useCallback((dirPath) => {
    if (!draggingPaths || draggingPaths.length === 0) return false;
    return draggingPaths.every((path) => {
      if (path === dirPath) return false;
      if (dirPath.startsWith(`${path}/`) || dirPath.startsWith(`${path}\\`)) return false;
      const parent = pathInfo.get(path)?.parentPath ?? (dirname(path) || rootPath);
      if (parent === dirPath) return false;
      return true;
    });
  }, [draggingPaths, pathInfo, rootPath]);

  const handleDragStart = useCallback((event, path) => {
    setDraggingPaths([path]);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', path);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingPaths(null);
    setDropTargetPath(null);
  }, []);

  const handleDragOver = useCallback((event, dirPath) => {
    event.preventDefault();
    const valid = isValidDropTarget(dirPath);
    event.dataTransfer.dropEffect = valid ? 'move' : 'none';
    setDropTargetPath(valid ? dirPath : null);
  }, [isValidDropTarget]);

  const handleDragLeave = useCallback((dirPath) => {
    setDropTargetPath((prev) => (prev === dirPath ? null : prev));
  }, []);

  const handleDrop = useCallback(async (event, dirPath) => {
    event.preventDefault();
    const paths = draggingPaths;
    setDraggingPaths(null);
    setDropTargetPath(null);
    if (!paths || !isValidDropTarget(dirPath)) return;
    try {
      const parentsToReload = new Set([dirPath]);
      const renamedPairs = [];
      for (const path of paths) {
        const info = pathInfo.get(path);
        const sourceParent = info?.parentPath ?? (dirname(path) || rootPath);
        const nextPath = joinPath(dirPath, info?.name ?? basename(path));
        await window.seecode.fs.rename(path, nextPath);
        parentsToReload.add(sourceParent);
        renamedPairs.push([path, nextPath]);
      }
      await Promise.all(Array.from(parentsToReload).map((dir) => loadDir(dir)));
      setTree((prev) => ({ ...prev, [dirPath]: { ...prev[dirPath], open: true } }));
      const movedActive = renamedPairs.find(([oldPath]) => oldPath === activeFilePath);
      if (movedActive) onOpenFile?.(movedActive[1]);
    } catch (err) {
      setError(err.message || 'Failed to move.');
    }
  }, [draggingPaths, isValidDropTarget, pathInfo, rootPath, loadDir, activeFilePath, onOpenFile]);

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
      <div
        style={{
          ...styles.header,
          ...(dropTargetPath === rootPath ? styles.headerDropTarget : {}),
        }}
        onDragOver={(e) => handleDragOver(e, rootPath)}
        onDragLeave={() => handleDragLeave(rootPath)}
        onDrop={(e) => handleDrop(e, rootPath)}
      >
        <span style={{
          ...styles.headerLabel,
          ...(draggingPaths ? { pointerEvents: 'none' } : {}),
        }}>
          {basename(rootPath) || rootPath}
        </span>
        <div style={{
          ...styles.headerActions,
          ...(draggingPaths ? { pointerEvents: 'none' } : {}),
        }}>
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

      <div
        style={{
          ...styles.tree,
          ...(dropTargetPath === rootPath && !tree[rootPath]?.open ? styles.treeDropTarget : {}),
        }}
        onContextMenu={(e) => {
          // Right-click on empty space: context menu for creating new items
          if (e.target === e.currentTarget) {
            e.preventDefault();
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              path: rootPath,
              name: basename(rootPath) || rootPath,
              isDir: true,
              parentPath: rootPath,
              isBackground: true,
            });
          }
        }}
        onDragOver={(e) => {
          // Empty space below folders → drop to project root
          if (e.target === e.currentTarget) {
            handleDragOver(e, rootPath);
          }
        }}
        onDragLeave={(e) => {
          if (e.target === e.currentTarget) {
            handleDragLeave(rootPath);
          }
        }}
        onDrop={(e) => {
          if (e.target === e.currentTarget) {
            handleDrop(e, rootPath);
          }
        }}
      >
        <TreeNode
          path={rootPath}
          name={basename(rootPath) || rootPath}
          isDir
          depth={0}
          tree={tree}
          onToggleDir={toggleDir}
          onOpenFile={onOpenFile}
          activeFilePath={activeFilePath}
          selectedDir={selectedDir}
          onSelectDir={setSelectedDir}
          isRoot
          renaming={renaming}
          renameDraft={renameDraft}
          renameRef={renameRef}
          onRenameDraftChange={setRenameDraft}
          onRenameKey={onRenameKey}
          onRenameBlur={commitRename}
          draggingPaths={draggingPaths}
          dropTargetPath={dropTargetPath}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onContextMenu={openContextMenu}
          hoveredPath={hoveredPath}
          onHoverPath={setHoveredPath}
        />
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
// ContextMenu — floating right-click menu, positioned at the cursor.
// Styled after VS Code's file explorer context menu.
// ---------------------------------------------------------------------------

import { forwardRef } from 'react';

const ContextMenu = forwardRef(function ContextMenu({
  x, y, isDir, isBackground, menuPath, menuName, parentPath,
  onClose, onNewFile, onNewFolder, onRename, onDelete,
  onCopyPath, onCopyRelativePath,
}, ref) {
  // Build menu items based on what was right-clicked
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

  // Position: flip if menu would go off-screen
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
// TreeNode — recursive tree row renderer
// ---------------------------------------------------------------------------

function TreeNode({
  path, name, isDir, depth, tree, onToggleDir, onOpenFile, activeFilePath, selectedDir, onSelectDir, isRoot,
  renaming, renameDraft, renameRef, onRenameDraftChange, onRenameKey, onRenameBlur,
  draggingPaths, dropTargetPath, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onContextMenu, hoveredPath, onHoverPath,
}) {
  const node = isDir ? tree[path] : null;
  const open = !!node?.open;
  const entries = node?.entries;

  if (isRoot) {
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
            renaming={renaming}
            renameDraft={renameDraft}
            renameRef={renameRef}
            onRenameDraftChange={onRenameDraftChange}
            onRenameKey={onRenameKey}
            onRenameBlur={onRenameBlur}
            draggingPaths={draggingPaths}
            dropTargetPath={dropTargetPath}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onContextMenu={onContextMenu}
            hoveredPath={hoveredPath}
            onHoverPath={onHoverPath}
          />
        ))}
      </>
    );
  }

  const isActive = !isDir && path === activeFilePath;
  const isSelectedDir = isDir && path === selectedDir;
  const isRenaming = renaming?.path === path;
  const isDragging = !!draggingPaths?.includes(path);
  const isDropTarget = isDir && dropTargetPath === path;
  const isHovered = hoveredPath === path;

  return (
    <div>
      <button
        className="ui-tree-row"
        style={{
          ...styles.row,
          ...(isActive ? styles.rowActive : {}),
          ...(isSelectedDir ? styles.rowSelected : {}),
          ...(isDragging ? styles.rowDragging : {}),
          ...(isDropTarget ? styles.rowDropTarget : {}),
          ...(isHovered && !isActive && !isSelectedDir ? styles.rowHover : {}),
          paddingLeft: 8 + depth * 12,
        }}
        draggable={!isRenaming}
        onDragStart={(e) => onDragStart(e, path)}
        onDragEnd={onDragEnd}
        onDragOver={isDir ? (e) => onDragOver(e, path) : undefined}
        onDragLeave={isDir ? () => onDragLeave(path) : undefined}
        onDrop={isDir ? (e) => onDrop(e, path) : undefined}
        onContextMenu={(e) => onContextMenu(e, path, name, isDir)}
        onMouseEnter={() => onHoverPath?.(path)}
        onMouseLeave={() => onHoverPath?.((prev) => prev === path ? null : prev)}
        onClick={(e) => {
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
          renaming={renaming}
          renameDraft={renameDraft}
          renameRef={renameRef}
          onRenameDraftChange={onRenameDraftChange}
          onRenameKey={onRenameKey}
          onRenameBlur={onRenameBlur}
          draggingPaths={draggingPaths}
          dropTargetPath={dropTargetPath}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onContextMenu={onContextMenu}
          hoveredPath={hoveredPath}
          onHoverPath={onHoverPath}
        />
      ))}
    </div>
  );
}

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
  headerDropTarget: {
    background: 'var(--accent-soft)',
    outline: '1px dashed var(--border-focus)',
    outlineOffset: -1,
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
    padding: '4px 0',
  },
  treeDropTarget: {
    background: 'var(--accent-soft)',
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
  row: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    minHeight: 'var(--control-compact)',
    fontSize: 'var(--text-sm)',
    padding: '0 var(--space-2)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rowActive: {
    background: 'var(--active-row-bg)',
    color: 'var(--text-on-accent)',
  },
  rowSelected: {
    background: 'var(--accent-soft)',
  },
  rowDragging: {
    opacity: 0.5,
  },
  rowDropTarget: {
    background: 'var(--accent-soft)',
    outline: '1px dashed var(--border-focus)',
    outlineOffset: -1,
  },
  rowHover: {
    background: 'var(--bg-tertiary)',
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
