import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
    console.log(`Client connected to /bookmarks: ${client.id}`);
  }
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from /bookmarks: ${client.id}`);
  }

  notifyBookmarkUpdate(
    bookmarkId: Bookmark['id'],
    metadata: { title: string; faviconUrl: string | null }
  ) {
    this.logger.log(
      `notifyBookmarkUpdate bookmark:update:${bookmarkId}`,
      JSON.stringify(metadata)
    );
    this.server.emit(`bookmark:update:${bookmarkId}`, metadata);
  }
}
