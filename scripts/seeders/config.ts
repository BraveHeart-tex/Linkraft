export const SEED_CONFIG = {
  userCount: Number(process.env.SEED_USER_COUNT) || 100,
  collectionsPerUser: Number(process.env.SEED_COLLECTIONS_PER_USER) || 100,
  batchSize: Number(process.env.BATCH_SIZE) || 500,
};
