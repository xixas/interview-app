import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FluidModule } from 'primeng/fluid';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ToolbarModule } from 'primeng/toolbar';
import { EvaluatorIpcService } from '../../core/services/evaluator-ipc.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { EnvironmentService } from '../../core/services/environment.service';
import { 
  EvaluationResult, 
  AudioEvaluationResult,
  ProficiencyLevel, 
  Role, 
  QuestionType 
} from '@interview-app/shared-interfaces';

@Component({
    selector: 'app-evaluator',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        FluidModule,
        CardModule,
        ButtonModule,
        TextareaModule,
        ProgressBarModule,
        TagModule,
        DividerModule,
        TooltipModule,
        SelectModule,
        MessageModule,
        SkeletonModule,
        ToolbarModule,
        PageHeaderComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './evaluator.component.html',
    styleUrls: ['./evaluator.component.scss']
})
export class EvaluatorComponent implements OnInit, OnDestroy {
    private readonly evaluatorIpc = inject(EvaluatorIpcService);
    private readonly env = inject(EnvironmentService);

    // Form state
    answer = '';
    interviewQuestion = '';
    selectedRole: Role | null = null;
    selectedLevel: ProficiencyLevel | null = null;

    // Audio recording state
    isRecording = signal(false);
    recordedAudio = signal<Blob | null>(null);
    recordingDuration = signal(0);
    audioDuration = signal(0);
    isPlayingAudio = signal(false);
    
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private audioUrl: string | null = null;
    private recordingTimer: any = null;
    private recordingStartTime = 0;
    private currentAudio: HTMLAudioElement | null = null;

    // Component state
    isEvaluating = signal(false);
    evaluation = signal<EvaluationResult | AudioEvaluationResult | null>(null);
    errorMessage = signal('');
    serviceStatus = signal<'available' | 'unavailable' | 'checking'>('checking');
    isCheckingService = signal(false);
    retryCount = signal(0);

    // Dropdown options
    roleOptions = [
        { label: 'Frontend Developer', value: Role.FRONTEND },
        { label: 'Backend Developer', value: Role.BACKEND },
        { label: 'Full Stack Developer', value: Role.FULLSTACK },
        { label: 'DevOps Engineer', value: Role.DEVOPS },
        { label: 'Mobile Developer', value: Role.MOBILE },
        { label: 'Data Scientist', value: Role.DATA_SCIENCE },
        { label: 'QA Engineer', value: Role.QA }
    ];

    levelOptions = [
        { label: 'Junior (0-2 years)', value: ProficiencyLevel.JUNIOR },
        { label: 'Mid-level (2-5 years)', value: ProficiencyLevel.MID },
        { label: 'Senior (5+ years)', value: ProficiencyLevel.SENIOR },
        { label: 'Lead/Principal (8+ years)', value: ProficiencyLevel.LEAD }
    ];

    ngOnInit() {
        this.checkServiceHealth();
    }

    ngOnDestroy() {
        this.cleanupRecording();
        if (this.audioUrl) {
            URL.revokeObjectURL(this.audioUrl);
        }
    }

    canEvaluate(): boolean {
        const hasQuestion = this.interviewQuestion.trim().length > 0;
        const hasAudioAnswer = this.recordedAudio() !== null;
        return hasQuestion && hasAudioAnswer && !!this.selectedRole && !!this.selectedLevel;
    }

    getWordCount(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    async checkServiceHealth() {
        this.isCheckingService.set(true);
        this.serviceStatus.set('checking');
        
        try {
            // Check if running in Electron environment
            if (!this.evaluatorIpc.isElectronAvailable()) {
                throw new Error('Desktop mode is required. Please run the Electron application.');
            }

            // Use IPC API key validation as health check
            const validationResult = await this.evaluatorIpc.validateApiKey();
            
            if (validationResult.valid) {
                this.serviceStatus.set('available');
                this.errorMessage.set('');
            } else {
                this.serviceStatus.set('unavailable');
                this.errorMessage.set(validationResult.message || 'API key validation failed. Please check your configuration.');
            }
        } catch (error: any) {
            this.serviceStatus.set('unavailable');
            this.errorMessage.set(error.message || 'Service unavailable. Please ensure you are running the desktop application.');
        } finally {
            this.isCheckingService.set(false);
        }
    }



    resetForm() {
        this.answer = '';
        this.interviewQuestion = '';
        this.selectedRole = null;
        this.selectedLevel = null;
        this.evaluation.set(null);
        this.errorMessage.set('');
        this.clearRecording();
    }


    async evaluateAnswer() {
        if (!this.canEvaluate()) {
            this.errorMessage.set('Please ensure you have a valid audio recording and all required fields are filled.');
            return;
        }

        const recordedAudio = this.recordedAudio();
        if (!recordedAudio) {
            this.errorMessage.set('Cannot evaluate: No audio recording found. Please record your answer first.');
            return;
        }

        // Convert Blob to File for proper API compatibility
        const audioFile = new File([recordedAudio], 'audio-recording.webm', {
            type: recordedAudio.type || 'audio/webm'
        });

        this.isEvaluating.set(true);
        this.errorMessage.set('');
        this.evaluation.set(null);

        try {
            // Check if service is available before attempting evaluation
            if (this.serviceStatus() === 'unavailable') {
                throw new Error('Evaluation service is not available. Please check your configuration.');
            }

            const request = {
                question: this.interviewQuestion,
                role: this.selectedRole as Role,
                proficiencyLevel: this.selectedLevel as ProficiencyLevel,
                questionType: QuestionType.TECHNICAL, // Default to technical
                context: undefined, // Optional context
                audioFile: audioFile
            };

            console.log('Sending audio evaluation request with:', {
                question: request.question,
                role: request.role,
                proficiencyLevel: request.proficiencyLevel,
                questionType: request.questionType,
                audioFile: `${audioFile.name} (${audioFile.size} bytes)`
            });

            // Convert audio file to base64 for IPC transmission
            const audioData = await this.audioFileToBase64(audioFile);
            
            // Use IPC service instead of direct HTTP
            const ipcRequest = {
                question: request.question,
                role: request.role,
                proficiencyLevel: request.proficiencyLevel,
                questionType: request.questionType,
                context: request.context,
                audioData: audioData
            };
            
            const result = await this.evaluatorIpc.evaluateAudioAnswer(ipcRequest);
            this.retryCount.set(0); // Reset retry count on success
            
            if (result) {
                console.log('Audio evaluation completed:', result);
                this.evaluation.set(result);
            } else {
                throw new Error('No evaluation result received');
            }
        } catch (error: any) {
            console.error('Audio evaluation failed:', error);
            
            // Provide specific error messages based on error type
            if (error.status === 0) {
                this.errorMessage.set('Cannot connect to evaluation service. Please ensure the evaluator service is running on port 3001.');
            } else if (error.status === 401) {
                this.errorMessage.set('OpenAI API key is not configured or invalid. Please check your API key configuration in the evaluator service.');
            } else if (error.status === 429) {
                this.errorMessage.set('API rate limit exceeded. Please wait a moment before trying again.');
            } else if (error.status === 413) {
                this.errorMessage.set('Audio file is too large. Please record a shorter answer or check the service configuration.');
            } else if (error.status === 400) {
                this.errorMessage.set('Invalid request format. Please ensure all required fields are filled correctly.');
            } else if (error.status === 500) {
                this.errorMessage.set('Internal server error. Please check the evaluator service logs and ensure your OpenAI API key is valid.');
            } else if (error.status >= 500) {
                this.errorMessage.set('Server error. The evaluation service is temporarily unavailable. Please try again later.');
            } else {
                this.errorMessage.set(`Audio evaluation failed: ${error.message || 'Unknown error occurred. Please try again.'}`);
            }
            
            // Increment retry count for potential auto-retry logic
            this.retryCount.update(count => count + 1);
        } finally {
            this.isEvaluating.set(false);
        }
    }

    // Audio Recording Methods
    toggleRecording() {
        if (this.isRecording()) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    async startRecording() {
        if (!this.env.isFeatureEnabled('audioRecording')) {
            this.errorMessage.set('Audio recording is not available in this environment.');
            return;
        }

        try {
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
            this.recordedAudio.set(null);
            this.recordingDuration.set(0);
            if (this.audioUrl) {
                URL.revokeObjectURL(this.audioUrl);
                this.audioUrl = null;
            }

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

            // Handle recording stop
            this.mediaRecorder.onstop = () => {
                this.processRecordedAudio();
                stream.getTracks().forEach(track => track.stop());
            };

            // Start recording
            this.mediaRecorder.start();
            this.isRecording.set(true);
            this.recordingStartTime = Date.now();

            // Start duration timer
            this.recordingTimer = setInterval(() => {
                const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                this.recordingDuration.set(duration);
            }, 100);

            // Auto-stop after 5 minutes
            setTimeout(() => {
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

    stopRecording() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        this.isRecording.set(false);

        // Stop MediaRecorder if active
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
    }

    private processRecordedAudio() {
        if (this.audioChunks.length === 0) {
            this.errorMessage.set('No audio data recorded. Please try again.');
            return;
        }

        // Create audio blob
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.recordedAudio.set(audioBlob);
        this.audioUrl = URL.createObjectURL(audioBlob);

        // Calculate audio duration (approximate from recording time)
        const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        this.audioDuration.set(duration);

        // Audio recording complete - ready for evaluation
        console.log('Audio recording completed, ready for evaluation');
    }


    togglePlayback() {
        if (this.isPlayingAudio()) {
            this.pauseRecording();
        } else {
            this.playRecording();
        }
    }

    playRecording() {
        if (this.audioUrl) {
            // Stop any currently playing audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            }

            this.currentAudio = new Audio(this.audioUrl);
            this.currentAudio.addEventListener('ended', () => {
                this.isPlayingAudio.set(false);
                this.currentAudio = null;
            });

            this.currentAudio.addEventListener('error', () => {
                console.error('Failed to play audio');
                this.errorMessage.set('Failed to play audio recording.');
                this.isPlayingAudio.set(false);
                this.currentAudio = null;
            });

            this.currentAudio.play().then(() => {
                this.isPlayingAudio.set(true);
            }).catch(error => {
                console.error('Failed to play audio:', error);
                this.errorMessage.set('Failed to play audio recording.');
                this.isPlayingAudio.set(false);
                this.currentAudio = null;
            });
        }
    }

    pauseRecording() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.isPlayingAudio.set(false);
        }
    }

    clearRecording() {
        this.cleanupRecording();
        this.recordedAudio.set(null);
        this.recordingDuration.set(0);
        this.audioDuration.set(0);
        this.isPlayingAudio.set(false);
        
        // Stop any playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        if (this.audioUrl) {
            URL.revokeObjectURL(this.audioUrl);
            this.audioUrl = null;
        }
    }

    private cleanupRecording() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        this.isRecording.set(false);

        if (this.mediaRecorder) {
            if (this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
            this.mediaRecorder = null;
        }
        this.audioChunks = [];
    }

    formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getCriteriaItems() {
        const evaluation = this.evaluation();
        if (!evaluation) return [];

        const criteriaLabels = {
            technicalAccuracy: 'Technical Accuracy',
            clarity: 'Clarity & Structure',
            completeness: 'Completeness',
            problemSolving: 'Problem Solving',
            communication: 'Communication',
            bestPractices: 'Best Practices'
        };

        return Object.entries(evaluation.criteria)
            .filter(([_, score]) => score > 0)
            .map(([key, score]) => ({
                key,
                label: criteriaLabels[key as keyof typeof criteriaLabels] || key,
                score
            }));
    }

    retryEvaluation() {
        if (this.retryCount() < 3) { // Allow up to 3 retries
            this.errorMessage.set('');
            this.evaluateAnswer();
        } else {
            this.errorMessage.set('Maximum retry attempts reached. Please check your configuration and try again later.');
        }
    }

    refreshService() {
        this.errorMessage.set('');
        this.retryCount.set(0);
        this.checkServiceHealth();
    }


    canRetry(): boolean {
        return this.retryCount() > 0 && this.retryCount() < 3 && !this.isEvaluating();
    }

    getScoreSeverity(score: number): string {
        if (score >= 85) return 'success';
        if (score >= 70) return 'info'; 
        if (score >= 60) return 'warn';
        return 'danger';
    }

    getRecommendationSeverity(recommendation: string): string {
        switch (recommendation) {
            case 'PASS': return 'success';
            case 'CONDITIONAL': return 'warn';
            case 'FAIL': return 'danger';
            default: return 'info';
        }
    }

    private async audioFileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result && typeof reader.result === 'string') {
                    // Remove the data URL prefix to get just the base64 content
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Failed to read audio file'));
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }
}