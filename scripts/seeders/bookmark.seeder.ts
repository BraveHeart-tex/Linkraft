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
  console.log(
    `Seeding ${options.count} bookmarks for ${collectionAndUserIds.length} collections...`
  );
  let batch: BookmarkInsertDto[] = [];
  const gen = generateUserBookmarksForCollections(
    collectionAndUserIds,
    options.count
  );

  while (true) {
    const next = gen.next();
    if (next.done) break;
    batch.push(next.value);

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
