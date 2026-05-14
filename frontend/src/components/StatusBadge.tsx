import clsx from 'clsx';
import type { TicketStatus } from '../api/tickets';

const styles: Record<TicketStatus, string> = {
  OPEN:        'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  RESOLVED:    'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  CLOSED:      'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const dots: Record<TicketStatus, string> = {
  OPEN:        'bg-violet-500',
  IN_PROGRESS: 'bg-amber-500',
  RESOLVED:    'bg-emerald-500',
  CLOSED:      'bg-slate-400',
};

const labels: Record<TicketStatus, string> = {
  OPEN:        'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED:    'Resolved',
  CLOSED:      'Closed',
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={clsx('badge gap-1.5', styles[status])}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', dots[status])} />
      {labels[status]}
    </span>
  );
}
