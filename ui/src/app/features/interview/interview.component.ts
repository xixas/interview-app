import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';
import { firstValueFrom } from 'rxjs';
import { ProficiencyLevel, Role, QuestionDifficulty } from '@interview-app/shared-interfaces';
import { EnvironmentService } from '../../core/services/environment.service';

interface InterviewSettings {
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  numberOfQuestions: number;
  allowSkip: boolean;
  recordAudio: boolean;
  enableAIAnalysis: boolean;
}

interface TechnologyStats {
  name: string;
  totalQuestions: number;
  fundamental: number;
  advanced: number;
  extensive: number;
}

interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  type: string;
}

interface InterviewSession {
  id: string;
  title: string;
  description: string;
  settings: InterviewSettings;
  questions: Question[];
  responses: InterviewResponse[];
  startTime: Date;
  endTime?: Date;
  currentQuestionIndex: number;
}

interface InterviewResponse {
  id: string;
  questionId: string;
  question: string;
  userAnswer?: string;
  transcription?: string;
  audioBlob?: Blob;
  audioUrl?: string;
  skipped: boolean;
  startTime: Date;
  endTime?: Date;
  duration: number;
  aiAnalysis?: {
    score: number;
    metrics: {
      technicalAccuracy: number;
      communication: number;
      completeness: number;
    };
    strengths: string[];
    improvements: string[];
    feedback: string;
  };
}

interface SessionProgress {
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: number;
  skippedQuestions: number;
  progressPercentage: number;
}

interface InterviewResult {
  overallScore: number;
  totalQuestions: number;
  answeredQuestions: number;
  skippedQuestions: number;
  averageResponseTime: number;
  strengthAreas: string[];
  improvementAreas: string[];
  recommendations: string[];
  categoryBreakdown: Array<{ category: string; averageScore: number }>;
}

@Component({
  selector: 'app-interview',
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    TextareaModule,
    ProgressBarModule,
    CheckboxModule,
    InputNumberModule,
    DialogModule,
    MessageModule,
    TagModule,
    PanelModule
  ],
  templateUrl: './interview.component.html',
  styleUrl: './interview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  protected env = inject(EnvironmentService);
  
  // Make Math available in template
  protected readonly Math = Math;

  // Signals for reactive state management
  currentStep = signal<'setup' | 'interview' | 'results'>('setup');
  isLoading = signal(false);
  errorMessage = signal('');
  technologies = signal<TechnologyStats[]>([]);
  
  settings = signal<InterviewSettings>({
    category: '',
    difficulty: 'medium',
    numberOfQuestions: 10,
    allowSkip: true,
    recordAudio: this.env.isFeatureEnabled('audioRecording'),
    enableAIAnalysis: this.env.isFeatureEnabled('aiAnalysis')
  });

  // Interview session state
  currentSession = signal<InterviewSession | null>(null);
  currentQuestion = signal<Question | null>(null);
  currentAnswer = signal('');
  sessionTime = signal(0);
  isRecording = signal(false);
  hasRecording = signal(false);
  isProcessing = signal(false);
  sessionResult = signal<InterviewResult | null>(null);

  // Dialog state
  showEndDialog = signal(false);

  // Computed values
  techOptions = computed(() => 
    this.technologies().map(tech => ({
      label: `${tech.name} (${tech.totalQuestions} questions)`,
      value: tech.name,
      totalQuestions: tech.totalQuestions,
      fundamental: tech.fundamental || 0,
      advanced: tech.advanced || 0,
      extensive: tech.extensive || 0
    }))
  );

  selectedTechInfo = computed(() => 
    this.techOptions().find(opt => opt.value === this.settings().category)
  );

  estimatedTime = computed(() => 
    Math.ceil(this.settings().numberOfQuestions * 3)
  );

  availableForDifficulty = computed(() => {
    const tech = this.selectedTechInfo();
    const difficulty = this.settings().difficulty;
    
    if (!tech || difficulty === 'mixed') {
      return tech?.totalQuestions || 0;
    }
    
    switch (difficulty) {
      case 'easy': return tech.fundamental || 0;
      case 'medium': return tech.advanced || 0;
      case 'hard': return tech.extensive || 0;
      default: return tech.totalQuestions || 0;
    }
  });

  progress = computed(() => {
    const session = this.currentSession();
    if (!session) return null;

    const totalQuestions = session.questions.length;
    const currentQuestionIndex = session.currentQuestionIndex;
    const answeredQuestions = session.responses.filter(r => !r.skipped).length;
    const skippedQuestions = session.responses.filter(r => r.skipped).length;

    return {
      currentQuestion: currentQuestionIndex + 1,
      totalQuestions,
      answeredQuestions,
      skippedQuestions,
      progressPercentage: Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
    } as SessionProgress;
  });

  canStartInterview = computed(() => {
    const settingsValue = this.settings();
    const selectedTech = this.selectedTechInfo();
    const availableQuestions = this.availableForDifficulty();
    
    return !!(
      settingsValue.category &&
      settingsValue.difficulty &&
      settingsValue.numberOfQuestions >= 5 &&
      selectedTech &&
      selectedTech.totalQuestions > 0 &&
      availableQuestions >= settingsValue.numberOfQuestions
    );
  });

  canSubmit = computed(() => {
    return (this.currentAnswer().trim().length > 0 || this.hasRecording()) && !this.isProcessing();
  });

  hasNext = computed(() => {
    const session = this.currentSession();
    return session ? session.currentQuestionIndex < session.questions.length - 1 : false;
  });

  hasPrevious = computed(() => {
    const session = this.currentSession();
    return session ? session.currentQuestionIndex > 0 : false;
  });

  canSkip = computed(() => {
    return this.settings().allowSkip && !this.isProcessing();
  });

  // Constants
  readonly difficultyOptions = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
    { label: 'Mixed', value: 'mixed' }
  ];

  // Private fields
  private timerInterval: any;
  private recordingTimer: any;
  private audioRecording: any;

  async ngOnInit() {
    await this.loadTechnologies();
    this.startSessionTimer();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
    }
  }

  private async loadTechnologies() {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      
      const stats = await firstValueFrom(
        this.http.get<TechnologyStats[]>(this.env.getApiEndpoint('/api/questions/technologies'))
      );
      
      this.technologies.set(stats);
      
      // Set the first available technology as default if none selected
      if (stats.length > 0 && !this.settings().category) {
        this.settings.update(current => ({
          ...current,
          category: stats[0].name
        }));
      }
    } catch (error) {
      console.error('Failed to load technologies:', error);
      this.errorMessage.set('Failed to load available technologies. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async startInterview() {
    if (!this.canStartInterview()) {
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      // Fetch questions for the interview
      const questions = await firstValueFrom(
        this.http.post<Question[]>(this.env.getApiEndpoint('/api/questions/interview'), {
          category: this.settings().category,
          difficulty: this.settings().difficulty === 'mixed' ? undefined : this.settings().difficulty,
          count: this.settings().numberOfQuestions
        })
      );

      if (!questions || questions.length === 0) {
        throw new Error('No questions available for the selected criteria');
      }

      // Create interview session
      const session: InterviewSession = {
        id: this.generateId(),
        title: `${this.settings().category} Interview`,
        description: `${this.settings().difficulty} level - ${this.settings().numberOfQuestions} questions`,
        settings: { ...this.settings() },
        questions,
        responses: [],
        startTime: new Date(),
        currentQuestionIndex: 0
      };

      this.currentSession.set(session);
      this.currentQuestion.set(questions[0]);
      this.currentStep.set('interview');
      
    } catch (error) {
      console.error('Failed to start interview:', error);
      this.errorMessage.set('Failed to start interview session. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitAnswer() {
    if (!this.canSubmit()) {
      return;
    }

    const session = this.currentSession();
    const question = this.currentQuestion();
    
    if (!session || !question) {
      return;
    }

    try {
      this.isProcessing.set(true);

      // Create response
      const response: InterviewResponse = {
        id: this.generateId(),
        questionId: question.id,
        question: question.question,
        userAnswer: this.currentAnswer() || undefined,
        transcription: this.audioRecording?.transcription,
        audioBlob: this.audioRecording?.blob,
        audioUrl: this.audioRecording?.url,
        skipped: false,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0 // Would be calculated from start/end times
      };

      // Add response to session
      this.currentSession.update(current => {
        if (!current) return current;
        return {
          ...current,
          responses: [...current.responses, response]
        };
      });

      // If AI analysis is enabled, send for evaluation
      if (this.settings().enableAIAnalysis) {
        this.evaluateAnswer(response);
      }

      // Clean up form state
      this.currentAnswer.set('');
      this.hasRecording.set(false);
      this.isRecording.set(false);
      this.audioRecording = null;

      // Move to next question or complete interview
      if (this.hasNext()) {
        this.nextQuestion();
      } else {
        this.completeInterview();
      }

    } catch (error) {
      console.error('Failed to submit answer:', error);
      this.errorMessage.set('Failed to submit answer. Please try again.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  private async evaluateAnswer(response: InterviewResponse) {
    try {
      const evaluation = await firstValueFrom(
        this.http.post<any>(this.env.getEvaluatorEndpoint('/evaluator/evaluate'), {
          question: response.question,
          answer: response.userAnswer || response.transcription || '',
          audioTranscription: response.transcription
        })
      );

      // Update response with AI analysis
      this.currentSession.update(current => {
        if (!current) return current;
        
        const updatedResponses = current.responses.map(r => 
          r.id === response.id 
            ? {
                ...r,
                aiAnalysis: {
                  score: evaluation.overallScore || 0,
                  metrics: {
                    technicalAccuracy: evaluation.technicalAccuracy || 0,
                    communication: evaluation.communication || 0,
                    completeness: evaluation.completeness || 0
                  },
                  strengths: evaluation.strengths || [],
                  improvements: evaluation.improvements || [],
                  feedback: evaluation.feedback || ''
                }
              }
            : r
        );

        return {
          ...current,
          responses: updatedResponses
        };
      });

    } catch (error) {
      console.error('Failed to evaluate answer:', error);
    }
  }

  skipQuestion() {
    if (!this.canSkip()) {
      return;
    }

    const session = this.currentSession();
    const question = this.currentQuestion();
    
    if (!session || !question) {
      return;
    }

    const response: InterviewResponse = {
      id: this.generateId(),
      questionId: question.id,
      question: question.question,
      skipped: true,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0
    };

    this.currentSession.update(current => {
      if (!current) return current;
      return {
        ...current,
        responses: [...current.responses, response]
      };
    });

    if (this.hasNext()) {
      this.nextQuestion();
    } else {
      this.completeInterview();
    }
  }

  nextQuestion() {
    this.currentSession.update(current => {
      if (!current || current.currentQuestionIndex >= current.questions.length - 1) {
        return current;
      }

      const newIndex = current.currentQuestionIndex + 1;
      this.currentQuestion.set(current.questions[newIndex]);
      
      return {
        ...current,
        currentQuestionIndex: newIndex
      };
    });

    this.currentAnswer.set('');
  }

  previousQuestion() {
    this.currentSession.update(current => {
      if (!current || current.currentQuestionIndex <= 0) {
        return current;
      }

      const newIndex = current.currentQuestionIndex - 1;
      this.currentQuestion.set(current.questions[newIndex]);
      
      // Load previous answer if exists
      const previousResponse = current.responses.find(r => r.questionId === current.questions[newIndex].id);
      this.currentAnswer.set(previousResponse?.userAnswer || '');
      
      return {
        ...current,
        currentQuestionIndex: newIndex
      };
    });
  }

  toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  private startRecording() {
    // Mock implementation - in real app would use MediaRecorder
    this.isRecording.set(true);
    this.hasRecording.set(false);
    this.audioRecording = null;

    this.recordingTimer = setTimeout(() => {
      if (this.isRecording()) {
        this.stopRecording();
      }
    }, 30000); // Auto-stop after 30 seconds
  }

  private stopRecording() {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    this.isRecording.set(false);
    this.hasRecording.set(true);
    
    // Mock recording data
    this.audioRecording = {
      blob: new Blob(['mock-audio-data'], { type: 'audio/wav' }),
      url: 'mock-audio-url',
      transcription: 'This is a mock transcription of the recorded audio response.'
    };
  }

  endInterview() {
    this.showEndDialog.set(false);
    this.completeInterview();
  }

  private completeInterview() {
    const session = this.currentSession();
    if (!session) return;

    // Calculate results
    const responses = session.responses.filter(r => !r.skipped);
    const totalScore = responses.reduce((sum, r) => sum + (r.aiAnalysis?.score || 0), 0);
    const overallScore = responses.length > 0 ? Math.round(totalScore / responses.length) : 0;

    const result: InterviewResult = {
      overallScore,
      totalQuestions: session.questions.length,
      answeredQuestions: responses.length,
      skippedQuestions: session.responses.filter(r => r.skipped).length,
      averageResponseTime: 0, // Would calculate from durations
      strengthAreas: this.extractStrengths(responses),
      improvementAreas: this.extractImprovements(responses),
      recommendations: this.generateRecommendations(responses),
      categoryBreakdown: []
    };

    this.sessionResult.set(result);
    this.currentStep.set('results');
  }

  private extractStrengths(responses: InterviewResponse[]): string[] {
    const strengths = new Set<string>();
    responses.forEach(r => {
      r.aiAnalysis?.strengths.forEach(s => strengths.add(s));
    });
    return Array.from(strengths).slice(0, 5);
  }

  private extractImprovements(responses: InterviewResponse[]): string[] {
    const improvements = new Set<string>();
    responses.forEach(r => {
      r.aiAnalysis?.improvements.forEach(i => improvements.add(i));
    });
    return Array.from(improvements).slice(0, 5);
  }

  private generateRecommendations(responses: InterviewResponse[]): string[] {
    // Simple recommendation logic based on scores
    const avgTechnical = this.getAverageMetric(responses, 'technicalAccuracy');
    const avgCommunication = this.getAverageMetric(responses, 'communication');
    const avgCompleteness = this.getAverageMetric(responses, 'completeness');

    const recommendations: string[] = [];

    if (avgTechnical < 70) {
      recommendations.push('Focus on strengthening technical fundamentals in ' + this.settings().category);
    }
    if (avgCommunication < 70) {
      recommendations.push('Practice explaining technical concepts more clearly');
    }
    if (avgCompleteness < 70) {
      recommendations.push('Work on providing more comprehensive answers');
    }

    return recommendations;
  }

  private getAverageMetric(responses: InterviewResponse[], metric: string): number {
    const scores = responses
      .filter(r => r.aiAnalysis?.metrics && (r.aiAnalysis.metrics as any)[metric] !== undefined)
      .map(r => (r.aiAnalysis!.metrics as any)[metric]);
    
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  startNewInterview() {
    this.sessionResult.set(null);
    this.currentSession.set(null);
    this.currentQuestion.set(null);
    this.currentAnswer.set('');
    this.currentStep.set('setup');
  }

  getDifficultySeverity(difficulty: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'success';
      case 'medium': return 'info';
      case 'hard': return 'warn';
      case 'mixed': return 'danger';
      default: return 'info';
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'interview': return 'pi pi-microphone';
      case 'practice': return 'pi pi-book';
      case 'evaluation': return 'pi pi-chart-line';
      default: return 'pi pi-question';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private startSessionTimer() {
    this.timerInterval = setInterval(() => {
      if (this.currentStep() === 'interview') {
        this.sessionTime.update(time => time + 1);
      }
    }, 1000);
  }

  // Form change handlers
  onTechnologyChange(value: string) {
    this.settings.update(current => ({ ...current, category: value }));
  }

  onDifficultyChange(value: string) {
    this.settings.update(current => ({ ...current, difficulty: value as any }));
  }

  onNumberOfQuestionsChange(value: number) {
    // Validate against environment limits
    const validatedValue = Math.min(Math.max(value, 5), this.env.limits.maxQuestions);
    this.settings.update(current => ({ ...current, numberOfQuestions: validatedValue }));
  }

  onAllowSkipChange(value: boolean) {
    this.settings.update(current => ({ ...current, allowSkip: value }));
  }

  onEnableAIChange(value: boolean) {
    this.settings.update(current => ({ ...current, enableAIAnalysis: value }));
  }

  onRecordAudioChange(value: boolean) {
    this.settings.update(current => ({ ...current, recordAudio: value }));
  }

  // Navigation methods
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}