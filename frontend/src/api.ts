import type { ProjectData, FileEntry, ProjectSummary } from './types';

// Re-export types for backward compatibility
export type { FileEntry, ProjectSummary };

const API_BASE = 'http://localhost:8000';

export async function fetchFiles(): Promise<FileEntry[]> {
  const resp = await fetch(`${API_BASE}/files`)
  if (!resp.ok) {
    throw new Error(`Failed to fetch files: ${resp.status} ${resp.statusText}`)
  }
  const data = await resp.json()
  if (!Array.isArray(data)) return []

  // Map backend response to FileEntry
  const entries: FileEntry[] = data.map((it: any) => ({
    key: it.key,
    name: it.name || it.filename || 'Untitled',
    filename: it.filename || '',
    path: it.key,  // Use key as path for compatibility
    type: it.type === 'html' ? 'html' : 'pdf',
    parentKey: it.parentKey,
    itemType: it.itemType,
  }))
  return entries
}

/**
 * Sync library from Zotero API (refreshes cache)
 */
export async function syncLibrary(): Promise<void> {
  const resp = await fetch(`${API_BASE}/sync`, { method: 'POST' })
  if (!resp.ok) {
    throw new Error(`Sync failed: ${resp.status} ${resp.statusText}`)
  }
}

/**
 * Get the URL to stream a file (PDF or HTML) from the backend
 * @param key - The Zotero attachment key
 * @returns URL to access the file
 */
export function getFileUrl(key: string): string {
  return `${API_BASE}/file/${encodeURIComponent(key)}`;
}

// Legacy aliases for backward compatibility
export const getPdfUrl = getFileUrl;
export const getHtmlUrl = getFileUrl;

/**
 * Save the current project to the backend
 * @param project - Project data to save
 * @param filename - Optional filename for the project
 */
export async function saveProject(project: ProjectData, filename?: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, filename }),
  });

  if (!resp.ok) {
    throw new Error(`Save failed: ${resp.status} ${resp.statusText}`);
  }
}

/**
 * Fetch list of all saved projects
 */
export async function fetchProjects(): Promise<ProjectSummary[]> {
  const resp = await fetch(`${API_BASE}/projects`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch projects: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * Load a specific project from the backend
 * @param filename - The project filename (with .json extension)
 */
export async function loadProjectFromServer(filename: string): Promise<ProjectData> {
  const resp = await fetch(`${API_BASE}/projects/${encodeURIComponent(filename)}`);
  if (!resp.ok) {
    throw new Error(`Failed to load project: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * Delete a project from the backend
 * @param filename - The project filename to delete
 */
export async function deleteProject(filename: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/projects/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!resp.ok) {
    throw new Error(`Failed to delete project: ${resp.status} ${resp.statusText}`);
  }
}