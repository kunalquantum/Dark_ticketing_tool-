import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { queueEmail } from '../jobs/email.queue.js';
import { emailTemplates } from '../services/email.service.js';
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const ticketSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  _count: { select: { comments: true } },
};

export async function listTickets(req: AuthRequest, res: Response) {
  const { status, priority, assignedTo, page = '1', limit = '20', search } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where.status = status as TicketStatus;
  if (priority) where.priority = priority as Priority;
  if (assignedTo === 'me') where.assignedToId = req.user!.id;
  else if (assignedTo) where.assignedToId = assignedTo as string;
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = Math.min(parseInt(limit as string, 10), 100);
  const skip = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({ where, select: ticketSelect, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page: pageNum, pages: Math.ceil(total / limitNum) });
}

export async function createTicket(req: AuthRequest, res: Response) {
  const { title, description, priority, assignedToId } = req.body;

  const ticket = await prisma.ticket.create({
    data: { title, description, priority, createdById: req.user!.id, assignedToId },
    select: ticketSelect,
  });

  await prisma.ticketHistory.create({
    data: { ticketId: ticket.id, changedBy: req.user!.id, field: 'status', oldValue: null, newValue: 'OPEN' },
  });

  const { subject, html } = emailTemplates.ticketCreated(ticket.title, ticket.id);
  queueEmail(req.user!.email, subject, html);

  if (assignedToId && ticket.assignedTo) {
    const tpl = emailTemplates.ticketAssigned(ticket.title, ticket.id, ticket.assignedTo.name);
    queueEmail(ticket.assignedTo.email, tpl.subject, tpl.html);
  }

  res.status(201).json({ ticket });
}

export async function getTicket(req: AuthRequest, res: Response) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    select: { ...ticketSelect, history: { orderBy: { changedAt: 'asc' }, include: { user: { select: { id: true, name: true } } } } },
  });

  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }
  res.json({ ticket });
}

export async function updateTicket(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ error: 'Ticket not found' }); return; }

  const { title, description, status, priority, assignedToId } = req.body;
  const updates: Record<string, unknown> = {};
  const historyEntries: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

  if (title !== undefined && title !== existing.title) {
    historyEntries.push({ field: 'title', oldValue: existing.title, newValue: title });
    updates.title = title;
  }
  if (description !== undefined && description !== existing.description) {
    updates.description = description;
  }
  if (status !== undefined && status !== existing.status) {
    historyEntries.push({ field: 'status', oldValue: existing.status, newValue: status });
    updates.status = status;
    if (status === 'RESOLVED') updates.resolvedAt = new Date();
    else if (existing.status === 'RESOLVED') updates.resolvedAt = null;
  }
  if (priority !== undefined && priority !== existing.priority) {
    historyEntries.push({ field: 'priority', oldValue: existing.priority, newValue: priority });
    updates.priority = priority;
  }
  if (assignedToId !== undefined && assignedToId !== existing.assignedToId) {
    historyEntries.push({ field: 'assignedTo', oldValue: existing.assignedToId, newValue: assignedToId });
    updates.assignedToId = assignedToId;
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: updates,
    select: ticketSelect,
  });

  if (historyEntries.length > 0) {
    await prisma.ticketHistory.createMany({
      data: historyEntries.map((e) => ({ ticketId: id, changedBy: req.user!.id, ...e })),
    });
  }

  if (status && status !== existing.status) {
    const tpl = emailTemplates.ticketUpdated(ticket.title, ticket.id, 'Status', status);
    if (ticket.assignedTo) queueEmail(ticket.assignedTo.email, tpl.subject, tpl.html);
  }

  if (assignedToId && assignedToId !== existing.assignedToId && ticket.assignedTo) {
    const tpl = emailTemplates.ticketAssigned(ticket.title, ticket.id, ticket.assignedTo.name);
    queueEmail(ticket.assignedTo.email, tpl.subject, tpl.html);
  }

  res.json({ ticket });
}

export async function deleteTicket(req: AuthRequest, res: Response) {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

  await prisma.ticket.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}
