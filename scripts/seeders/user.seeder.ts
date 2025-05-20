import { User, UserInsertDto, users } from '@/db/schema';
import { hashPassword } from '@/modules/auth/utils/password.utils';
import { AppDatabase } from '@/modules/database/database.types';
import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from 'scripts/seeders/config';

interface SeedUserOptions {
  count: number;
}

const DEFAULT_USER_SEED_PASSWORD = '12345678';

export const seedUsers = async (
  db: AppDatabase,
  options: SeedUserOptions
): Promise<User['id'][]> => {
  const defaultPasswordHash = await hashPassword(DEFAULT_USER_SEED_PASSWORD);
  const gen = userGenerator(options.count, defaultPasswordHash);

  let insertedIds: User['id'][] = [];
  let batch: UserInsertDto[] = [];

  for (let i = 0; i < options.count; i++) {
    const next = gen.next();
    if (next.done) break;
    batch.push(next.value);

    if (batch.length === SEED_CONFIG.batchSize || i === options.count - 1) {
      const batchIds = await db
        .insert(users)
        .values(batch)
        .returning({ id: users.id });
      insertedIds = insertedIds.concat(batchIds.map(({ id }) => id));
      batch = [];
    }
  }

  return insertedIds;
};

function* userGenerator(
  count: number,
  defaultPasswordHash: string
): Generator<UserInsertDto, void, unknown> {
  for (let i = 0; i < count; i++) {
    yield {
      email: faker.internet.email(),
      passwordHash: defaultPasswordHash,
      visibleName: faker.person.fullName(),
    };
  }
}
