import { store } from '../lib/localStore';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  isActive: boolean;
  createdAt: string;
}

function wrap<T>(data: T): Promise<{ data: T }> {
  return Promise.resolve({ data });
}

export const usersApi = {
  list() {
    return wrap({ users: store.getUsers() });
  },

  create(data: { name: string; email: string; password: string; role?: 'ADMIN' | 'AGENT' }) {
    const user = store.createUser({ name: data.name, email: data.email, role: data.role ?? 'AGENT' });
    return wrap({ user });
  },

  update(id: string, data: Partial<{ name: string; email: string; role: 'ADMIN' | 'AGENT'; isActive: boolean; password: string }>) {
    const user = store.updateUser(id, data);
    return wrap({ user });
  },
};
