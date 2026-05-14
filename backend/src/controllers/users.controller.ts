import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
type Role = 'ADMIN' | 'AGENT';

export async function listUsers(_req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  res.json({ users });
}

export async function createUser(req: AuthRequest, res: Response) {
  const { name, email, password, role = 'AGENT' } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role as Role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  res.status(201).json({ user });
}

export async function updateUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, email, role, isActive, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ error: 'User not found' }); return; }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password) updates.passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updates,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  res.json({ user });
}
