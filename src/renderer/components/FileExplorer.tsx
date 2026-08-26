import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Plus, RefreshCw, FolderPlus, X, Check, Pencil, Trash2, Copy } from 'lucide-react';
import { basename, dirname, joinPath } from '../engine/fileLanguage';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const NEW_FILE = 'file';
const NEW_FOLDER = 'folder';

interface FileExplorerProps {
  rootPath?: string | null;
  onPickFolder?: () => void;
  onCloseFolder?: () => void;
  onOpenFile?: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  activeFilePath?: string | null;
  refreshKey?: number;
}

interface TreeNodeData { entries: any[] | null; open: boolean; }
interface ContextMenuData { x: number; y: number; path: string; name: string; isDir: boolean; parentPath: string; isBackground?: boolean; }
interface RenamingData { path: string; name: string; parentPath: string; isDir: boolean; }
interface DeletingData { items: { path: string; name: string; isDir: boolean; parentPath: string }[]; }

export default function FileExplorer({ rootPath, onPickFolder, onCloseFolder, onOpenFile, onDeleteFile, activeFilePath, refreshKey }: FileExplorerProps) {
  const [tree, setTree] = useState<Record<string, TreeNodeData>>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [selectedDir, setSelectedDir] = useState<string | null>(rootPath || null);
  const [deleting, setDeleting] = useState<DeletingData | null>(null);
  const [renaming, setRenaming] = useState<RenamingData | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [draggingPaths, setDraggingPaths] = useState<string[] | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);

  const clearSelection = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => { if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null); };
    const timer = setTimeout(() => window.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(timer); window.removeEventListener('mousedown', handler); };
  }, [contextMenu]);

  const loadDir = useCallback(async (dirPath: string) => {
    try {
      const entries = await (window as any).seecode.fs.readDir(dirPath);
      setTree((prev) => ({ ...prev, [dirPath]: { entries, open: prev[dirPath]?.open ?? true } }));
    } catch (err: any) { setError(`Couldn't read ${dirPath}: ${err.message}`); }
  }, []);

  useEffect(() => {
    if (!rootPath) { setTree({}); setSelectedDir(null); clearSelection(); return; }
    setSelectedDir(rootPath); setDeleting(null); clearSelection(); setTree({ [rootPath]: { entries: null, open: true } }); loadDir(rootPath);
  }, [rootPath, refreshKey, loadDir, clearSelection]);

  useEffect(() => { if (creating && draftRef.current) draftRef.current.focus(); }, [creating]);
  useEffect(() => { if (renaming && renameRef.current) { renameRef.current.focus(); renameRef.current.select(); } }, [renaming]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (creating || renaming || deleting) return; if (e.key === 'Escape' && contextMenu) { e.preventDefault(); setContextMenu(null); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [creating, renaming, deleting, contextMenu]);

  const toggleDir = useCallback(async (dirPath: string) => {
    const node = tree[dirPath];
    if (!node || !node.entries) { await loadDir(dirPath); setTree((prev) => ({ ...prev, [dirPath]: { ...prev[dirPath], open: true } })); return; }
    setTree((prev) => ({ ...prev, [dirPath]: { ...prev[dirPath], open: !prev[dirPath].open } }));
  }, [tree, loadDir]);

  const startCreate = useCallback((kind: string, targetDir?: string) => { setError(null); setDraftName(''); setCreating(kind); if (targetDir) setSelectedDir(targetDir); }, []);
  const cancelCreate = useCallback(() => { setCreating(null); setDraftName(''); }, []);

  const commitCreate = useCallback(async () => {
    if (!rootPath || !creating) return;
    const name = draftName.trim();
    if (!name) { cancelCreate(); return; }
    if (/[\\\/]/.test(name)) { setError('Name cannot contain "/" or "\\". Select a folder, then create the item there.'); return; }
    try {
      const parentPath = selectedDir || rootPath;
      const target = joinPath(parentPath, name);
      if (creating === NEW_FILE) await (window as any).seecode.fs.createFile(target);
      else await (window as any).seecode.fs.createDir(target);
      await loadDir(parentPath); setTree((prev) => ({ ...prev, [parentPath]: { ...prev[parentPath], open: true } })); cancelCreate();
      if (creating === NEW_FILE) onOpenFile?.(target);
    } catch (err: any) { setError(err.message || 'Failed to create.'); }
  }, [rootPath, selectedDir, creating, draftName, loadDir, cancelCreate, onOpenFile]);

  const onDraftKey = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); commitCreate(); } else if (e.key === 'Escape') { e.preventDefault(); cancelCreate(); } }, [commitCreate, cancelCreate]);
  const handleRefresh = useCallback(() => { if (rootPath) { setError(null); loadDir(rootPath); } }, [rootPath, loadDir]);

  const startRename = useCallback((entryPath: string, entryName: string, isDir: boolean) => {
    setError(null); const slash = Math.max(entryPath.lastIndexOf('/'), entryPath.lastIndexOf('\\'));
    const parentPath = slash >= 0 ? entryPath.slice(0, slash) : rootPath;
    setRenaming({ path: entryPath, name: entryName, parentPath: parentPath || '', isDir }); setRenameDraft(entryName);
  }, [rootPath]);

  const cancelRename = useCallback(() => { setRenaming(null); setRenameDraft(''); }, []);

  const commitRename = useCallback(async () => {
    if (!renaming) return; const nextName = renameDraft.trim();
    if (!nextName || nextName === renaming.name) { cancelRename(); return; }
    if (/[\\\/]/.test(nextName)) { setError('Name cannot contain "/" or "\\".'); return; }
    try {
      const nextPath = joinPath(renaming.parentPath, nextName); await (window as any).seecode.fs.rename(renaming.path, nextPath);
      await loadDir(renaming.parentPath); cancelRename();
    } catch (err: any) { setError(err.message || 'Failed to rename.'); }
  }, [renaming, renameDraft, cancelRename, loadDir]);

  const onRenameKey = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); commitRename(); } else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); } }, [commitRename, cancelRename]);

  const requestDelete = useCallback((path: string, name: string, isDir: boolean, parentPath: string) => { setError(null); setDeleting({ items: [{ path, name, isDir, parentPath }] }); }, []);
  const cancelDelete = useCallback(() => setDeleting(null), []);
  const commitDelete = useCallback(async () => {
    if (!deleting) return; try {
      const parentsToReload = new Set<string>();
      for (const item of deleting.items) { await (window as any).seecode.fs.delete(item.path); if (!item.isDir) onDeleteFile?.(item.path); parentsToReload.add(item.parentPath); }
      await Promise.all(Array.from(parentsToReload).map((dir) => loadDir(dir))); setDeleting(null);
    } catch (err: any) { setError(err.message || 'Failed to delete.'); }
  }, [deleting, loadDir, onDeleteFile]);

  const copyPath = useCallback(async (path: string) => { try { await navigator.clipboard.writeText(path); } catch {} }, []);
  const copyRelativePath = useCallback(async (path: string) => { if (!rootPath) return; const rel = path.startsWith(rootPath) ? path.slice(rootPath.length + 1) : path; try { await navigator.clipboard.writeText(rel); } catch {} }, [rootPath]);
  const openContextMenu = useCallback((e: React.MouseEvent, path: string, name: string, isDir: boolean) => {
    e.preventDefault(); e.stopPropagation(); const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    const parentPath = slash >= 0 ? path.slice(0, slash) : rootPath;
    setContextMenu({ x: e.clientX, y: e.clientY, path, name, isDir, parentPath: parentPath || '' });
  }, [rootPath]);

  const { visiblePaths, pathInfo } = useMemo(() => {
    const paths: string[] = []; const info = new Map<string, { name: string; isDir: boolean; parentPath: string }>();
    const walk = (dirPath: string) => { const entries = tree[dirPath]?.entries; if (!entries) return; for (const entry of entries) { paths.push(entry.path); info.set(entry.path, { name: entry.name, isDir: entry.isDir, parentPath: dirPath }); if (entry.isDir && tree[entry.path]?.open) walk(entry.path); } };
    if (rootPath) walk(rootPath); return { visiblePaths: paths, pathInfo: info };
  }, [tree, rootPath]);

  const isValidDropTarget = useCallback((dirPath: string) => {
    if (!draggingPaths || draggingPaths.length === 0) return false;
    return draggingPaths.every((path) => { if (path === dirPath) return false; if (dirPath.startsWith(`${path}/`) || dirPath.startsWith(`${path}\\`)) return false; const parent = pathInfo.get(path)?.parentPath ?? (dirname(path) || rootPath); if (parent === dirPath) return false; return true; });
  }, [draggingPaths, pathInfo, rootPath]);

  const handleDragStart = useCallback((event: React.DragEvent, path: string) => { setDraggingPaths([path]); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', path); }, []);
  const handleDragEnd = useCallback(() => { setDraggingPaths(null); setDropTargetPath(null); }, []);
  const handleDragOver = useCallback((event: React.DragEvent, dirPath: string) => { event.preventDefault(); const valid = isValidDropTarget(dirPath); event.dataTransfer.dropEffect = valid ? 'move' : 'none'; setDropTargetPath(valid ? dirPath : null); }, [isValidDropTarget]);
  const handleDragLeave = useCallback((dirPath: string) => setDropTargetPath((prev) => (prev === dirPath ? null : prev)), []);

  const handleDrop = useCallback(async (event: React.DragEvent, dirPath: string) => {
    event.preventDefault(); const paths = draggingPaths; setDraggingPaths(null); setDropTargetPath(null);
    if (!paths || !isValidDropTarget(dirPath)) return;
    try {
      const parentsToReload = new Set([dirPath]); const renamedPairs: [string, string][] = [];
      for (const path of paths) { const info = pathInfo.get(path); const sourceParent = info?.parentPath ?? (dirname(path) || rootPath); const nextPath = joinPath(dirPath, info?.name ?? basename(path)); await (window as any).seecode.fs.rename(path, nextPath); parentsToReload.add(sourceParent); renamedPairs.push([path, nextPath]); }
      await Promise.all(Array.from(parentsToReload).map((dir) => loadDir(dir))); setTree((prev) => ({ ...prev, [dirPath]: { ...prev[dirPath], open: true } }));
      const movedActive = renamedPairs.find(([oldPath]) => oldPath === activeFilePath);
      if (movedActive) onOpenFile?.(movedActive[1]);
    } catch (err: any) { setError(err.message || 'Failed to move.'); }
  }, [draggingPaths, isValidDropTarget, pathInfo, rootPath, loadDir, activeFilePath, onOpenFile]);

  if (!rootPath) {
    return (
      <div className="w-full h-full flex flex-col bg-[var(--bg-secondary)] overflow-hidden">
        <div className="h-[var(--panel-header-height)] shrink-0 flex items-center justify-between px-2 pl-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <span className="min-w-0 min-h-[var(--control-compact)] px-1 border-none rounded-[3px] bg-transparent text-[var(--text-sm)] tracking-[0.2px] text-[var(--text-secondary)] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">Files</span>
        </div>
        <div className="p-4 flex flex-col gap-2.5 items-start">
          <p className="text-xs text-[var(--text-secondary)]">No folder open.</p>
          <Button onClick={onPickFolder}>Open folder</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-secondary)] overflow-hidden">
      <div className={cn('h-[var(--panel-header-height)] shrink-0 flex items-center justify-between px-2 pl-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]', dropTargetPath === rootPath && 'bg-[var(--accent-soft)] outline outline-1 outline-dashed outline-[var(--border-focus)] outline-offset-[-1px]')} onDragOver={(e) => handleDragOver(e, rootPath)} onDragLeave={() => handleDragLeave(rootPath)} onDrop={(e) => handleDrop(e, rootPath)}>
        <span className={cn('min-w-0 min-h-[var(--control-compact)] px-1 border-none rounded-[3px] bg-transparent text-[var(--text-sm)] tracking-[0.2px] text-[var(--text-secondary)] font-semibold overflow-hidden text-ellipsis whitespace-nowrap', draggingPaths && 'pointer-events-none')}>{basename(rootPath) || rootPath}</span>
        <div className={cn('flex gap-0.5', draggingPaths && 'pointer-events-none')}>
          <button className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0" onClick={() => startCreate(NEW_FILE)} title="New file"><Plus size={12} /></button>
          <button className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0" onClick={() => startCreate(NEW_FOLDER)} title="New folder"><FolderPlus size={12} /></button>
          <button className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0" onClick={handleRefresh} title="Refresh"><RefreshCw size={12} /></button>
          <button className="ui-icon-button w-[var(--control-compact)] h-[var(--control-compact)] flex items-center justify-center bg-transparent border-none text-[var(--text-secondary)] rounded-[var(--radius-control)] p-0" onClick={onCloseFolder} title="Close folder"><X size={12} /></button>
        </div>
      </div>

      {creating && (
        <div>
          <div className="px-2 pt-1.5 pb-0 bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[10px]">Creating in {selectedDir === rootPath ? 'project root' : basename(selectedDir || '')}</div>
          <div className="flex items-center gap-1 py-1.5 px-2 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
            {creating === NEW_FOLDER ? <Folder size={13} className="text-[var(--text-secondary)] shrink-0" /> : <File size={13} className="text-[var(--text-secondary)] shrink-0" />}
            <input ref={draftRef} type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={onDraftKey} onBlur={commitCreate} placeholder={creating === NEW_FOLDER ? 'new-folder' : 'new-file.py'} className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[3px] text-[var(--text-primary)] text-xs py-[3px] px-1.5 outline-none font-sans" />
            <button className="bg-transparent border-none text-[var(--text-primary)] p-[3px] rounded-[3px] flex items-center cursor-pointer hover:text-[var(--text-primary)]" onMouseDown={(e) => e.preventDefault()} onClick={commitCreate} title="Create (Enter)"><Check size={11} /></button>
            <button className="bg-transparent border-none text-[var(--text-muted)] p-[3px] rounded-[3px] flex items-center cursor-pointer hover:text-[var(--text-primary)]" onMouseDown={(e) => e.preventDefault()} onClick={cancelCreate} title="Cancel (Esc)"><X size={11} /></button>
          </div>
        </div>
      )}

      {deleting && (
        <div className="flex items-center gap-1.5 py-1.5 px-2 bg-[var(--danger-soft)] border-b border-[var(--border)]" role="alert">
          <span className="flex-1 min-w-0 text-[var(--text-secondary)] text-[10.5px] leading-[1.35]">{deleting.items.length === 1 ? `Move "${deleting.items[0].name}" to the Recycle Bin?` : `Move ${deleting.items.length} items to the Recycle Bin?`}</span>
          <button type="button" className="py-[3px] px-[7px] border border-[var(--danger)] rounded-[3px] bg-[var(--danger)] text-[var(--text-on-accent)] text-[10.5px]" onClick={commitDelete}>Delete</button>
          <button type="button" className="bg-transparent border-none text-[var(--text-muted)] p-[3px] rounded-[3px] flex items-center cursor-pointer" onClick={cancelDelete}><X size={11} /></button>
        </div>
      )}

      {error && <div className="p-2 text-[11px] text-[var(--danger-text)] bg-[rgba(224,108,117,0.08)] border-b border-[var(--border)]">{error}</div>}

      <div className="flex-1 overflow-auto py-1" onContextMenu={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, path: rootPath, name: basename(rootPath) || rootPath, isDir: true, parentPath: rootPath, isBackground: true }); } }} onDragOver={(e) => { if (e.target === e.currentTarget) handleDragOver(e, rootPath); }} onDragLeave={(e) => { if (e.target === e.currentTarget) handleDragLeave(rootPath); }} onDrop={(e) => { if (e.target === e.currentTarget) handleDrop(e, rootPath); }}>
        {tree[rootPath]?.entries === null && <div className="px-2 py-2 text-[11px] text-[var(--text-muted)]">Loading…</div>}
        {tree[rootPath]?.entries && tree[rootPath].entries.map((entry: any) => (
          <TreeNode key={entry.path} path={entry.path} name={entry.name} isDir={entry.isDir} depth={0} tree={tree} onToggleDir={toggleDir} onOpenFile={onOpenFile!} activeFilePath={activeFilePath} selectedDir={selectedDir} onSelectDir={setSelectedDir} renaming={renaming} renameDraft={renameDraft} renameRef={renameRef} onRenameDraftChange={setRenameDraft} onRenameKey={onRenameKey} onRenameBlur={commitRename} draggingPaths={draggingPaths} dropTargetPath={dropTargetPath} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onContextMenu={openContextMenu} hoveredPath={hoveredPath} onHoverPath={setHoveredPath} isRoot={false} />
        ))}
      </div>

      {contextMenu && (
        <ContextMenu ref={contextMenuRef} x={contextMenu.x} y={contextMenu.y} isDir={contextMenu.isDir} isBackground={contextMenu.isBackground} menuPath={contextMenu.path} menuName={contextMenu.name} parentPath={contextMenu.parentPath} onClose={() => setContextMenu(null)} onNewFile={(dir) => { setContextMenu(null); startCreate(NEW_FILE, dir); }} onNewFolder={(dir) => { setContextMenu(null); startCreate(NEW_FOLDER, dir); }} onRename={() => { setContextMenu(null); startRename(contextMenu.path, contextMenu.name, contextMenu.isDir); }} onDelete={() => { setContextMenu(null); requestDelete(contextMenu.path, contextMenu.name, contextMenu.isDir, contextMenu.parentPath); }} onCopyPath={() => { setContextMenu(null); copyPath(contextMenu.path); }} onCopyRelativePath={() => { setContextMenu(null); copyRelativePath(contextMenu.path); }} />
      )}
    </div>
  );
}

const ContextMenu = forwardRef(function ContextMenu({ x, y, isDir, isBackground, menuPath, menuName, parentPath, onClose, onNewFile, onNewFolder, onRename, onDelete, onCopyPath, onCopyRelativePath }: {
  x: number; y: number; isDir: boolean; isBackground?: boolean; menuPath: string; menuName: string; parentPath: string;
  onClose: () => void; onNewFile: (dir: string) => void; onNewFolder: (dir: string) => void; onRename: () => void; onDelete: () => void; onCopyPath: () => void; onCopyRelativePath: () => void;
}, ref: React.Ref<HTMLDivElement>) {
  const items: { label: string; icon: React.ReactNode; action: () => void; shortcut?: string; type?: string }[] = [];
  if (isDir) { items.push({ label: 'New File…', icon: <File size={12} />, action: () => onNewFile(menuPath) }); items.push({ label: 'New Folder…', icon: <FolderPlus size={12} />, action: () => onNewFolder(menuPath) }); items.push({ type: 'separator', label: '', icon: null, action: () => {} }); }
  if (!isBackground) { items.push({ label: 'Rename', icon: <Pencil size={12} />, action: onRename, shortcut: 'F2' }); items.push({ label: 'Delete', icon: <Trash2 size={12} />, action: onDelete }); items.push({ type: 'separator', label: '', icon: null, action: () => {} }); }
  items.push({ label: 'Copy Path', icon: <Copy size={12} />, action: onCopyPath });
  if (!isBackground) items.push({ label: 'Copy Relative Path', icon: <Copy size={12} />, action: onCopyRelativePath });
  const menuWidth = 220; const menuHeight = items.length * 28;
  const finalX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const finalY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
  return (
    <div ref={ref} className="fixed z-[1000] min-w-[200px] bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.4)] py-1 animate-[seec0de-fade-in_0.1s_ease-out]" style={{ left: finalX, top: finalY }}>
      {items.map((item, i) => {
        if (item.type === 'separator') return <div key={`sep-${i}`} className="h-px my-1 bg-[var(--border)]" />;
        return (
          <button key={item.label} type="button" className="flex items-center gap-2 w-full py-[5px] px-3 bg-transparent border-none text-[var(--text-primary)] text-xs text-left cursor-pointer hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" onClick={(e) => { e.stopPropagation(); item.action(); }}>
            <span className="inline-flex items-center text-[var(--text-secondary)] shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-[var(--text-muted)] text-[11px] ml-auto">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
});

function TreeNode({ path, name, isDir, depth, tree, onToggleDir, onOpenFile, activeFilePath, selectedDir, onSelectDir, isRoot, renaming, renameDraft, renameRef, onRenameDraftChange, onRenameKey, onRenameBlur, draggingPaths, dropTargetPath, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onContextMenu, hoveredPath, onHoverPath }: {
  path: string; name: string; isDir: boolean; depth: number; tree: Record<string, TreeNodeData>; onToggleDir: (path: string) => void; onOpenFile: (path: string) => void; activeFilePath: string | null | undefined; selectedDir: string | null; onSelectDir: (path: string) => void; isRoot: boolean; renaming: RenamingData | null; renameDraft: string; renameRef: React.RefObject<HTMLInputElement>; onRenameDraftChange: (v: string) => void; onRenameKey: (e: React.KeyboardEvent) => void; onRenameBlur: () => void; draggingPaths: string[] | null; dropTargetPath: string | null; onDragStart: (e: React.DragEvent, path: string) => void; onDragEnd: () => void; onDragOver: (e: React.DragEvent, path: string) => void; onDragLeave: (path: string) => void; onDrop: (e: React.DragEvent, path: string) => void; onContextMenu: (e: React.MouseEvent, path: string, name: string, isDir: boolean) => void; hoveredPath: string | null; onHoverPath: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const node = isDir ? tree[path] : null;
  const open = !!node?.open;
  const entries = node?.entries;
  if (isRoot) {
    if (!entries) return <div className="px-2 py-2 text-[11px] text-[var(--text-muted)]">Loading…</div>;
    return <>{entries.map((entry: any) => <TreeNode key={entry.path} path={entry.path} name={entry.name} isDir={entry.isDir} depth={0} tree={tree} onToggleDir={onToggleDir} onOpenFile={onOpenFile} activeFilePath={activeFilePath} selectedDir={selectedDir} onSelectDir={onSelectDir} renaming={renaming} renameDraft={renameDraft} renameRef={renameRef} onRenameDraftChange={onRenameDraftChange} onRenameKey={onRenameKey} onRenameBlur={onRenameBlur} draggingPaths={draggingPaths} dropTargetPath={dropTargetPath} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onContextMenu={onContextMenu} hoveredPath={hoveredPath} onHoverPath={onHoverPath} isRoot={false} />)}</>;
  }
  const isActive = !isDir && path === activeFilePath;
  const isSelectedDir = isDir && path === selectedDir;
  const isRenaming = renaming?.path === path;
  const isDragging = !!draggingPaths?.includes(path);
  const isDropTarget = isDir && dropTargetPath === path;
  const isHovered = hoveredPath === path;
  return (
    <div>
      <button className={cn('ui-tree-row w-full flex items-center gap-1 bg-transparent border-none text-[var(--text-primary)] min-h-[var(--control-compact)] text-[var(--text-sm)] px-2 text-left whitespace-nowrap overflow-hidden text-ellipsis', isActive && 'bg-[var(--active-row-bg)] text-[var(--text-on-accent)]', isSelectedDir && 'bg-[var(--accent-soft)]', isDragging && 'opacity-50', isDropTarget && 'bg-[var(--accent-soft)] outline outline-1 outline-dashed outline-[var(--border-focus)] outline-offset-[-1px]', isHovered && !isActive && !isSelectedDir && 'bg-[var(--bg-tertiary)]')} style={{ paddingLeft: 8 + depth * 12 }} draggable={!isRenaming} onDragStart={(e) => onDragStart(e, path)} onDragEnd={onDragEnd} onDragOver={isDir ? (e) => onDragOver(e, path) : undefined} onDragLeave={isDir ? () => onDragLeave(path) : undefined} onDrop={isDir ? (e) => onDrop(e, path) : undefined} onContextMenu={(e) => onContextMenu(e, path, name, isDir)} onMouseEnter={() => onHoverPath(path)} onMouseLeave={() => onHoverPath((prev) => prev === path ? null : prev)} onClick={() => { if (isDir) { onSelectDir(path); onToggleDir(path); } else onOpenFile(path); }} title={path}>
        {isDir ? (open ? <ChevronDown size={12} className="w-3 h-3 shrink-0 text-[var(--text-muted)]" /> : <ChevronRight size={12} className="w-3 h-3 shrink-0 text-[var(--text-muted)]" />) : <span className="w-3 h-3 shrink-0" />}
        {isDir ? (open ? <FolderOpen size={13} className="shrink-0 text-[var(--text-secondary)]" /> : <Folder size={13} className="shrink-0 text-[var(--text-secondary)]" />) : <File size={13} className="shrink-0 text-[var(--text-secondary)]" />}
        {isRenaming ? <input ref={renameRef} value={renameDraft} onChange={(e) => onRenameDraftChange(e.target.value)} onKeyDown={onRenameKey} onBlur={onRenameBlur} onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-focus)] rounded-[3px] text-[var(--text-primary)] text-xs py-[2px] px-[5px] outline-none font-sans" /> : <span className="overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>}
      </button>
      {isDir && open && entries && entries.map((entry: any) => <TreeNode key={entry.path} path={entry.path} name={entry.name} isDir={entry.isDir} depth={depth + 1} tree={tree} onToggleDir={onToggleDir} onOpenFile={onOpenFile} activeFilePath={activeFilePath} selectedDir={selectedDir} onSelectDir={onSelectDir} renaming={renaming} renameDraft={renameDraft} renameRef={renameRef} onRenameDraftChange={onRenameDraftChange} onRenameKey={onRenameKey} onRenameBlur={onRenameBlur} draggingPaths={draggingPaths} dropTargetPath={dropTargetPath} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onContextMenu={onContextMenu} hoveredPath={hoveredPath} onHoverPath={onHoverPath} isRoot={false} />)}
    </div>
  );
}
