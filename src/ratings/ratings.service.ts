import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderRating } from './entities/provider-rating.entity';
import { SubmitRatingDto } from './dto/submit-rating.dto';
import { RatingSummaryDto, RatingResponseDto } from './dto/rating-summary.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(ProviderRating)
    private ratingRepository: Repository<ProviderRating>,
  ) {}

  async submitRating(
    userId: string,
    providerId: string,
    dto: SubmitRatingDto,
  ): Promise<ProviderRating> {
    const existing = await this.ratingRepository.findOne({
      where: { userId, providerId },
    });

    if (existing) {
      // Update existing rating
      existing.stars = dto.stars;
      existing.review = dto.review;
      return this.ratingRepository.save(existing);
    }

    // Create new rating
    const rating = this.ratingRepository.create({
      userId,
      providerId,
      stars: dto.stars,
      review: dto.review,
    });

    return this.ratingRepository.save(rating);
  }

  async getRatings(
    providerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: RatingResponseDto[]; total: number }> {
    const [ratings, total] = await this.ratingRepository.findAndCount({
      where: { providerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: ratings.map(r => this.toResponseDto(r)),
      total,
    };
  }

  async getRatingSummary(providerId: string): Promise<RatingSummaryDto> {
    const ratings = await this.ratingRepository.find({
      where: { providerId },
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalStars = ratings.reduce((sum, r) => sum + r.stars, 0);
    const averageRating = totalStars / ratings.length;

    const starDistribution = ratings.reduce(
      (dist, r) => {
        dist[r.stars as keyof typeof dist]++;
        return dist;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    );

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: ratings.length,
      starDistribution,
    };
  }

  async getUserRating(userId: string, providerId: string): Promise<ProviderRating | null> {
    return this.ratingRepository.findOne({
      where: { userId, providerId },
    });
  }

  async deleteRating(userId: string, providerId: string): Promise<void> {
    const rating = await this.ratingRepository.findOne({
      where: { userId, providerId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    await this.ratingRepository.remove(rating);
  }

  private toResponseDto(rating: ProviderRating): RatingResponseDto {
    return {
      id: rating.id,
      userId: rating.userId,
      providerId: rating.providerId,
      stars: rating.stars,
      review: rating.review,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    };
  }
}