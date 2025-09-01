import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail?: string;
  life?: number;
  sticky?: boolean;
  closable?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private messages = signal<ToastMessage[]>([]);
  
  // Expose readonly version of messages
  readonly notifications = this.messages.asReadonly();
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private addMessage(message: Omit<ToastMessage, 'id'>): void {
    const newMessage: ToastMessage = {
      id: this.generateId(),
      life: 5000, // Default 5 seconds
      closable: true,
      ...message
    };

    this.messages.update(current => [...current, newMessage]);

    // Auto remove non-sticky messages
    if (!newMessage.sticky && newMessage.life && newMessage.life > 0) {
      setTimeout(() => {
        this.removeMessage(newMessage.id);
      }, newMessage.life);
    }
  }

  showSuccess(summary: string, detail?: string, options?: Partial<ToastMessage>): void {
    this.addMessage({
      severity: 'success',
      summary,
      detail,
      ...options
    });
  }

  showInfo(summary: string, detail?: string, options?: Partial<ToastMessage>): void {
    this.addMessage({
      severity: 'info', 
      summary,
      detail,
      ...options
    });
  }

  showWarn(summary: string, detail?: string, options?: Partial<ToastMessage>): void {
    this.addMessage({
      severity: 'warn',
      summary, 
      detail,
      ...options
    });
  }

  showError(summary: string, detail?: string, options?: Partial<ToastMessage>): void {
    this.addMessage({
      severity: 'error',
      summary,
      detail,
      life: 8000, // Error messages stay longer
      ...options
    });
  }

  removeMessage(id: string): void {
    this.messages.update(current => current.filter(msg => msg.id !== id));
  }

  clear(): void {
    this.messages.set([]);
  }

  // Convenience methods for common scenarios
  showApiError(error: any): void {
    let summary = 'Request Failed';
    let detail = 'An unexpected error occurred. Please try again.';
    
    if (error?.message) {
      detail = error.message;
    } else if (typeof error === 'string') {
      detail = error;
    } else if (error?.status) {
      switch (error.status) {
        case 0:
          detail = 'Unable to connect to service. Please check your connection.';
          break;
        case 401:
          summary = 'Unauthorized';
          detail = 'Please check your API key configuration.';
          break;
        case 403:
          summary = 'Forbidden';
          detail = 'You do not have permission to perform this action.';
          break;
        case 404:
          summary = 'Not Found';
          detail = 'The requested resource was not found.';
          break;
        case 429:
          summary = 'Rate Limited';
          detail = 'Too many requests. Please wait a moment before trying again.';
          break;
        case 500:
          summary = 'Server Error';
          detail = 'Internal server error. Please try again later.';
          break;
        default:
          detail = `Server responded with status ${error.status}`;
      }
    }

    this.showError(summary, detail);
  }

  showSaveSuccess(): void {
    this.showSuccess('Saved', 'Your changes have been saved successfully');
  }

  showDeleteSuccess(): void {
    this.showSuccess('Deleted', 'Item has been removed successfully');
  }

  showValidationError(message: string = 'Please check the form for errors'): void {
    this.showWarn('Validation Error', message);
  }

  showLoadingError(): void {
    this.showError('Loading Failed', 'Unable to load data. Please refresh the page.');
  }

  showServiceUnavailable(): void {
    this.showWarn('Service Unavailable', 'This feature is temporarily unavailable. Please try again later.');
  }

  showOfflineNotice(): void {
    this.showInfo('Offline Mode', 'You are currently offline. Some features may not be available.');
  }
}