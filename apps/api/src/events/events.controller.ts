import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EventsService } from './events.service.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('status')
  getStatus(@Query('displayId') displayId?: string) {
    const wsCount = this.eventsService.getWsServer().getClientCount(displayId);
    return {
      status: 'ok',
      displayId: displayId || 'all',
      wsClients: wsCount,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stream')
  streamEvents(
    @Query('displayId') displayId: string = 'boss-01',
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.eventsService.addSseClient(clientId, displayId, res);
  }
}
