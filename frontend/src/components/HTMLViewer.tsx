import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getHtmlUrl } from '../api';
import type { SnippetNode } from '../types';

// Script to inject into HTML for selection handling and highlights
const SELECTION_SCRIPT = `
<style>
  .ls-highlight-overlay {
    position: absolute;
    background-color: rgba(59, 130, 246, 0.25);
    pointer-events: none;
    z-index: 9998;
    border-radius: 2px;
    transition: background-color 0.2s;
  }
  .ls-highlight-overlay.ls-highlight-active {
    background-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }
  .ls-highlight-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  }
</style>
<script>
(function() {
  // Track selection state
  let isSelecting = false;
  let highlightContainer = null;
  let currentHighlights = [];

  // Create highlight container
  function ensureHighlightContainer() {
    if (!highlightContainer) {
      highlightContainer = document.createElement('div');
      highlightContainer.className = 'ls-highlight-container';
      document.body.appendChild(highlightContainer);
    }
    return highlightContainer;
  }

  // Render highlights
  function renderHighlights(highlights, activeHighlightId) {
    const container = ensureHighlightContainer();
    container.innerHTML = '';

    highlights.forEach(function(highlight) {
      highlight.rects.forEach(function(rect) {
        const el = document.createElement('div');
        el.className = 'ls-highlight-overlay';
        if (highlight.id === activeHighlightId) {
          el.classList.add('ls-highlight-active');
        }
        el.style.left = rect.x + 'px';
        el.style.top = rect.y + 'px';
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        container.appendChild(el);
      });
    });
  }

  // Listen for highlight updates from parent
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'UPDATE_HTML_HIGHLIGHTS') {
      currentHighlights = event.data.highlights || [];
      renderHighlights(currentHighlights, event.data.activeHighlightId);
    }
  });

  document.addEventListener('mousedown', function() {
    isSelecting = true;
  });

  document.addEventListener('mouseup', function() {
    if (!isSelecting) return;
    isSelecting = false;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || text.length < 3) return;

    // Get selection range info
    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects());

    if (rects.length === 0) return;

    // Calculate bounding box
    const boundingRect = {
      x: Math.min(...rects.map(r => r.left)),
      y: Math.min(...rects.map(r => r.top)),
      width: Math.max(...rects.map(r => r.right)) - Math.min(...rects.map(r => r.left)),
      height: Math.max(...rects.map(r => r.bottom)) - Math.min(...rects.map(r => r.top))
    };

    // Get scroll position for proper positioning
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    // Send selection to parent
    window.parent.postMessage({
      type: 'HTML_TEXT_SELECTION',
      payload: {
        text: text,
        boundingRect: boundingRect,
        scrollPosition: { x: scrollX, y: scrollY },
        pageHeight: document.documentElement.scrollHeight,
        pageWidth: document.documentElement.scrollWidth
      }
    }, '*');

    // Clear selection after sending
    selection.removeAllRanges();
  });

  // Notify parent that selection handler is ready
  window.parent.postMessage({ type: 'HTML_SELECTION_READY' }, '*');
})();
</script>
`;

export function HTMLViewer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const selectedFile = useAppStore((state) => state.selectedPdf);
  const nodes = useAppStore((state) => state.nodes);
  const highlights = useAppStore((state) => state.highlights);
  const highlightedRect = useAppStore((state) => state.pdfViewerState.highlightedRect);
  const addNode = useAppStore((state) => state.addNode);
  const addHighlight = useAppStore((state) => state.addHighlight);

  // Fetch HTML content and inject selection script
  useEffect(() => {
    if (!selectedFile || selectedFile.type !== 'html') {
      setHtmlContent(null);
      setIframeReady(false);
      return;
    }

    // Reset iframe ready state when switching files
    setIframeReady(false);

    const fetchHtml = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = getHtmlUrl(selectedFile.path);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch HTML: ${response.status}`);
        }

        let html = await response.text();

        // Inject selection script before closing body tag (or at end if no body)
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${SELECTION_SCRIPT}</body>`);
        } else if (html.includes('</html>')) {
          html = html.replace('</html>', `${SELECTION_SCRIPT}</html>`);
        } else {
          html = html + SELECTION_SCRIPT;
        }

        // Add base tag to fix relative URLs
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        if (!html.includes('<base')) {
          if (html.includes('<head>')) {
            html = html.replace('<head>', `<head><base href="${baseUrl}">`);
          } else if (html.includes('<html>')) {
            html = html.replace('<html>', `<html><head><base href="${baseUrl}"></head>`);
          }
        }

        setHtmlContent(html);
      } catch (err) {
        console.error('Failed to load HTML:', err);
        setError(err instanceof Error ? err.message : 'Failed to load HTML');
      } finally {
        setLoading(false);
      }
    };

    fetchHtml();
  }, [selectedFile]);

  // Filter highlights for this HTML file
  const htmlHighlights = highlights.filter(
    (h) => h.pdfPath === selectedFile?.path
  );

  // Send highlights to iframe when ready or when highlights change
  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) return;

    // Find active highlight (from jumpToSource)
    const activeNode = nodes.find(
      (n) =>
        n.data.sourcePdf === selectedFile?.path &&
        highlightedRect?.pageIndex === n.data.location.pageIndex
    );

    iframeRef.current.contentWindow.postMessage(
      {
        type: 'UPDATE_HTML_HIGHLIGHTS',
        highlights: htmlHighlights,
        activeHighlightId: activeNode?.id || null,
      },
      '*'
    );
  }, [iframeReady, htmlHighlights, nodes, selectedFile, highlightedRect]);

  // Handle selection messages from iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Handle iframe ready signal
    if (event.data?.type === 'HTML_SELECTION_READY') {
      setIframeReady(true);
      return;
    }

    if (event.data?.type === 'HTML_TEXT_SELECTION') {
      const { text, boundingRect, scrollPosition, pageHeight } = event.data.payload;

      // Create snippet node from HTML selection
      const nodeId = `node-${Date.now()}`;
      const newNode: SnippetNode = {
        id: nodeId,
        type: 'snippetNode',
        data: {
          label: text,
          sourcePdf: selectedFile?.path || '',
          sourceName: selectedFile?.name || 'Unknown',
          sourceType: 'html',
          location: {
            pageIndex: 0, // HTML doesn't have pages, use 0
            rect: {
              x: boundingRect.x,
              y: boundingRect.y + scrollPosition.y, // Include scroll position
              width: boundingRect.width,
              height: boundingRect.height,
            },
            highlightRects: [{
              x: boundingRect.x,
              y: boundingRect.y + scrollPosition.y,
              width: boundingRect.width,
              height: boundingRect.height,
            }],
          },
          comments: [],
        },
        position: {
          x: 100 + (nodes.length * 30) % 400,
          y: 100 + (nodes.length * 30) % 400,
        },
      };

      addNode(newNode);

      // Add highlight for rendering
      addHighlight({
        id: nodeId,
        pdfPath: selectedFile?.path || '',
        pageIndex: 0,
        rects: [{
          x: boundingRect.x,
          y: boundingRect.y + scrollPosition.y,
          width: boundingRect.width,
          height: boundingRect.height,
        }],
      });
    }
  }, [selectedFile, nodes.length, addNode, addHighlight]);

  // Listen for messages from iframe
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  if (!selectedFile || selectedFile.type !== 'html') {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No HTML file selected</p>
          <p className="text-sm">Select an HTML snapshot from the library to view</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg">Loading HTML...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <div className="text-center">
          <p className="text-lg mb-2">Failed to load HTML</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white relative">
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent || ''}
        className="w-full h-full border-0"
        sandbox="allow-same-origin allow-scripts allow-popups"
        title="HTML Snapshot"
      />
      {/* Selection hint */}
      <div className="absolute bottom-4 right-4 bg-green-100 text-green-800 text-xs px-3 py-1.5 rounded-full shadow-sm pointer-events-none opacity-75">
        Select text to create snippets
      </div>
    </div>
  );
}
