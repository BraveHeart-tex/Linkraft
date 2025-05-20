import { users } from '@/db/schema';
import { createDb, createPgPool } from '@/modules/database/bootstrap';
import { performance } from 'perf_hooks';
import { seedAll } from 'scripts/seeders';

const runSeed = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot seed in production');
  }

  const start = performance.now();

  const pool = createPgPool({ connectionString: process.env.DATABASE_URL! });
  const db = createDb(pool);

  const hasUsers = await db.select({ id: users.id }).from(users).limit(1);

  if (hasUsers.length) {
    throw new Error('Seed aborted because data exists');
  }

  await db.transaction(async (tx) => {
    await seedAll(tx);
  });

  console.log(`Seeding completed in ${performance.now() - start}ms`);
  process.exit(0);
};

runSeed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
