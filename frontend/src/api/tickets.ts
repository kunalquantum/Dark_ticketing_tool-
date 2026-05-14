import { store } from '../lib/localStore';
import { useAuthStore } from '../store/authStore';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TicketUser {
  id: string;
  name: string;
  email: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  createdBy: TicketUser;
  assignedTo: TicketUser | null;
  _count?: { comments: number };
}

export interface HistoryEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  user: { id: string; name: string };
}

export interface TicketDetail extends Ticket {
  history: HistoryEntry[];
}

export interface ListTicketsParams {
  status?: TicketStatus;
  priority?: Priority;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function wrap<T>(data: T): Promise<{ data: T }> {
  return Promise.resolve({ data });
}

export const ticketsApi = {
  list(params: ListTicketsParams = {}) {
    let tickets = store.getTickets();
    if (params.status) tickets = tickets.filter((t) => t.status === params.status);
    if (params.priority) tickets = tickets.filter((t) => t.priority === params.priority);
    if (params.assignedTo === 'me') {
      const me = useAuthStore.getState().user;
      tickets = tickets.filter((t) => t.assignedTo?.id === me?.id);
    } else if (params.assignedTo) {
      tickets = tickets.filter((t) => t.assignedTo?.id === params.assignedTo);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      tickets = tickets.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const total = tickets.length;
    const sliced = tickets.slice((page - 1) * limit, page * limit);
    return wrap({ tickets: sliced, total, page, pages: Math.ceil(total / limit) });
  },

  get(id: string) {
    const ticket = store.getTicketById(id);
    if (!ticket) return Promise.reject(new Error('Ticket not found'));
    return wrap({ ticket });
  },

  create(data: { title: string; description: string; priority?: Priority; assignedToId?: string }) {
    const me = useAuthStore.getState().user!;
    const meUser = store.getUserById(me.id) ?? { id: me.id, name: me.name, email: me.email, role: me.role as 'ADMIN' | 'AGENT', isActive: true, createdAt: new Date().toISOString() };
    const ticket = store.createTicket({ title: data.title, description: data.description, priority: data.priority ?? 'MEDIUM', assignedToId: data.assignedToId }, meUser);
    return wrap({ ticket });
  },

  update(id: string, data: Partial<{ title: string; description: string; status: TicketStatus; priority: Priority; assignedToId: string | null }>) {
    const me = useAuthStore.getState().user!;
    const meUser = store.getUserById(me.id) ?? { id: me.id, name: me.name, email: me.email, role: me.role as 'ADMIN' | 'AGENT', isActive: true, createdAt: new Date().toISOString() };
    const ticket = store.updateTicket(id, data, meUser);
    return wrap({ ticket });
  },

  delete(id: string) {
    store.deleteTicket(id);
    return wrap({ ok: true });
  },
};
