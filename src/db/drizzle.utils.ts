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

export const customTimestamp = customType<{
  data: string;
  driverData: Date | string;
  config: {
    precision?: number;
  };
}>({
  dataType(config) {
    const precision =
      typeof config?.precision !== 'undefined' ? `(${config.precision})` : '';
    return `timestamp${precision} with time zone`;
  },
  toDriver(value: string | Date): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toISOString();
  },
  fromDriver(value): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toISOString();
  },
});
