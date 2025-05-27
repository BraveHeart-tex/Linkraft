import { SetMetadata } from '@nestjs/common';

export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_METADATA_KEY, message);
export const RESPONSE_MESSAGE_METADATA_KEY = 'response_message' as const;
