import axios, { AxiosInstance, AxiosResponse } from 'axios';

// DTOs and interfaces (matching backend service)
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
}

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
  // Strengths and improvements as JSON strings that need parsing
  strengths?: string;
  improvements?: string;
  nextSteps?: string;
  criteriaFeedback?: string;
  answeredAt: Date;
  evaluatedAt?: Date;
  // Question details
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

export class InterviewSessionService {
  private axios: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.axios = axios.create({
      baseURL: `${baseUrl}/api/interview-history`,
      timeout: 90000, // 90 seconds to accommodate potential long-running operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for better error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('InterviewSessionService: HTTP error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  // Session Management
  async createSession(data: CreateSessionDto): Promise<InterviewSession> {
    console.log('InterviewSessionService: Creating session with data:', data);
    
    try {
      const response: AxiosResponse<InterviewSession> = await this.axios.post('/sessions', data);
      console.log('InterviewSessionService: Session created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to create session:', error);
      throw new Error(`Failed to create session: ${error.response?.data?.message || error.message}`);
    }
  }

  async getSession(sessionId: string): Promise<InterviewSession | null> {
    console.log('InterviewSessionService: Getting session:', sessionId);
    
    try {
      const response: AxiosResponse<InterviewSession> = await this.axios.get(`/sessions/${sessionId}`);
      console.log('InterviewSessionService: Session retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('InterviewSessionService: Session not found:', sessionId);
        return null;
      }
      console.error('InterviewSessionService: Failed to get session:', error);
      throw new Error(`Failed to get session: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateSessionProgress(sessionId: string, completedQuestions: number): Promise<void> {
    console.log('InterviewSessionService: Updating session progress:', { sessionId, completedQuestions });
    
    try {
      await this.axios.patch(`/sessions/${sessionId}/progress`, { completedQuestions });
      console.log('InterviewSessionService: Session progress updated successfully');
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to update session progress:', error);
      throw new Error(`Failed to update session progress: ${error.response?.data?.message || error.message}`);
    }
  }

  async completeSession(sessionId: string, data: CompleteSessionDto): Promise<void> {
    console.log('InterviewSessionService: Completing session:', { sessionId, ...data });
    
    try {
      await this.axios.patch(`/sessions/${sessionId}/complete`, data);
      console.log('InterviewSessionService: Session completed successfully');
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to complete session:', error);
      throw new Error(`Failed to complete session: ${error.response?.data?.message || error.message}`);
    }
  }

  // Response Management
  async createResponse(data: CreateResponseDto): Promise<InterviewResponse> {
    console.log('InterviewSessionService: Creating response with data:', data);
    
    try {
      const response: AxiosResponse<InterviewResponse> = await this.axios.post('/responses', data);
      console.log('InterviewSessionService: Response created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to create response:', error);
      throw new Error(`Failed to create response: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateResponseEvaluation(responseId: string, evaluation: EvaluationData): Promise<void> {
    console.log('InterviewSessionService: Updating response evaluation:', { responseId, evaluation });
    
    try {
      await this.axios.patch(`/responses/${responseId}/evaluation`, evaluation);
      console.log('InterviewSessionService: Response evaluation updated successfully');
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to update response evaluation:', error);
      throw new Error(`Failed to update response evaluation: ${error.response?.data?.message || error.message}`);
    }
  }

  // History and Analytics
  async getSessionHistory(limit: number = 20, offset: number = 0): Promise<SessionSummary[]> {
    console.log('InterviewSessionService: Getting session history:', { limit, offset });
    
    try {
      const response: AxiosResponse<SessionSummary[]> = await this.axios.get('/sessions', {
        params: { limit, offset }
      });
      console.log('InterviewSessionService: Session history retrieved:', response.data.length, 'sessions');
      return response.data;
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to get session history:', error);
      throw new Error(`Failed to get session history: ${error.response?.data?.message || error.message}`);
    }
  }

  async getSessionDetails(sessionId: string): Promise<InterviewSession | null> {
    console.log('InterviewSessionService: Getting session details:', sessionId);
    
    try {
      const response: AxiosResponse<InterviewSession> = await this.axios.get(`/sessions/${sessionId}/details`);
      console.log('InterviewSessionService: Session details retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('InterviewSessionService: Session details not found:', sessionId);
        return null;
      }
      console.error('InterviewSessionService: Failed to get session details:', error);
      throw new Error(`Failed to get session details: ${error.response?.data?.message || error.message}`);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    console.log('InterviewSessionService: Deleting session:', sessionId);
    
    try {
      await this.axios.delete(`/sessions/${sessionId}`);
      console.log('InterviewSessionService: Session deleted successfully');
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to delete session:', error);
      throw new Error(`Failed to delete session: ${error.response?.data?.message || error.message}`);
    }
  }

  async getStatistics(): Promise<UserStatistics> {
    console.log('InterviewSessionService: Getting user statistics');
    
    try {
      const response: AxiosResponse<UserStatistics> = await this.axios.get('/statistics');
      console.log('InterviewSessionService: Statistics retrieved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to get statistics:', error);
      throw new Error(`Failed to get statistics: ${error.response?.data?.message || error.message}`);
    }
  }

  // Import/Export
  async exportUserData(): Promise<ExportData> {
    console.log('InterviewSessionService: Exporting user data');
    
    try {
      const response: AxiosResponse<ExportData> = await this.axios.get('/export');
      console.log('InterviewSessionService: User data exported successfully');
      return response.data;
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to export user data:', error);
      throw new Error(`Failed to export user data: ${error.response?.data?.message || error.message}`);
    }
  }

  async importUserData(data: ExportData): Promise<ImportResult> {
    console.log('InterviewSessionService: Importing user data');
    
    try {
      const response: AxiosResponse<ImportResult> = await this.axios.post('/import', data);
      console.log('InterviewSessionService: User data imported successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to import user data:', error);
      throw new Error(`Failed to import user data: ${error.response?.data?.message || error.message}`);
    }
  }

  async clearAllData(): Promise<void> {
    console.log('InterviewSessionService: Clearing all user data');
    
    try {
      await this.axios.delete('/clear');
      console.log('InterviewSessionService: All user data cleared successfully');
    } catch (error: any) {
      console.error('InterviewSessionService: Failed to clear user data:', error);
      throw new Error(`Failed to clear user data: ${error.response?.data?.message || error.message}`);
    }
  }

  // Connection test
  async testConnection(): Promise<boolean> {
    try {
      await this.axios.get('/statistics');
      return true;
    } catch (error) {
      console.error('InterviewSessionService: Connection test failed:', error);
      return false;
    }
  }
}