import { LoggerService } from '@/modules/logging/logger.service';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
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
  constructor(private readonly logger: LoggerService) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: AuthenticatedSocket) {
    this.handleClientRoomAction(client, 'join');
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.handleClientRoomAction(client, 'leave');
  }

  notifyBookmarkUpdate({
    userId,
    bookmarkId,
    metadata,
  }: BookmarkOwnershipParams & {
    metadata: { title?: string; faviconUrl: string | null };
  }) {
    const room = this.getUserRoomName(userId);

    this.log('Sending bookmark update', {
      room,
      userId,
      bookmarkId,
      title: metadata.title,
      faviconUrl: metadata.faviconUrl,
    });

    this.server.to(room).emit(SOCKET_EVENTS.BOOKMARK.UPDATE, {
      bookmarkId,
      ...metadata,
    });
  }

  async emitImportProgress(
    userId: User['id'],
    payload: { importJobId: string; progress: number; status: string }
  ) {
    const room = this.getUserRoomName(userId);

    this.log('Emitting import progress update', {
      room,
      userId,
      ...payload,
    });

    this.server.to(room).emit(SOCKET_EVENTS.IMPORT.PROGRESS, payload);
  }

  private handleClientRoomAction(
    client: AuthenticatedSocket,
    action: 'join' | 'leave'
  ) {
    const userId = client.data.user.id;
    const room = this.getUserRoomName(userId);

    if (action === 'join') {
      client.join(room);
    } else {
      client.leave(room);
    }

    this.log(`Client ${action === 'leave' ? 'left' : 'joined'} the room`, {
      clientId: client.id,
      userId,
      room,
    });
  }

  private getUserRoomName(userId: User['id']): string {
    return SOCKET_ROOMS.user(userId);
  }

  private log(message: string, meta: Record<string, unknown>) {
    this.logger.log(message, {
      context: BookmarkGateway.name,
      meta,
    });
  }
}
