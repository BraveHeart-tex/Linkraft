import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ResponseStatus } from 'src/common/decorators/response-status.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { CollectionService } from './collection.service';
import { zodPipe } from 'src/pipes/zod.pipe.factory';
import {
  CreateCollectionDto,
  CreateCollectionSchema,
} from 'src/common/validation/schemas/collection/collection.schema';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSessionContext } from '../auth/session.types';

@Controller('collections')
@UseGuards(AuthGuard)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post('/')
  @ResponseMessage('Collection created successfully')
  @ResponseStatus(HttpStatus.CREATED)
  createCollection(
    @Body(zodPipe(CreateCollectionSchema))
    createCollectionDto: CreateCollectionDto,
    @CurrentUser() userSessionInfo: UserSessionContext
  ) {
    return this.collectionService.createCollection({
      ...createCollectionDto,
      userId: userSessionInfo.user.id,
    });
  }

  @Get('/')
  @ResponseStatus(HttpStatus.OK)
  getCollections(@CurrentUser() userSessionInfo: UserSessionContext) {
    return this.collectionService.getCollectionsForUser(
      userSessionInfo.user.id
    );
  }

  @Delete('/:id')
  @ResponseStatus(HttpStatus.OK)
  deleteCollection(
    @CurrentUser() userSessionInfo: UserSessionContext,
    @Param('id', ParseIntPipe) collectionId: number
  ) {
    return this.collectionService.deleteUserCollection({
      userId: userSessionInfo.user.id,
      collectionId,
    });
  }
}
