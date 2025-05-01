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
import { Server, Socket } from 'socket.io';
import { Bookmark } from 'src/modules/bookmark/bookmark.types';

@WebSocketGateway({
  namespace: 'bookmarks',
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

  @SubscribeMessage('subscribeToBookmark')
  handleSubscribe(
    @MessageBody() data: { bookmarkId: Bookmark['id'] },
    @ConnectedSocket() client: Socket
  ) {
    const roomName = this.getBookmarkRoomName(data.bookmarkId);
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room ${roomName}`);
  }

  @SubscribeMessage('unsubscribeFromBookmark')
  handleUnsubscribe(
    @MessageBody() data: { bookmarkId: Bookmark['id'] },
    @ConnectedSocket() client: Socket
  ) {
    const roomName = this.getBookmarkRoomName(data.bookmarkId);
    client.leave(roomName);
    this.logger.log(`Client ${client.id} left room ${roomName}`);
  }

  notifyBookmarkUpdate(
    bookmarkId: Bookmark['id'],
    metadata: { title?: string; faviconUrl: string | null }
  ) {
    const roomName = this.getBookmarkRoomName(bookmarkId);
    this.logger.log(
      `Sending update to ${roomName}: ${JSON.stringify(metadata)}`
    );
    this.server.to(roomName).emit('bookmark:update', {
      bookmarkId,
      ...metadata,
    });
  }

  private getBookmarkRoomName(bookmarkId: Bookmark['id']): string {
    return `bookmark:${bookmarkId}`;
  }
}
