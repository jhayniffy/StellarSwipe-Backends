import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { GeoBlockService } from './geo-blocking/geo-block.service';
import { SanctionsScreeningService } from './geo-blocking/sanctions-screening.service';
import { ComplianceReportingService } from './compliance-reporting.service';

@Controller('compliance')
export class ComplianceController {
  constructor(
    private geoBlockService: GeoBlockService,
    private sanctionsService: SanctionsScreeningService,
    private reportingService: ComplianceReportingService,
  ) {}

  @Get('blocked-countries')
  getBlockedCountries(): { countries: string[] } {
    return {
      countries: this.geoBlockService.getBlockedCountries(),
    };
  }

  @Get('check-ip')
  async checkIP(@Query('ip') ip: string) {
    const location = await this.geoBlockService.getGeoLocation(ip);
    const isBlocked = this.geoBlockService.isBlocked(location.countryCode);

    return {
      ...location,
      isBlocked,
    };
  }

  @Post('screen-wallet')
  async screenWallet(@Body('address') address: string) {
    return this.sanctionsService.screenWalletAddress(address);
  }

  @Post('screen-user')
  async screenUser(
    @Body() data: { walletAddress?: string; email?: string; name?: string },
  ) {
    return this.sanctionsService.screenUser(data);
  }

  @Get('stats')
  getComplianceStats() {
    return {
      blockedCountries: this.geoBlockService.getBlockedCountries().length,
      blockedWallets: this.sanctionsService.getBlockedWalletsCount(),
      blockedEmails: this.sanctionsService.getBlockedEmailsCount(),
    };
  }

  @Get('report')
  async getComplianceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.reportingService.generateReport(start, end);
  }

  @Get('recent-blocks')
  async getRecentBlocks(@Query('limit') limit?: number) {
    return this.reportingService.getRecentBlocks(limit ? parseInt(limit as any) : 100);
  }
}