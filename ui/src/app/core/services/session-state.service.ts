import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { InterviewSessionIpcService } from './interview-session-ipc.service';

export interface InterviewSessionState {
  sessionId: string | null;
  dbSessionId: string | null;
  technology: string;
  difficulty: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  completedQuestions: number;
  isActive: boolean;
  startTime: Date | null;
  lastSavedAt: Date | null;
  autoSaveEnabled: boolean;
}

export interface QuestionState {
  questionId: string;
  question: string;
  answer: string;
  userAnswer: string;
  transcription?: string;
  audioUrl?: string;
  timeSpent: number;
  isCompleted: boolean;
  isEvaluated: boolean;
  evaluationScore?: number;
  submittedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SessionStateService implements OnDestroy {
  private sessionService = inject(InterviewSessionIpcService);

  // Session state signals
  private currentSession = signal<InterviewSessionState | null>(null);
  private currentQuestionState = signal<QuestionState | null>(null);
  private questionHistory = signal<QuestionState[]>([]);
  private autoSaveInterval: any = null;

  // Public computed properties
  readonly session = computed(() => this.currentSession());
  readonly currentQuestion = computed(() => this.currentQuestionState());
  readonly questions = computed(() => this.questionHistory());
  readonly isSessionActive = computed(() => this.currentSession()?.isActive ?? false);
  readonly hasUnsavedChanges = computed(() => {
    const session = this.currentSession();
    const lastSaved = session?.lastSavedAt;
    const currentTime = new Date();
    
    // Consider changes unsaved if more than 30 seconds since last save
    return lastSaved ? (currentTime.getTime() - lastSaved.getTime()) > 30000 : true;
  });

  readonly sessionProgress = computed(() => {
    const session = this.currentSession();
    if (!session) return null;

    return {
      current: session.currentQuestionIndex + 1,
      total: session.totalQuestions,
      completed: session.completedQuestions,
      percentage: Math.round(((session.currentQuestionIndex + 1) / session.totalQuestions) * 100)
    };
  });

  readonly canProceed = computed(() => {
    const question = this.currentQuestionState();
    return question?.isCompleted ?? false;
  });

  readonly canGoBack = computed(() => {
    const session = this.currentSession();
    return session ? session.currentQuestionIndex > 0 : false;
  });

  readonly canGoForward = computed(() => {
    const session = this.currentSession();
    return session ? session.currentQuestionIndex < session.totalQuestions - 1 : false;
  });

  // Session management methods
  startNewSession(config: {
    sessionId: string;
    dbSessionId: string;
    technology: string;
    difficulty: string;
    totalQuestions: number;
    autoSaveEnabled?: boolean;
  }): void {
    const sessionState: InterviewSessionState = {
      sessionId: config.sessionId,
      dbSessionId: config.dbSessionId,
      technology: config.technology,
      difficulty: config.difficulty,
      totalQuestions: config.totalQuestions,
      currentQuestionIndex: 0,
      completedQuestions: 0,
      isActive: true,
      startTime: new Date(),
      lastSavedAt: null,
      autoSaveEnabled: config.autoSaveEnabled ?? true
    };

    this.currentSession.set(sessionState);
    this.questionHistory.set([]);
    this.currentQuestionState.set(null);

    if (sessionState.autoSaveEnabled) {
      this.startAutoSave();
    }

    console.log('Session state service: New session started', sessionState);
  }

  setCurrentQuestion(question: {
    questionId: string;
    question: string;
    answer: string;
  }): void {
    const session = this.currentSession();
    if (!session) {
      console.warn('Cannot set question: No active session');
      return;
    }

    const questionState: QuestionState = {
      questionId: question.questionId,
      question: question.question,
      answer: question.answer,
      userAnswer: '',
      timeSpent: 0,
      isCompleted: false,
      isEvaluated: false
    };

    this.currentQuestionState.set(questionState);
    console.log('Session state service: Current question set', questionState);
  }

  updateCurrentAnswer(answer: string, transcription?: string, audioUrl?: string): void {
    this.currentQuestionState.update(current => {
      if (!current) return current;
      
      return {
        ...current,
        userAnswer: answer,
        transcription,
        audioUrl,
        isCompleted: answer.trim().length > 0
      };
    });
  }

  completeCurrentQuestion(timeSpent: number): void {
    const current = this.currentQuestionState();
    if (!current) return;

    const completedQuestion: QuestionState = {
      ...current,
      timeSpent,
      isCompleted: true,
      submittedAt: new Date()
    };

    // Add to history
    this.questionHistory.update(history => [...history, completedQuestion]);

    // Update session progress
    this.currentSession.update(session => {
      if (!session) return session;
      
      return {
        ...session,
        completedQuestions: session.completedQuestions + 1,
        lastSavedAt: new Date()
      };
    });

    console.log('Session state service: Question completed', completedQuestion);
  }

  markQuestionEvaluated(questionId: string, evaluationScore: number): void {
    this.questionHistory.update(history => 
      history.map(q => 
        q.questionId === questionId 
          ? { ...q, isEvaluated: true, evaluationScore }
          : q
      )
    );

    // Also update current question if it matches
    this.currentQuestionState.update(current => {
      if (!current || current.questionId !== questionId) return current;
      return { ...current, isEvaluated: true, evaluationScore };
    });
  }

  moveToNextQuestion(): boolean {
    const session = this.currentSession();
    if (!session || !this.canGoForward()) return false;

    this.currentSession.update(current => {
      if (!current) return current;
      return {
        ...current,
        currentQuestionIndex: current.currentQuestionIndex + 1
      };
    });

    this.currentQuestionState.set(null);
    return true;
  }

  moveToPreviousQuestion(): boolean {
    const session = this.currentSession();
    if (!session || !this.canGoBack()) return false;

    this.currentSession.update(current => {
      if (!current) return current;
      return {
        ...current,
        currentQuestionIndex: current.currentQuestionIndex - 1
      };
    });

    this.currentQuestionState.set(null);
    return true;
  }

  async completeSession(): Promise<void> {
    const session = this.currentSession();
    if (!session?.dbSessionId) return;

    try {
      const totalScore = this.calculateTotalScore();
      const duration = this.calculateSessionDuration();

      await this.sessionService.completeSession(session.dbSessionId, {
        totalScore,
        maxScore: session.completedQuestions * 100,
        durationSeconds: duration
      });

      this.currentSession.update(current => {
        if (!current) return current;
        return {
          ...current,
          isActive: false,
          lastSavedAt: new Date()
        };
      });

      this.stopAutoSave();
      console.log('Session state service: Session completed successfully');

    } catch (error) {
      console.error('Session state service: Failed to complete session:', error);
      throw error;
    }
  }

  clearSession(): void {
    this.currentSession.set(null);
    this.currentQuestionState.set(null);
    this.questionHistory.set([]);
    this.stopAutoSave();
    console.log('Session state service: Session cleared');
  }

  // Auto-save functionality
  private startAutoSave(): void {
    this.stopAutoSave(); // Clear any existing interval
    
    this.autoSaveInterval = setInterval(async () => {
      await this.autoSaveProgress();
    }, 30000); // Auto-save every 30 seconds
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  private async autoSaveProgress(): Promise<void> {
    const session = this.currentSession();
    if (!session?.isActive || !session.dbSessionId) return;

    try {
      await this.sessionService.updateSessionProgress(
        session.dbSessionId,
        session.completedQuestions
      );

      this.currentSession.update(current => {
        if (!current) return current;
        return {
          ...current,
          lastSavedAt: new Date()
        };
      });

      console.log('Session state service: Auto-save completed');

    } catch (error) {
      console.error('Session state service: Auto-save failed:', error);
    }
  }

  // Utility methods
  private calculateTotalScore(): number {
    const questions = this.questionHistory();
    const evaluatedQuestions = questions.filter(q => q.isEvaluated && q.evaluationScore !== undefined);
    
    if (evaluatedQuestions.length === 0) return 0;
    
    const totalScore = evaluatedQuestions.reduce((sum, q) => sum + (q.evaluationScore || 0), 0);
    return Math.round(totalScore);
  }

  private calculateSessionDuration(): number {
    const session = this.currentSession();
    if (!session?.startTime) return 0;

    const now = new Date();
    return Math.round((now.getTime() - session.startTime.getTime()) / 1000);
  }

  // Resume functionality
  async resumeSession(sessionId: string): Promise<boolean> {
    try {
      const sessionDetails = await this.sessionService.getSession(sessionId);
      if (!sessionDetails || sessionDetails.status === 'completed') {
        return false;
      }

      // Restore session state
      const sessionState: InterviewSessionState = {
        sessionId: sessionDetails.id,
        dbSessionId: sessionDetails.id,
        technology: sessionDetails.technology,
        difficulty: sessionDetails.difficulty,
        totalQuestions: sessionDetails.totalQuestions,
        currentQuestionIndex: sessionDetails.completedQuestions,
        completedQuestions: sessionDetails.completedQuestions,
        isActive: true,
        startTime: new Date(sessionDetails.startedAt),
        lastSavedAt: new Date(),
        autoSaveEnabled: true
      };

      this.currentSession.set(sessionState);

      // TODO: Restore question history from responses
      // This would require additional implementation to convert database responses
      // back to QuestionState objects

      this.startAutoSave();
      console.log('Session state service: Session resumed successfully');
      return true;

    } catch (error) {
      console.error('Session state service: Failed to resume session:', error);
      return false;
    }
  }

  // Debug and utility methods
  getSessionSummary() {
    const session = this.currentSession();
    const questions = this.questionHistory();
    
    return {
      session,
      currentQuestion: this.currentQuestionState(),
      questionsHistory: questions,
      progress: this.sessionProgress(),
      canProceed: this.canProceed(),
      hasUnsavedChanges: this.hasUnsavedChanges()
    };
  }

  // Cleanup on service destroy
  ngOnDestroy(): void {
    this.stopAutoSave();
  }
}