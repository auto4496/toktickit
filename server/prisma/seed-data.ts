import { PrismaClient, Priority, TicketStatus } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';

// Synthetic local-lab credential only. Rerunning seed never resets it.
export const LOCAL_INITIAL_PASSWORD = 'Local lab green garden 2026';
export const staffUsers = [
  { id: '88888888-8888-4888-8888-888888888881', name: 'Alex Rivera', email: 'alex.staff@example.test', isActive: true },
  { id: '88888888-8888-4888-8888-888888888882', name: 'Jordan Lee', email: 'jordan.staff@example.test', isActive: true },
  { id: '88888888-8888-4888-8888-888888888883', name: 'Sam Taylor', email: 'sam.staff@example.test', isActive: true },
  { id: '88888888-8888-4888-8888-888888888884', name: 'Archived Staff', email: 'archived.staff@example.test', isActive: false },
];
export const administrator = { id: '88888888-8888-4888-8888-888888888885', name: 'Morgan Admin', email: 'admin@example.test', isActive: true };

export const categoryNames = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
] as const;

export const relatedSystemNames = [
  'Customer Portal',
  'Email and Collaboration',
  'ERP',
  'HRIS',
  'Network Infrastructure',
  'VPN',
] as const;

export const requesterUsers = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@example.com',
    isActive: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    isActive: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Nadia Patel',
    email: 'nadia.patel@example.com',
    isActive: true,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Samuel Wilson',
    email: 'samuel.wilson@example.com',
    isActive: true,
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Archived Requester',
    email: 'archived.requester@example.com',
    isActive: false,
  },
] as const;

export async function seedDatabase(client: PrismaClient) {
  if (process.env.NODE_ENV === 'production') throw new Error('Local seed is not available in production.');
  for (const name of categoryNames) {
    await client.category.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  for (const name of relatedSystemNames) {
    await client.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  const accounts = [
    ...requesterUsers.map((user) => ({ ...user, role: 'REQUESTER' as const })),
    ...staffUsers.map((user) => ({ ...user, role: 'IT_STAFF' as const })),
    { ...administrator, role: 'ADMINISTRATOR' as const },
  ];
  for (const user of accounts) {
    // Check ID as well as email so an edited seed user is not recreated.
    if (await client.user.findFirst({ where: { OR: [{ id: user.id }, { email: user.email }] } })) continue;
    await client.user.upsert({ where: { id: user.id }, update: {}, create: { ...user, passwordHash: await hashPassword(LOCAL_INITIAL_PASSWORD), mustChangePassword: true } });
  }

  const category = await client.category.findUniqueOrThrow({ where: { name: 'Network' } });
  const system = await client.relatedSystem.findUniqueOrThrow({ where: { name: 'VPN' } });
  const examples = [
    ['NEW', 'VPN disconnects after sign-in', 'The connection drops after a few minutes when working remotely.'],
    ['OPEN', 'New laptop cannot connect to VPN', 'Please help configure the VPN client on the replacement laptop.'],
    ['IN_PROGRESS', 'Slow access to shared project files', 'Opening the shared project folder takes more than a minute.'],
    ['WAITING_FOR_REQUESTER', 'VPN reports an expired certificate', 'The certificate warning appears when starting the VPN client.'],
    ['RESOLVED', 'VPN connection restored after client update', 'The updated client connects successfully and shared files are available.'],
    ['CLOSED', 'Remote access setup completed', 'Remote access has been configured and confirmed with the requester.'],
    ['REOPENED', 'Intermittent VPN disconnect has returned', 'The same disconnect returned after restarting the laptop today.'],
    ['CANCELLED', 'Duplicate remote access request', 'This request duplicates an existing remote access support ticket.'],
  ] as const;
  for (const [index, [status, summary, description]] of examples.entries()) {
    const ticketNumber = `TKT-20260913-D300000${index + 1}`;
    if (await client.ticket.findUnique({ where: { ticketNumber } })) continue;
    const requesterId = requesterUsers[index % 4].id;
    const ownerId = status === 'NEW' || status === 'CANCELLED' ? null : staffUsers[index % 3].id;
    const priority: Priority = ['LOW', 'MEDIUM', 'HIGH'][index % 3] as Priority;
    // Nested creation is atomic; reruns preserve all user edits and history.
    await client.ticket.upsert({ where: { ticketNumber }, update: {}, create: {
      ticketNumber, requesterId, ownerId, categoryId: category.id, relatedSystemId: system.id,
      summary, description, requestedPriority: priority, itPriority: priority,
      currentStatus: status as TicketStatus,
      ...(ownerId ? {
        publicComments: { create: { authorId: ownerId, content: 'We are checking the connection. Please let us know if the issue happens again.' } },
        internalNotes: { create: { authorId: ownerId, content: 'Synthetic training note: compare client versions before the next troubleshooting step.' } },
      } : {}),
    } });
  }
}
