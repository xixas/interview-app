import { ProficiencyLevel, Role, QuestionType } from './evaluation.interface';

export interface EvaluateAnswerDto {
  question: string;
  answer: string;
  role: Role;
  proficiencyLevel: ProficiencyLevel;
  questionType?: QuestionType;
  context?: string;
  audioUrl?: string;
}

export interface EvaluateAudioDto {
  question: string;
  role: Role;
  proficiencyLevel: ProficiencyLevel;
  questionType?: QuestionType;
  context?: string;
}

export interface QuestionDto {
  id?: number;
  text: string;
  technology: string;
  difficulty: string;
  category?: string;
  expectedAnswer?: string;
  timeLimit?: number;
}

export interface InterviewSessionDto {
  id?: string;
  candidateName?: string;
  role: Role;
  proficiencyLevel: ProficiencyLevel;
  questions: QuestionDto[];
  startTime?: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}
