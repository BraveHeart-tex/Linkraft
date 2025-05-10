import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication, Injectable, Logger } from '@nestjs/common';
import { ExtendedError, Namespace, ServerOptions, Socket } from 'socket.io';
import { SessionService } from 'src/modules/auth/session.service';
import { SESSION_TOKEN_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { parseCookies } from 'src/modules/auth/utils/token.utils';
import { toUserWithoutPassword } from 'src/modules/user/mappers/user.mapper';
import { SOCKET_NAMESPACES } from 'src/modules/bookmark/bookmark.constants';

@Injectable()
export class AuthenticatedIoAdapter extends IoAdapter {
  private readonly logger = new Logger(AuthenticatedIoAdapter.name);

  constructor(
    app: INestApplication,
    private readonly sessionService: SessionService
  ) {
    super(app);
    this.logger.log('✅ AuthenticatedIoAdapter instantiated');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.FRONT_END_URL,
        credentials: true,
      },
    });

    const applyAuthMiddleware = (namespace: Namespace) => {
      namespace.use(
        async (socket: Socket, next: (err?: ExtendedError) => void) => {
          try {
            const cookies = parseCookies(socket.handshake.headers.cookie || '');
            const token = cookies[SESSION_TOKEN_COOKIE_NAME];

            if (!token) throw new Error('No session token');

            const { user, session } =
              await this.sessionService.validateSession(token);

            if (!user || !session) throw new Error('Invalid session');

            socket.data.user = toUserWithoutPassword(user);
            return next();
          } catch (err) {
            this.logger.error('WebSocket auth failed:', err);
            return next(new Error('Unauthorized'));
          }
        }
      );
    };

    applyAuthMiddleware(server);

    for (const key of Object.keys(
      SOCKET_NAMESPACES
    ) as (keyof typeof SOCKET_NAMESPACES)[]) {
      applyAuthMiddleware(server.of(`/${SOCKET_NAMESPACES[key]}`));
    }

    return server;
  }
}
