import { Buffer } from 'node:buffer';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { EventsService } from './events/events.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();

  const eventsService = app.get(EventsService);
  const httpServer = app.getHttpServer();

  // Attach RFC 6455 WebSocket Upgrade handler
  httpServer.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = req.url || '';
    if (url.startsWith('/ws') || url.startsWith('/api/v1/ws')) {
      eventsService.getWsServer().handleUpgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
await bootstrap();
