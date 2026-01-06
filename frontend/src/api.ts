import type { ProjectData, FileEntry } from './types';

// Re-export FileEntry for backward compatibility
export type { FileEntry };

export async function fetchFiles(): Promise<FileEntry[]> {
  const resp = await fetch('http://localhost:8000/files')
  if (!resp.ok) {
    throw new Error(`Failed to fetch files: ${resp.status} ${resp.statusText}`)
  }
  const data = await resp.json()
  if (!Array.isArray(data)) return []

  // Backend may return Windows paths or Zotero-style subpaths.
  // Normalize to a flat list of { name, path }
  const entries: FileEntry[] = data.map((it: any) => {
    const raw = it.filename ?? it.path ?? String(it)
    // split on both forward and backward slashes
    const parts = raw.split(/[/\\\\]+/)
    const name = parts[parts.length - 1]
    return { name, path: raw, size: it.size, modified: it.modified }
  })
  return entries
}

/**
 * Get the URL to stream a PDF file from the backend
 * @param filename - The PDF filename or path
 * @returns URL to access the PDF
 */
export function getPdfUrl(filename: string): string {
  const encoded = encodeURIComponent(filename);
  return `http://localhost:8000/pdf/${encoded}`;
}

/**
 * Save the current project to the backend
 * @param project - Project data to save
 * @param filename - Optional filename for the project
 */
export async function saveProject(project: ProjectData, filename?: string): Promise<void> {
  const resp = await fetch('http://localhost:8000/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project, filename }),
  });

  if (!resp.ok) {
    throw new Error(`Save failed: ${resp.status} ${resp.statusText}`);
  }
}