import { Processor } from '@nestjs/bullmq';

import { BOOKMARK_IMPORT_QUEUE_NAME } from 'src/common/processors/queueNames';

@Processor(BOOKMARK_IMPORT_QUEUE_NAME)
export class BookmarkImportQueueProcessor {
  constructor() {}

  async process(): Promise<void> {}
}
