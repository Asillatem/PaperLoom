import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Brain,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  History,
  Plus,
  Trash2,
  Pin,
  Zap,
  Sparkles,
  BarChart3,
  Search,
  Network,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  sendChatMessage,
  getChatSessions,
  getChatSession,
  deleteChatSession,
  type ChatCitation,
  type ChatInsights,
  type ContextMode,
  type ChatSessionSummary,
} from '../api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  contextNodes?: string[];
  insights?: ChatInsights;
}

const CONTEXT_MODES: { value: ContextMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'auto', label: 'Auto', icon: <Zap className="w-3 h-3" />, description: 'RAG finds relevant snippets' },
  { value: 'manual', label: 'Manual', icon: <Pin className="w-3 h-3" />, description: 'Only use pinned snippets' },
  { value: 'hybrid', label: 'Hybrid', icon: <Sparkles className="w-3 h-3" />, description: 'RAG + pinned snippets' },
];

export function ChatSidebar() {
  const {
    chatSidebarOpen,
    toggleChatSidebar,
    nodes,
    edges,
    highlightedAiNodes,
    setHighlightedAiNodes,
    isAiLoading,
    setIsAiLoading,
    activeChatSessionId,
    setActiveChatSessionId,
    jumpToSource,
    currentProjectId,
  } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [expandedInsights, setExpandedInsights] = useState<string | null>(null);
  const [contextMode, setContextMode] = useState<ContextMode>('auto');
  const [pinnedNodeIds, setPinnedNodeIds] = useState<string[]>([]);
  const [showNodeSelector, setShowNodeSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get snippet nodes only (not notes)
  const snippetNodes = useMemo(() => {
    return nodes.filter((n) => n.type === 'snippetNode');
  }, [nodes]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (chatSidebarOpen) {
      inputRef.current?.focus();
    }
  }, [chatSidebarOpen]);

  // Load sessions when history panel opens
  useEffect(() => {
    if (showHistory && currentProjectId) {
      loadSessions();
    }
  }, [showHistory, currentProjectId]);

  const loadSessions = async () => {
    if (!currentProjectId) return;
    setLoadingSessions(true);
    try {
      const data = await getChatSessions(currentProjectId);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId: number) => {
    if (!currentProjectId) return;
    try {
      const data = await getChatSession(currentProjectId, sessionId);
      setMessages(
        data.messages.map((m) => ({
          id: `msg-${m.id}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          citations: m.citations,
          contextNodes: m.context_nodes,
        }))
      );
      setActiveChatSessionId(sessionId);
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeChatSessionId === sessionId) {
        setActiveChatSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const startNewChat = () => {
    setActiveChatSessionId(null);
    setMessages([]);
    setShowHistory(false);
    setPinnedNodeIds([]);
  };

  const togglePinnedNode = (nodeId: string) => {
    setPinnedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isAiLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsAiLoading(true);

    try {
      const response = await sendChatMessage({
        project_id: currentProjectId || '0',
        query: userMessage.content,
        session_id: activeChatSessionId || undefined,
        nodes: nodes,
        edges: edges,
        context_mode: contextMode,
        pinned_node_ids: pinnedNodeIds.length > 0 ? pinnedNodeIds : undefined,
      });

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        citations: response.citations,
        contextNodes: response.context_nodes,
        insights: response.insights,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setActiveChatSessionId(response.session_id);

      // Highlight cited nodes
      if (response.citations.length > 0) {
        setHighlightedAiNodes(response.citations.map((c) => c.nodeId));
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCitationClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node && node.type === 'snippetNode') {
      const data = node.data;
      jumpToSource(data.sourcePdf, data.location, data.sourceName, data.sourceType);
    }
    setHighlightedAiNodes([nodeId]);
  };

  const renderMessageContent = (content: string, citations?: ChatCitation[]) => {
    const parts = content.split(/(\[\d+\])/g);

    return parts.map((part, i) => {
      const match = part.match(/\[(\d+)\]/);
      if (match && citations) {
        const num = parseInt(match[1]);
        const citation = citations[num - 1];
        if (citation) {
          return (
            <button
              key={i}
              onClick={() => handleCitationClick(citation.nodeId)}
              className="inline-flex items-center justify-center w-5 h-5 mx-0.5 text-xs font-bold bg-yellow-400 text-yellow-900 rounded-full hover:bg-yellow-500 transition-colors"
              title={citation.preview}
            >
              {num}
            </button>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderInsights = (insights: ChatInsights, msgId: string) => {
    const isExpanded = expandedInsights === msgId;

    return (
      <div className="mt-2 pt-2 border-t border-neutral-200">
        <button
          onClick={() => setExpandedInsights(isExpanded ? null : msgId)}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 w-full"
        >
          <BarChart3 className="w-3 h-3" />
          <span className="flex-1 text-left">
            {insights.total_context_nodes} nodes · ~{insights.approx_context_tokens} tokens
          </span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2 text-xs">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-50 p-2 rounded">
                <div className="flex items-center gap-1 text-neutral-500">
                  <Search className="w-3 h-3" />
                  RAG
                </div>
                <div className="font-bold text-neutral-800">{insights.rag_nodes}</div>
              </div>
              <div className="bg-neutral-50 p-2 rounded">
                <div className="flex items-center gap-1 text-neutral-500">
                  <Pin className="w-3 h-3" />
                  Pinned
                </div>
                <div className="font-bold text-neutral-800">{insights.pinned_nodes}</div>
              </div>
              <div className="bg-neutral-50 p-2 rounded">
                <div className="flex items-center gap-1 text-neutral-500">
                  <Network className="w-3 h-3" />
                  Graph
                </div>
                <div className="font-bold text-neutral-800">{insights.graph_expanded_nodes}</div>
              </div>
              <div className="bg-neutral-50 p-2 rounded">
                <div className="text-neutral-500">Depth</div>
                <div className="font-bold text-neutral-800">{insights.graph_depth}</div>
              </div>
            </div>

            {/* Node details */}
            {insights.node_details.length > 0 && (
              <div className="space-y-1">
                <div className="text-neutral-500 font-medium">Context Nodes:</div>
                {insights.node_details.map((node, i) => (
                  <button
                    key={node.nodeId}
                    onClick={() => handleCitationClick(node.nodeId)}
                    className="w-full text-left p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded flex items-start gap-2"
                  >
                    <span className="font-bold text-neutral-400">[{i + 1}]</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-neutral-700">{node.preview}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                            node.source === 'rag'
                              ? 'bg-blue-100 text-blue-700'
                              : node.source === 'pinned'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {node.source}
                        </span>
                        {node.similarity !== null && (
                          <span className="text-neutral-400">
                            {Math.round(node.similarity * 100)}% match
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!chatSidebarOpen) {
    return (
      <button
        onClick={toggleChatSidebar}
        className="fixed right-4 bottom-4 p-3 bg-blue-900 text-white rounded-none shadow-lg hover:bg-blue-800 transition-colors z-50"
        title="Open AI Brain"
      >
        <Brain className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l-4 border-blue-900 shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b-4 border-blue-900 bg-blue-50">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-900" />
          <h2 className="font-extrabold text-blue-900 uppercase tracking-wide text-sm">
            AI Brain
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded transition-colors ${showHistory ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
            title="Chat history"
          >
            <History className="w-4 h-4 text-blue-900" />
          </button>
          <button
            onClick={startNewChat}
            className="p-1.5 hover:bg-blue-100 rounded transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4 text-blue-900" />
          </button>
          <button
            onClick={toggleChatSidebar}
            className="p-1.5 hover:bg-blue-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-blue-900" />
          </button>
        </div>
      </div>

      {/* Context Mode Toggle */}
      <div className="p-2 border-b border-neutral-200 bg-neutral-50">
        <div className="flex gap-1">
          {CONTEXT_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setContextMode(mode.value)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                contextMode === mode.value
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
              title={mode.description}
            >
              {mode.icon}
              {mode.label}
            </button>
          ))}
        </div>

        {/* Pinned nodes indicator / selector toggle */}
        {(contextMode === 'manual' || contextMode === 'hybrid') && (
          <div className="mt-2">
            <button
              onClick={() => setShowNodeSelector(!showNodeSelector)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs bg-white border border-neutral-200 rounded hover:bg-neutral-50"
            >
              <span className="flex items-center gap-1">
                <Pin className="w-3 h-3" />
                {pinnedNodeIds.length === 0
                  ? 'Select snippets to include...'
                  : `${pinnedNodeIds.length} snippet${pinnedNodeIds.length !== 1 ? 's' : ''} pinned`}
              </span>
              {showNodeSelector ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showNodeSelector && (
              <div className="mt-1 max-h-40 overflow-y-auto bg-white border border-neutral-200 rounded">
                {snippetNodes.length === 0 ? (
                  <div className="p-2 text-xs text-neutral-500 text-center">
                    No snippets on canvas
                  </div>
                ) : (
                  snippetNodes.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => togglePinnedNode(node.id)}
                      className={`w-full flex items-start gap-2 p-2 text-left text-xs hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 ${
                        pinnedNodeIds.includes(node.id) ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          pinnedNodeIds.includes(node.id)
                            ? 'bg-yellow-400 border-yellow-500'
                            : 'border-neutral-300'
                        }`}
                      >
                        {pinnedNodeIds.includes(node.id) && (
                          <Pin className="w-2.5 h-2.5 text-yellow-800" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-neutral-700">
                          {node.data.label.slice(0, 60)}
                          {node.data.label.length > 60 ? '...' : ''}
                        </div>
                        <div className="text-neutral-400 truncate">
                          {node.data.sourceName || node.data.sourcePdf.split(/[/\\]/).pop()}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Panel (slides in from left) */}
      {showHistory && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-neutral-200">
            <h3 className="font-bold text-neutral-800">Chat History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingSessions ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-sm">
                No previous conversations
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`w-full p-3 text-left border-b border-neutral-100 hover:bg-neutral-50 flex items-start gap-2 ${
                    activeChatSessionId === session.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-800 truncate text-sm">
                      {session.title}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {new Date(session.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="p-1 hover:bg-red-100 rounded text-neutral-400 hover:text-red-600"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>
              ))
            )}
          </div>
          <div className="p-3 border-t border-neutral-200">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-neutral-500 py-8">
            <Brain className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p className="text-sm">Ask questions about your research.</p>
            <p className="text-xs mt-2 text-neutral-400">
              {contextMode === 'auto' && 'I\'ll find relevant snippets automatically.'}
              {contextMode === 'manual' && 'Pin snippets above to include them.'}
              {contextMode === 'hybrid' && 'I\'ll search + use your pinned snippets.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] p-3 rounded ${
                msg.role === 'user'
                  ? 'bg-blue-900 text-white'
                  : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {msg.role === 'assistant'
                  ? renderMessageContent(msg.content, msg.citations)
                  : msg.content}
              </div>

              {/* Insights panel for assistant messages */}
              {msg.role === 'assistant' && msg.insights && renderInsights(msg.insights, msg.id)}
            </div>
          </div>
        ))}

        {isAiLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 p-3 border border-neutral-200 rounded">
              <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-neutral-200 bg-neutral-50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your research..."
            rows={2}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent resize-none text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAiLoading}
            className="px-3 py-2 bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-neutral-400 mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
