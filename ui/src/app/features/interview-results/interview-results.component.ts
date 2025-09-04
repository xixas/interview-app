import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { PanelModule } from 'primeng/panel';

import { InterviewSessionIpcService, InterviewSession, InterviewResponse } from '../../core/services/interview-session-ipc.service';

@Component({
  selector: 'app-interview-results',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    MessageModule,
    TabsModule,
    AccordionModule,
    ChartModule,
    SkeletonModule,
    DividerModule,
    TooltipModule,
    PanelModule,
  ],
  templateUrl: './interview-results.component.html',
  styleUrl: './interview-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewResultsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sessionService = inject(InterviewSessionIpcService);

  // Signals for reactive state management
  session = signal<InterviewSession | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  // Computed values
  performanceChartData = computed(() => {
    const sessionData = this.session();
    if (!sessionData?.responses?.length) return null;

    const responses = sessionData.responses.filter(r => 
      r.technicalAccuracy !== null && r.technicalAccuracy !== undefined
    );

    if (responses.length === 0) return null;

    // Convert 1-10 scores to percentages (0-100)
    const avgTechnical = this.getAverageScore(responses, 'technicalAccuracy') * 10;
    const avgClarity = this.getAverageScore(responses, 'clarity') * 10;
    const avgCompleteness = this.getAverageScore(responses, 'completeness') * 10;
    const avgProblemSolving = this.getAverageScore(responses, 'problemSolving') * 10;
    const avgCommunication = this.getAverageScore(responses, 'communication') * 10;

    return {
      labels: ['Technical Accuracy', 'Clarity', 'Completeness', 'Problem Solving', 'Communication'],
      datasets: [{
        label: 'Your Performance',
        data: [avgTechnical, avgClarity, avgCompleteness, avgProblemSolving, avgCommunication],
        backgroundColor: 'rgba(59, 130, 246, 0.25)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };
  });

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 20,
          color: 'rgba(107, 114, 128, 0.6)',
          font: {
            size: 12
          },
          backdropColor: 'transparent',
          callback: function(value: any) {
            return value + '%';
          }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.2)',
          lineWidth: 1
        },
        angleLines: {
          color: 'rgba(107, 114, 128, 0.2)',
          lineWidth: 1
        },
        pointLabels: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 13,
            weight: '500'
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context: any) {
            return context[0].label;
          },
          label: function(context: any) {
            return `Score: ${context.parsed.r}/10`;
          }
        }
      }
    }
  };

  topStrengths = computed(() => {
    const sessionData = this.session();
    if (!sessionData?.responses) return [];

    const strengths = new Set<string>();
    sessionData.responses.forEach(response => {
      if (response.strengths) {
        response.strengths.forEach(strength => strengths.add(strength));
      }
    });

    return Array.from(strengths).slice(0, 3);
  });

  topImprovements = computed(() => {
    const sessionData = this.session();
    if (!sessionData?.responses) return [];

    const improvements = new Set<string>();
    sessionData.responses.forEach(response => {
      if (response.improvements) {
        response.improvements.forEach(improvement => improvements.add(improvement));
      }
    });

    return Array.from(improvements).slice(0, 3);
  });

  recommendations = computed(() => {
    const sessionData = this.session();
    if (!sessionData?.responses) return [];

    const recs = new Set<string>();
    sessionData.responses.forEach(response => {
      if (response.nextSteps) {
        response.nextSteps.forEach(step => recs.add(step));
      }
    });

    const defaultRecs = [
      `Continue practicing ${sessionData.technology} interview questions`,
      'Focus on articulating your thought process clearly',
      'Practice coding problems related to your weak areas',
      'Review fundamental concepts and best practices'
    ];

    const allRecs = Array.from(recs);
    return allRecs.length > 0 ? allRecs.slice(0, 5) : defaultRecs.slice(0, 3);
  });

  averageResponseTime = computed(() => {
    const sessionData = this.session();
    if (!sessionData?.responses?.length) return 0;

    const responses = sessionData.responses.filter(r => r.timeSpentSeconds && r.timeSpentSeconds > 0);
    if (responses.length === 0) return 0;

    const totalTime = responses.reduce((sum, r) => sum + (r.timeSpentSeconds || 0), 0);
    return Math.round(totalTime / responses.length);
  });

  async ngOnInit() {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (sessionId) {
      await this.loadSessionDetails(sessionId);
    } else {
      this.errorMessage.set('No session ID provided');
      this.isLoading.set(false);
    }
  }

  private async loadSessionDetails(sessionId: string) {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const sessionDetails = await this.sessionService.getSessionDetails(sessionId);
      
      if (sessionDetails) {
        this.session.set(sessionDetails);
      } else {
        this.errorMessage.set('Session not found');
      }

    } catch (error) {
      console.error('Failed to load session details:', error);
      this.errorMessage.set('Failed to load session details. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Utility methods
  getSessionDescription(session: InterviewSession): string {
    const date = new Date(session.startedAt).toLocaleDateString();
    const status = session.status.charAt(0).toUpperCase() + session.status.slice(1);
    return `${session.difficulty} difficulty • ${date} • ${status}`;
  }

  formatDate(dateInput: string | Date): string {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds === 0) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  getGradeFromPercentage(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    return 'F';
  }

  getScoreSeverity(score: number): 'success' | 'info' | 'warn' | 'danger' {
    if (score >= 80) return 'success';
    if (score >= 70) return 'info';
    if (score >= 60) return 'warn';
    return 'danger';
  }

  hasScoreBreakdown(response: InterviewResponse): boolean {
    return response.technicalAccuracy !== null || 
           response.clarity !== null || 
           response.completeness !== null ||
           response.problemSolving !== null ||
           response.communication !== null;
  }

  private getAverageScore(responses: InterviewResponse[], field: keyof InterviewResponse): number {
    const scores = responses
      .map(r => r[field] as number)
      .filter(score => score !== null && score !== undefined && !isNaN(score));
    
    return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  }

  // Navigation and actions
  goBack() {
    this.router.navigate(['/interview-history']);
  }

  async exportSession() {
    const sessionData = this.session();
    if (!sessionData) return;

    try {
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-results-${sessionData.technology}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to export session:', error);
    }
  }

  retakeInterview() {
    this.router.navigate(['/interview']);
  }
}