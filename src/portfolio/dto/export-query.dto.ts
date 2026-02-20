import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportFormat {
    CSV = 'csv',
    JSON = 'json',
}

export class ExportQueryDto {
    @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.CSV })
    @IsEnum(ExportFormat)
    @IsOptional()
    format: ExportFormat = ExportFormat.CSV;

    @ApiPropertyOptional({ description: 'Start date for filtering trades' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for filtering trades' })
    @IsDateString()
    @IsOptional()
    endDate?: string;
}
