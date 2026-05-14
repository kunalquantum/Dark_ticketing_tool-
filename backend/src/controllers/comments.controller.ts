import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function listComments(req: AuthRequest, res: Response) {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

  const comments = await prisma.comment.findMany({
    where: { ticketId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ comments });
}

export async function createComment(req: AuthRequest, res: Response) {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }

  const { body, isInternal = false } = req.body;

  const comment = await prisma.comment.create({
    data: { ticketId: req.params.id, userId: req.user!.id, body, isInternal },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  await prisma.ticket.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } });

  res.status(201).json({ comment });
}
