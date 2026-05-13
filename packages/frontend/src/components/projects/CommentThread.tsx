import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────

interface CommentUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

interface Comment {
  id: string;
  projectId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  replies?: Comment[];
}

interface CommentThreadProps {
  projectId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getRelativeTime(dateString: string, t: (key: string, defaultValue: string, options?: Record<string, unknown>) => string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {return t('time.justNow', 'just now');}
  if (diffMin < 60) {return t('time.minutesAgo', '{{count}}m ago', { count: diffMin });}
  if (diffHour < 24) {return t('time.hoursAgo', '{{count}}h ago', { count: diffHour });}
  if (diffDay < 30) {return t('time.daysAgo', '{{count}}d ago', { count: diffDay });}
  return new Date(dateString).toLocaleDateString();
}

function getInitial(user: CommentUser): string {
  return (user.firstName?.charAt(0) || 'U').toUpperCase();
}

// ── Single Comment Component ───────────────────────────────────────────────

interface SingleCommentProps {
  comment: Comment;
  currentUserId: string | undefined;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  replyingTo: string | null;
  onSubmitReply: (parentId: string, content: string) => Promise<void>;
  onCancelReply: () => void;
  isNested?: boolean;
}

function SingleComment({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  replyingTo,
  onSubmitReply,
  onCancelReply,
  isNested = false,
}: SingleCommentProps): React.ReactElement {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const isOwner = currentUserId === comment.userId;
  const isReplying = replyingTo === comment.id;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== comment.content) {
      onEdit(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {return;}
    setIsSubmittingReply(true);
    try {
      await onSubmitReply(comment.id, replyContent.trim());
      setReplyContent('');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className={`${isNested ? 'ml-8 border-l-2 border-gray-200 dark:border-gray-600 pl-4' : ''}`}>
      <div className="flex gap-3 py-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.user.avatar ? (
            <img
              src={comment.user.avatar}
              alt={`${comment.user.firstName} ${comment.user.lastName}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {getInitial(comment.user)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {comment.user.firstName} {comment.user.lastName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getRelativeTime(comment.createdAt, t)}
            </span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                ({t('comments.edited', 'edited')})
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('comments.save', 'Save')}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                >
                  {t('comments.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-2">
              {!isNested && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {t('comments.reply', 'Reply')}
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('comments.edit', 'Edit')}
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    {t('comments.delete', 'Delete')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Inline Reply Form */}
          {isReplying && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('comments.replyPlaceholder', 'Write a reply...')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || isSubmittingReply}
                  className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReply ? t('comments.sending', 'Sending...') : t('comments.reply', 'Reply')}
                </button>
                <button
                  onClick={() => {
                    setReplyContent('');
                    onCancelReply();
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                >
                  {t('comments.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <SingleComment
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              replyingTo={replyingTo}
              onSubmitReply={onSubmitReply}
              onCancelReply={onCancelReply}
              isNested
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────────────

function CommentSkeleton(): React.ReactElement {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 py-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────

interface DeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmModal({ onConfirm, onCancel, isDeleting }: DeleteModalProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-comment-modal-title"
      onKeyDown={(e) => { if (e.key === 'Escape' && !isDeleting) {onCancel();} }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl" ref={(el) => { if (el) { const btn = el.querySelector<HTMLElement>('button'); btn?.focus(); } }}>
        <h3 id="delete-comment-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('comments.deleteTitle', 'Delete Comment')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('comments.deleteConfirmation', 'Are you sure you want to delete this comment? This action cannot be undone.')}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {t('comments.cancel', 'Cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            {isDeleting ? t('comments.deleting', 'Deleting...') : t('comments.delete', 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main CommentThread Component ───────────────────────────────────────────

export default function CommentThread({ projectId }: CommentThreadProps): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch comments
  useEffect(() => {
    if (!projectId) {return;}

    const controller = new AbortController();

    const fetchComments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/comments?projectId=${encodeURIComponent(projectId)}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load comments');
        }

        const data = await response.json();
        setComments(data.data || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {return;}
        const msg = err instanceof Error ? err.message : 'Failed to load comments';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
    return () => controller.abort();
  }, [projectId, retryCount]);

  // Add a new top-level comment
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || isSubmitting) {return;}

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/comments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, content: newComment.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();
      setComments((prev) => [{ ...data.data, replies: [] }, ...prev]);
      setNewComment('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add comment';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, isSubmitting, projectId]);

  // Submit a reply
  const handleSubmitReply = useCallback(async (parentId: string, content: string) => {
    const response = await fetch('/api/v1/comments', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, content, parentId }),
    });

    if (!response.ok) {
      throw new Error('Failed to add reply');
    }

    const data = await response.json();

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), data.data] };
        }
        return c;
      })
    );
    setReplyingTo(null);
  }, [projectId]);

  // Edit a comment
  const handleEdit = useCallback(async (commentId: string, content: string) => {
    try {
      const response = await fetch(`/api/v1/comments/${commentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit comment');
      }

      const data = await response.json();

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, content: data.data.content, updatedAt: data.data.updatedAt };
          }
          // Check replies
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, content: data.data.content, updatedAt: data.data.updatedAt }
                  : r
              ),
            };
          }
          return c;
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to edit comment';
      setError(msg);
    }
  }, []);

  // Delete a comment
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) {return;}

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/v1/comments/${deleteTarget}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      setComments((prev) =>
        prev
          .filter((c) => c.id !== deleteTarget)
          .map((c) => ({
            ...c,
            replies: c.replies?.filter((r) => r.id !== deleteTarget) || [],
          }))
      );
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete comment';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mt-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('comments.title', 'Comments')}
        {!isLoading && comments.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({comments.length})
          </span>
        )}
      </h2>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setRetryCount((c) => c + 1);
            }}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
          >
            {t('comments.retry', 'Retry')}
          </button>
        </div>
      )}

      {/* Add comment form */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('comments.placeholder', 'Add a comment...')}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            )}
            {isSubmitting ? t('comments.posting', 'Posting...') : t('comments.addComment', 'Comment')}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <CommentSkeleton />
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('comments.empty', 'No comments yet. Be the first to comment!')}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {comments.map((comment) => (
            <SingleComment
              key={comment.id}
              comment={comment}
              currentUserId={user?.userId}
              onReply={(id) => setReplyingTo(replyingTo === id ? null : id)}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteTarget(id)}
              replyingTo={replyingTo}
              onSubmitReply={handleSubmitReply}
              onCancelReply={() => setReplyingTo(null)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
