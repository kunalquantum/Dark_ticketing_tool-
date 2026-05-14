import { store } from './localStore';
import type { User } from '../api/users';
import type { TicketStatus, Priority } from '../api/tickets';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BotState =
  | { flow: 'create'; step: 'title' | 'description' | 'priority' | 'assignee'; draft: { title?: string; description?: string; priority?: string } }
  | { flow: 'comment'; ticketId: string; isInternal: boolean };

export type ResultData =
  | { type: 'tickets'; tickets: ReturnType<typeof store.getTickets> }
  | { type: 'ticket'; ticket: NonNullable<ReturnType<typeof store.getTicketById>>; commentCount: number }
  | { type: 'users'; users: ReturnType<typeof store.getUsers> }
  | { type: 'stats'; open: number; inProgress: number; resolved: number; closed: number; urgent: number; unassigned: number };

export type CmdResult = {
  text: string;
  ok: boolean;
  nextState?: BotState | null;
  invalidate?: string[];
  data?: ResultData;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, TicketStatus> = {
  open: 'OPEN', reopen: 'OPEN', reopened: 'OPEN',
  wip: 'IN_PROGRESS', progress: 'IN_PROGRESS', inprogress: 'IN_PROGRESS',
  in_progress: 'IN_PROGRESS', started: 'IN_PROGRESS', working: 'IN_PROGRESS',
  resolved: 'RESOLVED', resolve: 'RESOLVED', done: 'RESOLVED',
  fixed: 'RESOLVED', complete: 'RESOLVED', completed: 'RESOLVED',
  closed: 'CLOSED', close: 'CLOSED', archived: 'CLOSED',
};

const PRIORITY_MAP: Record<string, Priority> = {
  low: 'LOW', l: 'LOW',
  medium: 'MEDIUM', med: 'MEDIUM', normal: 'MEDIUM', m: 'MEDIUM',
  high: 'HIGH', h: 'HIGH',
  urgent: 'URGENT', u: 'URGENT', critical: 'URGENT', crit: 'URGENT', asap: 'URGENT',
};

function resolveStatus(s: string): TicketStatus | null {
  return STATUS_MAP[s.toLowerCase().replace(/[\s-]/g, '_')] ?? null;
}
function resolvePriority(s: string): Priority | null {
  return PRIORITY_MAP[s.toLowerCase()] ?? null;
}
function findTicket(idStr: string) {
  const clean = idStr.replace(/^#/, '');
  return store.getTickets().find((t) => t.id === clean || t.id.slice(-6) === clean) ?? null;
}
function findUser(nameStr: string) {
  const lower = nameStr.toLowerCase();
  return store.getUsers().find((u) => u.name.toLowerCase().includes(lower)) ?? null;
}

const HELP = `**Available commands:**

**View**
• \`list\` — all tickets  •  \`list open\` — filter by status
• \`show <id>\` — ticket details  •  \`search <query>\`
• \`stats\` — dashboard  •  \`users\` — team

**Create**
• \`new\` — guided ticket creation
• \`new <title> | <description>\` — quick create

**Update**
• \`update <id> status <value>\`
• \`update <id> priority <value>\`
• \`update <id> title <new title>\`
• \`assign <id> <name|me>\`  •  \`unassign <id>\`

**Quick status**
• \`open <id>\`  \`wip <id>\`  \`resolve <id>\`  \`close <id>\`

**Quick priority**
• \`urgent <id>\`  \`high <id>\`  \`low <id>\`

**Comments**
• \`comment <id> <text>\` — public reply
• \`note <id> <text>\` — internal note

• \`delete <id>\` — remove ticket`;

// ── Main command processor ────────────────────────────────────────────────────

export function processCommand(input: string, currentUser: User, botState: BotState | null): CmdResult {
  const raw = input.trim();
  const lower = raw.toLowerCase();
  const CANCEL = ['cancel', 'abort', 'quit', 'exit', 'stop', 'q'];

  // ── Active flow steps ──────────────────────────────────────────────────────
  if (botState?.flow === 'create') {
    if (CANCEL.includes(lower)) return { text: 'Ticket creation cancelled.', ok: true, nextState: null };
    const s = botState;

    if (s.step === 'title') {
      return {
        text: `Got it! Add a **description** (or \`skip\`):`,
        ok: true,
        nextState: { flow: 'create', step: 'description', draft: { ...s.draft, title: raw } },
      };
    }
    if (s.step === 'description') {
      const desc = lower === 'skip' ? s.draft.title! : raw;
      return {
        text: `What **priority**? (low / medium / high / urgent) or \`skip\` for Medium:`,
        ok: true,
        nextState: { flow: 'create', step: 'priority', draft: { ...s.draft, description: desc } },
      };
    }
    if (s.step === 'priority') {
      const priority = lower === 'skip' ? 'MEDIUM' : (resolvePriority(lower) ?? 'MEDIUM');
      return {
        text: `**Assign to** someone? Type a name or \`skip\`:`,
        ok: true,
        nextState: { flow: 'create', step: 'assignee', draft: { ...s.draft, priority } },
      };
    }
    if (s.step === 'assignee') {
      let assignedToId: string | undefined;
      if (!['skip', 'none', 'unassigned', 'nobody', 'no'].includes(lower)) {
        const assignee = lower === 'me' ? currentUser : findUser(raw);
        if (!assignee) return {
          text: `User "${raw}" not found. Try again or \`skip\`:`,
          ok: false,
          nextState: botState,
        };
        assignedToId = assignee.id;
      }
      const ticket = store.createTicket(
        { title: s.draft.title!, description: s.draft.description!, priority: s.draft.priority as Priority ?? 'MEDIUM', assignedToId },
        currentUser,
      );
      return {
        text: `✅ Created **#${ticket.id.slice(-6)}**: "${ticket.title}"`,
        ok: true,
        nextState: null,
        data: { type: 'ticket', ticket, commentCount: 0 },
        invalidate: ['tickets', 'dashboard'],
      };
    }
  }

  if (botState?.flow === 'comment') {
    if (CANCEL.includes(lower)) return { text: 'Cancelled.', ok: true, nextState: null };
    const { ticketId, isInternal } = botState;
    store.createComment(ticketId, { body: raw, isInternal }, currentUser);
    return {
      text: isInternal ? `🔒 Internal note added.` : `💬 Comment posted.`,
      ok: true,
      nextState: null,
      invalidate: ['comments', 'tickets'],
    };
  }

  // ── Parse fresh command ────────────────────────────────────────────────────
  const words = raw.split(/\s+/);
  const cmd = words[0].toLowerCase();
  const rest = words.slice(1).join(' ');

  // help
  if (['help', '?', 'h', 'commands'].includes(cmd)) {
    return { text: HELP, ok: true };
  }

  // stats
  if (['stats', 'dashboard', 'dash', 'summary', 'overview'].includes(cmd)) {
    const tickets = store.getTickets();
    return {
      text: '📊 **Dashboard:**',
      ok: true,
      data: {
        type: 'stats',
        open: tickets.filter((t) => t.status === 'OPEN').length,
        inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
        resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
        closed: tickets.filter((t) => t.status === 'CLOSED').length,
        urgent: tickets.filter((t) => t.priority === 'URGENT' && !['CLOSED', 'RESOLVED'].includes(t.status)).length,
        unassigned: tickets.filter((t) => !t.assignedTo && !['CLOSED', 'RESOLVED'].includes(t.status)).length,
      },
    };
  }

  // list / tickets
  if (['list', 'tickets', 'ls', 'all', 'inbox'].includes(cmd)) {
    let tickets = store.getTickets();
    if (rest) {
      const sf = resolveStatus(rest); const pf = resolvePriority(rest);
      if (sf) tickets = tickets.filter((t) => t.status === sf);
      else if (pf) tickets = tickets.filter((t) => t.priority === pf);
      else tickets = tickets.filter((t) => t.title.toLowerCase().includes(rest.toLowerCase()));
    }
    return {
      text: tickets.length ? `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}:` : 'No tickets found.',
      ok: true,
      data: { type: 'tickets', tickets },
    };
  }

  // search
  if (cmd === 'search') {
    if (!rest) return { text: 'Usage: `search <query>`', ok: false };
    const tickets = store.getTickets().filter((t) =>
      t.title.toLowerCase().includes(rest.toLowerCase()) ||
      t.description.toLowerCase().includes(rest.toLowerCase())
    );
    return {
      text: tickets.length ? `${tickets.length} result${tickets.length !== 1 ? 's' : ''} for "${rest}":` : `No tickets matching "${rest}".`,
      ok: true,
      data: { type: 'tickets', tickets },
    };
  }

  // show <id>
  if (['show', 'view', 'ticket', 'get', 'info', 't'].includes(cmd)) {
    if (!rest) return { text: 'Usage: `show <id>`', ok: false };
    const ticket = findTicket(rest.split(/\s+/)[0]);
    if (!ticket) return { text: `Ticket "${rest}" not found. Try \`list\` to see tickets.`, ok: false };
    return { text: '', ok: true, data: { type: 'ticket', ticket, commentCount: store.getCommentsByTicket(ticket.id).length } };
  }

  // new / create
  if (['new', 'create', 'add'].includes(cmd)) {
    const body = rest.replace(/^ticket\s*/i, '');
    if (!body) {
      return { text: "Let's create a ticket. What's the **title**?", ok: true, nextState: { flow: 'create', step: 'title', draft: {} } };
    }
    const parts = body.split('|').map((s) => s.trim());
    const ticket = store.createTicket(
      { title: parts[0], description: parts[1] ?? parts[0], priority: resolvePriority(parts[2] ?? '') ?? 'MEDIUM', assignedToId: undefined },
      currentUser,
    );
    return {
      text: `✅ Created **#${ticket.id.slice(-6)}**: "${ticket.title}"`,
      ok: true,
      data: { type: 'ticket', ticket, commentCount: 0 },
      invalidate: ['tickets', 'dashboard'],
    };
  }

  // update <id> <field> <value>
  if (['update', 'set', 'change', 'edit'].includes(cmd)) {
    const [idStr, field, ...valParts] = rest.split(/\s+/);
    const val = valParts.join(' ');
    if (!idStr || !field) return { text: 'Usage: `update <id> status|priority|title <value>`', ok: false };
    const ticket = findTicket(idStr);
    if (!ticket) return { text: `Ticket "${idStr}" not found.`, ok: false };
    const f = field.toLowerCase();
    if (['status', 's'].includes(f)) {
      const status = resolveStatus(val);
      if (!status) return { text: `Unknown status. Use: open, wip, resolved, closed`, ok: false };
      store.updateTicket(ticket.id, { status }, currentUser);
      return { text: `✅ **#${ticket.id.slice(-6)}** status → **${status.replace('_', ' ')}**`, ok: true, invalidate: ['tickets', 'ticket', 'dashboard'] };
    }
    if (['priority', 'p'].includes(f)) {
      const priority = resolvePriority(val);
      if (!priority) return { text: `Unknown priority. Use: low, medium, high, urgent`, ok: false };
      store.updateTicket(ticket.id, { priority }, currentUser);
      return { text: `✅ **#${ticket.id.slice(-6)}** priority → **${priority}**`, ok: true, invalidate: ['tickets', 'ticket'] };
    }
    if (['title', 'name'].includes(f)) {
      if (!val) return { text: 'Provide a new title.', ok: false };
      store.updateTicket(ticket.id, { title: val }, currentUser);
      return { text: `✅ **#${ticket.id.slice(-6)}** title updated.`, ok: true, invalidate: ['tickets', 'ticket'] };
    }
    return { text: `Unknown field "${field}". Use: status, priority, title`, ok: false };
  }

  // assign <id> <name|me>
  if (['assign', 'give'].includes(cmd)) {
    const [idStr, maybeTO, ...nameParts] = rest.split(/\s+/);
    const ticket = findTicket(idStr);
    if (!ticket) return { text: `Ticket "${idStr}" not found.`, ok: false };
    const nameStr = (maybeTO?.toLowerCase() === 'to' ? nameParts : [maybeTO, ...nameParts]).join(' ').trim();
    if (!nameStr) return { text: 'Usage: `assign <id> <name>`', ok: false };
    const assignee = nameStr.toLowerCase() === 'me' ? currentUser : findUser(nameStr);
    if (!assignee) return { text: `User "${nameStr}" not found. Type \`users\` to list team.`, ok: false };
    store.updateTicket(ticket.id, { assignedToId: assignee.id }, currentUser);
    return { text: `✅ **#${ticket.id.slice(-6)}** assigned to **${assignee.name}**.`, ok: true, invalidate: ['tickets', 'ticket'] };
  }

  // unassign <id>
  if (['unassign', 'deassign'].includes(cmd)) {
    const ticket = findTicket(rest);
    if (!ticket) return { text: `Ticket "${rest}" not found.`, ok: false };
    store.updateTicket(ticket.id, { assignedToId: null }, currentUser);
    return { text: `✅ **#${ticket.id.slice(-6)}** unassigned.`, ok: true, invalidate: ['tickets', 'ticket'] };
  }

  // quick status
  const quickStatus: Record<string, TicketStatus> = {
    open: 'OPEN', reopen: 'OPEN', close: 'CLOSED', closed: 'CLOSED',
    resolve: 'RESOLVED', resolved: 'RESOLVED', done: 'RESOLVED', fixed: 'RESOLVED',
    wip: 'IN_PROGRESS', progress: 'IN_PROGRESS', start: 'IN_PROGRESS',
  };
  if (cmd in quickStatus) {
    const ticket = findTicket(rest);
    if (!ticket) return { text: `Ticket "${rest}" not found.`, ok: false };
    const status = quickStatus[cmd];
    store.updateTicket(ticket.id, { status }, currentUser);
    return { text: `✅ **#${ticket.id.slice(-6)}** → **${status.replace('_', ' ')}**`, ok: true, invalidate: ['tickets', 'ticket', 'dashboard'] };
  }

  // quick priority
  const quickPri: Record<string, Priority> = { urgent: 'URGENT', critical: 'URGENT', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
  if (cmd in quickPri) {
    const ticket = findTicket(rest);
    if (!ticket) return { text: `Ticket "${rest}" not found.`, ok: false };
    store.updateTicket(ticket.id, { priority: quickPri[cmd] }, currentUser);
    return { text: `✅ **#${ticket.id.slice(-6)}** priority → **${quickPri[cmd]}**`, ok: true, invalidate: ['tickets', 'ticket'] };
  }

  // comment <id> [text]
  if (['comment', 'reply', 'respond', 'msg'].includes(cmd)) {
    const [idStr, ...textParts] = rest.split(/\s+/);
    const ticket = findTicket(idStr);
    if (!ticket) return { text: `Ticket "${idStr}" not found.`, ok: false };
    const body = textParts.join(' ');
    if (!body) return {
      text: `What's your reply for **#${ticket.id.slice(-6)}**?`,
      ok: true,
      nextState: { flow: 'comment', ticketId: ticket.id, isInternal: false },
    };
    store.createComment(ticket.id, { body, isInternal: false }, currentUser);
    return { text: `💬 Comment posted on **#${ticket.id.slice(-6)}**.`, ok: true, invalidate: ['comments', 'tickets'] };
  }

  // note <id> [text] (internal)
  if (['note', 'internal', 'private', 'intern'].includes(cmd)) {
    const [idStr, ...textParts] = rest.split(/\s+/);
    const ticket = findTicket(idStr);
    if (!ticket) return { text: `Ticket "${idStr}" not found.`, ok: false };
    const body = textParts.join(' ');
    if (!body) return {
      text: `Internal note for **#${ticket.id.slice(-6)}** — what's the note?`,
      ok: true,
      nextState: { flow: 'comment', ticketId: ticket.id, isInternal: true },
    };
    store.createComment(ticket.id, { body, isInternal: true }, currentUser);
    return { text: `🔒 Internal note added to **#${ticket.id.slice(-6)}**.`, ok: true, invalidate: ['comments', 'tickets'] };
  }

  // delete <id>
  if (['delete', 'del', 'rm', 'remove'].includes(cmd)) {
    const ticket = findTicket(rest);
    if (!ticket) return { text: `Ticket "${rest}" not found.`, ok: false };
    store.deleteTicket(ticket.id);
    return { text: `🗑️ Ticket **#${ticket.id.slice(-6)}** deleted.`, ok: true, invalidate: ['tickets', 'dashboard'] };
  }

  // users / team
  if (['users', 'team', 'agents', 'members', 'people', 'who'].includes(cmd)) {
    const users = store.getUsers();
    return { text: `👥 **Team** (${users.length} members):`, ok: true, data: { type: 'users', users } };
  }

  return { text: `Unknown command \`${cmd}\`. Type \`help\` to see what I can do.`, ok: false };
}
