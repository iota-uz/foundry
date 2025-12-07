'use client';

/**
 * F5: Inline Annotations
 *
 * Floating popover for adding comments to artifacts.
 * Shows existing annotations as badges with click-to-view.
 */

import { useState, useRef, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  ChatBubbleLeftIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import type { ArtifactType } from '@/components/features/history-viewer';

export interface Annotation {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  resolved: boolean;
  replies?: Annotation[];
}

interface AnnotationPopoverProps {
  artifactType: ArtifactType;
  artifactId: string;
  lineNumber?: number;
  annotations?: Annotation[];
  onAddAnnotation?: (text: string, lineNumber?: number) => Promise<void>;
  onResolveAnnotation?: (annotationId: string) => Promise<void>;
  onReplyAnnotation?: (annotationId: string, text: string) => Promise<void>;
}

export function AnnotationPopover({
  artifactType,
  artifactId,
  lineNumber,
  annotations = [],
  onAddAnnotation,
  onResolveAnnotation,
  onReplyAnnotation,
}: AnnotationPopoverProps) {
  const [newAnnotation, setNewAnnotation] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // TODO: WebSocket real-time updates
  // When implemented, subscribe to annotation updates for this artifact
  // Example: useEffect(() => {
  //   const ws = new WebSocket(`ws://localhost:3000/annotations/${artifactType}/${artifactId}`);
  //   ws.onmessage = (event) => {
  //     const update = JSON.parse(event.data);
  //     // Update annotations state with new/updated annotation
  //   };
  //   return () => ws.close();
  // }, [artifactType, artifactId]);

  // Load annotations from API on mount
  useEffect(() => {
    // TODO: Implement API call to load annotations
    // Example: fetchAnnotations(artifactType, artifactId).then(setAnnotations);
  }, [artifactType, artifactId]);

  const unresolvedCount = annotations.filter((a) => !a.resolved).length;

  const handleSubmitAnnotation = async () => {
    if (!newAnnotation.trim() || !onAddAnnotation) return;

    setSubmitting(true);
    try {
      await onAddAnnotation(newAnnotation.trim(), lineNumber);
      setNewAnnotation('');
    } catch (error) {
      console.error('Failed to add annotation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (annotationId: string) => {
    if (!replyText.trim() || !onReplyAnnotation) return;

    setSubmitting(true);
    try {
      await onReplyAnnotation(annotationId, replyText.trim());
      setReplyText('');
      setReplyTo(null);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <Popover className="relative inline-block">
      {() => (
        <>
          <Popover.Button
            className={`
              inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
              transition-colors
              ${
                unresolvedCount > 0
                  ? 'bg-amber-900/40 text-amber-300 border border-amber-700 hover:bg-amber-900/60'
                  : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
              }
            `}
            aria-label={`${unresolvedCount} ${unresolvedCount === 1 ? 'annotation' : 'annotations'}`}
          >
            <ChatBubbleLeftIcon className="h-4 w-4" />
            {annotations.length > 0 && (
              <span className="font-semibold">{annotations.length}</span>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-10 mt-2 w-80 left-0">
              <div className="rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
                {/* Header */}
                <div className="border-b border-gray-700 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white text-sm">Annotations</h3>
                    <Popover.Button className="text-gray-400 hover:text-white transition-colors">
                      <XMarkIcon className="h-4 w-4" />
                    </Popover.Button>
                  </div>
                  {lineNumber !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      Line {lineNumber}
                    </p>
                  )}
                </div>

                {/* Annotations list */}
                <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                  {annotations.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-4">
                      No annotations yet
                    </p>
                  ) : (
                    annotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className={`
                          rounded-lg border p-3 space-y-2
                          ${
                            annotation.resolved
                              ? 'border-gray-700 bg-gray-900/40 opacity-60'
                              : 'border-gray-600 bg-gray-800/40'
                          }
                        `}
                      >
                        {/* Main annotation */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-300">
                              {annotation.author}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(annotation.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-200">{annotation.text}</p>
                        </div>

                        {/* Replies */}
                        {annotation.replies && annotation.replies.length > 0 && (
                          <div className="ml-3 border-l-2 border-gray-700 pl-3 space-y-2">
                            {annotation.replies.map((reply) => (
                              <div key={reply.id}>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-xs font-semibold text-gray-400">
                                    {reply.author}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatTimestamp(reply.timestamp)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300">{reply.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        {!annotation.resolved && (
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                            {replyTo === annotation.id ? (
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write a reply..."
                                  className="flex-1 px-2 py-1 rounded bg-gray-900 border border-gray-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSubmitReply(annotation.id);
                                    }
                                    if (e.key === 'Escape') {
                                      setReplyTo(null);
                                      setReplyText('');
                                    }
                                  }}
                                  autoFocus
                                  aria-label="Reply text"
                                />
                                <button
                                  onClick={() => handleSubmitReply(annotation.id)}
                                  disabled={!replyText.trim() || submitting}
                                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Submit reply"
                                >
                                  Send
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => setReplyTo(annotation.id)}
                                  className="text-xs text-blue-400 hover:text-blue-300"
                                  aria-label="Reply to annotation"
                                >
                                  Reply
                                </button>
                                {onResolveAnnotation && (
                                  <button
                                    onClick={() => onResolveAnnotation(annotation.id)}
                                    className="text-xs text-green-400 hover:text-green-300"
                                    aria-label="Resolve annotation"
                                  >
                                    Resolve
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {annotation.resolved && (
                          <div className="text-xs text-green-400 font-semibold">
                            ✓ Resolved
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add new annotation */}
                {onAddAnnotation && (
                  <div className="border-t border-gray-700 p-4">
                    <textarea
                      ref={textareaRef}
                      value={newAnnotation}
                      onChange={(e) => setNewAnnotation(e.target.value)}
                      placeholder="Add an annotation..."
                      rows={3}
                      className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSubmitAnnotation();
                        }
                      }}
                      aria-label="New annotation text"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to submit
                      </span>
                      <button
                        onClick={handleSubmitAnnotation}
                        disabled={!newAnnotation.trim() || submitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Add annotation"
                      >
                        <PlusIcon className="h-4 w-4" />
                        {submitting ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
