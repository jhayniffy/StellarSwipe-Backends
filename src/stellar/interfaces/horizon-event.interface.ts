export interface HorizonOperation {
  id: string;
  type: string;
  type_i: number;
  source_account: string;
  created_at: string;
  transaction_hash: string;
  
  // Payment operation fields
  from?: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  
  // Manage offer operation fields
  offer_id?: string;
  selling_asset_type?: string;
  selling_asset_code?: string;
  selling_asset_issuer?: string;
  buying_asset_type?: string;
  buying_asset_code?: string;
  buying_asset_issuer?: string;
  price?: string;
  price_r?: {
    n: number;
    d: number;
  };
  
  // Change trust operation fields
  trustor?: string;
  trustee?: string;
  limit?: string;
  
  // Account merge fields
  account?: string;
  into?: string;
}

export interface HorizonTransaction {
  id: string;
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  source_account_sequence: string;
  fee_account: string;
  fee_charged: string;
  max_fee: string;
  operation_count: number;
  envelope_xdr: string;
  result_xdr: string;
  result_meta_xdr: string;
  fee_meta_xdr: string;
  memo_type: string;
  memo?: string;
  signatures: string[];
  valid_after?: string;
  valid_before?: string;
  successful: boolean;
}

export interface HorizonEffect {
  id: string;
  account: string;
  type: string;
  type_i: number;
  created_at: string;
  
  // Account credited/debited
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  
  // Trade effects
  sold_amount?: string;
  sold_asset_type?: string;
  sold_asset_code?: string;
  sold_asset_issuer?: string;
  bought_amount?: string;
  bought_asset_type?: string;
  bought_asset_code?: string;
  bought_asset_issuer?: string;
  offer_id?: string;
  seller?: string;
  
  // Trustline effects
  limit?: string;
  trustor?: string;
  trustee?: string;
}

export interface HorizonStreamEvent {
  id: string;
  paging_token: string;
  successful: boolean;
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  type: 'transaction' | 'operation' | 'effect' | 'ledger';
  data: HorizonTransaction | HorizonOperation | HorizonEffect;
}

export interface StreamCursor {
  cursor: string;
  lastEventTime: Date;
  reconnectCount: number;
}

export interface ProcessedEvent {
  eventId: string;
  eventType: 'payment' | 'trade' | 'trustline' | 'account_merge' | 'offer_created' | 'offer_updated' | 'offer_removed';
  accountId: string;
  transactionHash: string;
  ledger: number;
  timestamp: Date;
  data: any;
}

export interface TradeEvent extends ProcessedEvent {
  eventType: 'trade';
  data: {
    seller: string;
    buyer: string;
    soldAmount: string;
    soldAsset: {
      type: string;
      code?: string;
      issuer?: string;
    };
    boughtAmount: string;
    boughtAsset: {
      type: string;
      code?: string;
      issuer?: string;
    };
    price: string;
    offerId: string;
  };
}

export interface PaymentEvent extends ProcessedEvent {
  eventType: 'payment';
  data: {
    from: string;
    to: string;
    amount: string;
    asset: {
      type: string;
      code?: string;
      issuer?: string;
    };
  };
}

export interface TrustlineEvent extends ProcessedEvent {
  eventType: 'trustline';
  data: {
    trustor: string;
    asset: {
      code: string;
      issuer: string;
    };
    limit: string;
    action: 'created' | 'updated' | 'removed';
  };
}

export interface AccountMergeEvent extends ProcessedEvent {
  eventType: 'account_merge';
  data: {
    account: string;
    destination: string;
  };
}