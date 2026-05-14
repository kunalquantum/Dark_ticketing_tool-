import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { usersApi, type User } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'AGENT';
}

export default function Users() {
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    defaultValues: { role: 'AGENT' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data.users),
  });

  const create = useMutation({
    mutationFn: (d: CreateForm) => usersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowCreate(false); reset(); },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usersApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const users = data ?? [];

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-8 flex items-center gap-3 text-red-500">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Admin access required.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Team</h1>
          <p className="text-sm text-ink-400 mt-0.5">{users.length} member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className={showCreate ? 'btn btn-secondary' : 'btn btn-primary'}>
          {showCreate ? 'Cancel' : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Member
            </>
          )}
        </button>
      </div>

      {showCreate && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-ink-900 dark:text-white mb-4">New Team Member</h2>
          <form onSubmit={handleSubmit((d) => create.mutate(d))} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Full name" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email', { required: true })} type="email" className="input" placeholder="email@company.com" />
            </div>
            <div>
              <label className="label">Password *</label>
              <input {...register('password', { required: true, minLength: 8 })} type="password" className="input" placeholder="Min 8 characters" />
              {errors.password && <p className="text-xs text-red-500 mt-1">Minimum 8 characters required</p>}
            </div>
            <div>
              <label className="label">Role</label>
              <select {...register('role')} className="input">
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3 pt-1">
              <button type="submit" disabled={create.isPending} className="btn btn-primary">
                {create.isPending ? 'Creating…' : 'Create member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 text-ink-400 py-8">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading…
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 dark:border-ink-700">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-ink-400">Member</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-ink-400">Email</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-ink-400">Role</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-ink-400">Joined</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest text-ink-400">Status</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-ink-700">
            {users.map((u: User) => (
              <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-ink-700/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-ink-900 dark:text-ink-100 leading-none">{u.name}</p>
                      {u.id === currentUser?.id && <span className="text-[10px] text-ink-400 mt-0.5 block">you</span>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{u.email}</td>
                <td className="px-5 py-3.5">
                  <span className={`badge ${u.role === 'ADMIN' ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-800' : 'bg-slate-100 dark:bg-ink-700 text-slate-500 dark:text-ink-300 ring-1 ring-slate-200 dark:ring-ink-600'}`}>
                    {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-ink-400 font-mono text-xs">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-ink-600'}`} />
                    <span className={`text-xs font-medium ${u.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {u.id !== currentUser?.id && (
                    <button onClick={() => toggle.mutate({ id: u.id, isActive: !u.isActive })} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 font-medium">
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
