import { Injectable } from '@nestjs/common';
import { TagRepository } from './tag.repository';
import { User } from 'src/db/schema';

@Injectable()
export class TagService {
  constructor(private readonly tagRepository: TagRepository) {}

  getUserTags(userId: User['id']) {
    return this.tagRepository.getUserTags(userId);
  }
}
