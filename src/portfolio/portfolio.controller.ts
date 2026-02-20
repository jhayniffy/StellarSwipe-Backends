import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe, BadRequestException, Request, UseGuards } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PositionDetailDto } from './dto/position-detail.dto';
import { PortfolioSummaryDto } from './dto/portfolio-summary.dto';
import { Trade } from '../trades/entities/trade.entity';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExportQueryDto } from './dto/export-query.dto';
import { ExportService } from './services/export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly exportService: ExportService,
  ) { }

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
  async getPerformance(@Request() req: any): Promise<PortfolioSummaryDto> {
    return this.portfolioService.getPerformance(req.user.id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export trade history as CSV or JSON' })
  @ApiResponse({ status: 200, description: 'Export initiated or completed' })
  async exportHistory(@Request() req: any, @Query() query: ExportQueryDto) {
    return this.exportService.exportTrades(req.user.id, query);
  }
}
