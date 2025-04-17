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
    metadata: { title: string }
  ) {
    this.server.emit(`bookmark:update:${bookmarkId}`, metadata);
  }
}
