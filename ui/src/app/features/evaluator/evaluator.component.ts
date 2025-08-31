import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
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
import { EvaluatorApiService, DemoData } from './services/evaluator-api.service';
import { EvaluatorIpcService } from '../../core/services/evaluator-ipc.service';
import { 
  EvaluationResult, 
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
        ToolbarModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './evaluator.component.html',
    styleUrls: ['./evaluator.component.scss']
})
export class EvaluatorComponent implements OnInit {
    private readonly evaluatorApi = inject(EvaluatorApiService);
    private readonly evaluatorIpc = inject(EvaluatorIpcService);

    // Form state
    answer = '';
    selectedRole: Role | null = null;
    selectedLevel: ProficiencyLevel | null = null;  
    selectedType: QuestionType = QuestionType.TECHNICAL;

    // Component state
    currentQuestion = signal('Click "Generate New Question" or "Load Sample" to get started with an interview question.');
    isEvaluating = signal(false);
    evaluation = signal<EvaluationResult | null>(null);
    errorMessage = signal('');
    serviceStatus = signal<'available' | 'unavailable' | 'checking'>('checking');
    demoData = signal<DemoData | null>(null);
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

    typeOptions = [
        { label: 'Technical Knowledge', value: QuestionType.TECHNICAL },
        { label: 'Behavioral/Situational', value: QuestionType.BEHAVIORAL },
        { label: 'System Design', value: QuestionType.SYSTEM_DESIGN },
        { label: 'Coding/Algorithm', value: QuestionType.CODING }
    ];

    ngOnInit() {
        this.checkServiceHealth();
        this.loadDemoData();
    }

    canEvaluate(): boolean {
        return this.answer.trim().length > 10 && !!this.selectedRole && !!this.selectedLevel;
    }

    getWordCount(text: string): number {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    async checkServiceHealth() {
        this.isCheckingService.set(true);
        this.serviceStatus.set('checking');
        
        this.evaluatorApi.healthCheck().subscribe({
            next: (response) => {
                this.serviceStatus.set(response.status === 'healthy' ? 'available' : 'unavailable');
                if (response.status !== 'healthy') {
                    this.errorMessage.set('Evaluation service is not ready. Please check your API key configuration.');
                }
                this.isCheckingService.set(false);
            },
            error: (error) => {
                this.serviceStatus.set('unavailable');
                this.isCheckingService.set(false);
                
                if (error.status === 0) {
                    this.errorMessage.set('Cannot connect to evaluation service. Please ensure the service is running.');
                } else if (error.status === 401) {
                    this.errorMessage.set('API key authentication failed. Please check your OpenAI API key in Settings.');
                } else if (error.status === 429) {
                    this.errorMessage.set('API rate limit exceeded. Please wait a moment before trying again.');
                } else {
                    this.errorMessage.set(`Service unavailable: ${error.message || 'Unknown error'}`);
                }
            }
        });
    }

    loadDemoData() {
        this.evaluatorApi.getDemoData().subscribe({
            next: (data) => {
                this.demoData.set(data);
            },
            error: (error) => {
                console.warn('Could not load demo data:', error);
                // Provide fallback demo data
                this.demoData.set({
                    sampleQuestion: 'Explain the difference between let, const, and var in JavaScript.',
                    sampleAnswer: 'var is function-scoped and can be hoisted, let is block-scoped and cannot be redeclared in the same scope, const is block-scoped and cannot be reassigned after declaration.',
                    availableRoles: this.roleOptions.map(opt => opt.label),
                    availableProficiencyLevels: this.levelOptions.map(opt => opt.label),
                    questionTypes: this.typeOptions.map(opt => opt.label)
                });
            }
        });
    }

    loadSampleData() {
        const demo = this.demoData();
        if (demo) {
            this.currentQuestion.set(demo.sampleQuestion);
            this.answer = demo.sampleAnswer;
            this.selectedRole = Role.FRONTEND;
            this.selectedLevel = ProficiencyLevel.MID;
            this.selectedType = QuestionType.TECHNICAL;
        }
    }

    resetForm() {
        this.answer = '';
        this.selectedRole = null;
        this.selectedLevel = null;
        this.selectedType = QuestionType.TECHNICAL;
        this.evaluation.set(null);
        this.errorMessage.set('');
        this.currentQuestion.set('Click "Generate New Question" or "Load Sample" to get started with an interview question.');
    }

    generateNewQuestion() {
        const questions = {
            [QuestionType.TECHNICAL]: [
                'Explain the event loop in JavaScript and how it handles asynchronous operations.',
                'What are the differences between SQL and NoSQL databases? When would you use each?',
                'Describe the concept of RESTful APIs and the principles behind REST architecture.',
                'Explain how CSS specificity works and provide examples of different specificity levels.'
            ],
            [QuestionType.BEHAVIORAL]: [
                'Tell me about a time when you had to work with a difficult team member. How did you handle the situation?',
                'Describe a challenging project you worked on. What obstacles did you face and how did you overcome them?',
                'Give me an example of when you had to learn a new technology quickly for a project.'
            ],
            [QuestionType.SYSTEM_DESIGN]: [
                'Design a URL shortening service like bit.ly. Consider scalability, reliability, and performance.',
                'How would you design a real-time chat application that can handle millions of users?',
                'Design a caching system for a high-traffic e-commerce website.'
            ],
            [QuestionType.CODING]: [
                'Write a function to find the longest substring without repeating characters.',
                'Implement a function to reverse a linked list.',
                'Design an algorithm to find the shortest path between two nodes in a graph.'
            ]
        };

        const typeQuestions = questions[this.selectedType] || questions[QuestionType.TECHNICAL];
        const randomQuestion = typeQuestions[Math.floor(Math.random() * typeQuestions.length)];
        this.currentQuestion.set(randomQuestion);
    }

    async evaluateAnswer() {
        if (!this.canEvaluate()) {
            this.errorMessage.set('Please provide an answer and select both role and experience level.');
            return;
        }

        this.isEvaluating.set(true);
        this.errorMessage.set('');
        this.evaluation.set(null);

        try {
            // Check if service is available before attempting evaluation
            if (this.serviceStatus() === 'unavailable') {
                throw new Error('Evaluation service is not available. Please check your configuration.');
            }

            const request = {
                questionId: Date.now().toString(), // Generate a unique ID
                question: this.currentQuestion(),
                answer: this.answer,
                technology: this.selectedRole?.toLowerCase() || 'general',
                difficulty: this.selectedLevel?.toLowerCase() || 'medium',
                timeSpent: 0 // Could be tracked in the future
            };

            const result = await this.evaluatorIpc.evaluateAnswer(request);
            this.retryCount.set(0); // Reset retry count on success
            
            // Convert IPC response to expected UI format
            const evaluation: EvaluationResult = {
                overallScore: result.score,
                maxScore: 100,
                percentage: result.score,
                criteria: {
                    technicalAccuracy: result.technicalAccuracy,
                    clarity: result.communication, // Map communication to clarity
                    completeness: result.completeness,
                    problemSolving: Math.round((result.technicalAccuracy + result.completeness) / 2), // Calculated
                    communication: result.communication,
                    bestPractices: Math.round((result.technicalAccuracy + result.communication) / 2) // Calculated
                },
                strengths: result.strengths,
                improvements: result.improvements,
                detailedFeedback: result.feedback,
                recommendation: result.score >= 80 ? 'PASS' : result.score >= 60 ? 'CONDITIONAL' : 'FAIL',
                nextSteps: result.improvements.map((imp: string) => `Work on: ${imp}`)
            };

            console.log('Evaluation completed:', evaluation);
            this.evaluation.set(evaluation);
        } catch (error: any) {
            console.error('Evaluation failed:', error);
            
            // Provide specific error messages based on error type
            if (error.message?.includes('Desktop mode is required')) {
                this.errorMessage.set('AI evaluation requires the desktop version of the app. Please use the desktop client.');
            } else if (error.message?.includes('API key')) {
                this.errorMessage.set('OpenAI API key is not configured or invalid. Please check your Settings.');
            } else if (error.message?.includes('rate limit') || error.status === 429) {
                this.errorMessage.set('API rate limit exceeded. Please wait a moment before trying again.');
            } else if (error.message?.includes('network') || error.status === 0) {
                this.errorMessage.set('Network error. Please check your internet connection and try again.');
            } else if (error.status === 401) {
                this.errorMessage.set('Authentication failed. Please verify your API key in Settings.');
            } else if (error.status >= 500) {
                this.errorMessage.set('Server error. The evaluation service is temporarily unavailable.');
            } else {
                this.errorMessage.set(`Evaluation failed: ${error.message || 'Please try again later.'}`);
            }
            
            // Increment retry count for potential auto-retry logic
            this.retryCount.update(count => count + 1);
        } finally {
            this.isEvaluating.set(false);
        }
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

    isDesktopMode(): boolean {
        return !!(window.electronAPI || (window as any).electron);
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
}