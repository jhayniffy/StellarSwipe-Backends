import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe, BadRequestException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PositionDetailDto } from './dto/position-detail.dto';
import { PortfolioSummaryDto } from './dto/portfolio-summary.dto';
import { Trade } from '../trades/entities/trade.entity';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('positions')
  async getPositions(@Query('userId') userId: string): Promise<PositionDetailDto[]> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.portfolioService.getPositions(userId);
  }

  @Get('history')
  async getHistory(
    @Query('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ data: Trade[]; total: number; page: number; limit: number; totalPages: number }> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    if (limit > 100) {
      throw new BadRequestException('limit cannot exceed 100');
    }
    
    const result = await this.portfolioService.getHistory(userId, page, limit);
    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  @Get('performance')
  async getPerformance(@Query('userId') userId: string): Promise<PortfolioSummaryDto> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.portfolioService.getPerformance(userId);
  }
}
