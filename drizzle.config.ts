import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schema: './src/schema.ts',
  verbose: true,
  strict: true,
});
