import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
  UpdateCollectionSchema,
} from 'src/common/validation/schemas/collection/collection.schema';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserSessionContext } from '../auth/session.types';
import { ApiException } from 'src/exceptions/api.exception';
import { CollectionInsertDto } from 'src/db/schema';

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

  @Put('/:id')
  @ResponseMessage('Collection updated successfully')
  @ResponseStatus(HttpStatus.OK)
  updateCollection(
    @Body(zodPipe(UpdateCollectionSchema))
    updateCollectionDto: Partial<CollectionInsertDto>,
    @CurrentUser() userSessionInfo: UserSessionContext,
    @Param('id', ParseIntPipe) collectionId: number
  ) {
    if (Object.keys(updateCollectionDto).length === 0) {
      throw new ApiException(
        'BAD_REQUEST',
        'Please provide fields to update',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.collectionService.updateCollection(
      { ...updateCollectionDto, id: collectionId },
      userSessionInfo.user.id
    );
  }
}
