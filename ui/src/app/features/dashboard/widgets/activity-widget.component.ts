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
    templateUrl: './activity-widget.component.html',
    styleUrl: './activity-widget.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
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