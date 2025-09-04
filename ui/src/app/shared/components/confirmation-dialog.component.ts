import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmSeverity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
  icon?: string;
  width?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss'
})
export class ConfirmationDialogComponent {
  visible = input.required<boolean>();
  config = input.required<ConfirmationConfig>();
  
  onConfirm = output<void>();
  onCancel = output<void>();

  handleConfirm() {
    this.onConfirm.emit();
  }

  handleCancel() {
    this.onCancel.emit();
  }
}