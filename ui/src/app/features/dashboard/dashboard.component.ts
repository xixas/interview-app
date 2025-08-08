import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { firstValueFrom } from 'rxjs';
import { ProficiencyLevel, Role, QuestionDifficulty } from '@interview-app/shared-interfaces';
import { EnvironmentService } from '../../core/services/environment.service';
import { ElectronService } from '../../core/services/electron.service';

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
    CardModule,
    ButtonModule,
    ChartModule,
    ProgressBarModule,
    TagModule,
    TableModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private env = inject(EnvironmentService);
  private electron = inject(ElectronService);

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
  
  // Desktop-specific signals
  isElectron = signal(false);
  systemInfo = signal<any>(null);
  appVersion = signal<string>('Web Version');

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
    await this.initializeDesktopFeatures();
  }

  private async initializeDesktopFeatures() {
    this.isElectron.set(this.electron.isElectron);
    
    if (this.electron.isElectron) {
      try {
        const version = await this.electron.getAppVersion();
        this.appVersion.set(version);
        
        const systemInfo = await this.electron.getSystemInfo();
        this.systemInfo.set(systemInfo);
        
        // Set up Electron menu event listeners
        window.addEventListener('electron-menu', (event: any) => {
          this.handleElectronMenuEvent(event.detail.action);
        });
      } catch (error) {
        console.error('Failed to initialize desktop features:', error);
      }
    }
  }

  private handleElectronMenuEvent(action: string) {
    switch (action) {
      case 'menu-dashboard':
        this.router.navigate(['/dashboard']);
        break;
      case 'menu-new-interview':
        this.startNewInterview();
        break;
      case 'menu-evaluator':
        this.router.navigate(['/evaluator']);
        break;
      case 'menu-export-results':
        this.exportResults();
        break;
      case 'menu-about':
        this.showAbout();
        break;
    }
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
    this.router.navigate(['/interview']);
  }

  startPractice() {
    this.router.navigate(['/interview']);
  }

  async exportResults() {
    if (this.electron.isElectron) {
      const data = {
        stats: this.stats(),
        recentActivity: this.recentActivity(),
        exportDate: new Date().toISOString(),
        version: this.appVersion()
      };
      
      try {
        const result = await this.electron.exportData(data, 'dashboard-export.json');
        if (result.success) {
          await this.electron.showNotification(
            'Export Successful',
            `Dashboard data exported to ${result.filePath}`
          );
        }
      } catch (error) {
        console.error('Export failed:', error);
      }
    }
  }

  async showAbout() {
    if (this.electron.isElectron) {
      await this.electron.showNotification(
        'About Interview App',
        `Version: ${this.appVersion()}\nDesktop Edition`
      );
    }
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