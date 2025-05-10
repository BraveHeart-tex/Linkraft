import { Socket } from 'socket.io';
import { UserWithoutPasswordHash } from 'src/db/schema';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: UserWithoutPasswordHash;
  };
}
