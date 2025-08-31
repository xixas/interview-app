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

export interface AudioEvaluationRequest {
  question: string;
  role: string;
  proficiencyLevel: string;
  questionType: string;
  context?: string;
  audioData: string; // Base64 encoded audio data
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
      timeout: 30000,
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

      const headers = { 'X-OpenAI-API-Key': apiKey };
      const response = await this.httpClient.post('/api/evaluator/evaluate', evaluationData, { headers });

      return {
        id: response.data.id || `eval_${Date.now()}`,
        score: response.data.score || response.data.evaluation?.score || 0,
        feedback: response.data.feedback || response.data.evaluation?.feedback || '',
        strengths: response.data.strengths || response.data.evaluation?.strengths || [],
        improvements: response.data.improvements || response.data.evaluation?.improvements || [],
        technicalAccuracy: response.data.technicalAccuracy || response.data.evaluation?.technicalAccuracy || 0,
        communication: response.data.communication || response.data.evaluation?.communication || 0,
        completeness: response.data.completeness || response.data.evaluation?.completeness || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Evaluation failed:', error);
      throw error; // Don't fallback to mock - throw the actual error
    }
  }

  async evaluateAudioAnswer(audioEvaluationData: AudioEvaluationRequest): Promise<EvaluationResponse> {
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

      // Convert base64 audio data to Buffer for multipart upload
      const audioBuffer = Buffer.from(audioEvaluationData.audioData, 'base64');
      
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

      const headers = { 
        'X-OpenAI-API-Key': apiKey,
        ...formData.getHeaders()
      };

      const response = await this.httpClient.post('/api/evaluator/evaluate-audio', formData, { headers });

      return {
        id: response.data.id || `eval_${Date.now()}`,
        score: response.data.score || response.data.evaluation?.score || 0,
        feedback: response.data.feedback || response.data.evaluation?.feedback || '',
        strengths: response.data.strengths || response.data.evaluation?.strengths || [],
        improvements: response.data.improvements || response.data.evaluation?.improvements || [],
        technicalAccuracy: response.data.technicalAccuracy || response.data.evaluation?.technicalAccuracy || 0,
        communication: response.data.communication || response.data.evaluation?.communication || 0,
        completeness: response.data.completeness || response.data.evaluation?.completeness || 0,
        timestamp: new Date(),
      };
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
    try {
      const response = await this.httpClient.get('/api/evaluator/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.log('Evaluator service not available, using mock data');
      return false;
    }
  }

}