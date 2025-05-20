import { AppDatabase } from '@/modules/database/database.types';
import { seedCollections } from 'scripts/seeders/collection.seeder';
import { SEED_CONFIG } from 'scripts/seeders/config';
import { seedUsers } from 'scripts/seeders/user.seeder';

export const seedAll = async (db: AppDatabase) => {
  const userIds = await seedUsers(db, {
    count: SEED_CONFIG.userCount,
  });
  await seedCollections(db, userIds, { count: SEED_CONFIG.collectionsPerUser });
};
