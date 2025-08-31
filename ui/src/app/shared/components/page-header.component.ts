import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start gap-4 mb-6">
      @if (icon()) {
        <div class="bg-primary text-white w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0">
          <i [class]="icon() + ' text-2xl'"></i>
        </div>
      }
      <div class="flex-1">
        <h1 class="text-surface-900 dark:text-surface-0 text-2xl font-semibold m-0">{{ title() }}</h1>
        @if (description()) {
          <p class="text-muted-color text-sm m-0 mt-1">{{ description() }}</p>
        }
      </div>
      @if (hasActions) {
        <div class="flex items-center gap-2">
          <ng-content select="[slot=actions]"></ng-content>
        </div>
      }
    </div>
  `,
  styles: []
})
export class PageHeaderComponent {
  title = input.required<string>();
  description = input<string>('');
  icon = input<string>('');

  get hasActions(): boolean {
    return true; // Allow content projection for action buttons
  }
}