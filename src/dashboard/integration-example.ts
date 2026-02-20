// Example integration in trades.service.ts
// This shows how to trigger dashboard updates when trades change

import { Injectable } from '@nestjs/common';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';

@Injectable()
export class TradesIntegrationExample {
  constructor(private dashboardCacheService: DashboardCacheService) {}

  async onTradeCompleted(userId: string, tradeId: string): Promise<void> {
    // After trade is completed, invalidate dashboard cache and broadcast update
    await this.dashboardCacheService.onTradeUpdate(userId);
  }

  async onPositionOpened(userId: string): Promise<void> {
    // After new position is opened, update dashboard
    await this.dashboardCacheService.onPositionUpdate(userId);
  }
}