import { CollectionInsertDto, collections, User } from '@/db/schema';
import { generateRandomHexColor } from '@/modules/collection/collection.utils';
import { AppDatabase } from '@/modules/database/database.types';
import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from 'scripts/seeders/config';

interface SeedCollectionsOptions {
  count: number;
}

export const seedCollections = async (
  db: AppDatabase,
  userIds: User['id'][],
  options: SeedCollectionsOptions
) => {
  const gen = generateCollectionsForUsers(userIds, options.count);
  let batch: CollectionInsertDto[] = [];

  while (true) {
    const next = gen.next();
    if (next.done) break;

    batch.push(next.value);

    if (batch.length >= SEED_CONFIG.batchSize) {
      await db.insert(collections).values(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.insert(collections).values(batch);
    batch = [];
  }
};

function* generateCollectionsForUsers(
  userIds: User['id'][],
  count: number
): Generator<CollectionInsertDto, void, unknown> {
  for (const userId of userIds) {
    for (let i = 0; i < count; i++) {
      yield {
        userId,
        name: faker.lorem.word(),
        color: generateRandomHexColor(),
      };
    }
  }
}
