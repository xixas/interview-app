import axios, { AxiosInstance } from 'axios';

export interface EvaluationRequest {
  questionId: string | number;
  question: string;
  answer: string;
  technology?: string;
  difficulty?: string;
  timeSpent?: number;
}

export interface EvaluationResponse {
  overallScore: number;
  maxScore: number;
  percentage: number;
  criteria: {
    technicalAccuracy?: number;
    clarity?: number;
    completeness?: number;
    problemSolving?: number;
    communication?: number;
    bestPractices?: number;
    speakingPace?: number;
    confidence?: number;
    articulation?: number;
    professionalPresence?: number;
  };
  criteriaFeedback?: Record<string, string>;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  recommendation: 'PASS' | 'CONDITIONAL' | 'FAIL';
  nextSteps: string[];
  transcription?: {
    text: string;
    duration?: number;
    language?: string;
  };
  audioAnalysis?: any;
  applicableCriteria?: string[];
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

export class EvaluatorService {
  private httpClient: AxiosInstance;
  private baseUrl: string;
  private settingsService: any; // Reference to settings for API key

  constructor(baseUrl: string = 'http://localhost:3001', settingsService?: any) {
    this.baseUrl = baseUrl;
    this.settingsService = settingsService;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 90000, // 90 seconds to accommodate OpenAI's 60-second timeout plus network overhead
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async getApiKey(): Promise<string | null> {
    try {
      // Only get API key from UI settings - no environment variable fallback
      if (this.settingsService && typeof this.settingsService.get === 'function') {
        const apiKey = this.settingsService.get('openai_api_key');
        if (apiKey && typeof apiKey === 'string') {
          const trimmedKey = apiKey.trim();
          if (trimmedKey.length > 0) {
            return trimmedKey;
          }
        }
      }
      
      return null; // No API key available
    } catch (error) {
      console.error('Failed to get API key:', error);
      return null;
    }
  }

  async transcribeAudio(audioData: string): Promise<TranscriptionResponse> {
    try {
      // First check if the evaluator service is available
      const isAvailable = await this.isServiceAvailable();
      if (!isAvailable) {
        throw new Error('AI Transcription service is not available. Please ensure the evaluator service is running and your OpenAI API key is configured.');
      }

      const response = await this.httpClient.post('/api/evaluator/transcribe', {
        audioData,
        format: 'webm', // Default format from browser
      });

      return {
        text: response.data.text || response.data.transcription || '',
        confidence: response.data.confidence || 0.95,
        duration: response.data.duration,
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  async evaluateAnswer(evaluationData: EvaluationRequest): Promise<EvaluationResponse> {
    try {
      // Get API key for the request - required for evaluation
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set your API key in Settings.');
      }

      // Check if the evaluator service is available
      const isAvailable = await this.isServiceAvailable();
      if (!isAvailable) {
        throw new Error('AI Evaluator service is not available. Please check if the service is running.');
      }

      // Transform to backend DTO format
      const backendRequest = {
        question: evaluationData.question,
        answer: evaluationData.answer,
        role: 'FRONTEND', // Default role - could be made configurable
        proficiencyLevel: 'MID', // Default level - could be made configurable  
        questionType: 'TECHNICAL', // Default type
        context: evaluationData.technology ? `Technology: ${evaluationData.technology}, Difficulty: ${evaluationData.difficulty}` : undefined
      };

      const headers = { 'X-OpenAI-API-Key': apiKey };
      const response = await this.httpClient.post('/api/evaluator/evaluate', backendRequest, { headers });

      // Return the response data directly without transformation
      return response.data;
    } catch (error) {
      console.error('Evaluation failed:', error);
      throw error;
    }
  }

  async evaluateAudioAnswer(audioEvaluationData: AudioEvaluationRequest): Promise<EvaluationResponse> {
    try {
      console.log('=== ELECTRON SERVICE - AUDIO EVALUATION REQUEST ===');
      console.log('Question:', audioEvaluationData.question);
      console.log('Role:', audioEvaluationData.role);
      console.log('Proficiency Level:', audioEvaluationData.proficiencyLevel);
      console.log('Question Type:', audioEvaluationData.questionType);
      console.log('Context:', audioEvaluationData.context);
      console.log('Reference Answer Available:', !!audioEvaluationData.referenceAnswer);
      console.log('Example Available:', !!audioEvaluationData.example);
      console.log('Audio Data Length:', audioEvaluationData.audioData?.length);
      
      // Get API key for the request - required for evaluation
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set your API key in Settings.');
      }

      // Check if the evaluator service is available
      const isAvailable = await this.isServiceAvailable();
      if (!isAvailable) {
        throw new Error('AI Evaluator service is not available. Please check if the service is running.');
      }

      // Convert base64 audio data to Buffer for multipart upload
      const audioBuffer = Buffer.from(audioEvaluationData.audioData, 'base64');
      
      // Debug: Check WebM magic bytes after conversion
      const magicBytes = audioBuffer.slice(0, 4);
      console.log('=== ELECTRON SERVICE - AUDIO BUFFER DEBUG ===');
      console.log('Buffer size:', audioBuffer.length);
      console.log('Magic bytes:', Array.from(magicBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', '));
      
      // Check if this is a valid WebM file
      const webmMagic = [0x1A, 0x45, 0xDF, 0xA3];
      const isValidWebM = webmMagic.every((byte, index) => magicBytes[index] === byte);
      console.log('Is valid WebM after conversion:', isValidWebM);
      
      // Create form data for multipart upload
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Add the audio file (field name must be 'audio' to match backend FileInterceptor)
      formData.append('audio', audioBuffer, {
        filename: 'audio-recording.webm',
        contentType: 'audio/webm'
      });
      
      // Add other fields
      formData.append('question', audioEvaluationData.question);
      formData.append('role', audioEvaluationData.role);
      formData.append('proficiencyLevel', audioEvaluationData.proficiencyLevel);
      formData.append('questionType', audioEvaluationData.questionType);
      if (audioEvaluationData.context) {
        formData.append('context', audioEvaluationData.context);
      }
      if (audioEvaluationData.referenceAnswer) {
        formData.append('referenceAnswer', audioEvaluationData.referenceAnswer);
      }
      if (audioEvaluationData.example) {
        formData.append('example', audioEvaluationData.example);
      }

      const headers = { 
        'X-OpenAI-API-Key': apiKey,
        ...formData.getHeaders()
      };

      console.log('=== ELECTRON SERVICE - SENDING TO BACKEND ===');
      console.log('URL:', `${this.baseUrl}/api/evaluator/evaluate-audio`);
      console.log('Headers:', { 'X-OpenAI-API-Key': `${apiKey.substring(0, 10)}...` });
      
      const response = await this.httpClient.post('/api/evaluator/evaluate-audio', formData, { headers });

      console.log('=== ELECTRON SERVICE - BACKEND RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));
      
      // Return the response data directly without transformation
      return response.data;
    } catch (error) {
      console.error('Audio evaluation failed:', error);
      throw error;
    }
  }

  async batchEvaluateAnswers(evaluations: EvaluationRequest[]): Promise<EvaluationResponse[]> {
    try {
      // First check if the evaluator service is available
      const isAvailable = await this.isServiceAvailable();
      if (!isAvailable) {
        throw new Error('AI Evaluator service is not available. Please ensure the evaluator service is running and your OpenAI API key is configured.');
      }

      const response = await this.httpClient.post('/api/evaluator/batch-evaluate', {
        evaluations,
      });

      return response.data.results || response.data.evaluations || [];
    } catch (error) {
      console.error('Batch evaluation failed:', error);
      throw error;
    }
  }

  async generateInterviewSummary(summaryData: any): Promise<any> {
    try {
      // First check if the evaluator service is available
      const isAvailable = await this.isServiceAvailable();
      if (!isAvailable) {
        throw new Error('AI Summary service is not available. Please ensure the evaluator service is running and your OpenAI API key is configured.');
      }

      const response = await this.httpClient.post('/api/evaluator/generate-summary', summaryData);

      return response.data.summary || response.data;
    } catch (error) {
      console.error('Summary generation failed:', error);
      throw error;
    }
  }

  private async isServiceAvailable(): Promise<boolean> {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Evaluator service health check - Attempt ${attempt}/${maxRetries}`);
        const response = await this.httpClient.get('/api/evaluator/health', { timeout: 5000 });
        
        if (response.status === 200) {
          console.log('Evaluator service is available and healthy');
          return true;
        }
      } catch (error) {
        console.log(`Evaluator service health check failed (attempt ${attempt}/${maxRetries}):`, error.message || error);
        
        if (attempt < maxRetries) {
          console.log(`Waiting ${retryDelay}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    console.error('Evaluator service is not available after all retry attempts');
    return false;
  }

}