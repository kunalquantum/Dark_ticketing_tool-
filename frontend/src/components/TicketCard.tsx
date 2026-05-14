import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { Ticket } from '../api/tickets';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Link to={`/tickets/${ticket.id}`} className="block card-hover group cursor-pointer">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink-900 dark:text-ink-100 truncate group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
              {ticket.title}
            </p>
            <p className="text-sm text-ink-400 mt-0.5 line-clamp-1">{ticket.description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-ink-700">
          <span className="text-[11px] font-mono text-ink-400">#{ticket.id.slice(-6)}</span>
          {ticket.assignedTo ? (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-violet-200 dark:bg-violet-900/60 flex items-center justify-center text-violet-700 dark:text-violet-300 text-[9px] font-bold">
                {ticket.assignedTo.name.charAt(0)}
              </div>
              <span className="text-xs text-ink-500 dark:text-ink-400">{ticket.assignedTo.name}</span>
            </div>
          ) : (
            <span className="text-xs text-amber-500 font-medium">Unassigned</span>
          )}
          <span className="text-xs text-ink-400 ml-auto">
            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
          </span>
          {ticket._count && ticket._count.comments > 0 && (
            <div className="flex items-center gap-1 text-xs text-ink-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {ticket._count.comments}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
