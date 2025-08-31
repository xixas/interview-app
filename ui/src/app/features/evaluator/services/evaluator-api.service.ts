import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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

export interface DemoData {
  sampleQuestion: string;
  sampleAnswer: string;
  availableRoles: string[];
  availableProficiencyLevels: string[];
  questionTypes: string[];
}

@Injectable({
  providedIn: 'root',
})
export class EvaluatorApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3001/api/evaluator';

  evaluateAnswer(request: EvaluateAnswerRequest): Observable<EvaluationResult> {
    console.log('Evaluating answer with request:', request);
    
    return this.http.post<EvaluationResult>(`${this.baseUrl}/evaluate`, request)
      .pipe(
        tap(result => console.log('Evaluation result:', result)),
        catchError(error => {
          console.error('Error evaluating answer:', error);
          // Return mock data on error
          return of(this.createMockEvaluation(request));
        })
      );
  }

  getDemoData(): Observable<DemoData> {
    return this.http.get<DemoData>(`${this.baseUrl}/demo`)
      .pipe(
        catchError(error => {
          console.error('Error fetching demo data:', error);
          return of(this.createMockDemoData());
        })
      );
  }

  healthCheck(): Observable<{ status: string; timestamp: string }> {
    return this.http.get<{ status: string; timestamp: string }>(`${this.baseUrl}/health`)
      .pipe(
        catchError(error => {
          console.error('Health check failed:', error);
          return of({ status: 'unavailable', timestamp: new Date().toISOString() });
        })
      );
  }

  private createMockEvaluation(request: EvaluateAnswerRequest): EvaluationResult {
    const answerLength = request.answer.length;
    const hasCodeExamples = request.answer.includes('function') || request.answer.includes('=>');
    const mentionsBestPractices = request.answer.toLowerCase().includes('best practice');
    
    // Generate realistic mock scores based on answer quality
    const baseScore = Math.min(10, 6 + Math.floor(answerLength / 100));
    const codeBonus = hasCodeExamples ? 1 : 0;
    const practiceBonus = mentionsBestPractices ? 1 : 0;
    
    const criteria = {
      technicalAccuracy: Math.min(10, baseScore + codeBonus),
      clarity: Math.min(10, baseScore + (answerLength > 200 ? 1 : 0)),
      completeness: Math.min(10, baseScore),
      communication: Math.min(10, baseScore + 1)
    };
    
    const totalScore = Object.values(criteria).reduce((sum, score) => sum + score, 0);
    const maxScore = Object.keys(criteria).length * 10;
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    return {
      overallScore: totalScore,
      maxScore,
      percentage,
      criteria,
      criteriaFeedback: {
        technicalAccuracy: `Technical understanding is ${criteria.technicalAccuracy >= 8 ? 'excellent' : criteria.technicalAccuracy >= 6 ? 'good' : 'needs improvement'} (${criteria.technicalAccuracy}/10)`,
        clarity: `Explanation clarity is ${criteria.clarity >= 8 ? 'excellent' : criteria.clarity >= 6 ? 'good' : 'needs improvement'} (${criteria.clarity}/10)`,
        completeness: `Coverage is ${criteria.completeness >= 8 ? 'comprehensive' : criteria.completeness >= 6 ? 'adequate' : 'incomplete'} (${criteria.completeness}/10)`,
        communication: `Communication skills are ${criteria.communication >= 8 ? 'excellent' : criteria.communication >= 6 ? 'good' : 'need development'} (${criteria.communication}/10)`
      },
      strengths: [
        ...(criteria.technicalAccuracy >= 7 ? ['Good technical understanding'] : []),
        ...(criteria.clarity >= 7 ? ['Clear explanation'] : []),
        ...(hasCodeExamples ? ['Provided code examples'] : []),
        ...(answerLength > 300 ? ['Detailed response'] : [])
      ],
      improvements: [
        ...(criteria.technicalAccuracy < 7 ? ['Strengthen technical knowledge'] : []),
        ...(criteria.completeness < 7 ? ['Provide more comprehensive coverage'] : []),
        ...(answerLength < 150 ? ['Expand on key points'] : []),
        ...(!hasCodeExamples && request.questionType === QuestionType.CODING ? ['Include code examples'] : [])
      ],
      detailedFeedback: `This ${request.proficiencyLevel} ${request.role} answer demonstrates ${percentage >= 80 ? 'strong' : percentage >= 60 ? 'good' : 'basic'} understanding. The response ${percentage >= 75 ? 'meets expectations' : 'needs improvement in some areas'} for this level and role.`,
      recommendation: percentage >= 75 ? 'PASS' : percentage >= 60 ? 'CONDITIONAL' : 'FAIL',
      nextSteps: [
        ...(percentage < 75 ? ['Practice more interview questions'] : []),
        ...(criteria.technicalAccuracy < 7 ? [`Study core ${request.role} concepts`] : []),
        ...(request.proficiencyLevel === ProficiencyLevel.SENIOR ? ['Focus on system design'] : []),
        'Continue practicing technical communication'
      ]
    };
  }

  private createMockDemoData(): DemoData {
    return {
      sampleQuestion: 'Explain the difference between "let", "const", and "var" in JavaScript, and when you would use each one.',
      sampleAnswer: 'var is function-scoped and can be redeclared, let is block-scoped and cannot be redeclared in the same scope, and const is also block-scoped but cannot be reassigned after declaration. const is used for values that should not change, while let is used for variables that may be reassigned.',
      availableRoles: ['frontend', 'backend', 'fullstack', 'devops', 'mobile', 'data-science', 'qa'],
      availableProficiencyLevels: ['junior', 'mid', 'senior', 'lead'],
      questionTypes: ['technical', 'behavioral', 'system-design', 'coding']
    };
  }
}