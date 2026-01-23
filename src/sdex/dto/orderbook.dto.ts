import { ApiProperty } from '@nestjs/swagger';

export class OrderbookEntryDto {
  @ApiProperty({ example: '1.25', description: 'Price of the asset' })
  price!: string;

  @ApiProperty({ example: '100.50', description: 'Amount of the asset' })
  amount!: string;
}

export class OrderbookDto {
  @ApiProperty({ example: 'XLM:USDC', description: 'Asset pair string' })
  assetPair!: string;

  @ApiProperty({ type: [OrderbookEntryDto], description: 'List of buy orders' })
  bids!: OrderbookEntryDto[];

  @ApiProperty({ type: [OrderbookEntryDto], description: 'List of sell orders' })
  asks!: OrderbookEntryDto[];

  @ApiProperty({ example: 0.001, description: 'Percentage spread between best bid and ask' })
  spread!: number;

  @ApiProperty({ example: '2024-01-23T10:00:00Z', description: 'Last update timestamp' })
  lastUpdate!: Date;

  @ApiProperty({ example: '1.245', description: 'Mid price: (bestBid + bestAsk) / 2' })
  midPrice!: string;
}
