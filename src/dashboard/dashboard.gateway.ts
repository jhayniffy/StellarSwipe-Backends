import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/dashboard',
})
export class DashboardGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private dashboardService: DashboardService) {}

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await client.join(`user_${data.userId}`);
    
    // Send initial dashboard data
    const dashboardData = await this.dashboardService.getDashboardData(data.userId);
    client.emit('dashboard_update', dashboardData);
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await client.leave(`user_${data.userId}`);
  }

  async broadcastUpdate(userId: string): Promise<void> {
    try {
      // Invalidate cache first
      await this.dashboardService.invalidateCache(userId);
      
      // Get fresh data
      const dashboardData = await this.dashboardService.getDashboardData(userId);
      
      // Broadcast to subscribed clients
      this.server.to(`user_${userId}`).emit('dashboard_update', dashboardData);
    } catch (error) {
      console.error('Error broadcasting dashboard update:', error);
    }
  }
}