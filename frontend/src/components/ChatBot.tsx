import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { processCommand, type BotState, type ResultData } from '../lib/commandProcessor';
import { useAuthStore } from '../store/authStore';
import { store } from '../lib/localStore';

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  ok?: boolean;
  data?: ResultData;
};

// ── Simple markdown: **bold** and `code` ─────────────────────────────────────

function Md({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
          return (
            <code key={i} className="bg-black/10 dark:bg-white/20 px-1 py-0.5 rounded text-[11px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
        return part.split('\n').map((line, j, arr) => (
          <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
        ));
      })}
    </>
  );
}

// ── Data renderers ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'text-violet-600',
  IN_PROGRESS: 'text-amber-500',
  RESOLVED: 'text-emerald-600',
  CLOSED: 'text-gray-400',
};
const PRIORITY_ICON: Record<string, string> = { LOW: '↓', MEDIUM: '→', HIGH: '↑', URGENT: '⚡' };
const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'text-gray-400', MEDIUM: 'text-blue-500', HIGH: 'text-orange-500', URGENT: 'text-red-500',
};

function TicketRow({ ticket }: { ticket: ReturnType<typeof store.getTickets>[0] }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-200 dark:border-gray-600 last:border-0 text-xs">
      <span className="font-mono text-gray-400 w-12 flex-shrink-0">#{ticket.id.slice(-6)}</span>
      <span className="flex-1 truncate font-medium">{ticket.title}</span>
      <span className={clsx('flex-shrink-0', PRIORITY_COLOR[ticket.priority])}>{PRIORITY_ICON[ticket.priority]}</span>
      <span className={clsx('flex-shrink-0 font-semibold', STATUS_COLOR[ticket.status])}>
        {ticket.status.replace('_', ' ')}
      </span>
    </div>
  );
}

function TicketCard({ ticket, commentCount }: { ticket: ReturnType<typeof store.getTicketById>; commentCount: number }) {
  if (!ticket) return null;
  return (
    <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden text-xs">
      <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2">
        <span className="font-mono text-gray-500 dark:text-gray-300">#{ticket.id.slice(-6)}</span>
        <span className={clsx('font-semibold', STATUS_COLOR[ticket.status])}>{ticket.status.replace('_', ' ')}</span>
        <span className={clsx(PRIORITY_COLOR[ticket.priority])}>{PRIORITY_ICON[ticket.priority]} {ticket.priority}</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        <p className="font-semibold text-sm leading-snug">{ticket.title}</p>
        <p className="text-gray-500 dark:text-gray-400 line-clamp-2">{ticket.description}</p>
        <div className="flex items-center gap-3 pt-1 text-gray-400 dark:text-gray-500">
          <span>{ticket.assignedTo ? `→ ${ticket.assignedTo.name}` : 'Unassigned'}</span>
          {commentCount > 0 && <span>💬 {commentCount}</span>}
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ data }: { data: Extract<ResultData, { type: 'stats' }> }) {
  const items = [
    { label: 'Open', value: data.open, color: 'text-violet-600' },
    { label: 'In Progress', value: data.inProgress, color: 'text-amber-500' },
    { label: 'Resolved', value: data.resolved, color: 'text-emerald-600' },
    { label: 'Closed', value: data.closed, color: 'text-gray-400' },
    { label: 'Urgent', value: data.urgent, color: data.urgent > 0 ? 'text-red-500' : 'text-gray-400' },
    { label: 'Unassigned', value: data.unassigned, color: data.unassigned > 0 ? 'text-amber-500' : 'text-gray-400' },
  ];
  return (
    <div className="mt-2 grid grid-cols-3 gap-1">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1.5 text-center">
          <p className={clsx('text-lg font-bold leading-none', item.color)}>{item.value}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function UserList({ users }: { users: ReturnType<typeof store.getUsers> }) {
  return (
    <div className="mt-2 space-y-1">
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-2 text-xs py-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
            {u.name.charAt(0)}
          </div>
          <span className="font-medium flex-1">{u.name}</span>
          <span className="text-gray-400 text-[10px]">{u.role.toLowerCase()}</span>
          <span className={clsx('text-[10px] font-semibold', u.isActive ? 'text-emerald-500' : 'text-gray-400')}>
            {u.isActive ? '● active' : '○ off'}
          </span>
        </div>
      ))}
    </div>
  );
}

function DataBlock({ data }: { data: ResultData }) {
  if (data.type === 'stats') return <StatsGrid data={data} />;
  if (data.type === 'users') return <UserList users={data.users} />;
  if (data.type === 'ticket') return <TicketCard ticket={data.ticket} commentCount={data.commentCount} />;
  if (data.type === 'tickets') {
    if (data.tickets.length === 0) return null;
    return (
      <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden px-2 py-1">
        {data.tickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
      </div>
    );
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

const WELCOME: Message = {
  id: 'welcome',
  role: 'bot',
  text: "Hi! I'm the **Dark Desk** assistant.\nType `help` to see what I can do, or just tell me what you need.",
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [botState, setBotState] = useState<BotState | null>(null);
  const [thinking, setThinking] = useState(false);
  const user = useAuthStore((s) => s.user)!;
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function send() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    setTimeout(() => {
      const fullUser = store.getUserById(user.id) ?? {
        id: user.id, name: user.name, email: user.email,
        role: user.role as 'ADMIN' | 'AGENT', isActive: true, createdAt: new Date().toISOString(),
      };
      const result = processCommand(text, fullUser, botState);

      if (result.nextState !== undefined) setBotState(result.nextState);
      if (result.invalidate) result.invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: 'bot',
        text: result.text, ok: result.ok, data: result.data,
      }]);
      setThinking(false);
    }, 160);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const placeholder = botState
    ? botState.flow === 'create'
      ? { title: 'Enter ticket title…', description: 'Enter description (or skip)…', priority: 'low / medium / high / urgent…', assignee: 'Name, me, or skip…' }[botState.step]
      : 'Type your comment…'
    : 'Type a command…';

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-[380px] flex flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ height: 'min(520px, calc(100vh - 6rem))', boxShadow: '0 8px 32px -4px rgb(0 0 0 / 0.22), 0 2px 8px -2px rgb(0 0 0 / 0.12)' }}
        >
          {/* Header — always dark */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-none">Dark Desk Assistant</p>
              <p className="text-gray-400 text-[11px] mt-0.5">
                {botState
                  ? botState.flow === 'create' ? `Creating ticket — step: ${botState.step}` : 'Awaiting comment…'
                  : 'Ready'}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                )}
                <div className={clsx('max-w-[82%]', msg.role === 'user' ? '' : 'flex-1')}>
                  {msg.text && (
                    <div className={clsx(
                      'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-sm'
                        : clsx('rounded-tl-sm', msg.ok === false
                          ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100')
                    )}>
                      <Md text={msg.text} />
                    </div>
                  )}
                  {msg.data && <DataBlock data={msg.data} />}
                </div>
              </div>
            ))}

            {/* Thinking dots */}
            {thinking && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mr-2">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01" />
                  </svg>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-white dark:bg-gray-900">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
            />
            <button
              onClick={send}
              disabled={!input.trim() || thinking}
              className="w-9 h-9 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200',
          open ? 'bg-gray-800 rotate-12' : 'bg-violet-600 hover:bg-violet-700'
        )}
        style={{ boxShadow: '0 4px 16px rgb(124 58 237 / 0.4)' }}
        title="Open assistant"
      >
        {open ? (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </>
  );
}
