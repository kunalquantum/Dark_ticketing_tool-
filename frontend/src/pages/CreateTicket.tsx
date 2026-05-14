import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ticketsApi, type Priority } from '../api/tickets';
import { usersApi } from '../api/users';

interface FormData {
  title: string;
  description: string;
  priority: Priority;
  assignedToId: string;
}

export default function CreateTicket() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { priority: 'MEDIUM' },
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data.users),
  });

  const create = useMutation({
    mutationFn: (data: FormData) =>
      ticketsApi.create({ ...data, assignedToId: data.assignedToId || undefined }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/tickets/${r.data.ticket.id}`);
    },
  });

  const agents = usersData?.filter((u) => u.isActive) ?? [];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-ink-400 mb-6">
        <button onClick={() => navigate(-1)} className="hover:text-ink-700 dark:hover:text-ink-200 transition-colors">Tickets</button>
        <span className="text-ink-300 dark:text-ink-600">›</span>
        <span className="text-ink-600 dark:text-ink-300">New Ticket</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Create Ticket</h1>
        <p className="text-sm text-ink-400 mt-0.5">Describe the issue in as much detail as possible</p>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-5">
          <div>
            <label className="label">Title *</label>
            <input {...register('title', { required: 'Title is required', maxLength: 200 })} className="input" placeholder="Brief summary of the issue" />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea {...register('description', { required: 'Description is required' })} className="input" rows={6} placeholder="Full details of the issue — steps to reproduce, expected vs actual behavior…" />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select {...register('priority')} className="input">
                <option value="LOW">↓ Low</option>
                <option value="MEDIUM">→ Medium</option>
                <option value="HIGH">↑ High</option>
                <option value="URGENT">⚡ Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Assign to</label>
              <select {...register('assignedToId')} className="input">
                <option value="">Unassigned</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {create.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              Failed to create ticket. Please try again.
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={create.isPending} className="btn btn-primary">
              {create.isPending ? 'Creating…' : 'Create ticket'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
