import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getStats(_req: AuthRequest, res: Response) {
  const [
    totalOpen,
    totalInProgress,
    totalResolved,
    totalClosed,
    urgent,
    unassigned,
    recentTickets,
    resolvedWithTime,
  ] = await Promise.all([
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { status: 'CLOSED' } }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: 'URGENT' } }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, assignedToId: null } }),
    prisma.ticket.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      select: {
        id: true, title: true, status: true, priority: true, createdAt: true,
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.ticket.findMany({
      where: { status: { in: ['RESOLVED', 'CLOSED'] }, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 100,
      orderBy: { resolvedAt: 'desc' },
    }),
  ]);

  let avgResolutionHours: number | null = null;
  if (resolvedWithTime.length > 0) {
    const totalMs = resolvedWithTime.reduce((acc, t) => {
      return acc + (t.resolvedAt!.getTime() - t.createdAt.getTime());
    }, 0);
    avgResolutionHours = Math.round(totalMs / resolvedWithTime.length / 1000 / 60 / 60);
  }

  res.json({
    stats: {
      open: totalOpen,
      inProgress: totalInProgress,
      resolved: totalResolved,
      closed: totalClosed,
      urgent,
      unassigned,
      avgResolutionHours,
    },
    recentTickets,
  });
}
