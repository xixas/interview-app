import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Chart } from 'primeng/chart';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';
import { Table } from 'primeng/table';
import { firstValueFrom } from 'rxjs';
import { ProficiencyLevel, Role, QuestionDifficulty } from '@interview-app/shared-interfaces';
import { EnvironmentService } from '../../core/services/environment.service';

interface DashboardStats {
  totalQuestions: number;
  totalTechnologies: number;
  completedInterviews: number;
  averageScore: number;
  questionsByDifficulty: Record<QuestionDifficulty, number>;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  date: Date;
  type: 'interview' | 'practice' | 'evaluation';
  title: string;
  score?: number;
  status: 'completed' | 'in-progress' | 'pending';
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    Card,
    Button,
    Chart,
    ProgressBar,
    Tag,
    Table
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);

  // Signals for reactive state management
  stats = signal<DashboardStats>({
    totalQuestions: 0,
    totalTechnologies: 0,
    completedInterviews: 0,
    averageScore: 0,
    questionsByDifficulty: {
      [QuestionDifficulty.FUNDAMENTAL]: 0,
      [QuestionDifficulty.ADVANCED]: 0,
      [QuestionDifficulty.EXTENSIVE]: 0
    },
    recentActivity: []
  });

  loading = signal(true);
  selectedRole = signal<Role>(Role.FULLSTACK);
  selectedProficiency = signal<ProficiencyLevel>(ProficiencyLevel.MID);

  // Computed values
  totalQuestions = computed(() => this.stats().totalQuestions);
  averageScorePercentage = computed(() => Math.round(this.stats().averageScore));
  
  chartData = computed(() => ({
    labels: ['Fundamental', 'Advanced', 'Extensive'],
    datasets: [{
      label: 'Questions by Difficulty',
      data: [
        this.stats().questionsByDifficulty[QuestionDifficulty.FUNDAMENTAL],
        this.stats().questionsByDifficulty[QuestionDifficulty.ADVANCED],
        this.stats().questionsByDifficulty[QuestionDifficulty.EXTENSIVE]
      ],
      backgroundColor: [
        'rgba(16, 185, 129, 0.2)',
        'rgba(59, 130, 246, 0.2)',
        'rgba(239, 68, 68, 0.2)'
      ],
      borderColor: [
        'rgb(16, 185, 129)',
        'rgb(59, 130, 246)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }]
  }));

  chartOptions = {
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-color)'
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'var(--text-color-secondary)'
        },
        grid: {
          color: 'var(--surface-border)'
        }
      },
      y: {
        ticks: {
          color: 'var(--text-color-secondary)'
        },
        grid: {
          color: 'var(--surface-border)'
        }
      }
    }
  };

  // Mock recent activity data
  recentActivity = signal<ActivityItem[]>([
    {
      date: new Date(),
      type: 'interview',
      title: 'React Hooks Interview',
      score: 85,
      status: 'completed'
    },
    {
      date: new Date(Date.now() - 86400000),
      type: 'practice',
      title: 'JavaScript Fundamentals',
      score: 92,
      status: 'completed'
    },
    {
      date: new Date(Date.now() - 172800000),
      type: 'evaluation',
      title: 'System Design Review',
      score: 78,
      status: 'completed'
    },
    {
      date: new Date(Date.now() - 259200000),
      type: 'interview',
      title: 'Node.js Backend Interview',
      status: 'in-progress'
    }
  ]);

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      this.loading.set(true);
      
      // Fetch stats from API
      const stats = await firstValueFrom(
        this.http.get<any>(this.env.getApiEndpoint('/api/questions/stats'))
      );
      
      this.stats.update(current => ({
        ...current,
        totalQuestions: stats.totalQuestions,
        totalTechnologies: stats.totalTechnologies,
        questionsByDifficulty: stats.questionsByDifficulty
      }));
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use mock data if API fails
      this.stats.set({
        totalQuestions: 3844,
        totalTechnologies: 15,
        completedInterviews: 12,
        averageScore: 78.5,
        questionsByDifficulty: {
          [QuestionDifficulty.FUNDAMENTAL]: 1380,
          [QuestionDifficulty.ADVANCED]: 1371,
          [QuestionDifficulty.EXTENSIVE]: 1093
        },
        recentActivity: []
      });
    } finally {
      this.loading.set(false);
    }
  }

  startNewInterview() {
    // Navigate to interview page
    console.log('Starting new interview...');
  }

  startPractice() {
    // Navigate to practice page
    console.log('Starting practice session...');
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'pending':
        return 'warn';
      default:
        return 'info';
    }
  }

  getScoreSeverity(score: number): 'success' | 'info' | 'warn' | 'danger' {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warn';
    return 'danger';
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'interview':
        return 'pi pi-microphone';
      case 'practice':
        return 'pi pi-book';
      case 'evaluation':
        return 'pi pi-chart-line';
      default:
        return 'pi pi-question';
    }
  }
}