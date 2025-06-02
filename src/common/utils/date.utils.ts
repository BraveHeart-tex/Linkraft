import { DateTime } from 'luxon';

export const getCurrentTimestamp = (): string => DateTime.utc().toISO();
