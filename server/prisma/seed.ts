import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categoryNames = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
] as const;

const relatedSystemNames = [
  'Customer Portal',
  'Email and Collaboration',
  'ERP',
  'HRIS',
  'Network Infrastructure',
  'VPN',
] as const;

const requesterUsers = [
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

async function main() {
  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  for (const name of relatedSystemNames) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  for (const requester of requesterUsers) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: {
        name: requester.name,
        isActive: requester.isActive,
      },
      create: requester,
    });
  }

  console.log(
    `Seeded ${categoryNames.length} categories, ${relatedSystemNames.length} related systems, and ${requesterUsers.length} requester users.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed Lab 2 reference data.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
