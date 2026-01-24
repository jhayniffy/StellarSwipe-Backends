// Client-side WebSocket connection example
// This would be used in the frontend application

import { io, Socket } from 'socket.io-client';

class DashboardWebSocket {
  private socket: Socket;

  constructor(serverUrl: string) {
    this.socket = io(`${serverUrl}/dashboard`);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to dashboard WebSocket');
    });

    this.socket.on('dashboard_update', (data) => {
      console.log('Dashboard update received:', data);
      // Update UI with new dashboard data
      this.updateDashboard(data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from dashboard WebSocket');
    });
  }

  subscribe(userId: string): void {
    this.socket.emit('subscribe', { userId });
  }

  unsubscribe(userId: string): void {
    this.socket.emit('unsubscribe', { userId });
  }

  private updateDashboard(data: any): void {
    // Update dashboard UI components
    // This would integrate with your frontend framework (React, Vue, Angular, etc.)
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

// Usage example:
// const dashboard = new DashboardWebSocket('http://localhost:3000');
// dashboard.subscribe('user-123');