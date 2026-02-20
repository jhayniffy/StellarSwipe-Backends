import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { SubmitRatingDto } from './dto/submit-rating.dto';
import { RatingSummaryDto, RatingResponseDto } from './dto/rating-summary.dto';
import { ProviderRating } from './entities/provider-rating.entity';

@Controller('providers')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post(':id/rate')
  async submitRating(
    @Param('id') providerId: string,
    @Query('userId') userId: string,
    @Body() dto: SubmitRatingDto,
  ): Promise<ProviderRating> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.ratingsService.submitRating(userId, providerId, dto);
  }

  @Get(':id/ratings')
  async getRatings(
    @Param('id') providerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ data: RatingResponseDto[]; total: number; page: number; limit: number }> {
    if (limit > 100) {
      throw new BadRequestException('limit cannot exceed 100');
    }

    const result = await this.ratingsService.getRatings(providerId, page, limit);
    return {
      ...result,
      page,
      limit,
    };
  }

  @Get(':id/ratings/summary')
  async getRatingSummary(@Param('id') providerId: string): Promise<RatingSummaryDto> {
    return this.ratingsService.getRatingSummary(providerId);
  }

  @Get(':id/ratings/user')
  async getUserRating(
    @Param('id') providerId: string,
    @Query('userId') userId: string,
  ): Promise<ProviderRating | null> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.ratingsService.getUserRating(userId, providerId);
  }

  @Delete(':id/ratings')
  async deleteRating(
    @Param('id') providerId: string,
    @Query('userId') userId: string,
  ): Promise<{ message: string }> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    await this.ratingsService.deleteRating(userId, providerId);
    return { message: 'Rating deleted successfully' };
  }
}