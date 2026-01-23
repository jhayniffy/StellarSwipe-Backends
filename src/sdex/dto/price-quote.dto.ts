import { ApiProperty } from '@nestjs/swagger';

export class PriceQuoteDto {
  @ApiProperty({ example: 'XLM:USDC', description: 'Asset pair string' })
  assetPair!: string;

  @ApiProperty({ example: '100', description: 'Trade amount' })
  amount!: string;

  @ApiProperty({ example: '1.25', description: 'Estimated execution price' })
  estimatedPrice!: string;

  @ApiProperty({ example: 0.5, description: 'Percentage price impact' })
  priceImpact!: number;

  @ApiProperty({ example: '1.24', description: 'Current market mid-price' })
  marketPrice!: string;

  @ApiProperty({ example: '125.0', description: 'Total value of the trade' })
  totalValue!: string;
}
