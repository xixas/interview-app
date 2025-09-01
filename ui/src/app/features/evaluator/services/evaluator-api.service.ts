import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, from, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { SettingsService } from '../../../core/services/settings.service';
import { 
  EvaluationResult, 
  AudioEvaluationResult,
  ProficiencyLevel, 
  Role, 
  QuestionType 
} from '@interview-app/shared-interfaces';

export interface EvaluateAnswerRequest {
  question: string;
  answer: string;
  role: Role;
  proficiencyLevel: ProficiencyLevel;
  questionType: QuestionType;
  context?: string;
}

export interface EvaluateAudioRequest {
  question: string;
  role: Role;
  proficiencyLevel: ProficiencyLevel;
  questionType: QuestionType;
  context?: string;
  audioFile: File;
}


@Injectable({
  providedIn: 'root',
})
export class EvaluatorApiService {
  private readonly http = inject(HttpClient);
  private readonly settingsService = inject(SettingsService);
  private readonly baseUrl = 'http://localhost:3001/api/evaluator';

  evaluateAnswer(request: EvaluateAnswerRequest): Observable<EvaluationResult> {
    console.log('Evaluating answer with request:', request);
    
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => {
        if (!headers) {
          throw new Error('OpenAI API key not configured. Please set your API key in Settings.');
        }
        
        return this.http.post<EvaluationResult>(`${this.baseUrl}/evaluate`, request, { headers })
          .pipe(
            tap(result => console.log('Evaluation result:', result)),
            catchError(error => {
              console.error('Error evaluating answer:', error);
              throw error;
            })
          );
      })
    );
  }

  evaluateAudioAnswer(request: EvaluateAudioRequest): Observable<AudioEvaluationResult> {
    console.log('Evaluating audio answer with request:', { 
      ...request, 
      audioFile: `File: ${request.audioFile.name} (${request.audioFile.size} bytes)` 
    });
    
    return from(this.getAuthHeaders()).pipe(
      switchMap(headers => {
        if (!headers) {
          throw new Error('OpenAI API key not configured. Please set your API key in Settings.');
        }
        
        // Create FormData to send multipart/form-data
        const formData = new FormData();
        formData.append('audioFile', request.audioFile);
        formData.append('question', request.question);
        formData.append('role', request.role);
        formData.append('proficiencyLevel', request.proficiencyLevel);
        formData.append('questionType', request.questionType);
        if (request.context) {
          formData.append('context', request.context);
        }

        return this.http.post<AudioEvaluationResult>(`${this.baseUrl}/evaluate-audio`, formData, { headers })
          .pipe(
            tap(result => console.log('Audio evaluation result:', result)),
            catchError(error => {
              console.error('Error evaluating audio answer:', error);
              throw error;
            })
          );
      })
    );
  }


  healthCheck(): Observable<{ status: string; timestamp: string }> {
    return this.http.get<{ status: string; timestamp: string }>(`${this.baseUrl}/health`)
      .pipe(
        catchError(error => {
          console.error('Health check failed:', error);
          throw error;
        })
      );
  }

  private async getAuthHeaders(): Promise<HttpHeaders | null> {
    const apiKey = await this.settingsService.getApiKey();
    if (!apiKey) {
      return null;
    }
    
    return new HttpHeaders({
      'X-OpenAI-API-Key': apiKey
    });
  }
}