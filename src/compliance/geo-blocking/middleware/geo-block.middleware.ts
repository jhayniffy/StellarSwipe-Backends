import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GeoBlockService } from '../geo-block.service';
import { SanctionsScreeningService } from '../sanctions-screening.service';

@Injectable()
export class GeoBlockMiddleware implements NestMiddleware {
  constructor(
    private geoBlockService: GeoBlockService,
    private sanctionsService: SanctionsScreeningService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = this.getClientIP(req);
      
      // Check geo-blocking and VPN
      await this.geoBlockService.checkAccess(ip);

      // Log access attempt for compliance
      this.logAccessAttempt(ip, req);

      next();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        // Log blocked access for compliance reporting
        this.logBlockedAccess(this.getClientIP(req), req, error.message);
      }
      throw error;
    }
  }

  private getClientIP(req: Request): string {
    // Check various headers for real IP (behind proxies/load balancers)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    return (
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  private logAccessAttempt(ip: string, req: Request): void {
    console.log({
      type: 'access_allowed',
      ip,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  private logBlockedAccess(ip: string, req: Request, reason: string): void {
    console.warn({
      type: 'access_blocked',
      ip,
      path: req.path,
      method: req.method,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}