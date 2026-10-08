import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import { Logger } from '@nestjs/common';
import type { GameEvent } from './events.types.js';

interface WebSocketClient {
  id: string;
  socket: Socket;
  displayId: string;
  alive: boolean;
}

export class PureWebSocketServer {
  private readonly logger = new Logger(PureWebSocketServer.name);
  private readonly clients = new Map<string, WebSocketClient>();

  constructor() {
    // Keepalive ping interval
    setInterval(() => {
      this.checkHeartbeats();
    }, 30000);
  }

  handleUpgrade(req: IncomingMessage, socket: Socket, _head: Buffer) {
    const key = req.headers['sec-websocket-key'];
    if (!key || typeof key !== 'string') {
      socket.destroy();
      return;
    }

    // Extract displayId from URL, e.g. /ws?displayId=boss-01
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const displayId = url.searchParams.get('displayId') || 'boss-01';

    // RFC 6455 Sec-WebSocket-Accept calculation
    const sha1 = crypto.createHash('sha1');
    sha1.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
    const accept = sha1.digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n',
    ];

    socket.write(headers.join('\r\n'));

    const clientId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const client: WebSocketClient = {
      id: clientId,
      socket,
      displayId,
      alive: true,
    };

    this.clients.set(clientId, client);
    this.logger.log(`WebSocket client connected: ${clientId} (display: ${displayId})`);

    let buffer: Buffer<any> = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      buffer = this.processFrames(client, buffer);
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
      this.logger.log(`WebSocket client disconnected: ${clientId}`);
    });

    socket.on('error', (err) => {
      this.logger.warn(`WebSocket error on ${clientId}: ${err.message}`);
      socket.destroy();
      this.clients.delete(clientId);
    });

    // Send connection greeting confirmation
    this.sendToClient(client, {
      type: 'connection.established' as any,
      timestamp: new Date().toISOString(),
      displayId,
      data: { message: 'Connected to Adventure Platform WebSocket Gateway', displayId },
    });
  }

  private processFrames(client: WebSocketClient, buffer: Buffer): Buffer {
    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];

      const fin = (firstByte & 0x80) === 0x80;
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) === 0x80;
      let payloadLen = secondByte & 0x7f;

      let offset = 2;
      if (payloadLen === 126) {
        if (buffer.length < 4) return buffer;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) return buffer;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskKeyLen = isMasked ? 4 : 0;
      if (buffer.length < offset + maskKeyLen + payloadLen) {
        return buffer;
      }

      let maskKey: Buffer | null = null;
      if (isMasked) {
        maskKey = buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      const payload = buffer.subarray(offset, offset + payloadLen);
      buffer = buffer.subarray(offset + payloadLen);

      if (isMasked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i % 4];
        }
      }

      // Handle Opcode
      if (opcode === 0x8) {
        // Close frame
        client.socket.end();
        return buffer;
      } else if (opcode === 0x9) {
        // Ping frame -> send Pong
        this.sendPong(client);
      } else if (opcode === 0xa) {
        // Pong frame
        client.alive = true;
      } else if (opcode === 0x1) {
        // Text frame
        const text = payload.toString('utf8');
        try {
          const msg = JSON.parse(text);
          if (msg.action === 'subscribe' && typeof msg.displayId === 'string') {
            client.displayId = msg.displayId;
            this.logger.log(`Client ${client.id} subscribed to ${client.displayId}`);
          }
        } catch {
          // Non-JSON ping or message, ignore
        }
      }
    }
    return buffer;
  }

  private sendPong(client: WebSocketClient) {
    if (!client.socket.writable) return;
    const frame = Buffer.from([0x8a, 0x00]);
    client.socket.write(frame);
  }

  private checkHeartbeats() {
    const pingFrame = Buffer.from([0x89, 0x00]);
    for (const [id, client] of this.clients.entries()) {
      if (!client.alive) {
        client.socket.destroy();
        this.clients.delete(id);
      } else {
        client.alive = false;
        if (client.socket.writable) {
          client.socket.write(pingFrame);
        }
      }
    }
  }

  broadcast(event: GameEvent) {
    for (const client of this.clients.values()) {
      if (!event.displayId || client.displayId === event.displayId || event.displayId === 'all') {
        this.sendToClient(client, event);
      }
    }
  }

  sendToDisplay(displayId: string, event: GameEvent) {
    for (const client of this.clients.values()) {
      if (client.displayId === displayId || displayId === 'all') {
        this.sendToClient(client, event);
      }
    }
  }

  private sendToClient(client: WebSocketClient, event: GameEvent) {
    if (!client.socket.writable) return;
    const json = JSON.stringify(event);
    const payload = Buffer.from(json, 'utf8');
    const length = payload.length;

    let header: Buffer;
    if (length <= 125) {
      header = Buffer.from([0x81, length]);
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    client.socket.write(Buffer.concat([header, payload]));
  }

  getClientCount(displayId?: string): number {
    if (!displayId) return this.clients.size;
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.displayId === displayId) count++;
    }
    return count;
  }
}
