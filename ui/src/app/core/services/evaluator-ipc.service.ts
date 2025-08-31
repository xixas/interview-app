import { Injectable } from '@angular/core';
import { EvaluationResult, AudioEvaluationResult } from '@interview-app/shared-interfaces';

export interface EvaluationRequest {
  questionId: string | number;
  question: string;
  answer: string;
  technology?: string;
  difficulty?: string;
  timeSpent?: number;
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

export interface AudioEvaluationRequest {
  question: string;
  role: string;
  proficiencyLevel: string;
  questionType: string;
  context?: string;
  audioData: string; // Base64 encoded audio data
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

  async evaluateAnswer(evaluationData: EvaluationRequest): Promise<EvaluationResult> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for AI evaluation. Please use the desktop version of the app.');
    }

    try {
      const result = await window.electronAPI.evaluator.evaluateAnswer(evaluationData);
      if (!result.success) {
        throw new Error(result.error || 'AI evaluation failed. Please check your OpenAI API key configuration.');
      }

      return {
        overallScore: result.data.overallScore || 0,
        maxScore: result.data.maxScore || 100,
        percentage: result.data.percentage || 0,
        criteria: result.data.criteria || {},
        strengths: result.data.strengths || [],
        improvements: result.data.improvements || [],
        detailedFeedback: result.data.detailedFeedback || result.data.feedback || '',
        recommendation: result.data.recommendation || 'FAIL',
        nextSteps: result.data.nextSteps || [],
      };
    } catch (error) {
      console.error('Evaluation error:', error);
      throw error; // Don't mask the error with mock data
    }
  }

  async evaluateAudioAnswer(evaluationData: AudioEvaluationRequest): Promise<AudioEvaluationResult> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for audio evaluation. Please use the desktop version of the app.');
    }

    try {
      const result = await window.electronAPI.evaluator.evaluateAudioAnswer(evaluationData);
      if (!result.success) {
        throw new Error(result.error || 'Audio evaluation failed. Please check your OpenAI API key configuration.');
      }

      return {
        overallScore: result.data.overallScore || 0,
        maxScore: result.data.maxScore || 100,
        percentage: result.data.percentage || 0,
        criteria: result.data.criteria || {},
        strengths: result.data.strengths || [],
        improvements: result.data.improvements || [],
        detailedFeedback: result.data.detailedFeedback || result.data.feedback || '',
        recommendation: result.data.recommendation || 'FAIL',
        nextSteps: result.data.nextSteps || [],
        audioAnalysis: result.data.audioAnalysis,
      };
    } catch (error) {
      console.error('Audio evaluation error:', error);
      throw error;
    }
  }

  async batchEvaluateAnswers(evaluationuations: EvaluationRequest[]): Promise<EvaluationResult[]> {
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