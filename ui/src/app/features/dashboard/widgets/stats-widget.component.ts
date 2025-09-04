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
    templateUrl: './stats-widget.component.html',
    styleUrl: './stats-widget.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsWidgetComponent {
    stats = input.required<StatItem[]>();
}