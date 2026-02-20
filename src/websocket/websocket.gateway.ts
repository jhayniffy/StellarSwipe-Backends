import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SocketManagerService } from './services/socket-manager.service';
import { RoomSubscriptionDto, SocketRoom } from './dto/socket-event.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  pingInterval: 30000,
  pingTimeout: 10000,
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly socketManager: SocketManagerService,
  ) { }

  afterInit(server: Server): void {
    this.socketManager.setServer(server);
  }

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new UnauthorizedException('Missing token');
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid token');
      }

      client.data.walletAddress = payload.sub;
      await client.join(this.socketManager.getUserRoom(payload.sub));
      await client.join(SocketRoom.SIGNALS_FEED);
      await client.join(SocketRoom.LEADERBOARD_TOP100);

      this.socketManager.registerClient(client);
      this.logger.log(`Socket connected: ${client.id}`);
    } catch (error) {
      this.logger.warn(`Socket auth failed: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.socketManager.unregisterClient(client);
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RoomSubscriptionDto,
  ): Promise<void> {
    if (!this.isAllowedRoom(body?.room)) {
      return;
    }

    await client.join(body.room);
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: RoomSubscriptionDto,
  ): Promise<void> {
    if (!this.isAllowedRoom(body?.room)) {
      return;
    }

    await client.leave(body.room);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header =
      client.handshake.headers?.authorization ??
      client.handshake.headers?.Authorization;
    if (typeof header === 'string' && header.length > 0) {
      return header.startsWith('Bearer ') ? header.slice(7) : header;
    }

    return null;
  }

  private isAllowedRoom(room?: string): room is SocketRoom {
    return Object.values(SocketRoom).includes(room as SocketRoom);
  }

  emitToUser(userId: string, event: string, data: any): void {
    const room = this.socketManager.getUserRoom(userId);
    this.server.to(room).emit(event, data);
  }
}
