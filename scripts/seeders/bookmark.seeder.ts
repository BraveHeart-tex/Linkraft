import { BookmarkInsertDto, bookmarks, Collection } from '@/db/schema';
import { AppDatabase } from '@/modules/database/database.types';
import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from 'scripts/seeders/seedConfig';

interface SeedBookmarksOptions {
  count: number;
}

export const seedBookmarks = async (
  db: AppDatabase,
  collectionAndUserIds: Pick<Collection, 'id' | 'userId'>[],
  options: SeedBookmarksOptions
) => {
  const total = options.count * collectionAndUserIds.length;

  console.log(
    `Seeding ${options.count} bookmarks for ${collectionAndUserIds.length} collections...`
  );

  let batch: BookmarkInsertDto[] = [];
  let processed = 0;

  const gen = generateUserBookmarksForCollections(
    collectionAndUserIds,
    options.count
  );

  const logEvery = 1000;

  while (true) {
    const next = gen.next();
    if (next.done) break;
    batch.push(next.value);
    processed++;

    if (processed % logEvery === 0) {
      console.log(
        `Progress: ${processed}/${total} (${((processed / total) * 100).toFixed(2)}%)`
      );
    }

    if (batch.length === SEED_CONFIG.maxItemsPerBatch) {
      await db.insert(bookmarks).values(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.insert(bookmarks).values(batch);
  }
};

function* generateUserBookmarksForCollections(
  collectionAndUserIds: Pick<Collection, 'id' | 'userId'>[],
  count: number
): Generator<BookmarkInsertDto, void, unknown> {
  for (const { id: collectionId, userId } of collectionAndUserIds) {
    for (let i = 0; i < count; i++) {
      yield {
        collectionId: collectionId ?? null,
        userId,
        url: faker.internet.url(),
        title: faker.lorem.words(3),
        isMetadataPending: false,
      };
    }
  }
}
