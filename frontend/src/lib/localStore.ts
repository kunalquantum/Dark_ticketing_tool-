import type { Ticket, TicketStatus, Priority, HistoryEntry } from '../api/tickets';
import type { Comment } from '../api/comments';
import type { User } from '../api/users';

// ── Seed data ────────────────────────────────────────────────────────────────

const SEED_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'u2', name: 'Alice Agent', email: 'alice@example.com', role: 'AGENT', isActive: true, createdAt: '2024-01-02T00:00:00Z' },
  { id: 'u3', name: 'Bob Agent', email: 'bob@example.com', role: 'AGENT', isActive: true, createdAt: '2024-01-03T00:00:00Z' },
];

const SEED_TICKETS: (Ticket & { history: HistoryEntry[] })[] = [
  {
    id: 't1', title: 'Cannot login to account', description: 'User reports being unable to log in after password reset.',
    status: 'OPEN', priority: 'HIGH',
    createdAt: new Date(Date.now() - 3600_000 * 5).toISOString(), updatedAt: new Date(Date.now() - 3600_000 * 2).toISOString(), resolvedAt: null,
    createdBy: { id: 'u1', name: 'Admin User', email: 'admin@example.com' },
    assignedTo: { id: 'u2', name: 'Alice Agent', email: 'alice@example.com' },
    _count: { comments: 2 }, history: [],
  },
  {
    id: 't2', title: 'Billing discrepancy on invoice #4521', description: 'Customer was charged twice for the same subscription.',
    status: 'IN_PROGRESS', priority: 'URGENT',
    createdAt: new Date(Date.now() - 3600_000 * 10).toISOString(), updatedAt: new Date(Date.now() - 3600_000 * 1).toISOString(), resolvedAt: null,
    createdBy: { id: 'u1', name: 'Admin User', email: 'admin@example.com' },
    assignedTo: { id: 'u3', name: 'Bob Agent', email: 'bob@example.com' },
    _count: { comments: 1 }, history: [],
  },
];

const SEED_COMMENTS: Comment[] = [
  { id: 'c1', ticketId: 't1', body: 'Looking into this now. Can you confirm the email?', isInternal: false, createdAt: new Date(Date.now() - 3600_000 * 3).toISOString(), user: { id: 'u2', name: 'Alice Agent', email: 'alice@example.com', role: 'AGENT' } },
  { id: 'c2', ticketId: 't1', body: 'Internal: check if the password reset token expired.', isInternal: true, createdAt: new Date(Date.now() - 3600_000 * 2).toISOString(), user: { id: 'u1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' } },
  { id: 'c3', ticketId: 't2', body: 'I can see the duplicate charge. Initiating refund.', isInternal: false, createdAt: new Date(Date.now() - 3600_000 * 8).toISOString(), user: { id: 'u3', name: 'Bob Agent', email: 'bob@example.com', role: 'AGENT' } },
];

// ── Storage helpers ───────────────────────────────────────────────────────────

function load<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : seed;
  } catch { return seed; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── Public API ────────────────────────────────────────────────────────────────

export const store = {
  // Users
  getUsers(): User[] {
    return load('ttool_users', SEED_USERS);
  },
  saveUsers(users: User[]) {
    save('ttool_users', users);
  },
  getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  },
  createUser(data: { name: string; email: string; role: 'ADMIN' | 'AGENT' }): User {
    const users = this.getUsers();
    const user: User = { ...data, id: uid(), isActive: true, createdAt: new Date().toISOString() };
    this.saveUsers([...users, user]);
    return user;
  },
  updateUser(id: string, patch: Partial<User>): User {
    const users = this.getUsers().map((u) => u.id === id ? { ...u, ...patch } : u);
    this.saveUsers(users);
    return users.find((u) => u.id === id)!;
  },

  // Tickets
  getTickets(): (Ticket & { history: HistoryEntry[] })[] {
    return load('ttool_tickets', SEED_TICKETS);
  },
  saveTickets(tickets: (Ticket & { history: HistoryEntry[] })[]) {
    save('ttool_tickets', tickets);
  },
  getTicketById(id: string) {
    return this.getTickets().find((t) => t.id === id);
  },
  createTicket(data: { title: string; description: string; priority: Priority; assignedToId?: string }, createdBy: User): Ticket & { history: HistoryEntry[] } {
    const tickets = this.getTickets();
    const assignedTo = data.assignedToId ? this.getUserById(data.assignedToId) ?? null : null;
    const ticket: Ticket & { history: HistoryEntry[] } = {
      id: uid(), title: data.title, description: data.description,
      status: 'OPEN', priority: data.priority,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), resolvedAt: null,
      createdBy: { id: createdBy.id, name: createdBy.name, email: createdBy.email },
      assignedTo: assignedTo ? { id: assignedTo.id, name: assignedTo.name, email: assignedTo.email } : null,
      _count: { comments: 0 }, history: [],
    };
    this.saveTickets([ticket, ...tickets]);
    return ticket;
  },
  updateTicket(id: string, patch: Partial<{ title: string; description: string; status: TicketStatus; priority: Priority; assignedToId: string | null }>, changedBy: User): Ticket & { history: HistoryEntry[] } {
    const tickets = this.getTickets().map((t) => {
      if (t.id !== id) return t;
      const updates: Partial<Ticket & { history: HistoryEntry[] }> = { updatedAt: new Date().toISOString() };
      const newHistory: HistoryEntry[] = [];

      if (patch.title !== undefined && patch.title !== t.title) {
        newHistory.push({ id: uid(), field: 'title', oldValue: t.title, newValue: patch.title, changedAt: new Date().toISOString(), user: { id: changedBy.id, name: changedBy.name } });
        updates.title = patch.title;
      }
      if (patch.description !== undefined) updates.description = patch.description;
      if (patch.status !== undefined && patch.status !== t.status) {
        newHistory.push({ id: uid(), field: 'status', oldValue: t.status, newValue: patch.status, changedAt: new Date().toISOString(), user: { id: changedBy.id, name: changedBy.name } });
        updates.status = patch.status;
        if (patch.status === 'RESOLVED') updates.resolvedAt = new Date().toISOString();
        else if (t.status === 'RESOLVED') updates.resolvedAt = null;
      }
      if (patch.priority !== undefined && patch.priority !== t.priority) {
        newHistory.push({ id: uid(), field: 'priority', oldValue: t.priority, newValue: patch.priority, changedAt: new Date().toISOString(), user: { id: changedBy.id, name: changedBy.name } });
        updates.priority = patch.priority;
      }
      if ('assignedToId' in patch) {
        const newAssignee = patch.assignedToId ? this.getUserById(patch.assignedToId) ?? null : null;
        updates.assignedTo = newAssignee ? { id: newAssignee.id, name: newAssignee.name, email: newAssignee.email } : null;
        newHistory.push({ id: uid(), field: 'assignedTo', oldValue: t.assignedTo?.name ?? null, newValue: newAssignee?.name ?? null, changedAt: new Date().toISOString(), user: { id: changedBy.id, name: changedBy.name } });
      }

      return { ...t, ...updates, history: [...t.history, ...newHistory] };
    });
    this.saveTickets(tickets);
    return tickets.find((t) => t.id === id)!;
  },
  deleteTicket(id: string) {
    this.saveTickets(this.getTickets().filter((t) => t.id !== id));
    save('ttool_comments', this.getComments().filter((c) => c.ticketId !== id));
  },

  // Comments
  getComments(): Comment[] {
    return load('ttool_comments', SEED_COMMENTS);
  },
  getCommentsByTicket(ticketId: string): Comment[] {
    return this.getComments().filter((c) => c.ticketId === ticketId);
  },
  createComment(ticketId: string, data: { body: string; isInternal: boolean }, author: User): Comment {
    const comment: Comment = {
      id: uid(), ticketId, body: data.body, isInternal: data.isInternal,
      createdAt: new Date().toISOString(),
      user: { id: author.id, name: author.name, email: author.email, role: author.role },
    };
    save('ttool_comments', [...this.getComments(), comment]);
    // update _count on ticket
    const tickets = this.getTickets().map((t) =>
      t.id === ticketId ? { ...t, _count: { comments: (t._count?.comments ?? 0) + 1 }, updatedAt: new Date().toISOString() } : t
    );
    this.saveTickets(tickets);
    return comment;
  },
};
