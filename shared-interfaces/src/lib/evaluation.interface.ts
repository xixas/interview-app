export enum ProficiencyLevel {
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
}

export enum Role {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  FULLSTACK = 'fullstack',
  DEVOPS = 'devops',
  MOBILE = 'mobile',
  DATA_SCIENCE = 'data-science',
  QA = 'qa',
}

export enum QuestionType {
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
  SYSTEM_DESIGN = 'system-design',
  CODING = 'coding',
}

export interface EvaluationCriteria {
  technicalAccuracy: number;
  clarity: number;
  completeness: number;
  problemSolving: number;
  communication: number;
  bestPractices: number;
}

export interface AudioEvaluationCriteria extends EvaluationCriteria {
  speakingPace: number;
  confidence: number;
  articulation: number;
  professionalPresence: number;
}

export interface TranscriptionInfo {
  text: string;
  duration?: number;
  language?: string;
}

export interface ReadingAnomalies {
  isLikelyReading: boolean;
  readingIndicators: string[];
  naturalityScore: number; // 1-10, where 1-3 = likely reading, 7-10 = natural
  explanation: string;
}

export interface AudioAnalysisInfo {
  speakingRate: number; // words per minute
  pauseCount: number;
  averagePauseLength: number; // seconds
  fillerWordCount: number;
  confidenceMarkers: string[];
  hesitationMarkers: string[];
  readingAnomalies?: ReadingAnomalies;
}

export interface EvaluationResult {
  overallScore: number;
  maxScore: number;
  percentage: number;
  criteria: Partial<EvaluationCriteria>;
  criteriaFeedback?: Record<string, string>;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  recommendation: 'PASS' | 'CONDITIONAL' | 'FAIL';
  nextSteps: string[];
  transcription?: TranscriptionInfo;
}

export interface AudioEvaluationResult extends EvaluationResult {
  criteria: Partial<AudioEvaluationCriteria>;
  audioAnalysis?: AudioAnalysisInfo;
}
