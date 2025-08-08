import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { firstValueFrom } from 'rxjs';
import { EnvironmentService } from '../../core/services/environment.service';
import { DebugService } from '../../core/services/debug.service';

interface RecordingResult {
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  mimeType: string;
}

interface TranscriptionInfo {
  text: string;
  confidence: number;
  duration: number;
  language?: string;
}

interface EvaluationResult {
  overallScore: number;
  maxScore: number;
  percentage: number;
  recommendation: 'PASS' | 'CONDITIONAL' | 'FAIL';
  transcription: string;
  criteria: Record<string, number>;
  criteriaFeedback?: Record<string, string>;
  applicableCriteria: string[];
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  nextSteps: string[];
  audioAnalysis?: {
    readingAnomalies?: {
      isLikelyReading: boolean;
      naturalityScore: number;
      explanation: string;
      readingIndicators: string[];
    };
  };
}

interface SampleQuestion {
  question: string;
  role: string;
  level: string;
  roleValue: string;
  levelValue: string;
}

@Component({
  selector: 'app-evaluator',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ProgressBarModule,
    TagModule,
    MessageModule,
    DividerModule
  ],
  templateUrl: './evaluator.component.html',
  styleUrl: './evaluator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluatorComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  protected env = inject(EnvironmentService);
  private debug = inject(DebugService);

  // Form and state management
  evaluationForm: FormGroup;
  isLoading = signal(false);
  error = signal<string | null>(null);
  evaluationResult = signal<EvaluationResult | null>(null);
  apiStatus = signal<string>('Checking...');
  
  // Audio recording state
  lastTranscription = signal<TranscriptionInfo | null>(null);
  lastRecording = signal<RecordingResult | null>(null);
  isRecording = signal(false);
  isProcessing = signal(false);
  processingStatus = signal('');
  recordingDuration = signal(0);
  isPlaying = signal(false);
  playbackDuration = signal(0);

  // Private audio handling
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any = null;
  private audioElement: HTMLAudioElement | null = null;

  // Dropdown options
  readonly roleOptions = [
    { label: '🖥️ Frontend Developer', value: 'frontend' },
    { label: '⚙️ Backend Developer', value: 'backend' },
    { label: '🔄 Full-stack Developer', value: 'fullstack' },
    { label: '🚀 DevOps Engineer', value: 'devops' },
    { label: '📱 Mobile Developer', value: 'mobile' },
    { label: '📊 Data Scientist', value: 'data-science' },
    { label: '🧪 QA Engineer', value: 'qa' }
  ];

  readonly proficiencyOptions = [
    { label: '🌱 Junior (0-2 years)', value: 'junior' },
    { label: '🌿 Mid-level (2-5 years)', value: 'mid' },
    { label: '🌳 Senior (5-8+ years)', value: 'senior' },
    { label: '🎯 Tech Lead (8+ years)', value: 'lead' }
  ];

  readonly questionTypeOptions = [
    { label: '💻 Technical', value: 'technical' },
    { label: '👥 Behavioral', value: 'behavioral' },
    { label: '🏗️ System Design', value: 'system-design' },
    { label: '⚡ Coding', value: 'coding' }
  ];

  readonly sampleQuestions: SampleQuestion[] = [
    {
      question: 'What is the difference between React hooks and class components?',
      role: 'Frontend',
      level: 'Mid',
      roleValue: 'frontend',
      levelValue: 'mid',
    },
    {
      question: 'Explain the difference between SQL and NoSQL databases. When would you use each?',
      role: 'Backend',
      level: 'Senior', 
      roleValue: 'backend',
      levelValue: 'senior',
    },
    {
      question: 'How would you optimize the performance of a slow-loading web application?',
      role: 'Full-stack',
      level: 'Senior',
      roleValue: 'fullstack',
      levelValue: 'senior',
    },
    {
      question: 'Describe a challenging bug you faced and how you resolved it.',
      role: 'All',
      level: 'Mid',
      roleValue: 'fullstack',
      levelValue: 'mid',
    },
  ];

  // Computed properties
  apiStatusSeverity = computed(() => {
    const status = this.apiStatus();
    if (status.includes('Connected')) return 'success';
    if (status.includes('Error')) return 'danger';
    return 'warn';
  });

  canEvaluate = computed(() => {
    return this.evaluationForm.valid && 
           this.lastRecording() && 
           !this.isLoading() && 
           !this.isProcessing() &&
           this.env.isFeatureEnabled('aiAnalysis');
  });

  canRecord = computed(() => {
    return this.env.isFeatureEnabled('audioRecording') && !this.isProcessing();
  });

  criteriaArray = computed(() => {
    const result = this.evaluationResult();
    if (!result) return [];

    const applicableCriteria = result.applicableCriteria || Object.keys(result.criteria);
    
    return Object.entries(result.criteria)
      .filter(([key, value]) => 
        applicableCriteria.includes(key) && (value as number) > 0
      )
      .map(([key, value]) => ({
        key,
        value: value as number,
        name: this.formatCriterionName(key),
        feedback: result.criteriaFeedback?.[key] || null
      }));
  });

  constructor() {
    this.evaluationForm = this.fb.group({
      question: ['', [Validators.required, Validators.minLength(10)]],
      role: ['frontend', [Validators.required]],
      proficiencyLevel: ['mid', [Validators.required]],
      questionType: ['technical'],
      context: [''],
    });

    if (!this.env.production) {
      this.debug.logFeatureUsage('evaluator', true);
    }
  }

  async ngOnInit() {
    await this.checkApiStatus();
  }

  ngOnDestroy() {
    this.stopPlayback();
    
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  private async checkApiStatus() {
    if (!this.env.isFeatureEnabled('aiAnalysis')) {
      this.apiStatus.set('❌ AI Analysis Disabled');
      return;
    }

    try {
      await firstValueFrom(
        this.http.get(this.env.getEvaluatorEndpoint('/health'))
      );
      this.apiStatus.set('✅ API Connected');
    } catch (error) {
      this.apiStatus.set('❌ API Error');
      this.debug.error('Evaluator API health check failed', error);
    }
  }

  async startRecording(): Promise<void> {
    if (!this.canRecord()) {
      this.error.set('Audio recording is not available');
      return;
    }

    try {
      const startTime = performance.now();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.lastRecording.set({
          audioBlob,
          audioUrl,
          duration: this.recordingDuration(),
          mimeType: 'audio/webm'
        });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        this.debug.logPerformance('Audio Recording', startTime);
      };
      
      this.mediaRecorder.start(100);
      this.isRecording.set(true);
      this.recordingDuration.set(0);
      
      // Start timer
      this.recordingTimer = setInterval(() => {
        this.recordingDuration.set(this.recordingDuration() + 1);
        
        // Auto-stop after environment limit
        if (this.recordingDuration() >= 300) { // 5 minutes max
          this.stopRecording();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.error.set('Failed to access microphone. Please check permissions.');
      setTimeout(() => this.error.set(null), 5000);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
    }
  }

  async processRecording(): Promise<void> {
    const recording = this.lastRecording();
    if (!recording) return;
    
    this.isProcessing.set(true);
    this.processingStatus.set('Transcribing audio...');
    
    try {
      const audioFile = new File([recording.audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      const transcription = await firstValueFrom(
        this.http.post<TranscriptionInfo>(this.env.getEvaluatorEndpoint('/transcribe'), 
          { audio: audioFile }
        )
      );
      
      this.lastTranscription.set(transcription);
      this.processingStatus.set('Audio transcribed successfully!');
      
      setTimeout(() => {
        this.isProcessing.set(false);
        this.processingStatus.set('');
      }, 1000);
      
    } catch (error: any) {
      console.error('Failed to process recording:', error);
      this.error.set(error.message || 'Failed to process recording');
      this.isProcessing.set(false);
      this.processingStatus.set('');
      setTimeout(() => this.error.set(null), 5000);
    }
  }

  async evaluateAudioRecording() {
    if (!this.canEvaluate()) return;

    const recording = this.lastRecording();
    if (!recording) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.evaluationResult.set(null);

    try {
      const startTime = performance.now();
      const formData = this.evaluationForm.value;
      const audioFile = new File([recording.audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('audio', audioFile);
      uploadData.append('question', formData.question);
      uploadData.append('role', formData.role);
      uploadData.append('proficiencyLevel', formData.proficiencyLevel);
      uploadData.append('questionType', formData.questionType);
      uploadData.append('context', formData.context || '');
      
      const result = await firstValueFrom(
        this.http.post<EvaluationResult>(this.env.getEvaluatorEndpoint('/evaluate-audio'), uploadData)
      );
      
      this.evaluationResult.set(result);
      this.debug.logPerformance('Audio Evaluation', startTime);
      
    } catch (error: any) {
      this.error.set(error.message || 'Failed to evaluate answer. Please check if the API service is running.');
      this.debug.error('Audio evaluation failed', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  useSampleQuestion(sample: SampleQuestion) {
    this.evaluationForm.patchValue({
      question: sample.question,
      role: sample.roleValue,
      proficiencyLevel: sample.levelValue,
      questionType: 'technical',
      context: 'Interview practice',
    });
  }

  togglePlayback(): void {
    const recording = this.lastRecording();
    if (!recording) return;

    if (this.isPlaying()) {
      this.stopPlayback();
    } else {
      this.startPlayback(recording);
    }
  }

  private startPlayback(recording: RecordingResult): void {
    this.stopPlayback();

    this.audioElement = new Audio(recording.audioUrl);
    this.audioElement.onloadedmetadata = () => {
      this.playbackDuration.set(0);
      this.isPlaying.set(true);
    };

    this.audioElement.onended = () => {
      this.stopPlayback();
    };

    this.audioElement.onerror = (error) => {
      console.error('Audio playback error:', error);
      this.error.set('Failed to play audio recording');
      this.stopPlayback();
      setTimeout(() => this.error.set(null), 3000);
    };

    this.audioElement.ontimeupdate = () => {
      if (this.audioElement) {
        this.playbackDuration.set(Math.floor(this.audioElement.currentTime));
      }
    };

    this.audioElement.play().catch(error => {
      console.error('Failed to start audio playback:', error);
      this.error.set('Failed to start audio playback');
      this.stopPlayback();
      setTimeout(() => this.error.set(null), 3000);
    });
  }

  private stopPlayback(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }

    this.isPlaying.set(false);
    this.playbackDuration.set(0);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatCriterionName(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').trim();
  }

  getScoreColor(percentage: number): string {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getScoreBarColor(score: number): string {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  }

  getScorePercentage(score: number): number {
    return Math.min(score * 10, 100);
  }

  getRecommendationSeverity(recommendation: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (recommendation) {
      case 'PASS': return 'success';
      case 'CONDITIONAL': return 'warn';
      case 'FAIL': return 'danger';
      default: return 'info';
    }
  }

  getTranscriptionWordCount(): number {
    const transcription = this.lastTranscription();
    return transcription ? transcription.text.trim().split(/\s+/).length : 0;
  }

  // Reading detection methods
  isReadingDetected(): boolean {
    const result = this.evaluationResult();
    return !!(result as any)?.audioAnalysis?.readingAnomalies?.isLikelyReading;
  }

  getReadingScore(): number {
    const result = this.evaluationResult();
    return (result as any)?.audioAnalysis?.readingAnomalies?.naturalityScore || 10;
  }

  getReadingExplanation(): string {
    const result = this.evaluationResult();
    return (result as any)?.audioAnalysis?.readingAnomalies?.explanation || 'Natural speech detected';
  }

  getReadingIndicators(): string[] {
    const result = this.evaluationResult();
    return (result as any)?.audioAnalysis?.readingAnomalies?.readingIndicators || [];
  }

  hasAudioAnalysis(): boolean {
    const result = this.evaluationResult();
    return !!(result as any)?.audioAnalysis;
  }

  getReadingAnalysisSeverity(): 'success' | 'warn' | 'danger' {
    if (this.isReadingDetected()) return 'danger';
    return 'success';
  }

  getReadingScoreSeverity(): 'success' | 'warn' | 'danger' {
    const score = this.getReadingScore();
    if (score <= 3) return 'danger';
    if (score <= 6) return 'warn';
    return 'success';
  }

  getImprovementSeverity(improvement: string): 'warn' | 'danger' {
    if (improvement.includes('🚨 READING DETECTED') || 
        improvement.includes('reading from a script') ||
        improvement.includes('READING BEHAVIOR')) {
      return 'danger';
    }
    return 'warn';
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}