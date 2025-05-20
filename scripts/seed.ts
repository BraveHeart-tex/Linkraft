import { collections, users } from '@/db/schema';
import { hashPassword } from '@/modules/auth/utils/password.utils';
import { generateRandomHexColor } from '@/modules/collection/collection.utils';
import { createDb, createPgPool } from '@/modules/database/bootstrap';
import { faker } from '@faker-js/faker';

const main = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot seed in production');
  }

  const pool = createPgPool({
    connectionString: process.env.DATABASE_URL!,
  });
  const db = createDb(pool);

  const hasUsers = await db.select({ id: users.id }).from(users).limit(1);

  if (hasUsers.length) {
    throw new Error('Seed aborted because data exists');
  }

  const defaultPasswordHash = await hashPassword('123456');
  await db.transaction(async (tx) => {
    const userIds = await tx
      .insert(users)
      .values({
        email: faker.internet.email(),
        passwordHash: defaultPasswordHash,
        visibleName: faker.person.fullName(),
      })
      .returning({ id: users.id });

    console.log('userIds', userIds);

    await Promise.all(
      userIds.map(({ id }) =>
        tx.insert(collections).values(
          Array.from({ length: 100 }).map(() => ({
            userId: id,
            name: faker.lorem.word(),
            description: '',
            color: generateRandomHexColor(),
          }))
        )
      )
    );
  });
};

main()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });
