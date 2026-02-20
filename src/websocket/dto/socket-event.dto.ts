export enum SocketEvent {
  TRADE_UPDATED = 'trade:updated',
  SIGNAL_PERFORMANCE = 'signal:performance',
  PORTFOLIO_CHANGED = 'portfolio:changed',
  NEW_SIGNAL = 'signal:new',
}

export enum SocketRoom {
  SIGNALS_FEED = 'signals:feed',
  LEADERBOARD_TOP100 = 'leaderboard:top100',
}

export interface RoomSubscriptionDto {
  room: SocketRoom;
}

export interface SocketEventPayload<T = unknown> {
  event: SocketEvent;
  data: T;
}
