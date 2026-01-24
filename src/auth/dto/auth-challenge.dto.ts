
import { IsOptional, IsString } from 'class-validator';

export class AuthChallengeDto {
  @IsOptional()
  @IsString()
  publicKey?: string;
}
