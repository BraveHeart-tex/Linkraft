import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserSessionContext } from '../auth/session.types';
import { TagService } from './tag.service';

@Controller('tags')
@UseGuards(AuthGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}
  @Get()
  getUserTags(@CurrentUser() userSessionContext: UserSessionContext) {
    return this.tagService.getUserTags(userSessionContext.user.id);
  }
}
