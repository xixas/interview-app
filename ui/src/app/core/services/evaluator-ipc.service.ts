import { Injectable, inject } from '@angular/core';
import { EvaluationResult, AudioEvaluationResult } from '@interview-app/shared-interfaces';
import { NotificationService } from './notification.service';

export interface EvaluationRequest {
  questionId: string | number;
  question: string;
  answer: string;
  referenceAnswer?: string;
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
  referenceAnswer?: string; // Reference answer from database for comparison
  example?: string; // Example code/snippet from database
}

@Injectable({
  providedIn: 'root'
})
export class EvaluatorIpcService {
  private readonly notificationService = inject(NotificationService);

  async transcribeAudio(audioData: string): Promise<TranscriptionResponse> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for audio transcription. Please use the desktop version of the app.');
    }

    try {
      const result = await window.electronAPI.evaluator.transcribeAudio(audioData);
      if (!result.success) {
        const error = result.error || 'Audio transcription failed. Please check your OpenAI API key configuration.';
        this.notificationService.showError('Transcription Failed', error);
        throw new Error(error);
      }

      const transcription = {
        text: result.data.text || '',
        confidence: result.data.confidence || 0.95,
        duration: result.data.duration,
      };
      
      this.notificationService.showSuccess('Audio Transcribed', 'Your audio has been successfully transcribed');
      return transcription;
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
        overallScore: result.data.overallScore ?? 0,
        maxScore: result.data.maxScore ?? 100,
        percentage: result.data.percentage ?? 0,
        criteria: result.data.criteria ?? {},
        criteriaFeedback: result.data.criteriaFeedback ?? {},
        strengths: result.data.strengths ?? [],
        improvements: result.data.improvements ?? [],
        detailedFeedback: result.data.detailedFeedback || result.data.feedback || '',
        recommendation: result.data.recommendation ?? 'NO DECISION',
        nextSteps: result.data.nextSteps ?? [],
      };
    } catch (error) {
      console.error('Evaluation error:', error);
      throw error;
    }
  }

  async evaluateAudioAnswer(evaluationData: AudioEvaluationRequest): Promise<AudioEvaluationResult> {
    if (!window.electronAPI?.evaluator) {
      throw new Error('Desktop mode is required for audio evaluation. Please use the desktop version of the app.');
    }

    try {
      console.log('=== IPC SERVICE - SENDING EVALUATION REQUEST ===');
      console.log('Question:', evaluationData.question);
      console.log('Role:', evaluationData.role);
      console.log('Proficiency Level:', evaluationData.proficiencyLevel);
      console.log('Question Type:', evaluationData.questionType);
      console.log('Audio Data Length:', evaluationData.audioData?.length);
      
      const result = await window.electronAPI.evaluator.evaluateAudioAnswer(evaluationData);
      
      console.log('=== IPC SERVICE - RAW BACKEND RESPONSE ===');
      console.log('Success:', result.success);
      console.log('Full Result:', JSON.stringify(result, null, 2));
      
      if (!result.success) {
        const error = result.error || 'Audio evaluation failed. Please check your OpenAI API key configuration.';
        this.notificationService.showApiError(result.error || error);
        throw new Error(error);
      }

      const evaluation = {
        overallScore: result.data.overallScore ?? 0,
        maxScore: result.data.maxScore ?? 100,
        percentage: result.data.percentage ?? 0,
        criteria: result.data.criteria ?? {},
        criteriaFeedback: result.data.criteriaFeedback ?? {},
        strengths: result.data.strengths ?? [],
        improvements: result.data.improvements ?? [],
        detailedFeedback: result.data.detailedFeedback || result.data.feedback || '',
        recommendation: result.data.recommendation ?? 'CONDITIONAL',
        nextSteps: result.data.nextSteps ?? [],
        transcription: result.data.transcription,
        audioAnalysis: result.data.audioAnalysis,
      };
      
      console.log('=== IPC SERVICE - FINAL MAPPED EVALUATION ===');
      console.log('Mapped Evaluation:', JSON.stringify(evaluation, null, 2));
      console.log('Overall Score:', evaluation.overallScore);
      console.log('Max Score:', evaluation.maxScore);
      console.log('Percentage:', evaluation.percentage);
      console.log('Criteria:', evaluation.criteria);
      console.log('Audio Analysis Present:', !!evaluation.audioAnalysis);
      if (evaluation.audioAnalysis) {
        console.log('Speaking Rate:', evaluation.audioAnalysis.speakingRate);
        console.log('Filler Words:', evaluation.audioAnalysis.fillerWordCount);
        console.log('Reading Detection:', evaluation.audioAnalysis.readingAnomalies?.isLikelyReading);
        console.log('Naturalness Score:', evaluation.audioAnalysis.readingAnomalies?.naturalityScore);
      }
      console.log('Detailed Feedback Length:', evaluation.detailedFeedback?.length);
      
      // Toast notification removed to avoid distraction during interview
      // this.notificationService.showSuccess('Evaluation Complete', `Your answer has been evaluated with a score of ${evaluation.percentage}%`);
      return evaluation;
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