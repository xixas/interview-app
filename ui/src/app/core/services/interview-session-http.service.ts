import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { 
  CreateSessionDto, 
  CompleteSessionDto, 
  CreateResponseDto, 
  EvaluationData,
  InterviewSession,
  InterviewResponse,
  SessionSummary,
  UserStatistics,
  ExportData,
  ImportResult
} from './interview-session-ipc.service';

@Injectable({
  providedIn: 'root'
})
export class InterviewSessionHttpService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  private readonly baseUrl = 'http://localhost:3000/api/interview-history';

  constructor() {
    console.log('InterviewSessionHttpService: Service initialized');
  }

  // Session Management
  async createSession(data: CreateSessionDto): Promise<InterviewSession> {
    try {
      console.log('InterviewSessionHttpService: Creating session with data:', data);
      
      const response = await firstValueFrom(
        this.http.post<InterviewSession>(`${this.baseUrl}/sessions`, data)
      );

      console.log('InterviewSessionHttpService: Create session result:', response);
      this.notificationService.showSuccess('Interview session created successfully');
      return response;
    } catch (error) {
      console.error('InterviewSessionHttpService: Error creating session:', error);
      this.notificationService.showError(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<InterviewSession | null> {
    try {
      console.log('InterviewSessionHttpService: Getting session:', sessionId);
      
      const response = await firstValueFrom(
        this.http.get<InterviewSession>(`${this.baseUrl}/sessions/${sessionId}`)
      );

      console.log('InterviewSessionHttpService: Get session result:', response);
      return response;
    } catch (error) {
      console.error('InterviewSessionHttpService: Error getting session:', error);
      return null;
    }
  }

  async updateSessionProgress(sessionId: string, completedQuestions: number): Promise<void> {
    try {
      console.log('InterviewSessionHttpService: Updating session progress:', sessionId, completedQuestions);
      
      await firstValueFrom(
        this.http.patch(`${this.baseUrl}/sessions/${sessionId}/progress`, {
          completedQuestions
        })
      );

      console.log('InterviewSessionHttpService: Session progress updated');
    } catch (error) {
      console.error('InterviewSessionHttpService: Error updating session progress:', error);
      throw error;
    }
  }

  async completeSession(sessionId: string, completion: CompleteSessionDto): Promise<void> {
    try {
      console.log('InterviewSessionHttpService: Completing session:', sessionId, completion);
      
      await firstValueFrom(
        this.http.patch(`${this.baseUrl}/sessions/${sessionId}/complete`, completion)
      );

      console.log('InterviewSessionHttpService: Session completed');
      this.notificationService.showSuccess('Interview session completed successfully');
    } catch (error) {
      console.error('InterviewSessionHttpService: Error completing session:', error);
      this.notificationService.showError(`Failed to complete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Response Management
  async createResponse(data: CreateResponseDto): Promise<InterviewResponse> {
    try {
      console.log('InterviewSessionHttpService: Creating response with data:', data);
      
      const response = await firstValueFrom(
        this.http.post<InterviewResponse>(`${this.baseUrl}/responses`, data)
      );

      console.log('InterviewSessionHttpService: Create response result:', response);
      return response;
    } catch (error) {
      console.error('InterviewSessionHttpService: Error creating response:', error);
      this.notificationService.showError(`Failed to save answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async updateResponseEvaluation(responseId: string, evaluation: EvaluationData): Promise<void> {
    try {
      console.log('InterviewSessionHttpService: Updating response evaluation:', responseId);
      
      await firstValueFrom(
        this.http.patch(`${this.baseUrl}/responses/${responseId}/evaluation`, evaluation)
      );

      console.log('InterviewSessionHttpService: Response evaluation updated');
    } catch (error) {
      console.error('InterviewSessionHttpService: Error updating response evaluation:', error);
      // Don't show user notification for evaluation failures as they happen in background
      throw error;
    }
  }

  // History and Statistics
  async getSessionHistory(limit = 20, offset = 0): Promise<SessionSummary[]> {
    try {
      console.log('InterviewSessionHttpService: Getting session history');
      
      const response = await firstValueFrom(
        this.http.get<SessionSummary[]>(`${this.baseUrl}/sessions`, {
          params: { limit: limit.toString(), offset: offset.toString() }
        })
      );

      console.log('InterviewSessionHttpService: Session history retrieved:', response.length, 'sessions');
      return response;
    } catch (error) {
      console.error('InterviewSessionHttpService: Error getting session history:', error);
      this.notificationService.showError('Failed to load interview history');
      return [];
    }
  }

  async getSessionDetails(sessionId: string): Promise<InterviewSession | null> {
    try {
      console.log('InterviewSessionHttpService: Getting session details:', sessionId);
      
      const response = await firstValueFrom(
        this.http.get<InterviewSession>(`${this.baseUrl}/sessions/${sessionId}/details`)
      );

      console.log('InterviewSessionHttpService: Session details retrieved');
      return response;
    } catch (error) {
      console.error('InterviewSessionHttpService: Error getting session details:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      console.log('InterviewSessionHttpService: Deleting session:', sessionId);
      
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/sessions/${sessionId}`)
      );

      console.log('InterviewSessionHttpService: Session deleted');
      this.notificationService.showSuccess('Interview session deleted successfully');
    } catch (error) {
      console.error('InterviewSessionHttpService: Error deleting session:', error);
      this.notificationService.showError(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getStatistics(): Promise<UserStatistics> {
    try {
      console.log('InterviewSessionHttpService: Getting statistics');
      
      const response = await firstValueFrom(
        this.http.get<UserStatistics>(`${this.baseUrl}/statistics`)
      );

      console.log('InterviewSessionHttpService: Statistics retrieved');
      return response;
    } catch (error) {
      console.error('InterviewSessionHttpService: Error getting statistics:', error);
      throw error;
    }
  }

  // Import/Export
  async exportUserData(): Promise<ExportData> {
    try {
      console.log('InterviewSessionHttpService: Exporting user data');
      
      const response = await firstValueFrom(
        this.http.get<ExportData>(`${this.baseUrl}/export`)
      );

      console.log('InterviewSessionHttpService: User data exported');
      this.notificationService.showSuccess('Data exported successfully');
      return response;
    } catch (error) {
      console.error('InterviewSessionHttpService: Error exporting data:', error);
      this.notificationService.showError(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async importUserData(data: ExportData): Promise<ImportResult> {
    try {
      console.log('InterviewSessionHttpService: Importing user data');
      
      const response = await firstValueFrom(
        this.http.post<ImportResult>(`${this.baseUrl}/import`, data)
      );

      console.log('InterviewSessionHttpService: User data imported:', response);
      this.notificationService.showSuccess(
        `Data imported: ${response.importedSessions} sessions, ${response.importedResponses} responses`
      );
      return response;
    } catch (error) {
      console.error('InterviewSessionHttpService: Error importing data:', error);
      this.notificationService.showError(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      console.log('InterviewSessionHttpService: Clearing all data');
      
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/clear`)
      );

      console.log('InterviewSessionHttpService: All data cleared');
      this.notificationService.showSuccess('All data cleared successfully');
    } catch (error) {
      console.error('InterviewSessionHttpService: Error clearing data:', error);
      this.notificationService.showError(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}