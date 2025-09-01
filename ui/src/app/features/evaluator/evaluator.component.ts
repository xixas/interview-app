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
                // Ensure percentage is calculated correctly
                const processedResult = {
                    ...result,
                    percentage: result.percentage || Math.round((result.overallScore / result.maxScore) * 100)
                };
                
                this.evaluation.set(processedResult);
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
        if (!evaluation || !evaluation.criteria) return [];

        const criteriaConfig = {
            technicalAccuracy: { 
                label: 'Technical Accuracy', 
                icon: 'pi-check-circle', 
                group: 'technical',
                description: 'Correctness of technical information'
            },
            clarity: { 
                label: 'Clarity & Structure', 
                icon: 'pi-eye', 
                group: 'technical',
                description: 'How well structured and clear the answer is'
            },
            completeness: { 
                label: 'Completeness', 
                icon: 'pi-list-check', 
                group: 'technical',
                description: 'Coverage of all key points'
            },
            problemSolving: { 
                label: 'Problem Solving', 
                icon: 'pi-cog', 
                group: 'technical',
                description: 'Analytical thinking and approach'
            },
            communication: { 
                label: 'Communication', 
                icon: 'pi-comments', 
                group: 'communication',
                description: 'Professional communication skills'
            },
            bestPractices: { 
                label: 'Best Practices', 
                icon: 'pi-star', 
                group: 'technical',
                description: 'Knowledge of industry standards'
            },
            speakingPace: { 
                label: 'Speaking Pace', 
                icon: 'pi-clock', 
                group: 'audio',
                description: 'Appropriate speaking speed'
            },
            confidence: { 
                label: 'Confidence Level', 
                icon: 'pi-thumbs-up', 
                group: 'audio',
                description: 'Confidence in delivery'
            },
            articulation: { 
                label: 'Articulation', 
                icon: 'pi-volume-up', 
                group: 'audio',
                description: 'Clarity of speech'
            },
            professionalPresence: { 
                label: 'Professional Presence', 
                icon: 'pi-user', 
                group: 'audio',
                description: 'Professional demeanor and presence'
            }
        };

        return Object.entries(evaluation.criteria)
            .filter(([_, score]) => score !== undefined && score > 0)
            .map(([key, score]) => ({
                key,
                ...criteriaConfig[key as keyof typeof criteriaConfig],
                score: Number(score)
            }))
            .sort((a, b) => {
                // Sort by group first (technical, communication, audio), then by score
                const groupOrder = { technical: 0, communication: 1, audio: 2 };
                const groupA = groupOrder[a.group as keyof typeof groupOrder] ?? 3;
                const groupB = groupOrder[b.group as keyof typeof groupOrder] ?? 3;
                
                if (groupA !== groupB) return groupA - groupB;
                return b.score - a.score; // Within group, sort by score descending
            });
    }

    getGroupedCriteria() {
        const items = this.getCriteriaItems();
        const groups = {
            technical: items.filter(item => item.group === 'technical'),
            communication: items.filter(item => item.group === 'communication'), 
            audio: items.filter(item => item.group === 'audio')
        };
        return groups;
    }

    getCriteriaGroups() {
        const items = this.getCriteriaItems();
        
        const groupConfig = {
            technical: {
                name: 'Technical Knowledge',
                icon: 'pi pi-cog text-blue-600',
                criteria: items.filter(item => item.group === 'technical')
            },
            communication: {
                name: 'Communication Skills',
                icon: 'pi pi-comments text-purple-600',
                criteria: items.filter(item => item.group === 'communication')
            },
            audio: {
                name: 'Speech & Delivery',
                icon: 'pi pi-microphone text-green-600',
                criteria: items.filter(item => item.group === 'audio')
            }
        };

        // Return only groups that have criteria
        return Object.values(groupConfig).filter(group => group.criteria.length > 0);
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

    // Type guard to check if evaluation is AudioEvaluationResult
    isAudioEvaluation(evaluation: EvaluationResult | AudioEvaluationResult | null): evaluation is AudioEvaluationResult {
        return evaluation !== null && 'audioAnalysis' in evaluation && evaluation.audioAnalysis !== undefined;
    }

    // Get audio evaluation if available (for template use)
    get audioEvaluation(): AudioEvaluationResult | null {
        const eval_ = this.evaluation();
        return this.isAudioEvaluation(eval_) ? eval_ : null;
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
            case 'NO DECISION': return 'secondary';
            default: return 'info';
        }
    }

    getScoreBackgroundClass(percentage: number): string {
        if (percentage >= 70) return 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800';
        if (percentage >= 40) return 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800';
        return 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800';
    }

    getScoreColorClass(percentage: number): string {
        if (percentage >= 70) return 'text-green-500';
        if (percentage >= 40) return 'text-orange-500';
        return 'text-red-500';
    }

    getScoreTextClass(percentage: number): string {
        if (percentage >= 70) return 'text-green-700 dark:text-green-300';
        if (percentage >= 40) return 'text-orange-700 dark:text-orange-300';
        return 'text-red-700 dark:text-red-300';
    }

    getScoreLabel(percentage: number): string {
        if (percentage >= 85) return 'Excellent Performance';
        if (percentage >= 70) return 'Good Performance';
        if (percentage >= 60) return 'Average Performance';
        if (percentage >= 40) return 'Below Average';
        return 'Needs Significant Improvement';
    }

    getScoreDescription(percentage: number): string {
        if (percentage >= 85) return 'Outstanding answer with comprehensive coverage and excellent delivery';
        if (percentage >= 70) return 'Solid answer with good technical content and communication';
        if (percentage >= 60) return 'Adequate answer but missing some key points';
        if (percentage >= 40) return 'Partial answer with several areas needing improvement';
        return 'Answer lacks essential content and requires significant development';
    }

    getScoreColor(score: number): string {
        if (score >= 8) return 'text-green-600';
        if (score >= 6) return 'text-blue-600';
        if (score >= 4) return 'text-orange-600';
        return 'text-red-600';
    }

    getSpeakingRateStatus(rate: number): { text: string, class: string } {
        if (rate >= 140 && rate <= 180) return { text: 'Ideal pace', class: 'text-green-600' };
        if (rate >= 120 && rate <= 200) return { text: 'Good pace', class: 'text-blue-600' };
        if (rate < 120) return { text: 'Too slow', class: 'text-orange-600' };
        return { text: 'Too fast', class: 'text-red-600' };
    }

    getFillerWordStatus(count: number): { text: string, class: string } {
        if (count === 0) return { text: 'Excellent - no filler words', class: 'text-green-600' };
        if (count <= 2) return { text: 'Very good', class: 'text-green-600' };
        if (count <= 5) return { text: 'Acceptable', class: 'text-blue-600' };
        if (count <= 10) return { text: 'Room for improvement', class: 'text-orange-600' };
        return { text: 'Too many filler words', class: 'text-red-600' };
    }

    getPauseStatus(avgLength: number): { text: string, class: string } {
        if (avgLength <= 1.5) return { text: 'Natural flow', class: 'text-green-600' };
        if (avgLength <= 2.5) return { text: 'Good pacing', class: 'text-blue-600' };
        if (avgLength <= 4) return { text: 'Somewhat hesitant', class: 'text-orange-600' };
        return { text: 'Long pauses', class: 'text-red-600' };
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