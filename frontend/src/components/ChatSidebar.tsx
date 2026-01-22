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
  StickyNote,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  sendChatMessageStream,
  getChatSessions,
  getChatSession,
  deleteChatSession,
  generateChatSummary,
  getAISettings,
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

/** Format token count for display (e.g., 3200 -> "3.2k", 128000 -> "128k") */
function formatTokens(count: number): string {
  if (count >= 1000) {
    const k = count / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
  }
  return count.toString();
}

export function ChatSidebar() {
  const {
    chatSidebarOpen,
    toggleChatSidebar,
    nodes,
    edges,
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
  const [sessionTokens, setSessionTokens] = useState(0);
  const [maxContextWindow, setMaxContextWindow] = useState(128000); // Default 128k
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get all pinnable nodes (snippets and notes)
  const pinnableNodes = useMemo(() => {
    return nodes.filter((n) => n.type === 'snippetNode' || n.type === 'noteNode');
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

  // Load AI settings to get max context window
  useEffect(() => {
    getAISettings()
      .then((settings) => {
        if (settings.context_window) {
          setMaxContextWindow(settings.context_window);
        }
      })
      .catch(() => {
        // Keep default if settings fail to load
      });
  }, []);

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
    setSessionTokens(0);
    setSummary(null);
  };

  const handleGenerateSummary = async () => {
    if (!activeChatSessionId || loadingSummary) return;

    setLoadingSummary(true);
    try {
      const result = await generateChatSummary(activeChatSessionId);
      setSummary(result.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('Failed to generate summary');
    } finally {
      setLoadingSummary(false);
    }
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

    const streamingMsgId = `msg-${Date.now() + 1}`;

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsAiLoading(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [
      ...prev,
      {
        id: streamingMsgId,
        role: 'assistant',
        content: '',
      },
    ]);

    try {
      await sendChatMessageStream(
        {
          project_id: currentProjectId || '0',
          query: userMessage.content,
          session_id: activeChatSessionId || undefined,
          nodes: nodes,
          edges: edges,
          context_mode: contextMode,
          pinned_node_ids: pinnedNodeIds.length > 0 ? pinnedNodeIds : undefined,
        },
        // onToken - append each token to the streaming message
        (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMsgId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        },
        // onDone - update message with final data
        (data) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMsgId
                ? {
                    ...msg,
                    citations: data.citations,
                    insights: data.insights,
                  }
                : msg
            )
          );
          setActiveChatSessionId(data.session_id);

          // Update session token count
          if (data.insights?.approx_context_tokens) {
            setSessionTokens((prev) => prev + data.insights.approx_context_tokens);
          }

          // Highlight cited nodes
          if (data.citations.length > 0) {
            setHighlightedAiNodes(data.citations.map((c) => c.nodeId));
          }

          setIsAiLoading(false);
        },
        // onError
        (errorMsg) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMsgId
                ? { ...msg, content: `Error: ${errorMsg}` }
                : msg
            )
          );
          setIsAiLoading(false);
        }
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMsgId
            ? { ...msg, content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}` }
            : msg
        )
      );
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
        {/* Always visible summary */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded">
              <BarChart3 className="w-3 h-3" />
              {insights.total_context_nodes} nodes
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
              ~{formatTokens(insights.approx_context_tokens)} tokens
            </span>
          </div>
          <button
            onClick={() => setExpandedInsights(isExpanded ? null : msgId)}
            className="flex items-center gap-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
            title={isExpanded ? 'Hide details' : 'Show details'}
          >
            <span className="text-[10px]">Details</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

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
          {/* Context usage indicator */}
          {sessionTokens > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
              title={`Session context: ${sessionTokens.toLocaleString()} / ${maxContextWindow.toLocaleString()} tokens`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>{formatTokens(sessionTokens)}</span>
              <span className="text-blue-500">/</span>
              <span className="text-blue-500">{formatTokens(maxContextWindow)}</span>
            </div>
          )}
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
                  ? 'Select nodes to include...'
                  : `${pinnedNodeIds.length} node${pinnedNodeIds.length !== 1 ? 's' : ''} pinned`}
              </span>
              {showNodeSelector ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showNodeSelector && (
              <div className="mt-1 max-h-40 overflow-y-auto bg-white border border-neutral-200 rounded">
                {pinnableNodes.length === 0 ? (
                  <div className="p-2 text-xs text-neutral-500 text-center">
                    No snippets or notes on canvas
                  </div>
                ) : (
                  pinnableNodes.map((node) => {
                    const isNote = node.type === 'noteNode';
                    const noteColor = isNote ? (node.data as { color?: string }).color : null;
                    return (
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
                          <div className="flex items-center gap-1">
                            {isNote ? (
                              <StickyNote className={`w-3 h-3 flex-shrink-0 ${
                                noteColor === 'yellow' ? 'text-yellow-600' :
                                noteColor === 'blue' ? 'text-blue-600' :
                                noteColor === 'green' ? 'text-green-600' :
                                noteColor === 'pink' ? 'text-pink-600' :
                                noteColor === 'purple' ? 'text-purple-600' :
                                'text-yellow-600'
                              }`} />
                            ) : (
                              <FileText className="w-3 h-3 flex-shrink-0 text-neutral-400" />
                            )}
                            <span className="truncate text-neutral-700">
                              {node.data.label.slice(0, 55)}
                              {node.data.label.length > 55 ? '...' : ''}
                            </span>
                          </div>
                          <div className="text-neutral-400 truncate pl-4">
                            {isNote ? (
                              <span className="italic">Note</span>
                            ) : (
                              (node.data as { sourceName?: string; sourcePdf?: string }).sourceName ||
                              (node.data as { sourcePdf?: string }).sourcePdf?.split(/[/\\]/).pop()
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
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
        {/* Summary section - show for long conversations */}
        {messages.length >= 6 && activeChatSessionId && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
            {summary ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-blue-900 uppercase">Summary</h4>
                  <button
                    onClick={() => setSummary(null)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Hide
                  </button>
                </div>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{summary}</p>
              </div>
            ) : (
              <button
                onClick={handleGenerateSummary}
                disabled={loadingSummary}
                className="w-full flex items-center justify-center gap-2 text-sm text-blue-900 hover:text-blue-700 py-1"
              >
                {loadingSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Summarize this conversation
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center text-neutral-500 py-8">
            <Brain className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p className="text-sm">Ask questions about your research.</p>
            <p className="text-xs mt-2 text-neutral-400">
              {contextMode === 'auto' && 'I\'ll find relevant snippets and notes automatically.'}
              {contextMode === 'manual' && 'Pin snippets or notes above to include them.'}
              {contextMode === 'hybrid' && 'I\'ll search + use your pinned nodes.'}
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

        {/* Thinking indicator - only show when loading and no streaming content yet */}
        {isAiLoading && (() => {
          const lastMsg = messages[messages.length - 1];
          const isStreaming = lastMsg?.role === 'assistant' && lastMsg?.content?.length > 0;
          if (isStreaming) return null; // Content is streaming, hide indicator
          return (
            <div className="flex justify-start">
              <div className="bg-neutral-100 p-3 border border-neutral-200 rounded flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-900" />
                <span className="text-sm text-blue-900 font-medium">Thinking</span>
                <span className="thinking-dots text-blue-900 font-bold">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </div>
            </div>
          );
        })()}

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
