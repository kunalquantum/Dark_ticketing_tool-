import { PrismaClient, Role, Priority, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 12);
  const agentPassword = await bcrypt.hash('agent123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const agent1 = await prisma.user.upsert({
    where: { email: 'agent1@example.com' },
    update: {},
    create: {
      name: 'Alice Agent',
      email: 'agent1@example.com',
      passwordHash: agentPassword,
      role: Role.AGENT,
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: 'agent2@example.com' },
    update: {},
    create: {
      name: 'Bob Agent',
      email: 'agent2@example.com',
      passwordHash: agentPassword,
      role: Role.AGENT,
    },
  });

  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Cannot login to account',
      description: 'User reports being unable to log in after password reset.',
      status: TicketStatus.OPEN,
      priority: Priority.HIGH,
      createdById: admin.id,
      assignedToId: agent1.id,
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Billing discrepancy on invoice #4521',
      description: 'Customer was charged twice for the same subscription.',
      status: TicketStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      createdById: admin.id,
      assignedToId: agent2.id,
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        ticketId: ticket1.id,
        userId: agent1.id,
        body: 'Looking into this now. Can you confirm the email used for the account?',
        isInternal: false,
      },
      {
        ticketId: ticket1.id,
        userId: admin.id,
        body: 'Internal note: check if the password reset token expired.',
        isInternal: true,
      },
      {
        ticketId: ticket2.id,
        userId: agent2.id,
        body: 'I can see the duplicate charge. Initiating refund process.',
        isInternal: false,
      },
    ],
  });

  console.log('Seed complete.');
  console.log('Admin: admin@example.com / admin123');
  console.log('Agent 1: agent1@example.com / agent123');
  console.log('Agent 2: agent2@example.com / agent123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
