import {
  Collection,
  CollectionInsertDto,
  collections,
  User,
} from '@/db/schema';
import { generateRandomHexColor } from '@/modules/collection/collection.utils';
import { AppDatabase } from '@/modules/database/database.types';
import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from 'scripts/seeders/seedConfig';

interface SeedCollectionsOptions {
  count: number;
}

export const seedCollections = async (
  db: AppDatabase,
  userIds: User['id'][],
  options: SeedCollectionsOptions
): Promise<Pick<Collection, 'id' | 'userId'>[]> => {
  console.log(
    `Seeding ${options.count} collections for ${userIds.length} users...`
  );
  const gen = generateCollectionsForUsers(userIds, options.count);
  let batch: CollectionInsertDto[] = [];
  let insertedIds: Pick<Collection, 'id' | 'userId'>[] = [];

  while (true) {
    const next = gen.next();
    if (next.done) break;
    batch.push(next.value);

    if (batch.length === SEED_CONFIG.maxItemsPerBatch) {
      console.log(`Seeding ${batch.length} collections`);
      const batchIds = await db.insert(collections).values(batch).returning({
        id: collections.id,
        userId: collections.userId,
      });
      insertedIds = insertedIds.concat(batchIds);
      batch = [];
    }
  }

  if (batch.length > 0) {
    console.log(`Seeding ${batch.length} collections`);
    const batchIds = await db.insert(collections).values(batch).returning({
      id: collections.id,
      userId: collections.userId,
    });
    insertedIds = insertedIds.concat(batchIds);
  }

  return insertedIds;
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
