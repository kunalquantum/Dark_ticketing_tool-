import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ticketsApi, type TicketStatus, type Priority } from '../api/tickets';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import CommentThread from '../components/CommentThread';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.get(id!).then((r) => r.data.ticket),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data.users),
  });

  const update = useMutation({
    mutationFn: (data: Parameters<typeof ticketsApi.update>[1]) => ticketsApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const deleteTicket = useMutation({
    mutationFn: () => ticketsApi.delete(id!),
    onSuccess: () => navigate('/tickets'),
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-3 text-ink-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Loading…
      </div>
    );
  }
  if (!ticketData) return <div className="p-8 text-red-500">Ticket not found</div>;

  const t = ticketData;
  const agents = usersData?.filter((u) => u.isActive) ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-ink-400 mb-6">
        <Link to="/tickets" className="hover:text-ink-700 dark:hover:text-ink-200 transition-colors">Tickets</Link>
        <span className="text-ink-300 dark:text-ink-600">›</span>
        <span className="font-mono text-ink-600 dark:text-ink-300">#{t.id.slice(-6)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              {editing ? (
                <input
                  defaultValue={t.title}
                  className="input text-lg font-semibold flex-1"
                  onBlur={(e) => {
                    if (e.target.value !== t.title) update.mutate({ title: e.target.value });
                    setEditing(false);
                  }}
                  autoFocus
                />
              ) : (
                <h1
                  className="text-xl font-semibold text-ink-900 dark:text-white flex-1 cursor-pointer hover:text-violet-700 dark:hover:text-violet-400 transition-colors"
                  onClick={() => setEditing(true)}
                  title="Click to edit"
                >
                  {t.title}
                </h1>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </div>

            <p className="text-ink-700 dark:text-ink-200 whitespace-pre-wrap leading-relaxed">{t.description}</p>

            <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-ink-700 text-xs text-ink-400">
              <span>
                Created by{' '}
                <span className="font-medium text-ink-600 dark:text-ink-300">{t.createdBy.name}</span>
              </span>
              <span>{format(new Date(t.createdAt), 'MMM d, yyyy · HH:mm')}</span>
              {t.resolvedAt && (
                <span>Resolved {formatDistanceToNow(new Date(t.resolvedAt), { addSuffix: true })}</span>
              )}
            </div>
          </div>

          <CommentThread ticketId={id!} />

          {t.history.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-400 mb-4">Activity</h3>
              <div className="space-y-3">
                {t.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-ink-700 flex items-center justify-center text-ink-400 dark:text-ink-300 flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-ink-600 dark:text-ink-300">{h.user.name}</span>
                    <span>changed</span>
                    <span className="font-medium text-ink-700 dark:text-ink-200">{h.field}</span>
                    {h.oldValue && (
                      <><span>from</span><span className="line-through text-ink-400">{h.oldValue}</span></>
                    )}
                    <span>to</span>
                    <span className="font-medium text-ink-700 dark:text-ink-200">{h.newValue}</span>
                    <span className="ml-auto text-ink-400">
                      {formatDistanceToNow(new Date(h.changedAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">Properties</p>

            <div>
              <label className="label">Status</label>
              <select value={t.status} onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })} className="input" disabled={update.isPending}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Priority</label>
              <select value={t.priority} onChange={(e) => update.mutate({ priority: e.target.value as Priority })} className="input" disabled={update.isPending}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Assigned to</label>
              <select value={t.assignedTo?.id ?? ''} onChange={(e) => update.mutate({ assignedToId: e.target.value || null })} className="input" disabled={update.isPending}>
                <option value="">Unassigned</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {user && !t.assignedTo && (
                <button onClick={() => update.mutate({ assignedToId: user.id })} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 mt-1.5 font-medium">
                  Assign to me →
                </button>
              )}
            </div>
          </div>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => { if (confirm('Delete this ticket? This cannot be undone.')) deleteTicket.mutate(); }}
              className="btn btn-danger w-full justify-center"
              disabled={deleteTicket.isPending}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete ticket
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
