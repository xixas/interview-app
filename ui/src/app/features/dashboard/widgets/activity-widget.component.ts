import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';

export interface Activity {
    id: string;
    title: string;
    description: string;
    timestamp: Date;
    type: 'interview' | 'evaluation' | 'achievement' | 'review';
    status?: 'completed' | 'in-progress' | 'pending';
    score?: number;
}

@Component({
    selector: 'app-activity-widget',
    standalone: true,
    imports: [CommonModule, CardModule, ButtonModule, TagModule, AvatarModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-card [header]="title()" styleClass="h-full">
            <ng-template pTemplate="header">
                <div class="flex justify-between items-center">
                    <h3 class="text-surface-900 dark:text-surface-0 font-semibold m-0">
                        {{ title() }}
                    </h3>
                    <button 
                        pButton 
                        type="button" 
                        icon="pi pi-ellipsis-v" 
                        class="p-button-text p-button-plain p-button-sm">
                    </button>
                </div>
            </ng-template>

            <div class="space-y-3">
                @for (activity of activities(); track activity.id; let last = $last) {
                    <div class="flex gap-3 pb-3" [class.border-b]="!last" 
                         [class.border-surface-200]="!last"
                         [class.dark:border-surface-700]="!last">
                        <!-- Activity Icon -->
                        <div class="flex-shrink-0">
                            <div 
                                class="w-10 h-10 rounded-full flex items-center justify-center"
                                [ngClass]="{
                                    'bg-blue-100 dark:bg-blue-400/10': activity.type === 'interview',
                                    'bg-green-100 dark:bg-green-400/10': activity.type === 'evaluation',
                                    'bg-purple-100 dark:bg-purple-400/10': activity.type === 'achievement',
                                    'bg-orange-100 dark:bg-orange-400/10': activity.type === 'review'
                                }">
                                <i 
                                    [ngClass]="{
                                        'pi pi-microphone text-blue-500': activity.type === 'interview',
                                        'pi pi-check-circle text-green-500': activity.type === 'evaluation',
                                        'pi pi-trophy text-purple-500': activity.type === 'achievement',
                                        'pi pi-eye text-orange-500': activity.type === 'review'
                                    }">
                                </i>
                            </div>
                        </div>

                        <!-- Activity Content -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2">
                                <div class="flex-1">
                                    <p class="text-surface-900 dark:text-surface-0 font-medium text-sm mb-1">
                                        {{ activity.title }}
                                    </p>
                                    <p class="text-muted-color text-xs mb-2">
                                        {{ activity.description }}
                                    </p>
                                    <div class="flex items-center gap-2">
                                        <span class="text-muted-color text-xs">
                                            {{ getRelativeTime(activity.timestamp) }}
                                        </span>
                                        @if (activity.score) {
                                            <p-tag 
                                                [value]="activity.score + '%'" 
                                                [severity]="getScoreSeverity(activity.score)"
                                                styleClass="text-xs px-2 py-0">
                                            </p-tag>
                                        }
                                        @if (activity.status) {
                                            <p-tag 
                                                [value]="activity.status" 
                                                [severity]="getStatusSeverity(activity.status)"
                                                styleClass="text-xs px-2 py-0">
                                            </p-tag>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div>

            <ng-template pTemplate="footer">
                <button 
                    pButton 
                    type="button" 
                    label="View All Activities" 
                    class="p-button-link p-button-sm w-full">
                </button>
            </ng-template>
        </p-card>
    `,
    styles: [`
        :host {
            display: block;
            height: 100%;
        }

        .space-y-3 > * + * {
            margin-top: 0.75rem;
        }
    `]
})
export class ActivityWidgetComponent {
    title = input<string>('Recent Activity');
    activities = input.required<Activity[]>();

    getRelativeTime(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    getScoreSeverity(score: number): string {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warn';
        return 'danger';
    }

    getStatusSeverity(status: string): string {
        switch(status) {
            case 'completed': return 'success';
            case 'in-progress': return 'info';
            case 'pending': return 'secondary';
            default: return 'secondary';
        }
    }
}