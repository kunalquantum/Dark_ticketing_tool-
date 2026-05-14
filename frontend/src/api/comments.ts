import { store } from '../lib/localStore';
import { useAuthStore } from '../store/authStore';

export interface Comment {
  id: string;
  ticketId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string };
}

function wrap<T>(data: T): Promise<{ data: T }> {
  return Promise.resolve({ data });
}

export const commentsApi = {
  list(ticketId: string) {
    return wrap({ comments: store.getCommentsByTicket(ticketId) });
  },

  create(ticketId: string, data: { body: string; isInternal?: boolean }) {
    const me = useAuthStore.getState().user!;
    const meUser = store.getUserById(me.id) ?? { id: me.id, name: me.name, email: me.email, role: me.role as 'ADMIN' | 'AGENT', isActive: true, createdAt: new Date().toISOString() };
    const comment = store.createComment(ticketId, { body: data.body, isInternal: data.isInternal ?? false }, meUser);
    return wrap({ comment });
  },
};
