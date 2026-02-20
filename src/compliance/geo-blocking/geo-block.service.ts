import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GeoLocation {
  country: string;
  countryCode: string;
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  ip: string;
}

@Injectable()
export class GeoBlockService {
  private blockedCountries: Set<string>;
  private ipApiKey: string;

  constructor(private configService: ConfigService) {
    // OFAC sanctioned countries
    const blocked = this.configService.get<string>('BLOCKED_COUNTRIES', 
      'CU,IR,KP,SY,RU,BY,VE,MM,ZW,SD,LY,SO,YE,IQ,LB,AF'
    );
    this.blockedCountries = new Set(blocked.split(','));
    this.ipApiKey = this.configService.get<string>('IP_API_KEY', '');
  }

  async checkAccess(ip: string): Promise<void> {
    const location = await this.getGeoLocation(ip);

    if (this.blockedCountries.has(location.countryCode)) {
      throw new ForbiddenException(
        `Access denied: Service not available in ${location.country}`
      );
    }

    if (location.isVPN || location.isProxy || location.isTor) {
      throw new ForbiddenException(
        'Access denied: VPN/Proxy/Tor connections are not allowed'
      );
    }
  }

  async getGeoLocation(ip: string): Promise<GeoLocation> {
    // Skip localhost/private IPs
    if (this.isPrivateIP(ip)) {
      return {
        country: 'Local',
        countryCode: 'XX',
        isVPN: false,
        isProxy: false,
        isTor: false,
        ip,
      };
    }

    try {
      // Using ipapi.co (free tier: 1000 requests/day)
      const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 5000,
      });

      return {
        country: response.data.country_name || 'Unknown',
        countryCode: response.data.country_code || 'XX',
        isVPN: response.data.threat?.is_vpn || false,
        isProxy: response.data.threat?.is_proxy || false,
        isTor: response.data.threat?.is_tor || false,
        ip,
      };
    } catch (error) {
      // Fallback: allow access if geolocation fails
      console.error('Geolocation API error:', error);
      return {
        country: 'Unknown',
        countryCode: 'XX',
        isVPN: false,
        isProxy: false,
        isTor: false,
        ip,
      };
    }
  }

  isBlocked(countryCode: string): boolean {
    return this.blockedCountries.has(countryCode);
  }

  getBlockedCountries(): string[] {
    return Array.from(this.blockedCountries);
  }

  private isPrivateIP(ip: string): boolean {
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      return true;
    }

    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);

    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }
}