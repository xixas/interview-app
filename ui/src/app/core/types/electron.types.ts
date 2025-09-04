import type { ElectronAPI } from '../services/electron.service';

// Global type declarations for electron API
declare global {
  interface Window {
    electronAPI?: {
      database: {
        initialize: () => Promise<{ success: boolean; error?: string; message?: string }>;
        getTechnologies: () => Promise<{ success: boolean; data?: Array<{ name: string; totalQuestions: number }>; error?: string }>;
        getRandomQuestions: (filters: any) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getQuestionsByTechnology: (technology: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      };
      evaluator: {
        transcribeAudio: (audioData: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        evaluateAnswer: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        evaluateAudioAnswer: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        batchEvaluate: (evaluations: any[]) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        generateSummary: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        validateKey: () => Promise<{ success: boolean; valid?: boolean; message?: string; keyPreview?: string; error?: string }>;
      };
      interviewSession: {
        createSession: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        getSession: (sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        updateSessionProgress: (sessionId: string, completedQuestions: number) => Promise<{ success: boolean; data?: any; error?: string }>;
        completeSession: (sessionId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        createResponse: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        updateResponseEvaluation: (responseId: string, evaluation: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        getSessionHistory: (limit?: number, offset?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getSessionDetails: (sessionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        deleteSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
        getStatistics: () => Promise<{ success: boolean; data?: any; error?: string }>;
        exportUserData: () => Promise<{ success: boolean; data?: any; error?: string }>;
        importUserData: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        clearAllData: () => Promise<{ success: boolean; error?: string }>;
      };
    };
    electron?: ElectronAPI;
  }
}

export {};