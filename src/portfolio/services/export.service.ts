import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Trade } from '../../trades/entities/trade.entity';
import { ExportFormat, ExportQueryDto } from '../dto/export-query.dto';
import * as fastcsv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { NotificationService } from '../../common/services/notification.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
@Processor('export-history')
export class ExportService {
    private readonly logger = new Logger(ExportService.name);
    private readonly EXPORT_DIR = path.join(process.cwd(), 'exports');
    private readonly SYNC_THRESHOLD = 1000;

    constructor(
        @InjectRepository(Trade)
        private tradeRepository: Repository<Trade>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectQueue('export-history')
        private exportQueue: Queue,
        private rateLimitService: RateLimitService,
        private notificationService: NotificationService,
    ) {
        if (!fs.existsSync(this.EXPORT_DIR)) {
            fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
        }
    }

    async exportTrades(userId: string, query: ExportQueryDto): Promise<{ status: string; url?: string; message?: string }> {
        await this.rateLimitService.checkRateLimit(userId);

        const where: any = { userId };
        if (query.startDate && query.endDate) {
            where.createdAt = Between(new Date(query.startDate), new Date(query.endDate));
        } else if (query.startDate) {
            where.createdAt = MoreThanOrEqual(new Date(query.startDate));
        } else if (query.endDate) {
            where.createdAt = LessThanOrEqual(new Date(query.endDate));
        }

        const count = await this.tradeRepository.count({ where });

        if (count === 0) {
            return { status: 'empty', message: 'No trades found for the given criteria.' };
        }

        if (count > this.SYNC_THRESHOLD) {
            await this.exportQueue.add('generate-export', { userId, query, where });
            return { status: 'processing', message: 'Large export started. You will receive an email with the download link shortly.' };
        }

        const { fileName } = await this.generateFile(userId, query, where);
        await this.rateLimitService.incrementCount(userId);

        // In a real app, this would be a signed URL to a storage bucket
        return { status: 'completed', url: `/exports/${fileName}` };
    }

    private async generateFile(userId: string, query: ExportQueryDto, where: any): Promise<{ filePath: string; fileName: string }> {
        const trades = await this.tradeRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });

        const fileName = `trade_history_${userId}_${Date.now()}.${query.format}`;
        const filePath = path.join(this.EXPORT_DIR, fileName);

        if (query.format === ExportFormat.CSV) {
            await this.generateCsv(trades, filePath);
        } else {
            await this.generateJson(trades, filePath);
        }

        return { filePath, fileName };
    }

    private async generateCsv(trades: Trade[], filePath: string): Promise<void> {
        const csvStream = fastcsv.format({ headers: true });
        const writableStream = fs.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            csvStream.pipe(writableStream)
                .on('finish', resolve)
                .on('error', reject);

            trades.forEach((trade) => {
                csvStream.write({
                    Date: trade.createdAt.toISOString(),
                    Asset: `${trade.baseAsset}/${trade.counterAsset}`,
                    Action: trade.side.toUpperCase(),
                    'Entry Price': trade.entryPrice,
                    'Exit Price': trade.exitPrice || 'N/A',
                    Quantity: trade.amount,
                    Fees: trade.feeAmount,
                    'P&L': trade.profitLoss || '0.00',
                    Status: trade.status,
                });
            });
            csvStream.end();
        });
    }

    private async generateJson(trades: Trade[], filePath: string): Promise<void> {
        const data = trades.map((trade) => ({
            date: trade.createdAt,
            asset: `${trade.baseAsset}/${trade.counterAsset}`,
            action: trade.side,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            quantity: trade.amount,
            fees: trade.feeAmount,
            profitLoss: trade.profitLoss,
            status: trade.status,
        }));

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    @Process('generate-export')
    async handleExportJob(job: Job<{ userId: string; query: ExportQueryDto; where: any }>) {
        const { userId, query, where } = job.data;
        this.logger.log(`Starting background export for user ${userId}`);

        try {
            const { fileName } = await this.generateFile(userId, query, where);
            await this.rateLimitService.incrementCount(userId);

            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (user && user.email) {
                const downloadLink = `https://api.stellarswipe.com/exports/${fileName}`; // Mock domain
                await this.notificationService.sendEmail(
                    user.email,
                    'Your Trade History Export is Ready',
                    `Hello ${user.username},\n\nYour trade history export has been generated. You can download it using the link below:\n\n${downloadLink}\n\nThis link will expire in 24 hours.`,
                );
            }
        } catch (error: any) {
            this.logger.error(`Failed to generate export for user ${userId}`, error.stack);
            throw error;
        }
    }
}

