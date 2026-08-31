import { PrismaClient } from '@prisma/client';

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
  for (const name of categoryNames) {
    await client.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  for (const name of relatedSystemNames) {
    await client.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  for (const requester of requesterUsers) {
    await client.requesterUser.upsert({
      where: { email: requester.email },
      update: {
        name: requester.name,
        isActive: requester.isActive,
      },
      create: requester,
    });
  }
}
