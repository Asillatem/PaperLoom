import { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  BookOpen,
  Link,
  FileText,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { getItemMetadata, type ItemMetadata } from '../api';

interface SnippetMetadataPanelProps {
  attachmentKey: string;
  onClose: () => void;
}

export function SnippetMetadataPanel({ attachmentKey, onClose }: SnippetMetadataPanelProps) {
  const [metadata, setMetadata] = useState<ItemMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMetadata() {
      setLoading(true);
      setError(null);

      try {
        const data = await getItemMetadata(attachmentKey);
        if (!cancelled) {
          setMetadata(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load metadata');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [attachmentKey]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDOI = (doi: string) => {
    if (doi.startsWith('http')) return doi;
    return `https://doi.org/${doi}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-[480px] max-w-full h-full bg-white shadow-xl border-l-4 border-blue-900 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-blue-900 bg-blue-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-900" />
            <h2 className="font-extrabold text-blue-900 uppercase tracking-wide text-sm">
              Source Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-blue-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-blue-900" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {metadata && !loading && (
            <div className="space-y-5">
              {/* Title */}
              <div>
                <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                  {metadata.title}
                </h3>
                {metadata.publicationTitle && (
                  <p className="text-sm text-neutral-500 mt-1 italic">
                    {metadata.publicationTitle}
                  </p>
                )}
              </div>

              {/* Authors */}
              {metadata.authors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    <User className="w-3.5 h-3.5" />
                    Authors
                  </div>
                  <p className="text-sm text-neutral-800">
                    {metadata.authors.join(', ')}
                  </p>
                </div>
              )}

              {/* Publication Date */}
              {metadata.publicationDate && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    <Calendar className="w-3.5 h-3.5" />
                    Publication Date
                  </div>
                  <p className="text-sm text-neutral-800">
                    {metadata.publicationDate}
                  </p>
                </div>
              )}

              {/* DOI */}
              {metadata.doi && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    <Link className="w-3.5 h-3.5" />
                    DOI
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={formatDOI(metadata.doi)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                    >
                      {metadata.doi}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(metadata.doi, 'doi')}
                      className="p-1 hover:bg-neutral-100 rounded transition-colors"
                      title="Copy DOI"
                    >
                      {copiedField === 'doi' ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Abstract */}
              {metadata.abstract && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    <FileText className="w-3.5 h-3.5" />
                    Abstract
                  </div>
                  <div className="relative">
                    <p className="text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-3 border border-neutral-200 max-h-64 overflow-y-auto">
                      {metadata.abstract}
                    </p>
                    <button
                      onClick={() => copyToClipboard(metadata.abstract, 'abstract')}
                      className="absolute top-2 right-2 p-1 bg-white hover:bg-neutral-100 rounded border border-neutral-200 transition-colors"
                      title="Copy abstract"
                    >
                      {copiedField === 'abstract' ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* URL */}
              {metadata.url && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    <ExternalLink className="w-3.5 h-3.5" />
                    URL
                  </div>
                  <a
                    href={metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 hover:text-blue-900 hover:underline break-all flex items-center gap-1"
                  >
                    {metadata.url}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* File info */}
              <div className="pt-4 border-t border-neutral-200">
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="px-2 py-1 bg-neutral-100 rounded uppercase font-medium">
                    {metadata.fileType}
                  </span>
                  <span className="truncate" title={metadata.filename}>
                    {metadata.filename}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* No metadata available */}
          {!loading && !error && metadata && !metadata.authors.length && !metadata.doi && !metadata.abstract && !metadata.publicationDate && (
            <div className="text-center py-8 text-neutral-500 text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p>No additional metadata available for this item.</p>
              <p className="mt-1 text-xs">Try syncing your Zotero library.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
