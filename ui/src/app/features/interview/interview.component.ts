type UIDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

const UI_TO_DB: Record<Exclude<UIDifficulty, 'mixed'>, 'Fundamental'|'Advanced'|'Extensive'> = {
  easy: 'Fundamental',
  medium: 'Advanced',
  hard: 'Extensive',
};

const DB_TO_UI: Record<'Fundamental'|'Advanced'|'Extensive', Exclude<UIDifficulty,'mixed'>> = {
  Fundamental: 'easy',
  Advanced: 'medium',
  Extensive: 'hard',
};

function toApiDifficulty(d: UIDifficulty): 'Fundamental'|'Advanced'|'Extensive'|'ALL' {
  return d === 'mixed' ? 'ALL' : UI_TO_DB[d];
}

function toUiDifficulty(d: string): Exclude<UIDifficulty,'mixed'> {
  return DB_TO_UI[d as keyof typeof DB_TO_UI] ?? 'medium';
}

import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationDialogComponent, ConfirmationConfig } from '../../shared/components/confirmation-dialog.component';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { PanelModule } from 'primeng/panel';
import { FluidModule } from 'primeng/fluid';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { RippleModule } from 'primeng/ripple';
import { ProficiencyLevel, Role, QuestionDifficulty } from '@interview-app/shared-interfaces';
import { EnvironmentService } from '../../core/services/environment.service';
import { DatabaseIpcService } from '../../core/services/database-ipc.service';
import { EvaluatorIpcService } from '../../core/services/evaluator-ipc.service';
import { InterviewSessionService } from '../../core/services/interview-session.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

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
  answer: string; // Reference answer from database
  category: string;
  difficulty: string;
  type: string;
  example?: string;
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
    ConfirmationDialogComponent,
    MessageModule,
    TagModule,
    PanelModule,
    FluidModule,
    TableModule,
    InputTextModule,
    TooltipModule,
    InputIconModule,
    IconFieldModule,
    RippleModule,
    PageHeaderComponent
  ],
  templateUrl: './interview.component.html',
  styleUrl: './interview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  protected env = inject(EnvironmentService);
  private databaseService = inject(DatabaseIpcService);
  private evaluatorService = inject(EvaluatorIpcService);
  private sessionService = inject(InterviewSessionService);
  
  // Make Math and Array available in template
  protected readonly Math = Math;
  protected readonly Array = Array;

  // Signals for reactive state management
  currentStep = signal<'setup' | 'interview' | 'results'>('setup');
  isLoading = signal(false);
  errorMessage = signal('');
  technologies = signal<TechnologyStats[]>([]);
  
  settings = signal<InterviewSettings & { difficulty: UIDifficulty }>({
    category: '',
    difficulty: 'medium',
    numberOfQuestions: 10,
    allowSkip: true,
    recordAudio: true, // Always enabled for interview practice
    enableAIAnalysis: true // Always enabled for AI-powered feedback
  });


  // Interview session state
  currentSession = signal<InterviewSession | null>(null);
  currentDbSessionId = signal<string | null>(null); // Backend database session ID
  currentQuestion = signal<Question | null>(null);
  currentAnswer = signal('');
  sessionTime = signal(0);
  isRecording = signal(false);
  hasRecording = signal(false);
  isProcessing = signal(false);
  sessionResult = signal<InterviewResult | null>(null);

  // Dialog state
  // New recording-related signals
  answerMode = signal<'audio'>('audio'); // Interview is voice-only
  recordingTime = signal(0);
  recordingDuration = signal(0);
  isPlaying = signal(false);
  showEndDialog = signal(false);
  
  // Dialog configuration
  endDialogConfig = signal<ConfirmationConfig>({
    title: 'End Interview Session',
    message: 'Are you sure you want to end the current interview session? Your progress will be saved.',
    confirmLabel: 'End Session',
    cancelLabel: 'Cancel',
    confirmSeverity: 'danger',
    icon: 'pi pi-exclamation-triangle',
    width: '450px'
  });

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

  estimatedTime = computed(() => {
    const questions = this.settings().numberOfQuestions;
    const difficulty = this.settings().difficulty;
    
    // Base time per question varies by difficulty
    let baseTime = 4; // Default 4 minutes per question
    switch (difficulty) {
      case 'easy': baseTime = 3; break;
      case 'medium': baseTime = 4; break;
      case 'hard': baseTime = 5; break;
      case 'mixed': baseTime = 4; break;
    }
    
    // Add buffer time for transitions and review
    const bufferTime = Math.ceil(questions * 0.5); // 30 seconds per question buffer
    
    return Math.ceil((questions * baseTime) + bufferTime);
  });

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
    // Interview is voice-only, so only check for audio recording
    const hasAudioAnswer = this.hasRecording();
    return hasAudioAnswer && !this.isProcessing();
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
  private recordingTimeTimer: any;
  // MediaRecorder API fields
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioBlob: Blob | null = null;
  private audioUrl: string | null = null;
  private audioElement: HTMLAudioElement | null = null;

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
    if (this.recordingTimeTimer) {
      clearInterval(this.recordingTimeTimer);
    }
    
    // Clean up MediaRecorder resources
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    // Clean up audio URL
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
    
    // Clean up audio element
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }

  private async loadTechnologies() {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      
      const stats = await this.databaseService.getTechnologies();
      
      // Map to expected interface format with estimated difficulty breakdown
      const techStats: TechnologyStats[] = stats.map((tech) => {
        // Use estimated distribution based on typical technical interview question pools
        const total = tech.totalQuestions;
        return {
          name: tech.name,
          totalQuestions: total,
          fundamental: Math.floor(total * 0.4), // 40% easy/fundamental
          advanced: Math.floor(total * 0.4),   // 40% medium/advanced  
          extensive: Math.floor(total * 0.2)   // 20% hard/extensive
        };
      });
      
      this.technologies.set(techStats);
      
      // Set the first available technology as default if none selected
      if (techStats.length > 0 && !this.settings().category) {
        this.settings.update(current => ({
          ...current,
          category: techStats[0].name
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
  if (!this.canStartInterview()) return;

  try {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const s = this.settings();
    const apiDifficulty = toApiDifficulty(s.difficulty);

    const dbQuestions = await this.databaseService.getRandomQuestions({
      technology: s.category,                      // keep as-is
      difficulty: apiDifficulty,                   // <-- mapped for DB
      count: s.numberOfQuestions
    });

    if (!dbQuestions?.length) throw new Error('No questions available for the selected criteria');

    // Create database session for tracking
    const dbSession = await this.sessionService.createSession({
      technology: s.category,
      difficulty: apiDifficulty,
      totalQuestions: s.numberOfQuestions
    });

    const questions: Question[] = dbQuestions.map(q => ({
      id: String(q.id),
      question: q.question,
      answer: q.answer || '', // Include reference answer
      category: q.category,
      difficulty: toUiDifficulty(q.difficulty),    // <-- normalize back for UI
      type: 'technical',
      example: q.example
    }));

    const session: InterviewSession = {
      id: this.generateId(),
      title: `${s.category} Interview`,
      description: `${s.difficulty} level - ${s.numberOfQuestions} questions`,
      settings: { ...s },
      questions,
      responses: [],
      startTime: new Date(),
      currentQuestionIndex: 0
    };

    this.currentSession.set(session);
    this.currentDbSessionId.set(dbSession.id); // Store the database session ID
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
    const dbSessionId = this.currentDbSessionId();
    
    if (!session || !question || !dbSessionId) {
      return;
    }

    try {
      this.isProcessing.set(true);

      // Create database response with audio reference and question data for historical accuracy
      const dbResponse = await this.sessionService.createResponse({
        sessionId: dbSessionId,
        questionId: parseInt(question.id),
        questionOrder: session.currentQuestionIndex + 1,
        questionText: question.question,
        questionAnswer: question.answer,
        questionExample: question.example,
        questionDifficulty: question.difficulty,
        answer: 'Audio answer submitted', // Placeholder text
        audioUrl: this.audioUrl || undefined,
        timeSpentSeconds: this.recordingDuration()
      });

      console.log('Database response created:', dbResponse);

      // Create UI response for session tracking
      const uiResponse: InterviewResponse = {
        id: this.generateId(),
        questionId: question.id,
        question: question.question,
        userAnswer: 'Audio answer submitted',
        audioBlob: this.audioBlob || undefined,
        audioUrl: this.audioUrl || undefined,
        skipped: false,
        startTime: new Date(),
        endTime: new Date(),
        duration: this.recordingDuration()
      };

      // Add response to UI session
      this.currentSession.update(current => {
        if (!current) return current;
        return {
          ...current,
          responses: [...current.responses, uiResponse]
        };
      });

      // Update session progress in database
      await this.sessionService.updateSessionProgress(
        dbSessionId, 
        session.responses.length + 1
      );

      // Send audio to backend for async evaluation (fire and forget)
      if (this.settings().enableAIAnalysis && this.audioBlob) {
        this.sendAudioForEvaluation(dbResponse.id, question).catch(error => {
          console.warn('Background evaluation submission failed:', error);
        });
      }

      // Clean up form state and proceed immediately
      this.resetAnswerState();

      // Always proceed to next question immediately (async interview flow)
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

  private async sendAudioForEvaluation(responseId: string, question: Question) {
    try {
      if (!this.audioBlob) {
        console.warn('No audio blob available for evaluation');
        return;
      }

      console.log('Sending audio for evaluation - response ID:', responseId);
      
      // Convert audio to base64
      const audioBase64 = await this.convertBlobToBase64(this.audioBlob);
      
      // Send audio evaluation request to backend (fire and forget)
      await this.evaluatorService.evaluateAudioAnswer({
        question: question.question,
        role: 'FRONTEND',
        proficiencyLevel: 'MID',
        questionType: 'TECHNICAL',
        context: `Technology: ${this.settings().category}, Difficulty: ${this.settings().difficulty}`,
        audioData: audioBase64,
        referenceAnswer: question.answer, // Include reference answer from database
        example: question.example // Include example from database if available
      }).then(async (audioEvaluation) => {
        // Update the database with evaluation results when ready
        await this.sessionService.updateResponseEvaluation(responseId, {
          overallScore: audioEvaluation.overallScore || 0,
          maxScore: audioEvaluation.maxScore || 100,
          percentage: audioEvaluation.percentage || 0,
          detailedFeedback: audioEvaluation.detailedFeedback || '',
          recommendation: audioEvaluation.recommendation || 'Keep practicing!',
          technicalAccuracy: audioEvaluation.criteria?.technicalAccuracy || 0,
          clarity: audioEvaluation.criteria?.clarity || 0,
          completeness: audioEvaluation.criteria?.completeness || 0,
          problemSolving: audioEvaluation.criteria?.problemSolving || 0,
          communication: audioEvaluation.criteria?.communication || 0,
          bestPractices: audioEvaluation.criteria?.bestPractices || 0,
          strengths: audioEvaluation.strengths || [],
          improvements: audioEvaluation.improvements || [],
          nextSteps: audioEvaluation.nextSteps || [],
          criteriaFeedback: audioEvaluation.criteriaFeedback || {},
          transcription: audioEvaluation.transcription
        });
        console.log('Evaluation completed and stored for response:', responseId);
      });

    } catch (error) {
      console.error('Failed to send audio for evaluation:', error);
      // Don't throw - this is a background operation
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

  private async startRecording() {
    if (!this.env.isFeatureEnabled('audioRecording')) {
      this.errorMessage.set('Audio recording is not available in this environment.');
      return;
    }
    
    try {
      // Clear any previous errors
      this.errorMessage.set('');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Reset previous recording data
      this.audioChunks = [];
      this.audioBlob = null;
      this.audioUrl = null;
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Handle recording stop event
      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio();
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.hasRecording.set(false);
      this.recordingTime.set(0);
      
      // Start recording timer
      this.recordingTimeTimer = setInterval(() => {
        this.recordingTime.update(time => time + 1);
      }, 1000);
      
      // Auto-stop after 5 minutes
      this.recordingTimer = setTimeout(() => {
        if (this.isRecording()) {
          this.stopRecording();
        }
      }, 300000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording.set(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.errorMessage.set('Microphone access denied. Please allow microphone permissions and try again.');
        } else if (error.name === 'NotFoundError') {
          this.errorMessage.set('No microphone found. Please connect a microphone and try again.');
        } else {
          this.errorMessage.set('Failed to access microphone: ' + error.message);
        }
      } else {
        this.errorMessage.set('Failed to start recording. Please try again.');
      }
    }
  }

  private stopRecording() {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    if (this.recordingTimeTimer) {
      clearInterval(this.recordingTimeTimer);
      this.recordingTimeTimer = null;
    }

    this.isRecording.set(false);
    
    // Stop MediaRecorder if active
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  private processRecordedAudio() {
    if (this.audioChunks.length === 0) {
      console.warn('No audio chunks to process');
      return;
    }
    
    // Create blob from audio chunks
    this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioUrl = URL.createObjectURL(this.audioBlob);
    
    // Set recording duration
    this.recordingDuration.set(this.recordingTime());
    
    // Mark as having recording
    this.hasRecording.set(true);
    
    // Create audio element for playback
    this.audioElement = new Audio(this.audioUrl);
    this.audioElement.addEventListener('ended', () => {
      this.isPlaying.set(false);
    });
    
    // No transcription needed - audio will be evaluated in backend
    console.log('Audio recorded successfully, ready for submission');
  }


  private resetAnswerState() {
    // Reset text answer
    this.currentAnswer.set('');
    
    // Reset audio recording state
    this.isRecording.set(false);
    this.hasRecording.set(false);
    this.recordingTime.set(0);
    this.recordingDuration.set(0);
    this.isPlaying.set(false);
    
    // Clean up MediaRecorder
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }
    
    // Clean up audio resources
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    
    this.audioBlob = null;
    this.audioChunks = [];
    
    // Reset to audio mode (interview is voice-only)
    this.answerMode.set('audio');
  }


  togglePlayback() {
    if (!this.audioElement) {
      console.warn('No audio element available');
      return;
    }
    
    if (this.isPlaying()) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying.set(false);
    } else {
      // Add error handling for playback
      this.audioElement.play().catch(error => {
        console.error('Audio playback failed:', error);
        this.isPlaying.set(false);
        this.errorMessage.set('Failed to play audio recording.');
      });
      this.isPlaying.set(true);
    }
  }

  endInterview() {
    this.showEndDialog.set(false);
    this.completeInterview();
  }

  private async completeInterview() {
    const session = this.currentSession();
    const dbSessionId = this.currentDbSessionId();
    
    if (!session) return;

    try {
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

      // Complete the database session if exists
      if (dbSessionId) {
        const sessionTime = this.sessionTime();
        await this.sessionService.completeSession(dbSessionId, {
          totalScore: totalScore,
          maxScore: responses.length * 100, // Assuming 100 max per question
          durationSeconds: sessionTime
        });
        console.log('Database session completed successfully');
      }

      this.sessionResult.set(result);
      this.currentStep.set('results');

    } catch (error) {
      console.error('Failed to complete interview session:', error);
      // Still show results even if database update fails
      const responses = session.responses.filter(r => !r.skipped);
      const totalScore = responses.reduce((sum, r) => sum + (r.aiAnalysis?.score || 0), 0);
      const overallScore = responses.length > 0 ? Math.round(totalScore / responses.length) : 0;

      const result: InterviewResult = {
        overallScore,
        totalQuestions: session.questions.length,
        answeredQuestions: responses.length,
        skippedQuestions: session.responses.filter(r => r.skipped).length,
        averageResponseTime: 0,
        strengthAreas: this.extractStrengths(responses),
        improvementAreas: this.extractImprovements(responses),
        recommendations: this.generateRecommendations(responses),
        categoryBreakdown: []
      };

      this.sessionResult.set(result);
      this.currentStep.set('results');
    }
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
    this.currentDbSessionId.set(null);
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

  private async convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract only the base64 part, removing the "data:audio/webm;base64," prefix
        const base64 = result.split(',')[1];
        
        // Debug: Check the original blob and base64
        console.log('=== FRONTEND - AUDIO CONVERSION DEBUG ===');
        console.log('Original blob type:', blob.type);
        console.log('Original blob size:', blob.size);
        console.log('Base64 length:', base64.length);
        
        // Check first few characters of base64 to verify it starts correctly
        console.log('Base64 starts with:', base64.substring(0, 20));
        
        // Decode the first few bytes to check WebM magic bytes
        const firstBytes = atob(base64.substring(0, 8)); // Decode first ~6 bytes
        const magicBytes: number[] = [];
        for (let i = 0; i < Math.min(4, firstBytes.length); i++) {
          magicBytes.push(firstBytes.charCodeAt(i));
        }
        console.log('Decoded magic bytes:', magicBytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', '));
        
        // Check if this is a valid WebM file (0x1A, 0x45, 0xDF, 0xA3)
        const webmMagic = [0x1A, 0x45, 0xDF, 0xA3];
        const isValidWebM = webmMagic.every((byte, index) => magicBytes[index] === byte);
        console.log('Is valid WebM in frontend:', isValidWebM);
        
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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


  // Utility methods
  formatMarkdown(markdown: string): string {
    // Basic markdown to HTML conversion
    return markdown
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/### ([^\n]+)/g, '<h3>$1</h3>')
      .replace(/## ([^\n]+)/g, '<h2>$1</h2>')
      .replace(/# ([^\n]+)/g, '<h1>$1</h1>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\|([^|]+)\|/g, (match, content) => {
        // Simple table row conversion
        const cells = content.split('|').map((cell: string) => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      });
  }

  // Navigation methods
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  viewDetailedResults() {
    // Navigate to Interview History page with session filter
    const sessionId = this.currentDbSessionId();
    if (sessionId) {
      this.router.navigate(['/interview-history', sessionId]);
    } else {
      // Fallback to practice history tab
      this.router.navigate(['/interview'], { fragment: 'history' });
    }
  }

  goToProgress() {
    this.router.navigate(['/progress']);
  }

  // Navigation methods
  navigateToHistory() {
    this.router.navigate(['/interview-history']);
  }

}