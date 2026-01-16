import type { ProjectData, FileEntry, ProjectSummary, AISettings } from './types';

// Re-export types for backward compatibility
export type { FileEntry, ProjectSummary, AISettings };

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

// ============================================
// AI Settings API
// ============================================

/**
 * Get current AI settings (API key will be masked as ***)
 */
export async function getAISettings(): Promise<AISettings> {
  const resp = await fetch(`${API_BASE}/settings/ai`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch AI settings: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * Update AI settings
 * @param settings - Partial or full AI settings to update
 */
export async function updateAISettings(settings: Partial<AISettings>): Promise<void> {
  const resp = await fetch(`${API_BASE}/settings/ai`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!resp.ok) {
    throw new Error(`Failed to update AI settings: ${resp.status} ${resp.statusText}`);
  }
}

/**
 * Test the LLM connection with current settings
 */
export async function testAIConnection(): Promise<{ status: string; response?: string; message?: string }> {
  const resp = await fetch(`${API_BASE}/settings/ai/test`, { method: 'POST' });
  if (!resp.ok) {
    throw new Error(`Connection test failed: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * Get available models from the current provider
 */
export async function getAvailableModels(): Promise<{ status: string; models: string[]; message?: string }> {
  const resp = await fetch(`${API_BASE}/settings/ai/models`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch models: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

// ============================================
// Chat API
// ============================================

export type ContextMode = 'auto' | 'manual' | 'hybrid';

export interface ChatRequest {
  project_id: string;
  query: string;
  session_id?: number;
  context_node_ids?: string[];
  nodes?: any[];
  edges?: any[];
  context_mode?: ContextMode;
  pinned_node_ids?: string[];
}

export interface ChatCitation {
  nodeId: string;
  preview: string;
}

export interface NodeInsight {
  nodeId: string;
  source: 'rag' | 'pinned' | 'graph';
  similarity: number | null;
  preview: string;
}

export interface ChatInsights {
  total_context_nodes: number;
  rag_nodes: number;
  pinned_nodes: number;
  graph_expanded_nodes: number;
  context_mode: string;
  graph_depth: number;
  approx_context_tokens: number;
  node_details: NodeInsight[];
}

export interface ChatResponse {
  response: string;
  citations: ChatCitation[];
  context_nodes: string[];
  session_id: number;
  insights: ChatInsights;
}

/**
 * Send a message to the AI Brain
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const resp = await fetch(`${API_BASE}/chat/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error.detail || `Chat failed: ${resp.status}`);
  }
  return resp.json();
}

export interface ChatSessionSummary {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all chat sessions for a project
 */
export async function getChatSessions(projectId: string): Promise<ChatSessionSummary[]> {
  const resp = await fetch(`${API_BASE}/chat/sessions/${encodeURIComponent(projectId)}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch sessions: ${resp.status}`);
  }
  return resp.json();
}

export interface ChatMessageData {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ChatCitation[];
  context_nodes: string[];
  created_at: string;
}

export interface ChatSessionData {
  id: number;
  title: string;
  messages: ChatMessageData[];
}

/**
 * Get a chat session with all messages
 */
export async function getChatSession(projectId: string, sessionId: number): Promise<ChatSessionData> {
  const resp = await fetch(`${API_BASE}/chat/sessions/${encodeURIComponent(projectId)}/${sessionId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch session: ${resp.status}`);
  }
  return resp.json();
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId: number): Promise<void> {
  const resp = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, { method: 'DELETE' });
  if (!resp.ok) {
    throw new Error(`Failed to delete session: ${resp.status}`);
  }
}