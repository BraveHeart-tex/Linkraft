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
import { Server, Socket } from 'socket.io';
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
  },
})
export class BookmarkGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(BookmarkGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to /bookmarks: ${client.id}`);
  }
  handleDisconnect(client: Socket) {
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
    @ConnectedSocket() client: Socket
  ) {
    const roomName = this.getBookmarkRoomName(data.bookmarkId);
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room ${roomName}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.BOOKMARK.UNSUBSCRIBE)
  handleUnsubscribe(
    @MessageBody() data: { bookmarkId: Bookmark['id'] },
    @ConnectedSocket() client: Socket
  ) {
    const roomName = this.getBookmarkRoomName(data.bookmarkId);
    client.leave(roomName);
    this.logger.log(`Client ${client.id} left room ${roomName}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.IMPORT.SUBSCRIBE)
  handleImportSubscribe(
    @MessageBody() data: { importJobId: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = this.getImportRoomName(data.importJobId);
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.IMPORT.UNSUBSCRIBE)
  handleImportUnsubscribe(
    @MessageBody() data: { importJobId: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = this.getImportRoomName(data.importJobId);
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
  }

  private getBookmarkRoomName(bookmarkId: Bookmark['id']): string {
    return SOCKET_ROOMS.bookmark(bookmarkId);
  }

  private getImportRoomName(importJobId: Job['id']): string {
    return SOCKET_ROOMS.importJob(importJobId);
  }
}
