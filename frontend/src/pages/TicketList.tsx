import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ticketsApi, type TicketStatus, type Priority } from '../api/tickets';
import TicketCard from '../components/TicketCard';

const STATUSES: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITIES: { value: Priority | ''; label: string }[] = [
  { value: '', label: 'All priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function TicketList() {
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { status, priority, assignedToMe, search, page }],
    queryFn: () =>
      ticketsApi.list({
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedToMe && { assignedTo: 'me' }),
        ...(search && { search }),
        page,
        limit: 20,
      }).then((r) => r.data),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Tickets</h1>
          {data && <p className="text-sm text-ink-400 mt-0.5">{data.total} total</p>}
        </div>
        <Link to="/tickets/new" className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Ticket
        </Link>
      </div>

      <div className="card px-4 py-3 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-8 w-full"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value as TicketStatus | ''); setPage(1); }} className="input w-40">
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={priority} onChange={(e) => { setPriority(e.target.value as Priority | ''); setPage(1); }} className="input w-40">
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={assignedToMe} onChange={(e) => { setAssignedToMe(e.target.checked); setPage(1); }} className="rounded accent-violet-600" />
          Assigned to me
        </label>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-ink-400 py-8 justify-center">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading…
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="space-y-2 mb-6">
            {data.tickets.length === 0 && (
              <div className="card px-6 py-14 text-center">
                <p className="text-ink-400 text-sm">No tickets found.</p>
                <Link to="/tickets/new" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 text-sm font-medium mt-1 inline-block">
                  Create one →
                </Link>
              </div>
            )}
            {data.tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-ink-400">
              <span>{data.total} tickets · page {data.page} of {data.pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="btn btn-secondary">← Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages} className="btn btn-secondary">Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
