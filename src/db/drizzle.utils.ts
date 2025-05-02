import { SQL, sql } from 'drizzle-orm';
import { AnyPgColumn, customType } from 'drizzle-orm/pg-core';

export const lower = (email: AnyPgColumn): SQL => {
  return sql`lower(${email})`;
};

export const tsvector = customType<{
  data: string;
}>({
  dataType() {
    return `tsvector`;
  },
});
