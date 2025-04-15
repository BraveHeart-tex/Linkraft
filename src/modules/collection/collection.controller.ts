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
  createCollectionForUser(
    @Body(zodPipe(CreateCollectionSchema))
    createCollectionDto: CreateCollectionDto,
    @CurrentUser() userSessionInfo: UserSessionContext
  ) {
    return this.collectionService.createCollectionForUser({
      ...createCollectionDto,
      userId: userSessionInfo.user.id,
    });
  }

  @Get('/')
  @ResponseStatus(HttpStatus.OK)
  getCollectionsForUser(@CurrentUser() userSessionInfo: UserSessionContext) {
    return this.collectionService.getCollectionsForUser(
      userSessionInfo.user.id
    );
  }

  @Delete('/:id')
  @ResponseStatus(HttpStatus.OK)
  deleteUserCollection(
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
  updateUserCollection(
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

    return this.collectionService.updateUserCollection(
      { ...updateCollectionDto, id: collectionId },
      userSessionInfo.user.id
    );
  }
}
