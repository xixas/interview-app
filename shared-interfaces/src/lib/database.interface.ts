export enum QuestionDifficulty {
  FUNDAMENTAL = 'Fundamental',
  ADVANCED = 'Advanced',
  EXTENSIVE = 'Extensive'
}

export interface QuestionEntity {
  id: number;
  tech: TechEntity;
  techId: number;
  question: string;
  answer: string;
  difficulty: QuestionDifficulty;
  example?: string;
  createdAt: Date;
}

export interface TechEntity {
  id: number;
  name: string;
  createdAt: Date;
  questions: QuestionEntity[];
}

// Database DTOs
export interface GetQuestionsDto {
  technology?: string;
  difficulty?: QuestionDifficulty;
  limit?: number;
  offset?: number;
}

export interface GetRandomQuestionsDto {
  count?: number;
  technology?: string;
  difficulty?: QuestionDifficulty | 'ALL';
}

export interface TechnologyStatsDto {
  name: string;
  totalQuestions: number;
  fundamental: number;
  advanced: number;
  extensive: number;
}

export interface DatabaseStatsDto {
  totalQuestions: number;
  totalTechnologies: number;
  questionsByDifficulty: Record<QuestionDifficulty, number>;
}