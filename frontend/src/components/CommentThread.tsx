import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { commentsApi } from '../api/comments';
import clsx from 'clsx';

export default function CommentThread({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data } = useQuery({
    queryKey: ['comments', ticketId],
    queryFn: () => commentsApi.list(ticketId).then((r) => r.data.comments),
  });

  const addComment = useMutation({
    mutationFn: (vars: { body: string; isInternal: boolean }) =>
      commentsApi.create(ticketId, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', ticketId] });
      setBody('');
    },
  });

  const comments = data ?? [];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-ink-400">Thread</h3>

      {comments.length === 0 && (
        <p className="text-sm text-ink-400 italic py-4 text-center">No comments yet.</p>
      )}

      {comments.map((c) => (
        <div
          key={c.id}
          className={clsx(
            'rounded-xl px-4 py-3 text-sm border',
            c.isInternal
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
              : 'bg-white dark:bg-ink-800 border-slate-200 dark:border-ink-700 shadow-card'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {c.user.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-ink-800 dark:text-ink-100">{c.user.name}</span>
              {c.isInternal && (
                <span className="badge bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800">
                  Internal
                </span>
              )}
            </div>
            <span className="text-xs text-ink-400">
              {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-ink-700 dark:text-ink-200 whitespace-pre-wrap leading-relaxed pl-8">{c.body}</p>
        </div>
      ))}

      <div className="card overflow-hidden mt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a reply…"
          rows={4}
          className="w-full px-4 py-3 text-sm resize-none focus:outline-none bg-white dark:bg-ink-800 text-ink-800 dark:text-ink-100 placeholder-ink-400"
        />
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-ink-700 bg-slate-50/70 dark:bg-ink-900/50">
          <label className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded accent-violet-600"
            />
            Internal note
          </label>
          <button
            onClick={() => body.trim() && addComment.mutate({ body: body.trim(), isInternal })}
            disabled={!body.trim() || addComment.isPending}
            className="btn btn-primary"
          >
            {addComment.isPending ? 'Posting…' : 'Post reply'}
          </button>
        </div>
      </div>
    </div>
  );
}
