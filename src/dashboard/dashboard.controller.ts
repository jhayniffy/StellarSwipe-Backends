import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardDataDto } from './dto/dashboard-data.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Query('userId') userId: string): Promise<DashboardDataDto> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const startTime = Date.now();
    const data = await this.dashboardService.getDashboardData(userId);
    const responseTime = Date.now() - startTime;

    // Log performance for monitoring
    if (responseTime > 500) {
      console.warn(`Dashboard response time exceeded 500ms: ${responseTime}ms for user ${userId}`);
    }

    return data;
  }
}