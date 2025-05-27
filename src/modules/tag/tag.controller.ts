import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSessionContext } from '../auth/session.types';
import { TagService } from './tag.service';

@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}
  @Get()
  getUserTags(@CurrentUser() userSessionContext: UserSessionContext) {
    return this.tagService.getUserTags(userSessionContext.user.id);
  }
}
