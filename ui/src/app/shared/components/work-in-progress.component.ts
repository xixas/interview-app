import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Router } from '@angular/router';

export interface WorkInProgressConfig {
  title: string;
  description: string;
  icon: string;
  features: string[];
  estimatedRelease?: string;
  actionLabel?: string;
  actionRoute?: string;
}

@Component({
  selector: 'app-work-in-progress',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './work-in-progress.component.html',
  styleUrl: './work-in-progress.component.scss'
})
export class WorkInProgressComponent {
  config = input.required<WorkInProgressConfig>();
  private router = inject(Router);

  navigate() {
    const route = this.config().actionRoute;
    if (route) {
      this.router.navigate([route]);
    }
  }
}