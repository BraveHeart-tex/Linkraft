import { HttpStatus, SetMetadata } from '@nestjs/common';
import { RESPONSE_STATUS_METADATA_KEY } from './decorator.constants';

export const ResponseStatus = (status: HttpStatus) =>
  SetMetadata(RESPONSE_STATUS_METADATA_KEY, status);
