import { Tag, User } from 'src/db/schema';

export interface TagOwnershipParams {
  tagId: Tag['id'];
  userId: User['id'];
}
