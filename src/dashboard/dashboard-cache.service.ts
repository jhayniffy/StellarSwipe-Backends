import { Injectable } from '@nestjs/common';
import { DashboardGateway } from './dashboard.gateway';

@Injectable()
export class DashboardCacheService {
  constructor(private dashboardGateway: DashboardGateway) {}

  async onTradeUpdate(userId: string): Promise<void> {
    // Broadcast real-time update via WebSocket
    await this.dashboardGateway.broadcastUpdate(userId);
  }

  async onPositionUpdate(userId: string): Promise<void> {
    // Broadcast real-time update via WebSocket
    await this.dashboardGateway.broadcastUpdate(userId);
  }
}