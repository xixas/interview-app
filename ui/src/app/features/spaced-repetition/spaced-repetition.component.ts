import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkInProgressComponent, WorkInProgressConfig } from '../../shared/components/work-in-progress.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-spaced-repetition',
  standalone: true,
  imports: [CommonModule, WorkInProgressComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './spaced-repetition.component.html',
  styleUrl: './spaced-repetition.component.scss'
})
export class SpacedRepetitionComponent {
  spacedRepetitionConfig = signal<WorkInProgressConfig>({
    title: 'Spaced Repetition Learning',
    description: 'Optimize your learning with scientifically-proven spaced repetition algorithms. Practice questions at optimal intervals to maximize retention and minimize review time.',
    icon: 'pi pi-refresh',
    features: [
      'FSRS algorithm implementation (ts-fsrs 5.2.1)',
      'Personalized review scheduling',
      'Adaptive difficulty adjustment',
      'Memory retention optimization',
      'Smart question prioritization',
      'Learning progress tracking',
      'Review session planning',
      'Forgetting curve analysis'
    ],
    estimatedRelease: 'Version 1.2',
    actionLabel: 'Try AI Evaluation',
    actionRoute: '/evaluator'
  });
}