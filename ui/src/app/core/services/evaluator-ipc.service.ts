import { Injectable } from '@angular/core';

export interface EvaluationRequest {
  questionId: string | number;
  question: string;
  answer: string;
  technology?: string;
  difficulty?: string;
  timeSpent?: number;
}

export interface EvaluationResponse {
  id: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  technicalAccuracy: number;
  communication: number;
  completeness: number;
  timestamp: Date;
}

export interface TranscriptionRequest {
  audioData: string; // Base64 encoded audio
  format?: string;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EvaluatorIpcService {

  async transcribeAudio(audioData: string): Promise<TranscriptionResponse> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for audio transcription. Please use the desktop version of the app.');
    }

    try {
      const result = await window.electronAPI.evaluator.transcribeAudio(audioData);
      if (!result.success) {
        throw new Error(result.error || 'Audio transcription failed. Please check your OpenAI API key configuration.');
      }

      return {
        text: result.data.text || '',
        confidence: result.data.confidence || 0.95,
        duration: result.data.duration,
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  async evaluateAnswer(evaluationData: EvaluationRequest): Promise<EvaluationResponse> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for AI evaluation. Please use the desktop version of the app.');
    }

    try {
      const result = await window.electronAPI.evaluator.evaluateAnswer(evaluationData);
      if (!result.success) {
        throw new Error(result.error || 'AI evaluation failed. Please check your OpenAI API key configuration.');
      }

      return {
        id: result.data.id || `evaluation_${Date.now()}`,
        score: result.data.score || 0,
        feedback: result.data.feedback || '',
        strengths: result.data.strengths || [],
        improvements: result.data.improvements || [],
        technicalAccuracy: result.data.technicalAccuracy || 0,
        communication: result.data.communication || 0,
        completeness: result.data.completeness || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Evaluation error:', error);
      throw error; // Don't mask the error with mock data
    }
  }

  async batchEvaluateAnswers(evaluationuations: EvaluationRequest[]): Promise<EvaluationResponse[]> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for AI evaluation. Please use the desktop version of the app.');
    }

    try {
      const result = await window.electronAPI.evaluator.batchEvaluate(evaluationuations);
      if (!result.success) {
        throw new Error(result.error || 'Batch evaluation failed. Please check your OpenAI API key configuration.');
      }

      return result.data || [];
    } catch (error) {
      console.error('Batch evaluation error:', error);
      throw error;
    }
  }

  async generateInterviewSummary(summaryData: any): Promise<any> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for AI summary generation. Please use the desktop version of the app.');
    }

    try {
      const result = await window.electronAPI.evaluator.generateSummary(summaryData);
      if (!result.success) {
        throw new Error(result.error || 'AI summary generation failed. Please check your OpenAI API key configuration.');
      }

      return result.data || {};
    } catch (error) {
      console.error('Summary generation error:', error);
      throw error;
    }
  }


  async validateApiKey(): Promise<{ valid: boolean; message: string; keyPreview?: string }> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for API key validation. Please use the desktop version of the app.');
    }

    try {
      const result = await window.electronAPI.evaluator.validateKey();
      if (!result.success) {
        throw new Error(result.error || 'API key validation failed');
      }

      return {
        valid: result.valid || false,
        message: result.message || 'API key validation failed',
        keyPreview: result.keyPreview
      };
    } catch (error) {
      console.error('API key validation error:', error);
      throw error;
    }
  }

  // Check if running in Electron environment
  isElectronAvailable(): boolean {
    return !!(window.electronAPI && window.electronAPI.evaluator);
  }

  // Get environment info
  getEnvironmentInfo(): { isElectron: boolean; hasEvaluator: boolean } {
    const isElectron = this.isElectronAvailable();
    return {
      isElectron,
      hasEvaluator: isElectron,
    };
  }
}