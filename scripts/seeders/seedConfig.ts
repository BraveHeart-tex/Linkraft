export const SEED_CONFIG = {
  userCount: Number(process.env.SEED_USER_COUNT) || 20,
  collectionsPerUser: Number(process.env.SEED_COLLECTIONS_PER_USER) || 100,
  maxItemsPerBatch: Number(process.env.BATCH_SIZE) || 500,
  bookmarksPerCollection:
    Number(process.env.SEED_BOOKMARKS_PER_COLLECTION) || 100,
};
