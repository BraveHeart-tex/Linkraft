import { HttpStatus, SetMetadata } from '@nestjs/common';

export const RESPONSE_STATUS_METADATA_KEY = 'response_status' as const;

export const ResponseStatus = (status: HttpStatus) =>
  SetMetadata(RESPONSE_STATUS_METADATA_KEY, status);
