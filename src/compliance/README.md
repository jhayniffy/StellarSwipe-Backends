# Compliance & Geo-Blocking System

## Overview
Comprehensive compliance system with IP geolocation, sanctions screening, VPN detection, and regulatory compliance reporting.

## Features

### 1. Geo-Blocking
- **IP Geolocation**: Automatic country detection
- **Blocked Countries**: OFAC sanctioned countries
- **VPN Detection**: Blocks VPN/Proxy/Tor connections
- **Real-time Blocking**: Middleware intercepts all requests

### 2. Sanctions Screening
- **OFAC Compliance**: Screens against sanctioned entities
- **Wallet Screening**: Checks crypto addresses
- **Email Screening**: Validates email addresses
- **Tornado Cash**: Blocks sanctioned mixer addresses

### 3. Compliance Reporting
- **Audit Logs**: All access attempts logged
- **Reports**: Generate compliance reports
- **Analytics**: Top blocked countries, IPs, reasons
- **Export**: Data for regulatory submissions

## Blocked Countries (OFAC Sanctioned)

```
CU - Cuba
IR - Iran
KP - North Korea
SY - Syria
RU - Russia
BY - Belarus
VE - Venezuela
MM - Myanmar
ZW - Zimbabwe
SD - Sudan
LY - Libya
SO - Somalia
YE - Yemen
IQ - Iraq
LB - Lebanon
AF - Afghanistan
```

## API Endpoints

### Check IP Location
```http
GET /compliance/check-ip?ip=8.8.8.8
```

**Response:**
```json
{
  "country": "United States",
  "countryCode": "US",
  "isVPN": false,
  "isProxy": false,
  "isTor": false,
  "ip": "8.8.8.8",
  "isBlocked": false
}
```

### Screen Wallet Address
```http
POST /compliance/screen-wallet
Content-Type: application/json

{
  "address": "0x8589427373D6D84E98730D7795D8f6f8731FDA16"
}
```

**Response:**
```json
{
  "isBlocked": true,
  "reason": "Wallet address appears on OFAC sanctions list",
  "matchedEntity": "0x8589427373D6D84E98730D7795D8f6f8731FDA16"
}
```

### Screen User
```http
POST /compliance/screen-user
Content-Type: application/json

{
  "walletAddress": "0x...",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Get Blocked Countries
```http
GET /compliance/blocked-countries
```

**Response:**
```json
{
  "countries": ["CU", "IR", "KP", "SY", "RU", "BY", "VE", "MM", "ZW", "SD", "LY", "SO", "YE", "IQ", "LB", "AF"]
}
```

### Compliance Stats
```http
GET /compliance/stats
```

**Response:**
```json
{
  "blockedCountries": 16,
  "blockedWallets": 2,
  "blockedEmails": 0
}
```

### Generate Compliance Report
```http
GET /compliance/report?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "totalBlocked": 150,
  "totalAllowed": 10000,
  "sanctionsHits": 5,
  "topBlockedCountries": [
    { "country": "RU", "count": 50 },
    { "country": "IR", "count": 30 }
  ],
  "topBlockedIPs": [
    { "ip": "1.2.3.4", "count": 10 }
  ],
  "blockReasons": [
    { "reason": "Access denied: Service not available in Russia", "count": 50 }
  ]
}
```

### Recent Blocked Access
```http
GET /compliance/recent-blocks?limit=100
```

## Configuration

### Environment Variables

```env
# Blocked countries (comma-separated ISO codes)
BLOCKED_COUNTRIES=CU,IR,KP,SY,RU,BY,VE,MM,ZW,SD,LY,SO,YE,IQ,LB,AF

# IP Geolocation API key (optional)
IP_API_KEY=your_api_key_here
```

## Middleware Integration

The geo-blocking middleware is automatically applied to all routes except health checks:

```typescript
// Automatically applied in ComplianceModule
consumer
  .apply(GeoBlockMiddleware)
  .exclude('health', 'health/(.*)')
  .forRoutes('*');
```

## Error Responses

### Blocked Country
```json
{
  "statusCode": 403,
  "message": "Access denied: Service not available in Russia",
  "error": "Forbidden"
}
```

### VPN Detected
```json
{
  "statusCode": 403,
  "message": "Access denied: VPN/Proxy/Tor connections are not allowed",
  "error": "Forbidden"
}
```

### Sanctioned Wallet
```json
{
  "isBlocked": true,
  "reason": "Wallet address appears on OFAC sanctions list",
  "matchedEntity": "0x..."
}
```

## Compliance Logging

All access attempts are logged to the database:

```typescript
{
  type: 'access_blocked' | 'access_allowed' | 'sanctions_hit',
  ipAddress: '1.2.3.4',
  countryCode: 'RU',
  reason: 'Service not available',
  path: '/api/v1/trades',
  method: 'POST',
  userId: 'user-uuid',
  walletAddress: '0x...',
  metadata: { /* additional data */ },
  createdAt: '2024-01-19T10:00:00Z'
}
```

## VPN Detection

The system detects:
- ✅ VPN connections
- ✅ Proxy servers
- ✅ Tor exit nodes
- ✅ Data center IPs

## Sanctions Lists

Currently screening against:
- **OFAC SDN**: Specially Designated Nationals
- **Tornado Cash**: Sanctioned mixer addresses
- **Custom Lists**: Configurable blocked entities

## Best Practices

1. **Regular Updates**: Sync sanctions lists weekly
2. **Audit Logs**: Review compliance logs monthly
3. **False Positives**: Monitor and whitelist legitimate users
4. **Reporting**: Generate quarterly compliance reports
5. **Documentation**: Maintain records for 7 years

## Testing

### Bypass for Development
```typescript
// In development, localhost IPs are allowed
if (ip === '127.0.0.1' || ip === '::1') {
  // Skip geo-blocking
}
```

### Test Blocked Country
```bash
curl -H "X-Forwarded-For: 1.2.3.4" http://localhost:3000/api/v1/dashboard
```

## Legal Compliance

This system helps comply with:
- ✅ OFAC Regulations (US)
- ✅ EU Sanctions
- ✅ UN Security Council Resolutions
- ✅ Financial Action Task Force (FATF)
- ✅ Know Your Customer (KYC) requirements

## Support

For compliance questions or to report false positives:
- Email: compliance@stellarswipe.com
- Review process: 24-48 hours