import { Injectable, signal } from '@angular/core';

export interface NetworkStatus {
  isOnline: boolean;
  canReachEvaluator: boolean;
  lastChecked: Date;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private _networkStatus = signal<NetworkStatus>({
    isOnline: navigator.onLine,
    canReachEvaluator: false,
    lastChecked: new Date()
  });

  readonly networkStatus = this._networkStatus.asReadonly();
  
  private checkInterval: number | null = null;
  private readonly EVALUATOR_URL = 'http://localhost:3001';
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  constructor() {
    this.initializeNetworkMonitoring();
    this.checkEvaluatorService();
  }

  private initializeNetworkMonitoring(): void {
    // Listen for browser online/offline events
    const onlineHandler = () => {
      this.updateOnlineStatus(true);
      this.checkEvaluatorService();
    };

    const offlineHandler = () => {
      this.updateOnlineStatus(false);
    };

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    // Store handlers for cleanup
    this.onlineHandler = onlineHandler;
    this.offlineHandler = offlineHandler;

    // Start periodic checks for evaluator service
    this.startPeriodicChecks();
  }

  private updateOnlineStatus(isOnline: boolean): void {
    this._networkStatus.update(current => ({
      ...current,
      isOnline,
      lastChecked: new Date(),
      error: isOnline ? undefined : 'No internet connection'
    }));
  }

  private startPeriodicChecks(): void {
    // Check evaluator service every 30 seconds
    this.checkInterval = window.setInterval(() => {
      if (this._networkStatus().isOnline) {
        this.checkEvaluatorService();
      }
    }, 30000);
  }

  async checkEvaluatorService(): Promise<boolean> {
    if (!this._networkStatus().isOnline) {
      this._networkStatus.update(current => ({
        ...current,
        canReachEvaluator: false,
        error: 'No internet connection'
      }));
      return false;
    }

    try {
      // Try to reach evaluator health endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.EVALUATOR_URL}/evaluator/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      const canReach = response.ok;
      
      this._networkStatus.update(current => ({
        ...current,
        canReachEvaluator: canReach,
        lastChecked: new Date(),
        error: canReach ? undefined : `Evaluator service unavailable (${response.status})`
      }));

      return canReach;
    } catch (error) {
      let errorMessage = 'Evaluator service unavailable';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Evaluator service timeout';
        } else {
          errorMessage = `Evaluator service error: ${error.message}`;
        }
      }

      this._networkStatus.update(current => ({
        ...current,
        canReachEvaluator: false,
        lastChecked: new Date(),
        error: errorMessage
      }));

      return false;
    }
  }

  isOnline(): boolean {
    return this._networkStatus().isOnline;
  }

  canUseAIFeatures(): boolean {
    const status = this._networkStatus();
    return status.isOnline && status.canReachEvaluator;
  }

  getNetworkStatusMessage(): string {
    const status = this._networkStatus();
    
    if (!status.isOnline) {
      return 'No internet connection. AI evaluation features are unavailable.';
    }
    
    if (!status.canReachEvaluator) {
      return status.error || 'Evaluator service is unavailable. AI features may not work.';
    }
    
    return 'All services are online and ready.';
  }

  // Get user-friendly error message with suggestions
  getConnectivityError(): {
    title: string;
    message: string;
    suggestions: string[];
  } {
    const status = this._networkStatus();
    
    if (!status.isOnline) {
      return {
        title: 'No Internet Connection',
        message: 'AI evaluation requires an internet connection to work.',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'You can still practice interviews without AI evaluation'
        ]
      };
    }
    
    if (!status.canReachEvaluator) {
      return {
        title: 'Evaluator Service Unavailable',
        message: 'The AI evaluation service is not responding.',
        suggestions: [
          'Make sure all services are running (npm run dev)',
          'Check if the evaluator service is running on port 3001',
          'Try restarting the application',
          'You can still practice interviews and get evaluations later'
        ]
      };
    }
    
    return {
      title: 'Service Ready',
      message: 'All services are working properly.',
      suggestions: []
    };
  }

  // Force a connectivity check
  async refreshNetworkStatus(): Promise<void> {
    this.updateOnlineStatus(navigator.onLine);
    if (this._networkStatus().isOnline) {
      await this.checkEvaluatorService();
    }
  }

  // Cleanup method
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
      this.offlineHandler = null;
    }
  }
}