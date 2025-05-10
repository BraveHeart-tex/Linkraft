import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from 'src/common/types/socket.types';
import { User } from 'src/db/schema';
import {
  SOCKET_EVENTS,
  SOCKET_NAMESPACES,
  SOCKET_ROOMS,
} from 'src/modules/bookmark/bookmark.constants';
import { BookmarkOwnershipParams } from 'src/modules/bookmark/bookmark.types';

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
    const room = this.getUserRoomName(client.data.user.id);
    client.join(room);
    this.logger.log(`Client [${client.id}] connected and joined ${room}`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const room = this.getUserRoomName(client.data.user.id);
    client.leave(room);
    this.logger.log(`Client [${client.id}] disconnected and left ${room}`);
  }

  notifyBookmarkUpdate({
    userId,
    bookmarkId,
    metadata,
  }: BookmarkOwnershipParams & {
    metadata: { title?: string; faviconUrl: string | null };
  }) {
    const room = this.getUserRoomName(userId);
    this.logger.log(`Sending bookmark update to ${room}`);
    this.server.to(room).emit(SOCKET_EVENTS.BOOKMARK.UPDATE, {
      bookmarkId,
      ...metadata,
    });
  }

  async emitImportProgress(
    userId: User['id'],
    payload: { importJobId: string; progress: number; status: string }
  ) {
    const roomName = this.getUserRoomName(userId);
    this.server.to(roomName).emit(SOCKET_EVENTS.IMPORT.PROGRESS, payload);
  }

  private getUserRoomName(userId: User['id']): string {
    return SOCKET_ROOMS.user(userId);
  }
}
