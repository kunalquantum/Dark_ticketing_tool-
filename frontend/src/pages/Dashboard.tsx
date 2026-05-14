import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { formatDistanceToNow } from 'date-fns';

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, sub, accent = 'text-ink-900 dark:text-white', icon }: StatCardProps) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">{label}</p>
          <p className={`text-3xl font-bold mt-1.5 ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-ink-700 flex items-center justify-center text-ink-400 dark:text-ink-300 flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
    refetchInterval: 5_000,
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

  const stats = data!.stats;
  const recentTickets = data!.recentTickets;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-ink-400 mt-0.5">Overview of your support queue</p>
        </div>
        <Link to="/tickets/new" className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Ticket
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Open" value={stats.open} accent="text-violet-700 dark:text-violet-400"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3"/></svg>}
        />
        <StatCard label="In Progress" value={stats.inProgress} accent="text-amber-600 dark:text-amber-400"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
        />
        <StatCard label="Resolved" value={stats.resolved} accent="text-emerald-600 dark:text-emerald-400"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="Closed" value={stats.closed} accent="text-ink-500 dark:text-ink-400"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Urgent" value={stats.urgent}
          accent={stats.urgent > 0 ? 'text-red-600 dark:text-red-400' : 'text-ink-900 dark:text-white'}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
        />
        <StatCard label="Unassigned" value={stats.unassigned}
          accent={stats.unassigned > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-ink-900 dark:text-white'}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
        />
        <StatCard label="Avg Resolution"
          value={stats.avgResolutionHours !== null ? `${stats.avgResolutionHours}h` : '—'}
          sub="based on last 100 resolved"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-ink-700 flex items-center justify-between">
          <h2 className="font-semibold text-ink-900 dark:text-white">Active Tickets</h2>
          <Link to="/tickets" className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-ink-700">
          {recentTickets.length === 0 && (
            <p className="px-5 py-10 text-sm text-ink-400 text-center">No active tickets. All clear!</p>
          )}
          {recentTickets.map((t) => (
            <Link key={t.id} to={`/tickets/${t.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-ink-700/40 transition-colors group"
            >
              <span className="text-[11px] font-mono text-ink-400 w-14 flex-shrink-0">#{t.id.slice(-6)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 dark:text-ink-100 truncate group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">{t.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">
                  {t.assignedTo ? t.assignedTo.name : <span className="text-amber-500">Unassigned</span>}
                  {' · '}
                  {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
