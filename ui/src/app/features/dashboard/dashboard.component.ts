import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkInProgressComponent, WorkInProgressConfig } from '../../shared/components/work-in-progress.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        WorkInProgressComponent,
        PageHeaderComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-container">
            <app-page-header 
                title="Dashboard"
                description="Monitor your interview performance and progress"
                icon="pi pi-chart-line">
            </app-page-header>
            <app-work-in-progress [config]="dashboardConfig()" />
        </div>
    `,
    styles: []
})
export class DashboardComponent {
    dashboardConfig = signal<WorkInProgressConfig>({
        title: 'Performance Dashboard',
        description: 'Get comprehensive insights into your interview practice performance, track progress over time, and identify areas for improvement.',
        icon: 'pi pi-chart-line',
        features: [
            'Real-time performance analytics',
            'Progress tracking across topics',
            'Skill assessment charts',
            'Study streak monitoring',
            'Personalized recommendations',
            'Historical performance data',
            'Achievement system',
            'Export progress reports'
        ],
        estimatedRelease: 'Next Version (v1.1)',
        actionLabel: 'Try Interview Practice',
        actionRoute: '/interview'
    });
}