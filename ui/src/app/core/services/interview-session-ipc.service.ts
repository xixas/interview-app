import { Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';
import '../types/electron.types';

// Session Management DTOs
export interface CreateSessionDto {
  technology: string;
  difficulty: string;
  totalQuestions: number;
}

export interface CompleteSessionDto {
  totalScore: number;
  maxScore: number;
  durationSeconds: number;
}

export interface CreateResponseDto {
  sessionId: string;
  questionId: number;
  questionOrder: number;
  questionText: string;
  questionAnswer?: string;
  questionExample?: string;
  questionDifficulty?: string;
  answer: string;
  audioUrl?: string;
  timeSpentSeconds?: number;
}

export interface EvaluationData {
  overallScore: number;
  maxScore: number;
  percentage: number;
  detailedFeedback: string;
  recommendation: string;
  technicalAccuracy?: number;
  clarity?: number;
  completeness?: number;
  problemSolving?: number;
  communication?: number;
  bestPractices?: number;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  criteriaFeedback?: Record<string, string>;
  transcription?: {
    text: string;
    duration?: number;
    language?: string;
  };
}

// Response Interfaces
export interface InterviewSession {
  id: string;
  technology: string;
  difficulty: string;
  totalQuestions: number;
  completedQuestions: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  totalScore?: number;
  maxScore?: number;
  percentage?: number;
  durationSeconds?: number;
  startedAt: Date;
  completedAt?: Date;
  notes?: string;
  responses?: InterviewResponse[];
}

export interface InterviewResponse {
  id: string;
  sessionId: string;
  questionId: number;
  questionOrder: number;
  answer: string;
  audioUrl?: string;
  timeSpentSeconds?: number;
  // Evaluation results
  overallScore?: number;
  maxScore?: number;
  percentage?: number;
  detailedFeedback?: string;
  recommendation?: string;
  // Individual criteria scores
  technicalAccuracy?: number;
  clarity?: number;
  completeness?: number;
  problemSolving?: number;
  communication?: number;
  bestPractices?: number;
  // Strengths and improvements as arrays
  strengths?: string[];
  improvements?: string[];
  nextSteps?: string[];
  criteriaFeedback?: Record<string, string>;
  transcription?: {
    text: string;
    duration?: number;
    language?: string;
  };
  answeredAt: Date;
  evaluatedAt?: Date;
  // Navigation
  question?: {
    id: number;
    question: string;
    answer: string;
    difficulty: string;
    example?: string;
  };
}

export interface SessionSummary {
  id: string;
  technology: string;
  difficulty: string;
  totalQuestions: number;
  completedQuestions: number;
  status: string;
  percentage?: number;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
}

export interface UserStatistics {
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  totalQuestionsAnswered: number;
  averageSessionDuration: number;
  technologyBreakdown: Record<string, number>;
  difficultyBreakdown: Record<string, number>;
}

export interface ExportData {
  sessions: InterviewSession[];
  responses: InterviewResponse[];
  exportedAt: Date;
  version: string;
}

export interface ImportResult {
  importedSessions: number;
  importedResponses: number;
  skippedSessions: number;
  skippedResponses: number;
}

@Injectable({
  providedIn: 'root'
})
export class InterviewSessionIpcService {
  private readonly notificationService = inject(NotificationService);

  constructor() {
    console.log('InterviewSessionIpcService: Service initialized');
  }

  // Session Management
  async createSession(data: CreateSessionDto): Promise<InterviewSession> {
    try {
      console.log('InterviewSessionIpcService: Creating session with data:', data);
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.createSession(data);
      console.log('InterviewSessionIpcService: Create session result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create interview session');
      }

      if (!result.data) {
        throw new Error('No session data returned from create operation');
      }

      this.notificationService.showSuccess('Interview session created successfully');
      return result.data;
    } catch (error) {
      console.error('InterviewSessionIpcService: Error creating session:', error);
      this.notificationService.showError(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<InterviewSession | null> {
    try {
      console.log('InterviewSessionIpcService: Getting session:', sessionId);
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.getSession(sessionId);
      console.log('InterviewSessionIpcService: Get session result:', result);
      
      if (!result.success) {
        console.warn('InterviewSessionIpcService: Failed to get session:', result.error);
        return null;
      }

      return result.data || null;
    } catch (error) {
      console.error('InterviewSessionIpcService: Error getting session:', error);
      throw error;
    }
  }

  async updateSessionProgress(sessionId: string, completedQuestions: number): Promise<void> {
    try {
      console.log('InterviewSessionIpcService: Updating session progress:', { sessionId, completedQuestions });
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.updateSessionProgress(sessionId, completedQuestions);
      console.log('InterviewSessionIpcService: Update progress result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update session progress');
      }
    } catch (error) {
      console.error('InterviewSessionIpcService: Error updating session progress:', error);
      throw error;
    }
  }

  async completeSession(sessionId: string, data: CompleteSessionDto): Promise<void> {
    try {
      console.log('InterviewSessionIpcService: Completing session:', { sessionId, ...data });
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.completeSession(sessionId, data);
      console.log('InterviewSessionIpcService: Complete session result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete session');
      }

      this.notificationService.showSuccess('Interview session completed successfully');
    } catch (error) {
      console.error('InterviewSessionIpcService: Error completing session:', error);
      this.notificationService.showError(`Failed to complete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Response Management
  async createResponse(data: CreateResponseDto): Promise<InterviewResponse> {
    try {
      console.log('InterviewSessionIpcService: Creating response with data:', data);
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.createResponse(data);
      console.log('InterviewSessionIpcService: Create response result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create interview response');
      }

      if (!result.data) {
        throw new Error('No response data returned from create operation');
      }

      return result.data;
    } catch (error) {
      console.error('InterviewSessionIpcService: Error creating response:', error);
      throw error;
    }
  }

  async updateResponseEvaluation(responseId: string, evaluation: EvaluationData): Promise<void> {
    try {
      console.log('InterviewSessionIpcService: Updating response evaluation:', { responseId, evaluation });
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.updateResponseEvaluation(responseId, evaluation);
      console.log('InterviewSessionIpcService: Update evaluation result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update response evaluation');
      }
    } catch (error) {
      console.error('InterviewSessionIpcService: Error updating response evaluation:', error);
      throw error;
    }
  }

  // History and Analytics
  async getSessionHistory(limit = 20, offset = 0): Promise<SessionSummary[]> {
    try {
      console.log('InterviewSessionIpcService: Getting session history:', { limit, offset });
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.getSessionHistory(limit, offset);
      console.log('InterviewSessionIpcService: Session history result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get session history');
      }

      return result.data || [];
    } catch (error) {
      console.error('InterviewSessionIpcService: Error getting session history:', error);
      throw error;
    }
  }

  async getSessionDetails(sessionId: string): Promise<InterviewSession | null> {
    try {
      console.log('InterviewSessionIpcService: Getting session details:', sessionId);
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.getSessionDetails(sessionId);
      console.log('InterviewSessionIpcService: Session details result:', result);
      
      if (!result.success) {
        console.warn('InterviewSessionIpcService: Failed to get session details:', result.error);
        return null;
      }

      // Parse JSON fields that come back as strings (if they're still strings)
      if (result.data?.responses) {
        result.data.responses = result.data.responses.map((response: any) => {
          const parseJsonField = (field: any, defaultValue: any) => {
            if (!field) return defaultValue;
            if (typeof field === 'string') {
              try {
                return JSON.parse(field);
              } catch (e) {
                console.warn('Failed to parse JSON field, using as plain text:', field.substring(0, 50));
                return defaultValue;
              }
            }
            return field;
          };

          return {
            ...response,
            strengths: parseJsonField(response.strengths, []),
            improvements: parseJsonField(response.improvements, []),
            nextSteps: parseJsonField(response.nextSteps, []),
            criteriaFeedback: parseJsonField(response.criteriaFeedback, {})
          };
        });
      }

      return result.data || null;
    } catch (error) {
      console.error('InterviewSessionIpcService: Error getting session details:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      console.log('InterviewSessionIpcService: Deleting session:', sessionId);
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.deleteSession(sessionId);
      console.log('InterviewSessionIpcService: Delete session result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete session');
      }

      this.notificationService.showSuccess('Interview session deleted successfully');
    } catch (error) {
      console.error('InterviewSessionIpcService: Error deleting session:', error);
      this.notificationService.showError(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getStatistics(): Promise<UserStatistics> {
    try {
      console.log('InterviewSessionIpcService: Getting user statistics');
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.getStatistics();
      console.log('InterviewSessionIpcService: Statistics result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get statistics');
      }

      return result.data || {
        totalSessions: 0,
        completedSessions: 0,
        averageScore: 0,
        totalQuestionsAnswered: 0,
        averageSessionDuration: 0,
        technologyBreakdown: {},
        difficultyBreakdown: {}
      };
    } catch (error) {
      console.error('InterviewSessionIpcService: Error getting statistics:', error);
      throw error;
    }
  }

  // Import/Export
  async exportUserData(): Promise<ExportData> {
    try {
      console.log('InterviewSessionIpcService: Exporting user data');
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.exportUserData();
      console.log('InterviewSessionIpcService: Export data result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to export user data');
      }

      if (!result.data) {
        throw new Error('No export data returned');
      }

      this.notificationService.showSuccess('User data exported successfully');
      return result.data;
    } catch (error) {
      console.error('InterviewSessionIpcService: Error exporting user data:', error);
      this.notificationService.showError(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async importUserData(data: ExportData): Promise<ImportResult> {
    try {
      console.log('InterviewSessionIpcService: Importing user data');
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.importUserData(data);
      console.log('InterviewSessionIpcService: Import data result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to import user data');
      }

      if (!result.data) {
        throw new Error('No import result data returned');
      }

      this.notificationService.showSuccess(
        `Data imported successfully: ${result.data.importedSessions} sessions, ${result.data.importedResponses} responses`
      );
      return result.data;
    } catch (error) {
      console.error('InterviewSessionIpcService: Error importing user data:', error);
      this.notificationService.showError(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      console.log('InterviewSessionIpcService: Clearing all user data');
      
      if (!window.electronAPI?.interviewSession) {
        throw new Error('Interview session IPC not available. Are you running in Electron?');
      }

      const result = await window.electronAPI.interviewSession.clearAllData();
      console.log('InterviewSessionIpcService: Clear data result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear user data');
      }

      this.notificationService.showSuccess('All interview data cleared successfully');
    } catch (error) {
      console.error('InterviewSessionIpcService: Error clearing user data:', error);
      this.notificationService.showError(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Utility Methods
  isElectronAvailable(): boolean {
    return !!(window.electronAPI && window.electronAPI.interviewSession);
  }

  getEnvironmentInfo(): { isElectron: boolean; hasInterviewSession: boolean } {
    const isElectron = this.isElectronAvailable();
    return {
      isElectron,
      hasInterviewSession: isElectron
    };
  }
}