import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-global-toast',
  standalone: true,
  imports: [CommonModule, ToastModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-toast.component.html',
  styleUrl: './global-toast.component.scss'
})
export class GlobalToastComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly messageService = inject(MessageService);

  constructor() {
    // Sync NotificationService with PrimeNG MessageService
    effect(() => {
      const notifications = this.notificationService.notifications();
      
      // Clear existing messages and add new ones
      this.messageService.clear();
      
      notifications.forEach(notification => {
        this.messageService.add({
          key: 'global', // Use a consistent key for global toasts
          severity: notification.severity,
          summary: notification.summary,
          detail: notification.detail,
          life: notification.sticky ? 0 : notification.life,
          closable: notification.closable,
          id: notification.id
        });
      });
    });
  }
}