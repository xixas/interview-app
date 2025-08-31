import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkInProgressComponent, WorkInProgressConfig } from '../../shared/components/work-in-progress.component';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, WorkInProgressComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-work-in-progress [config]="progressConfig()" />
  `,
  styles: []
})
export class ProgressComponent {
  progressConfig = signal<WorkInProgressConfig>({
    title: 'Progress Analytics',
    description: 'Track your interview practice progress with detailed analytics, performance trends, and learning insights to optimize your preparation.',
    icon: 'pi pi-chart-line',
    features: [
      'Detailed performance analytics',
      'Progress tracking by topic',
      'Learning curve visualization',
      'Performance comparison over time',
      'Difficulty progression tracking',
      'Success rate by category',
      'Time spent analysis',
      'Improvement recommendations'
    ],
    estimatedRelease: 'Next Version (v1.1)',
    actionLabel: 'Start Interview Practice',
    actionRoute: '/interview'
  });
}