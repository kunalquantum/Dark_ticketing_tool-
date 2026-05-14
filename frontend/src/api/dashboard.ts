import { store } from '../lib/localStore';
import type { Ticket } from './tickets';

export interface DashboardStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
  unassigned: number;
  avgResolutionHours: number | null;
}

function wrap<T>(data: T): Promise<{ data: T }> {
  return Promise.resolve({ data });
}

export const dashboardApi = {
  stats() {
    const tickets = store.getTickets();
    const open = tickets.filter((t) => t.status === 'OPEN').length;
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;
    const closed = tickets.filter((t) => t.status === 'CLOSED').length;
    const urgent = tickets.filter((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status) && t.priority === 'URGENT').length;
    const unassigned = tickets.filter((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status) && !t.assignedTo).length;

    const resolvedWithTime = tickets.filter((t) => t.resolvedAt);
    let avgResolutionHours: number | null = null;
    if (resolvedWithTime.length > 0) {
      const totalMs = resolvedWithTime.reduce((acc, t) => acc + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0);
      avgResolutionHours = Math.round(totalMs / resolvedWithTime.length / 3_600_000);
    }

    const recentTickets: Ticket[] = tickets
      .filter((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status))
      .slice(0, 10);

    return wrap({
      stats: { open, inProgress, resolved, closed, urgent, unassigned, avgResolutionHours },
      recentTickets,
    });
  },
};
