import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

export interface StatItem {
    label: string;
    value: string | number;
    icon: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    color: 'blue' | 'green' | 'orange' | 'purple' | 'cyan';
}

@Component({
    selector: 'app-stats-widget',
    standalone: true,
    imports: [CommonModule, CardModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="grid grid-cols-12 gap-8">
            @for (stat of stats(); track stat.label) {
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <span class="block text-muted-color text-sm font-medium mb-2">
                                    {{ stat.label }}
                                </span>
                                <div class="text-surface-900 dark:text-surface-0 text-xl font-medium">
                                    {{ stat.value }}
                                </div>
                                @if (stat.change) {
                                    <div class="flex items-center mt-2 text-sm">
                                        @if (stat.changeType === 'positive') {
                                            <i class="pi pi-arrow-up text-green-500 mr-1"></i>
                                            <span class="text-green-500">{{ stat.change }}</span>
                                        } @else if (stat.changeType === 'negative') {
                                            <i class="pi pi-arrow-down text-red-500 mr-1"></i>
                                            <span class="text-red-500">{{ stat.change }}</span>
                                        } @else {
                                            <i class="pi pi-minus text-muted-color mr-1"></i>
                                            <span class="text-muted-color">{{ stat.change }}</span>
                                        }
                                        <span class="text-muted-color ml-1">vs last week</span>
                                    </div>
                                }
                            </div>
                            <div 
                                class="flex items-center justify-center rounded-border" style="width: 2.5rem; height: 2.5rem"
                                [ngClass]="{
                                    'bg-blue-100 dark:bg-blue-400/10': stat.color === 'blue',
                                    'bg-green-100 dark:bg-green-400/10': stat.color === 'green',
                                    'bg-orange-100 dark:bg-orange-400/10': stat.color === 'orange',
                                    'bg-purple-100 dark:bg-purple-400/10': stat.color === 'purple',
                                    'bg-cyan-100 dark:bg-cyan-400/10': stat.color === 'cyan'
                                }">
                                <i 
                                    [class]="stat.icon + ' text-xl'"
                                    [ngClass]="{
                                        'text-blue-500': stat.color === 'blue',
                                        'text-green-500': stat.color === 'green',
                                        'text-orange-500': stat.color === 'orange',
                                        'text-purple-500': stat.color === 'purple',
                                        'text-cyan-500': stat.color === 'cyan'
                                    }">
                                </i>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    `
})
export class StatsWidgetComponent {
    stats = input.required<StatItem[]>();
}