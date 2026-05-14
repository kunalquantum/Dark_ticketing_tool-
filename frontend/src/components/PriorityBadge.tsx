import clsx from 'clsx';
import type { Priority } from '../api/tickets';

const styles: Record<Priority, string> = {
  LOW:    'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  MEDIUM: 'bg-blue-100 text-blue-600 ring-1 ring-blue-200',
  HIGH:   'bg-orange-100 text-orange-600 ring-1 ring-orange-200',
  URGENT: 'bg-red-100 text-red-600 ring-1 ring-red-200',
};

const icons: Record<Priority, string> = {
  LOW: '↓', MEDIUM: '→', HIGH: '↑', URGENT: '⚡',
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={clsx('badge gap-1', styles[priority])}>
      <span className="text-[10px]">{icons[priority]}</span>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}
