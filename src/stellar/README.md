# Stellar Real-Time Event Streaming

This module provides real-time monitoring of Stellar ledger events through Horizon's Server-Sent Events (SSE) streams.

## Features

- **Real-time Event Processing**: Listens to Horizon SSE streams for transactions and effects
- **Account Monitoring**: Track specific accounts for relevant events
- **Automatic Reconnection**: Handles stream disconnections with exponential backoff
- **Event Filtering**: Processes only relevant events (payments, trades, trustlines, account merges)
- **Cursor Management**: Resumes streams from last processed event
- **Integration Ready**: Connects with trustline and trade execution systems

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Horizon Server  │───▶│ HorizonStream    │───▶│ EventProcessor  │
│ (SSE Streams)   │    │ Service          │    │ Service         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │ Stream Cursors   │    │ Processed       │
                       │ (Redis Cache)    │    │ Events          │
                       └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Integration     │
                                               │ Service         │
                                               └─────────────────┘
```

## Services

### HorizonStreamService

Manages SSE connections to Horizon server:

- **Account Watching**: Add/remove accounts to monitor
- **Stream Management**: Handles transaction and effects streams
- **Reconnection Logic**: Exponential backoff on failures
- **Cursor Persistence**: Saves stream positions to Redis

### EventProcessorService

Processes raw Horizon events:

- **Event Filtering**: Only processes relevant event types
- **Data Transformation**: Converts raw events to typed interfaces
- **Event Emission**: Publishes processed events via EventEmitter

### StellarIntegrationService

Integrates streaming with business logic:

- **Trade Confirmations**: Updates trade status when confirmed
- **Balance Updates**: Processes payment confirmations
- **Trustline Changes**: Handles trustline creation/removal
- **Security Alerts**: Monitors for account merge events

## Event Types

### Trade Events
```typescript
{
  eventType: 'trade',
  accountId: 'GXXX...',
  data: {
    seller: 'GXXX...',
    buyer: 'GYYY...',
    soldAmount: '100.0000000',
    soldAsset: { code: 'USDC', issuer: 'GZZZ...' },
    boughtAmount: '0.5000000',
    boughtAsset: { code: 'XLM' },
    price: '200.0000000',
    offerId: '12345'
  }
}
```

### Payment Events
```typescript
{
  eventType: 'payment',
  accountId: 'GXXX...',
  data: {
    from: 'GYYY...',
    to: 'GXXX...',
    amount: '100.0000000',
    asset: { code: 'USDC', issuer: 'GZZZ...' }
  }
}
```

### Trustline Events
```typescript
{
  eventType: 'trustline',
  accountId: 'GXXX...',
  data: {
    trustor: 'GXXX...',
    asset: { code: 'USDC', issuer: 'GZZZ...' },
    limit: '1000000.0000000',
    action: 'created' | 'updated' | 'removed'
  }
}
```

## API Endpoints

### Start Watching Account
```http
POST /api/v1/horizon-stream/watch/{publicKey}
```

### Stop Watching Account
```http
DELETE /api/v1/horizon-stream/watch/{publicKey}
```

### Watch Multiple Accounts
```http
POST /api/v1/horizon-stream/watch-multiple
Content-Type: application/json

{
  "publicKeys": ["GXXX...", "GYYY..."]
}
```

### Get Stream Status
```http
GET /api/v1/horizon-stream/status
```

Response:
```json
{
  "activeStreams": [
    "transactions_GXXX...",
    "effects_GXXX..."
  ],
  "watchedAccounts": ["GXXX..."],
  "cursors": {
    "transactions_GXXX...": {
      "cursor": "12345-1",
      "lastEventTime": "2024-01-19T12:00:00.000Z",
      "reconnectCount": 0
    }
  }
}
```

## Configuration

Environment variables:

```bash
# Stellar Configuration
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Redis for cursor storage
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Usage Examples

### Basic Account Monitoring

```typescript
import { StellarIntegrationService } from './stellar/services/stellar-integration.service';

@Injectable()
export class UserService {
  constructor(private stellarIntegration: StellarIntegrationService) {}

  async onUserLogin(publicKey: string) {
    // Start monitoring user's account
    await this.stellarIntegration.startWatchingUserAccount(publicKey);
  }

  async onUserLogout(publicKey: string) {
    // Stop monitoring when user logs out
    await this.stellarIntegration.stopWatchingUserAccount(publicKey);
  }
}
```

### Event Handling

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  @OnEvent('stellar.trade')
  async handleTradeConfirmation(event: TradeEvent) {
    // Send push notification about confirmed trade
    await this.sendPushNotification(event.accountId, {
      title: 'Trade Confirmed',
      body: `Your trade of ${event.data.soldAmount} ${event.data.soldAsset.code} completed`
    });
  }

  @OnEvent('stellar.payment')
  async handlePaymentReceived(event: PaymentEvent) {
    // Notify user of incoming payment
    if (event.data.to === event.accountId) {
      await this.sendPushNotification(event.accountId, {
        title: 'Payment Received',
        body: `Received ${event.data.amount} ${event.data.asset.code || 'XLM'}`
      });
    }
  }
}
```

## Error Handling

The system handles various error scenarios:

- **Stream Disconnections**: Automatic reconnection with exponential backoff
- **Network Issues**: Retries with increasing delays (max 60 seconds)
- **Invalid Events**: Logs errors and continues processing
- **Account Not Found**: Gracefully handles non-existent accounts

## Performance Considerations

- **Event Filtering**: Only processes relevant events to reduce load
- **Cursor Persistence**: Prevents reprocessing events after restarts
- **Connection Pooling**: Reuses connections where possible
- **Memory Management**: Cleans up inactive streams

## Security

- **Account Validation**: Validates Stellar public key formats
- **Event Verification**: Ensures events are from trusted Horizon servers
- **Security Alerts**: Monitors for suspicious activities (account merges)
- **Rate Limiting**: Prevents abuse of streaming endpoints

## Monitoring

The system provides comprehensive monitoring:

- **Stream Status**: Active streams and watched accounts
- **Event Metrics**: Processed events count and types
- **Error Tracking**: Failed connections and processing errors
- **Performance**: Event processing latency

## Testing

```bash
# Start watching a test account
curl -X POST http://localhost:3000/api/v1/horizon-stream/watch/GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU

# Check stream status
curl http://localhost:3000/api/v1/horizon-stream/status

# Stop watching
curl -X DELETE http://localhost:3000/api/v1/horizon-stream/watch/GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU
```

## Integration with Trades

The streaming system automatically integrates with the trading system:

1. **Pre-Trade**: Ensures trustlines exist before executing trades
2. **Trade Execution**: Monitors for trade confirmations
3. **Post-Trade**: Updates balances and portfolio when trades settle

This provides real-time feedback to users about their trading activity and account changes.