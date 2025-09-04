import { Injectable, inject } from '@angular/core';
import { InterviewSessionIpcService } from './interview-session-ipc.service';
import { InterviewSessionHttpService } from './interview-session-http.service';
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

/**
 * Hybrid service that automatically uses IPC (Electron) or HTTP (Web) based on environment
 * This ensures data persistence works in both desktop and web environments
 */
@Injectable({
  providedIn: 'root'
})
export class InterviewSessionService {
  private readonly ipcService = inject(InterviewSessionIpcService);
  private readonly httpService = inject(InterviewSessionHttpService);
  private readonly isElectron: boolean;

  constructor() {
    // Detect if running in Electron environment
    this.isElectron = !!(window as any).electronAPI?.interviewSession;
    console.log('InterviewSessionService: Environment detected:', this.isElectron ? 'Electron' : 'Web');
  }

  private get service() {
    return this.isElectron ? this.ipcService : this.httpService;
  }

  // Session Management
  async createSession(data: CreateSessionDto): Promise<InterviewSession> {
    return this.service.createSession(data);
  }

  async getSession(sessionId: string): Promise<InterviewSession | null> {
    return this.service.getSession(sessionId);
  }

  async updateSessionProgress(sessionId: string, completedQuestions: number): Promise<void> {
    return this.service.updateSessionProgress(sessionId, completedQuestions);
  }

  async completeSession(sessionId: string, completion: CompleteSessionDto): Promise<void> {
    return this.service.completeSession(sessionId, completion);
  }

  // Response Management
  async createResponse(data: CreateResponseDto): Promise<InterviewResponse> {
    return this.service.createResponse(data);
  }

  async updateResponseEvaluation(responseId: string, evaluation: EvaluationData): Promise<void> {
    return this.service.updateResponseEvaluation(responseId, evaluation);
  }

  // History and Statistics
  async getSessionHistory(limit = 20, offset = 0): Promise<SessionSummary[]> {
    return this.service.getSessionHistory(limit, offset);
  }

  async getSessionDetails(sessionId: string): Promise<InterviewSession | null> {
    return this.service.getSessionDetails(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.service.deleteSession(sessionId);
  }

  async getStatistics(): Promise<UserStatistics> {
    return this.service.getStatistics();
  }

  // Import/Export
  async exportUserData(): Promise<ExportData> {
    return this.service.exportUserData();
  }

  async importUserData(data: ExportData): Promise<ImportResult> {
    return this.service.importUserData(data);
  }

  async clearAllData(): Promise<void> {
    return this.service.clearAllData();
  }

  // Utility methods
  get environmentInfo() {
    return {
      isElectron: this.isElectron,
      serviceType: this.isElectron ? 'IPC' : 'HTTP'
    };
  }
}