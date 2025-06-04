import { DateTime } from 'luxon';
import { z } from 'zod';

export const TimestampSchema = z
  .union([z.string(), z.date()])
  .transform((val) => {
    const iso = val instanceof Date ? val.toISOString() : val;
    const dateTime = DateTime.fromISO(iso, { setZone: true });

    if (!dateTime.isValid) throw new Error('Invalid ISO 8601 date');

    return dateTime.toUTC().toISO();
  });
