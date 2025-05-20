import { AppDatabase } from '@/modules/database/database.types';
import { seedBookmarks } from 'scripts/seeders/bookmark.seeder';
import { seedCollections } from 'scripts/seeders/collection.seeder';
import { SEED_CONFIG } from 'scripts/seeders/seedConfig';
import { seedUsers } from 'scripts/seeders/user.seeder';

export const seedAll = async (db: AppDatabase) => {
  const userIds = await seedUsers(db, {
    count: SEED_CONFIG.userCount,
  });
  const collectionAndUserIds = await seedCollections(db, userIds, {
    count: SEED_CONFIG.collectionsPerUser,
  });
  await seedBookmarks(db, collectionAndUserIds, {
    count: SEED_CONFIG.bookmarksPerCollection,
  });
};
