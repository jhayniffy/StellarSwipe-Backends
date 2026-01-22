import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class CreateSignalDto {
  @IsString()
  @IsNotEmpty()
  assetPair!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  rationale!: string;
}
