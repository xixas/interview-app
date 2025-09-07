import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToolbarModule } from 'primeng/toolbar';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { InterviewSessionService } from '../../core/services/interview-session.service';
import { SessionSummary, UserStatistics } from '../../core/services/interview-session-ipc.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'date' | 'number' | 'tag' | 'action';
}

@Component({
  selector: 'app-interview-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    DatePickerModule,
    DialogModule,
    ProgressBarModule,
    MessageModule,
    TooltipModule,
    ConfirmDialogModule,
    ToolbarModule,
    ToastModule,
    PageHeaderComponent
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './interview-history.component.html',
  styleUrl: './interview-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewHistoryComponent implements OnInit {
  private router = inject(Router);
  private sessionService = inject(InterviewSessionService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  // Signals for reactive state management
  sessions = signal<SessionSummary[]>([]);
  statistics = signal<UserStatistics | null>(null);
  isLoading = signal(false);
  isExporting = signal(false);
  errorMessage = signal('');
  
  // Filtering
  globalFilter = '';
  filteredSessions = computed(() => {
    const filter = this.globalFilter.toLowerCase();
    if (!filter) return this.sessions();
    
    return this.sessions().filter(session =>
      session.technology.toLowerCase().includes(filter) ||
      session.difficulty.toLowerCase().includes(filter) ||
      session.status.toLowerCase().includes(filter)
    );
  });

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    await Promise.all([
      this.loadSessions(),
      this.loadStatistics()
    ]);
  }

  async loadSessions() {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      
      const sessions = await this.sessionService.getSessionHistory(100, 0); // Load up to 100 sessions
      this.sessions.set(sessions);
      
    } catch (error) {
      console.error('Failed to load interview sessions:', error);
      this.errorMessage.set('Failed to load interview history. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadStatistics() {
    try {
      const stats = await this.sessionService.getStatistics();
      this.statistics.set(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }

  onGlobalFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    this.globalFilter = input.value;
  }

  // Navigation methods
  startNewInterview() {
    this.router.navigate(['/interview']);
  }

  viewSessionDetails(sessionId: string) {
    this.router.navigate(['/interview-history', sessionId]);
  }

  // Utility methods
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  }

  formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
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

  getCompletionPercentage(session: SessionSummary): number {
    return Math.round((session.completedQuestions / session.totalQuestions) * 100);
  }

  getDifficultySeverity(difficulty: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (difficulty?.toLowerCase()) {
      case 'fundamental': return 'success';
      case 'advanced': return 'info';
      case 'extensive': return 'warn';
      default: return 'info';
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'cancelled': return 'warn';
      default: return 'info';
    }
  }

  getScoreSeverity(score: number): 'success' | 'info' | 'warn' | 'danger' {
    if (score >= 80) return 'success';
    if (score >= 70) return 'info';
    if (score >= 60) return 'warn';
    return 'danger';
  }

  // Export functionality
  async exportData() {
    try {
      this.isExporting.set(true);
      
      const exportData = await this.sessionService.exportUserData();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Export Successful',
        detail: 'Interview data exported successfully'
      });
      
    } catch (error) {
      console.error('Failed to export data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Export Failed',
        detail: 'Failed to export interview data'
      });
    } finally {
      this.isExporting.set(false);
    }
  }

  // Delete session
  confirmDeleteSession(session: SessionSummary) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the ${session.technology} interview session from ${this.formatDate(session.startedAt)}?`,
      header: 'Delete Session',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteSession(session.id)
    });
  }

  async deleteSession(sessionId: string) {
    try {
      await this.sessionService.deleteSession(sessionId);
      
      // Remove from local state
      this.sessions.update(sessions => 
        sessions.filter(s => s.id !== sessionId)
      );
      
      // Reload statistics
      await this.loadStatistics();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Session Deleted',
        detail: 'Interview session deleted successfully'
      });
      
    } catch (error) {
      console.error('Failed to delete session:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Delete Failed',
        detail: 'Failed to delete interview session'
      });
    }
  }

  // Clear all data
  confirmClearAllData() {
    this.confirmationService.confirm({
      message: 'This will permanently delete ALL interview data including sessions, responses, and statistics. This action cannot be undone. Are you sure?',
      header: 'Clear All Data',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.clearAllData()
    });
  }

  async clearAllData() {
    try {
      this.isLoading.set(true);
      
      await this.sessionService.clearAllData();
      
      // Reset local state
      this.sessions.set([]);
      this.statistics.set({
        totalSessions: 0,
        completedSessions: 0,
        averageScore: 0,
        totalQuestionsAnswered: 0,
        averageSessionDuration: 0,
        technologyBreakdown: {},
        difficultyBreakdown: {}
      });
      
      this.messageService.add({
        severity: 'success',
        summary: 'Data Cleared',
        detail: 'All interview data has been cleared successfully'
      });
      
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Clear Failed',
        detail: 'Failed to clear interview data'
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  // Helper methods for template
  getTechnologyCount(technologyBreakdown: Record<string, number> | undefined): number {
    if (!technologyBreakdown) return 0;
    return Object.keys(technologyBreakdown).length;
  }

  getMostPracticedCount(technologyBreakdown: Record<string, number> | undefined): number {
    if (!technologyBreakdown) return 0;
    const values = Object.values(technologyBreakdown);
    return values.length > 0 ? Math.max(...values) : 0;
  }
}