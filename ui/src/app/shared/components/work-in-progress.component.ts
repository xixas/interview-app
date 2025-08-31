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
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div class="card mb-0 max-w-4xl w-full text-center px-8 py-12 relative overflow-hidden bg-surface-ground border border-surface-border before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:to-primary-light">
        <!-- Icon Section -->
        <div class="relative mb-8">
          <div class="inline-block">
            <i class="pi pi-cog animate-spin text-orange-500 text-6xl"></i>
          </div>
        </div>

        <!-- Content Section -->
        <div class="flex flex-col gap-8">
          <h2 class="text-surface-900 dark:text-surface-0 text-2xl font-bold mb-4 text-center">
            {{ config().title }}
          </h2>
          
          <p class="text-surface-600 dark:text-surface-400 text-lg text-center mb-8 max-w-2xl mx-auto leading-relaxed">
            {{ config().description }}
          </p>

            <!-- Status Badge -->
            <div class="flex justify-center">
              <span class="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full font-medium">
                <i class="pi pi-wrench text-sm"></i>
                Under Development
              </span>
            </div>

            <!-- Features Preview -->
            @if (config().features && config().features.length > 0) {
              <div class="mt-8">
                <h3 class="text-surface-900 dark:text-surface-0 text-xl font-semibold mb-6 text-center">
                  Planned Features
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  @for (feature of config().features; track feature) {
                    <div class="flex items-center p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-600 text-left">
                      <i class="pi pi-check-circle text-green-500 mr-3 text-lg"></i>
                      <span class="text-surface-700 dark:text-surface-300 font-medium">{{ feature }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Timeline -->
            @if (config().estimatedRelease) {
              <div class="mt-4">
                <div class="flex items-center justify-center p-6 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg max-w-xs mx-auto">
                  <i class="pi pi-calendar text-primary text-xl mr-3"></i>
                  <div>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold">Estimated Release</div>
                    <div class="text-surface-600 dark:text-surface-400">{{ config().estimatedRelease }}</div>
                  </div>
                </div>
              </div>
            }

            <!-- Action Button -->
            @if (config().actionLabel && config().actionRoute) {
              <div class="mt-4">
                <p-button 
                  [label]="config().actionLabel!"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  size="large"
                  (onClick)="navigate()"
                  class="primary-action">
                </p-button>
              </div>
            }
          </div>
        </div>

        <!-- Additional Info -->
        <div class="mt-8 p-4 bg-surface-100 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-600">
          <p class="text-surface-500 dark:text-surface-400 text-sm text-center">
            In the meantime, explore our <strong>Interview Practice</strong> and <strong>AI Evaluation</strong> features!
          </p>
        </div>
      </div>
  `,
  styles: [`
    /* Custom animation for construction indicator */
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .animate-spin {
      animation: spin 2s linear infinite;
    }
  `]
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