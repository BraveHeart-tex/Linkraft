import { SetMetadata } from '@nestjs/common';
import { RESPONSE_MESSAGE_METADATA_KEY } from './decorator.constants';

export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_METADATA_KEY, message);
