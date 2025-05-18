import { getErrorStack } from '@/common/utils/logging.utils';
import { LoggerService } from '@/modules/logging/logger.service';
import { INestApplication, Injectable } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ExtendedError, Namespace, ServerOptions, Socket } from 'socket.io';
import { SESSION_TOKEN_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { SessionService } from 'src/modules/auth/session.service';
import { parseCookies } from 'src/modules/auth/utils/token.utils';
import {
  SOCKET_NAMESPACES,
  SocketNamespaceKey,
} from 'src/modules/bookmark/bookmark.constants';
import { toUserWithoutPassword } from 'src/modules/user/mappers/user.mapper';

@Injectable()
export class AuthenticatedIoAdapter extends IoAdapter {
  private readonly context = AuthenticatedIoAdapter.name;

  constructor(
    app: INestApplication,
    private readonly sessionService: SessionService,
    private readonly logger: LoggerService
  ) {
    super(app);
    this.logger.log('AuthenticatedIoAdapter instantiated', {
      context: this.context,
    });
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
          const ctx = `${this.context}::Middleware`;

          try {
            const cookies = parseCookies(socket.handshake.headers.cookie || '');
            const token = cookies[SESSION_TOKEN_COOKIE_NAME];

            if (!token) {
              this.logger.warn('No session token found in cookies', {
                context: ctx,
              });
              throw new Error('No session token found in cookies');
            }

            const { user, session } =
              await this.sessionService.validateSession(token);

            if (!user || !session) {
              this.logger.warn('Session validation failed', {
                context: ctx,
                meta: {
                  sessionToken: token,
                },
              });
              throw new Error('Invalid session');
            }

            this.logger.debug('WebSocket session authenticated', {
              context: ctx,
              meta: {
                userId: user.id,
                sessionId: session.id,
                namespace: namespace.name,
              },
            });

            socket.data.user = toUserWithoutPassword(user);
            return next();
          } catch (error) {
            this.logger.error('WebSocket authentication failed', {
              context: ctx,
              meta: {
                namespace: namespace.name,
                clientIp: socket.handshake.address,
              },
              trace: getErrorStack(error),
            });
            return next(new Error('Unauthorized'));
          }
        }
      );
    };

    applyAuthMiddleware(server);

    for (const key of Object.keys(SOCKET_NAMESPACES) as SocketNamespaceKey[]) {
      const namespacePath = `/${SOCKET_NAMESPACES[key]}`;

      applyAuthMiddleware(server.of(namespacePath));

      this.logger.log(`Socket namespace initialized`, {
        context: this.context,
        meta: {
          namespace: namespacePath,
        },
      });
    }

    this.logger.log(`Socket.IO server started`, {
      context: this.context,
      meta: {
        port,
        serverId: server.engine.id,
      },
    });

    return server;
  }
}
