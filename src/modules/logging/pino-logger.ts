import pino from 'pino';

export const createPinoLogger = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return pino({
    level: process.env.LOG_LEVEL || 'debug',
    transport: isProd
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
    redact: ['req.headers.authorization', 'password', '*.token'],
    base: {
      application_name: process.env.APP_NAME || 'linkraft',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
};
