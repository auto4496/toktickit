import { PrismaClient } from '@prisma/client';
import {
  categoryNames,
  relatedSystemNames,
  requesterUsers,
  seedDatabase,
} from './seed-data.js';

const prisma = new PrismaClient();

async function main() {
  await seedDatabase(prisma);
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
