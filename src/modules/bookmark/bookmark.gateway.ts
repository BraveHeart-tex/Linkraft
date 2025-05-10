import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Job } from 'bullmq';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from 'src/common/types/socket.types';
import {
  SOCKET_EVENTS,
  SOCKET_NAMESPACES,
  SOCKET_ROOMS,
} from 'src/modules/bookmark/bookmark.constants';
import { Bookmark } from 'src/modules/bookmark/bookmark.types';

@WebSocketGateway({
  namespace: SOCKET_NAMESPACES.BOOKMARKS,
  cors: {
    origin: process.env.FRONT_END_URL,
    credentials: true,
    allowedHeaders: ['Authorization'],
  },
})
export class BookmarkGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(BookmarkGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(
      `Client connected to ${client.id} ${JSON.stringify(client.data)}`
    );
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected from /bookmarks: ${client.id}`);
  }

  notifyBookmarkUpdate(
    bookmarkId: Bookmark['id'],
    metadata: { title?: string; faviconUrl: string | null }
  ) {
    const roomName = this.getBookmarkRoomName(bookmarkId);
    this.logger.log(
      `Sending update to ${roomName}: ${JSON.stringify(metadata)}`
    );
    this.server.to(roomName).emit(SOCKET_EVENTS.BOOKMARK.UPDATE, {
      bookmarkId,
      ...metadata,
    });
  }

  @SubscribeMessage(SOCKET_EVENTS.BOOKMARK.SUBSCRIBE)
  handleSubscribe(
    @MessageBody() data: { bookmarkId: Bookmark['id'] },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const roomName = this.getBookmarkRoomName(data.bookmarkId);
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room ${roomName}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.BOOKMARK.UNSUBSCRIBE)
  handleUnsubscribe(
    @MessageBody() data: { bookmarkId: Bookmark['id'] },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const roomName = this.getBookmarkRoomName(data.bookmarkId);
    client.leave(roomName);
    this.logger.log(`Client ${client.id} left room ${roomName}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.IMPORT.SUBSCRIBE)
  handleImportSubscribe(
    @MessageBody() data: { importJobId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const room = this.getImportRoomName(data.importJobId);
    client.join(room);
    this.logger.log(
      `[Bookmark-Import]: Client ${client.id} subscribed to ${room}`
    );
  }

  @SubscribeMessage(SOCKET_EVENTS.IMPORT.UNSUBSCRIBE)
  handleImportUnsubscribe(
    @MessageBody() data: { importJobId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const room = this.getImportRoomName(data.importJobId);
    client.leave(room);
    this.logger.log(
      `[Bookmark-Import] Client ${client.id} unsubscribed from ${room}`
    );
  }

  async emitImportProgress(
    importJobId: string,
    payload: { progress: number; status: string }
  ) {
    const roomName = this.getImportRoomName(importJobId);
    this.server.to(roomName).emit(SOCKET_EVENTS.IMPORT.PROGRESS, {
      importJobId,
      ...payload,
    });
  }

  private getBookmarkRoomName(bookmarkId: Bookmark['id']): string {
    return SOCKET_ROOMS.bookmark(bookmarkId);
  }

  private getImportRoomName(importJobId: Job['id']): string {
    return SOCKET_ROOMS.importJob(importJobId);
  }
}
