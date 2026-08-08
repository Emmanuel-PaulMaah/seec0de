import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
//
// Selection & bulk actions: click selects a single row (and still opens it /
// toggles it, same as before). Ctrl/Cmd+click toggles a row in/out of a
// multi-selection; Shift+click selects a contiguous range in the currently
// *visible* (expanded) tree order. When one or more rows are selected, a
// floating toolbar appears with Rename (single selection only) and Delete
// (any size). Moving is drag-and-drop only: drag the selection onto a
// folder row (or the root header) to move everything there.

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
  const [deleting, setDeleting] = useState(null); // { items: [{ path, name, isDir, parentPath }] } | null
  const [renaming, setRenaming] = useState(null); // { path, name, parentPath } | null
  const [renameDraft, setRenameDraft] = useState('');
  const renameRef = useRef(null);
  const draftRef = useRef(null);

  // ---- multi-select ---------------------------------------------------
  // `selectedPaths` is the multi-selection (Ctrl/Cmd+click, Shift+click).
  // `lastSelectedPath` is the anchor a Shift+click range is measured from.
  const [selectedPaths, setSelectedPaths] = useState(() => new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState(null);

  // ---- drag & drop (move) ----------------------------------------------
  // `draggingPaths` is the set of paths being dragged (the row you grabbed,
  // or the whole selection if you grabbed a row that was already selected).
  // `dropTargetPath` is whichever folder row is currently being hovered
  // over with a valid drop, purely for the highlight style.
  const [draggingPaths, setDraggingPaths] = useState(null);
  const [dropTargetPath, setDropTargetPath] = useState(null);

  // Flatten the tree into the order it's actually rendered in (respecting
  // which folders are currently expanded), plus a path -> info lookup.
  // Both are needed for: Shift+click range selection (needs visual order)
  // and the selection toolbar / bulk delete (needs name + isDir + parent
  // for paths we only have as strings in `selectedPaths`).
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

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
  }, []);

  // Plain click: select just this row (replacing whatever was selected).
  const selectOnly = useCallback((path) => {
    setSelectedPaths(new Set([path]));
    setLastSelectedPath(path);
  }, []);

  // Ctrl/Cmd+click: toggle this row in/out of the selection.
  const toggleSelected = useCallback((path) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    setLastSelectedPath(path);
  }, []);

  // Shift+click: select the contiguous visible range between the anchor
  // (`lastSelectedPath`) and this row. Falls back to a plain single-select
  // if the anchor has scrolled out of the current (expanded) tree.
  const selectRange = useCallback((path) => {
    const anchor = lastSelectedPath;
    const anchorIndex = anchor ? visiblePaths.indexOf(anchor) : -1;
    const targetIndex = visiblePaths.indexOf(path);
    if (anchorIndex === -1 || targetIndex === -1) {
      selectOnly(path);
      return;
    }
    const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
    setSelectedPaths(new Set(visiblePaths.slice(start, end + 1)));
    // Intentionally don't move the anchor — shift-clicking again extends
    // or shrinks the range from the same starting point, like Finder/VS Code.
  }, [lastSelectedPath, visiblePaths, selectOnly]);

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
      clearSelection();
      return;
    }
    setSelectedDir(rootPath);
    setDeleting(null);
    clearSelection();
    setTree({ [rootPath]: { entries: null, open: true } });
    loadDir(rootPath);
  }, [rootPath, refreshKey, loadDir, clearSelection]);

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

  // F2 renames the current single selection (standard desktop-app
  // convention); Escape clears the selection. Both are skipped while a
  // draft/rename/delete UI is already open — those own Escape themselves
  // via their own inputs' onKeyDown.
  useEffect(() => {
    const onKey = (e) => {
      if (creating || renaming || deleting) return;
      if (e.key === 'F2' && selectedPaths.size === 1) {
        e.preventDefault();
        startRenameSelection();
      } else if (e.key === 'Escape' && selectedPaths.size > 0) {
        e.preventDefault();
        clearSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [creating, renaming, deleting, selectedPaths, startRenameSelection, clearSelection]);

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

  // Toolbar entry point: rename whatever's currently selected. Only ever
  // called while exactly one item is selected (the toolbar hides the
  // Rename button otherwise), but guard anyway for safety.
  const startRenameSelection = useCallback(() => {
    if (selectedPaths.size !== 1) return;
    const [path] = selectedPaths;
    const info = pathInfo.get(path);
    if (!info) return;
    startRename(path, info.name, info.isDir);
  }, [selectedPaths, pathInfo, startRename]);

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

  // Builds the confirm-delete payload from one or more paths. Looks each
  // path up in `pathInfo` (the flattened tree) for its name/isDir/parent;
  // falls back to string-parsing for a lone path passed in directly (kept
  // for safety, though every caller now goes through the selection).
  const requestDelete = useCallback((paths) => {
    setError(null);
    const items = paths.map((path) => {
      const info = pathInfo.get(path);
      return info
        ? { path, name: info.name, isDir: info.isDir, parentPath: info.parentPath }
        : { path, name: basename(path), isDir: false, parentPath: dirname(path) || rootPath };
    });
    if (items.length === 0) return;
    setDeleting({ items });
  }, [pathInfo, rootPath]);

  // Toolbar entry point: delete whatever's currently selected.
  const requestDeleteSelection = useCallback(() => {
    requestDelete(Array.from(selectedPaths));
  }, [requestDelete, selectedPaths]);

  const cancelDelete = useCallback(() => setDeleting(null), []);

  const commitDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      const parentsToReload = new Set();
      for (const item of deleting.items) {
        // eslint-disable-next-line no-await-in-loop -- deletes must not race each other on the same fs
        await window.seecode.fs.delete(item.path);
        if (!item.isDir) onDeleteFile?.(item.path);
        parentsToReload.add(item.parentPath);
      }
      await Promise.all(Array.from(parentsToReload).map((dir) => loadDir(dir)));
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        deleting.items.forEach((item) => next.delete(item.path));
        return next;
      });
      setDeleting(null);
    } catch (err) {
      setError(err.message || 'Failed to delete.');
    }
  }, [deleting, loadDir, onDeleteFile]);

  // ---- drag & drop (move) ----------------------------------------------

  // A drop is valid as long as none of the dragged paths are the target
  // itself, an ancestor of the target (that would move a folder inside
  // itself), or already the target's parent (a no-op drop).
  const isValidDropTarget = useCallback((dirPath) => {
    if (!draggingPaths || draggingPaths.length === 0) return false;
    return draggingPaths.every((path) => {
      if (path === dirPath) return false;
      if (dirPath === path || dirPath.startsWith(`${path}/`) || dirPath.startsWith(`${path}\\`)) return false;
      const parent = pathInfo.get(path)?.parentPath ?? (dirname(path) || rootPath);
      if (parent === dirPath) return false;
      return true;
    });
  }, [draggingPaths, pathInfo, rootPath]);

  const handleDragStart = useCallback((event, path) => {
    // Dragging a row that's already part of the selection moves the whole
    // selection; dragging an unselected row moves (and selects) just it.
    const paths = selectedPaths.has(path) && selectedPaths.size > 1
      ? Array.from(selectedPaths)
      : [path];
    if (paths.length === 1) selectOnly(path);
    setDraggingPaths(paths);
    event.dataTransfer.effectAllowed = 'move';
    // Only used for the OS-level drag affordance — the actual move reads
    // from `draggingPaths` state, since drag and drop here never leaves
    // this component.
    event.dataTransfer.setData('text/plain', paths.join('\n'));
  }, [selectedPaths, selectOnly]);

  const handleDragEnd = useCallback(() => {
    setDraggingPaths(null);
    setDropTargetPath(null);
  }, []);

  const handleDragOver = useCallback((event, dirPath) => {
    // Always preventDefault so the drop event actually fires; whether the
    // drop is *allowed* is reflected in dropEffect + the highlight state.
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
      const renamedPairs = []; // [oldPath, newPath] — for activeFilePath / selection follow-up
      for (const path of paths) {
        const info = pathInfo.get(path);
        const sourceParent = info?.parentPath ?? (dirname(path) || rootPath);
        const nextPath = joinPath(dirPath, info?.name ?? basename(path));
        // eslint-disable-next-line no-await-in-loop -- moves must not race each other on the same fs
        await window.seecode.fs.rename(path, nextPath);
        parentsToReload.add(sourceParent);
        renamedPairs.push([path, nextPath]);
      }

      await Promise.all(Array.from(parentsToReload).map((dir) => loadDir(dir)));

      // Make sure the folder we just dropped into is expanded so the
      // moved item is immediately visible.
      setTree((prev) => ({ ...prev, [dirPath]: { ...prev[dirPath], open: true } }));

      // If a moved file was open in the editor, "re-open" it at its new
      // path — same pattern commitRename uses.
      const movedActive = renamedPairs.find(([oldPath]) => oldPath === activeFilePath);
      if (movedActive) onOpenFile?.(movedActive[1]);

      // Keep selection pointed at the moved items under their new paths.
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        renamedPairs.forEach(([oldPath, nextPath]) => {
          if (next.has(oldPath)) { next.delete(oldPath); next.add(nextPath); }
        });
        return next;
      });
    } catch (err) {
      setError(err.message || 'Failed to move.');
    }
  }, [draggingPaths, isValidDropTarget, pathInfo, rootPath, loadDir, activeFilePath, onOpenFile]);

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
        <button
          type="button"
          className="ui-toolbar-button"
          style={{
            ...styles.headerLabel,
            ...(selectedDir === rootPath ? styles.headerLabelSelected : {}),
            ...(dropTargetPath === rootPath ? styles.headerLabelDropTarget : {}),
          }}
          title="Select project root as the creation target — also a drop target to move items back to the top level"
          onClick={() => setSelectedDir(rootPath)}
          onDragOver={(e) => handleDragOver(e, rootPath)}
          onDragLeave={() => handleDragLeave(rootPath)}
          onDrop={(e) => handleDrop(e, rootPath)}
        >
          {basename(rootPath) || rootPath}
        </button>
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
              ? `Move “${deleting.items[0].name}” to the Recycle Bin?`
              : `Move ${deleting.items.length} items to the Recycle Bin?`}
          </span>
          <button type="button" style={styles.deleteBtn} onClick={commitDelete}>Delete</button>
          <button type="button" style={styles.draftCancel} onClick={cancelDelete} aria-label="Cancel delete"><X size={11} /></button>
        </div>
      )}

      {/* Selection toolbar — hidden while the delete-confirm bar is up so
          the two don't stack. Rename only makes sense for a single item;
          Delete and drag-to-move both work on the whole selection. */}
      {!deleting && selectedPaths.size > 0 && (
        <div style={styles.selectionToolbar}>
          <span style={styles.selectionCount}>
            {selectedPaths.size === 1 ? (pathInfo.get([...selectedPaths][0])?.name ?? '1 selected') : `${selectedPaths.size} selected`}
          </span>
          <div style={styles.selectionActions}>
            {selectedPaths.size === 1 && (
              <button type="button" className="ui-icon-button" style={styles.iconBtn} onClick={startRenameSelection} title="Rename (F2)">
                <Pencil size={12} />
              </button>
            )}
            <button type="button" className="ui-icon-button" style={styles.iconBtn} onClick={requestDeleteSelection} title="Delete selected">
              <Trash2 size={12} />
            </button>
            <button type="button" className="ui-icon-button" style={styles.iconBtn} onClick={clearSelection} title="Clear selection (Esc)">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
      <div
        style={styles.tree}
        // Clicking empty space below/between rows clears the selection —
        // only when the click actually lands on this wrapper, not a row.
        onClick={(e) => { if (e.target === e.currentTarget) clearSelection(); }}
      >
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
          activeFilePath={activeFilePath}
          isRoot
          renaming={renaming}
          renameDraft={renameDraft}
          renameRef={renameRef}
          onRenameDraftChange={setRenameDraft}
          onRenameKey={onRenameKey}
          onRenameBlur={commitRename}
          selectedPaths={selectedPaths}
          onSelectOnly={selectOnly}
          onToggleSelected={toggleSelected}
          onSelectRange={selectRange}
          draggingPaths={draggingPaths}
          dropTargetPath={dropTargetPath}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      </div>
    </div>
  );
}

function TreeNode({
  path, name, isDir, depth, tree, onToggleDir, onOpenFile, activeFilePath, selectedDir, onSelectDir, isRoot,
  renaming, renameDraft, renameRef, onRenameDraftChange, onRenameKey, onRenameBlur,
  selectedPaths, onSelectOnly, onToggleSelected, onSelectRange,
  draggingPaths, dropTargetPath, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}) {
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
            renaming={renaming}
            renameDraft={renameDraft}
            renameRef={renameRef}
            onRenameDraftChange={onRenameDraftChange}
            onRenameKey={onRenameKey}
            onRenameBlur={onRenameBlur}
            selectedPaths={selectedPaths}
            onSelectOnly={onSelectOnly}
            onToggleSelected={onToggleSelected}
            onSelectRange={onSelectRange}
            draggingPaths={draggingPaths}
            dropTargetPath={dropTargetPath}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
        ))}
      </>
    );
  }

  const isActive = !isDir && path === activeFilePath;
  const isSelectedDir = isDir && path === selectedDir;
  const isRenaming = renaming?.path === path;
  const isMultiSelected = selectedPaths.has(path);
  const isDragging = !!draggingPaths?.includes(path);
  const isDropTarget = isDir && dropTargetPath === path;

  return (
    <div>
      <button
        className="ui-tree-row"
        style={{
          ...styles.row,
          ...(isActive ? styles.rowActive : {}),
          ...(isSelectedDir ? styles.rowSelected : {}),
          ...(isMultiSelected ? styles.rowMultiSelected : {}),
          ...(isDragging ? styles.rowDragging : {}),
          ...(isDropTarget ? styles.rowDropTarget : {}),
          paddingLeft: 8 + depth * 12,
        }}
        // Rows are draggable (for move) except while being renamed, where
        // a drag would just fight with text selection in the input.
        draggable={!isRenaming}
        onDragStart={(e) => onDragStart(e, path)}
        onDragEnd={onDragEnd}
        onDragOver={isDir ? (e) => onDragOver(e, path) : undefined}
        onDragLeave={isDir ? () => onDragLeave(path) : undefined}
        onDrop={isDir ? (e) => onDrop(e, path) : undefined}
        onClick={(e) => {
          // Shift/Ctrl(Cmd) clicks only change the selection — they don't
          // open files or toggle folders, matching Finder/VS Code.
          if (e.shiftKey) {
            onSelectRange(path);
            return;
          }
          if (e.ctrlKey || e.metaKey) {
            onToggleSelected(path);
            return;
          }
          onSelectOnly(path);
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
          selectedPaths={selectedPaths}
          onSelectOnly={onSelectOnly}
          onToggleSelected={onToggleSelected}
          onSelectRange={onSelectRange}
          draggingPaths={draggingPaths}
          dropTargetPath={dropTargetPath}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
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
  headerLabelSelected: {
    background: 'var(--accent-soft)',
    color: 'var(--text-primary)',
  },
  headerLabelDropTarget: {
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
    width: 24,
    height: 24,
    borderRadius: 'var(--radius-control)',
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
  selectionToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 8px',
    background: 'var(--accent-soft)',
    borderBottom: '1px solid var(--border)',
  },
  selectionCount: {
    flex: 1,
    minWidth: 0,
    color: 'var(--text-primary)',
    fontSize: 11,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  selectionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
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
    minHeight: 'var(--control-compact)',
    fontSize: 'var(--text-sm)',
    padding: '0 var(--space-2)',
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
  // Multi-selection (Ctrl/Cmd+click, Shift+click) — a distinct, slightly
  // stronger highlight so it reads separately from the "active file" /
  // "selected creation target" states above, which can overlap it.
  rowMultiSelected: {
    background: 'var(--accent-soft)',
    outline: '1px solid var(--border-focus)',
    outlineOffset: -1,
  },
  rowDragging: {
    opacity: 0.5,
  },
  rowDropTarget: {
    background: 'var(--accent-soft)',
    outline: '1px dashed var(--border-focus)',
    outlineOffset: -1,
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
