import { ProviderRating } from '../entities/provider-rating.entity';

export class RatingSummaryDto {
  averageRating!: number;
  totalRatings!: number;
  starDistribution!: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export class RatingResponseDto {
  id!: string;
  userId!: string;
  providerId!: string;
  stars!: number;
  review?: string;
  createdAt!: Date;
  updatedAt!: Date;
}