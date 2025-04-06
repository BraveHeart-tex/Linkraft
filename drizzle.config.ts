import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './src/db/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schema: './src/db/schema.ts',
  verbose: true,
  strict: true,
});
