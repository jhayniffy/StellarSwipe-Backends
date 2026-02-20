import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  review?: string;
}