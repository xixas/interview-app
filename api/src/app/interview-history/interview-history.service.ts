import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewResponse } from '../entities/interview-response.entity';
import { Question } from '../entities/question.entity';

export interface CreateSessionDto {
  technology: string;
  difficulty: string;
  totalQuestions: number;
}

export interface CreateResponseDto {
  sessionId: string;
  questionId: number;
  questionOrder: number;
  questionText: string;
  questionAnswer?: string;
  questionExample?: string;
  questionDifficulty?: string;
  answer: string;
  audioUrl?: string;
  timeSpentSeconds?: number;
}

export interface EvaluationData {
  overallScore: number;
  maxScore: number;
  percentage: number;
  detailedFeedback: string;
  recommendation: string;
  technicalAccuracy?: number;
  clarity?: number;
  completeness?: number;
  problemSolving?: number;
  communication?: number;
  bestPractices?: number;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  criteriaFeedback?: Record<string, string>;
  transcription?: {
    text: string;
    duration?: number;
    language?: string;
  };
}

export interface SessionSummary {
  id: string;
  technology: string;
  difficulty: string;
  totalQuestions: number;
  completedQuestions: number;
  status: string;
  percentage?: number;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
}

export interface ExportData {
  sessions: InterviewSession[];
  responses: InterviewResponse[];
  exportedAt: Date;
  version: string;
}

@Injectable()
export class InterviewHistoryService {
  constructor(
    @InjectRepository(InterviewSession, 'historyConnection')
    private sessionRepository: Repository<InterviewSession>,
    @InjectRepository(InterviewResponse, 'historyConnection')
    private responseRepository: Repository<InterviewResponse>,
    @InjectRepository(Question, 'questionsConnection')
    private questionRepository: Repository<Question>,
  ) {}

  async createSession(dto: CreateSessionDto): Promise<InterviewSession> {
    const session = this.sessionRepository.create({
      technology: dto.technology,
      difficulty: dto.difficulty,
      totalQuestions: dto.totalQuestions,
      completedQuestions: 0,
      status: 'in_progress',
    });

    return await this.sessionRepository.save(session);
  }

  async getSession(sessionId: string): Promise<InterviewSession | null> {
    return await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['responses'],
    });
  }

  async updateSessionProgress(
    sessionId: string, 
    completedQuestions: number
  ): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      completedQuestions,
    });
  }

  async completeSession(
    sessionId: string,
    totalScore: number,
    maxScore: number,
    durationSeconds: number
  ): Promise<void> {
    // totalScore is now already a percentage (0-100), so use it directly
    const safeTotalScore = totalScore || 0;
    const safeMaxScore = maxScore || 100;
    
    await this.sessionRepository.update(sessionId, {
      status: 'completed',
      totalScore: safeTotalScore,
      maxScore: safeMaxScore,
      percentage: Math.round(safeTotalScore), // totalScore is already the percentage
      durationSeconds,
      completedAt: new Date(),
    });
  }

  async createResponse(dto: CreateResponseDto): Promise<InterviewResponse> {
    const response = this.responseRepository.create({
      sessionId: dto.sessionId,
      questionId: dto.questionId,
      questionOrder: dto.questionOrder,
      questionText: dto.questionText,
      questionAnswer: dto.questionAnswer,
      questionExample: dto.questionExample,
      questionDifficulty: dto.questionDifficulty,
      answer: dto.answer,
      audioUrl: dto.audioUrl,
      timeSpentSeconds: dto.timeSpentSeconds,
    });

    return await this.responseRepository.save(response);
  }

  async updateResponseEvaluation(
    responseId: string,
    evaluation: EvaluationData
  ): Promise<void> {
    // Update the response with evaluation data
    await this.responseRepository.update(responseId, {
      overallScore: evaluation.overallScore,
      maxScore: evaluation.maxScore,
      percentage: evaluation.percentage,
      detailedFeedback: evaluation.detailedFeedback,
      recommendation: evaluation.recommendation,
      technicalAccuracy: evaluation.technicalAccuracy,
      clarity: evaluation.clarity,
      completeness: evaluation.completeness,
      problemSolving: evaluation.problemSolving,
      communication: evaluation.communication,
      bestPractices: evaluation.bestPractices,
      strengths: JSON.stringify(evaluation.strengths),
      improvements: JSON.stringify(evaluation.improvements),
      nextSteps: JSON.stringify(evaluation.nextSteps),
      criteriaFeedback: evaluation.criteriaFeedback ? JSON.stringify(evaluation.criteriaFeedback) : null,
      transcriptionText: evaluation.transcription?.text,
      transcriptionDuration: evaluation.transcription?.duration,
      transcriptionLanguage: evaluation.transcription?.language,
      evaluatedAt: new Date(),
    });

    // Get the response to find its session
    const response = await this.responseRepository.findOne({
      where: { id: responseId }
    });

    if (response) {
      // Recalculate session score if all evaluations are complete
      await this.recalculateSessionScoreIfComplete(response.sessionId);
    }
  }

  private async recalculateSessionScoreIfComplete(sessionId: string): Promise<void> {
    // Get the session with all its responses
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, status: 'completed' },
      relations: ['responses']
    });

    if (!session || !session.responses) return;

    // All saved responses are answered responses (skipped ones aren't saved)
    const answeredResponses = session.responses;
    if (answeredResponses.length === 0) return;

    // Check if all responses have been evaluated (have percentage scores)
    const evaluatedResponses = answeredResponses.filter(r => 
      r.percentage !== null && r.percentage !== undefined && r.percentage >= 0
    );

    // Only recalculate if all responses are evaluated
    if (evaluatedResponses.length === answeredResponses.length) {
      // Calculate average percentage
      const totalPercentage = evaluatedResponses.reduce((sum, r) => sum + r.percentage, 0);
      const averagePercentage = Math.round(totalPercentage / evaluatedResponses.length);

      // Update session with final calculated score
      await this.sessionRepository.update(sessionId, {
        totalScore: averagePercentage,
        maxScore: 100,
        percentage: averagePercentage
      });

      console.log(`Session ${sessionId} score recalculated: ${averagePercentage}% (${evaluatedResponses.length}/${answeredResponses.length} responses evaluated)`);
    } else {
      console.log(`Session ${sessionId}: ${evaluatedResponses.length}/${answeredResponses.length} responses evaluated, waiting for more evaluations`);
    }
  }

  async getSessionHistory(limit = 20, offset = 0): Promise<SessionSummary[]> {
    const sessions = await this.sessionRepository.find({
      order: { startedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return sessions.map(session => ({
      id: session.id,
      technology: session.technology,
      difficulty: session.difficulty,
      totalQuestions: session.totalQuestions,
      completedQuestions: session.completedQuestions,
      status: session.status,
      percentage: session.percentage,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      durationSeconds: session.durationSeconds,
    }));
  }

  async getSessionDetails(sessionId: string): Promise<InterviewSession | null> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['responses'],
      order: {
        responses: { questionOrder: 'ASC' }
      }
    });

    if (session && session.responses) {
      // Parse JSON strings back to arrays and create question object from stored data
      session.responses.forEach(response => {
        try {
          // Parse JSON strings back to arrays for frontend consumption
          if (response.strengths && typeof response.strengths === 'string') {
            (response as any).strengths = JSON.parse(response.strengths);
          }
          if (response.improvements && typeof response.improvements === 'string') {
            (response as any).improvements = JSON.parse(response.improvements);
          }
          if (response.nextSteps && typeof response.nextSteps === 'string') {
            (response as any).nextSteps = JSON.parse(response.nextSteps);
          }
          if (response.criteriaFeedback && typeof response.criteriaFeedback === 'string') {
            (response as any).criteriaFeedback = JSON.parse(response.criteriaFeedback);
          }

          // Create question object from stored historical data
          (response as any).question = {
            id: response.questionId,
            question: (response as any).questionText,
            answer: (response as any).questionAnswer,
            example: (response as any).questionExample,
            difficulty: (response as any).questionDifficulty
          };

          // Add transcription data if available
          if ((response as any).transcriptionText) {
            (response as any).transcription = {
              text: (response as any).transcriptionText,
              duration: (response as any).transcriptionDuration,
              language: (response as any).transcriptionLanguage
            };
          }
        } catch (error) {
          console.error('Failed to parse JSON field for response:', response.id, error);
          // Set defaults if parsing fails
          if (typeof response.strengths === 'string') (response as any).strengths = [];
          if (typeof response.improvements === 'string') (response as any).improvements = [];
          if (typeof response.nextSteps === 'string') (response as any).nextSteps = [];
          if (typeof response.criteriaFeedback === 'string') (response as any).criteriaFeedback = {};
        }
      });
    }

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Delete all responses first (cascade should handle this, but being explicit)
    await this.responseRepository.delete({ sessionId });
    
    // Delete the session
    await this.sessionRepository.delete(sessionId);
  }

  async getStatistics(): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    totalQuestionsAnswered: number;
    averageSessionDuration: number;
    technologyBreakdown: Record<string, number>;
    difficultyBreakdown: Record<string, number>;
  }> {
    const totalSessions = await this.sessionRepository.count();
    const completedSessions = await this.sessionRepository.count({
      where: { status: 'completed' }
    });

    const completedSessionsData = await this.sessionRepository.find({
      where: { status: 'completed' }
    });

    const averageScore = completedSessionsData.length > 0 
      ? Math.round(completedSessionsData.reduce((sum, session) => sum + (session.percentage || 0), 0) / completedSessionsData.length)
      : 0;

    const averageSessionDuration = completedSessionsData.length > 0
      ? Math.round(completedSessionsData.reduce((sum, session) => sum + (session.durationSeconds || 0), 0) / completedSessionsData.length)
      : 0;

    const totalQuestionsAnswered = await this.responseRepository.count();

    // Technology breakdown
    const technologyBreakdown: Record<string, number> = {};
    const techCounts = await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.technology, COUNT(*) as count')
      .groupBy('session.technology')
      .getRawMany();

    techCounts.forEach(item => {
      technologyBreakdown[item.technology] = parseInt(item.count);
    });

    // Difficulty breakdown
    const difficultyBreakdown: Record<string, number> = {};
    const difficultyCounts = await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.difficulty, COUNT(*) as count')
      .groupBy('session.difficulty')
      .getRawMany();

    difficultyCounts.forEach(item => {
      difficultyBreakdown[item.difficulty] = parseInt(item.count);
    });

    return {
      totalSessions,
      completedSessions,
      averageScore,
      totalQuestionsAnswered,
      averageSessionDuration,
      technologyBreakdown,
      difficultyBreakdown,
    };
  }

  async exportUserData(): Promise<ExportData> {
    const sessions = await this.sessionRepository.find({
      relations: ['responses'],
      order: { startedAt: 'DESC' }
    });

    const responses = await this.responseRepository.find({
      relations: ['session'],
      order: { answeredAt: 'DESC' }
    });

    // Parse JSON strings back to arrays for export
    responses.forEach(response => {
      try {
        if (response.strengths && typeof response.strengths === 'string') {
          (response as any).strengths = JSON.parse(response.strengths);
        }
        if (response.improvements && typeof response.improvements === 'string') {
          (response as any).improvements = JSON.parse(response.improvements);
        }
        if (response.nextSteps && typeof response.nextSteps === 'string') {
          (response as any).nextSteps = JSON.parse(response.nextSteps);
        }
        if (response.criteriaFeedback && typeof response.criteriaFeedback === 'string') {
          (response as any).criteriaFeedback = JSON.parse(response.criteriaFeedback);
        }
      } catch (error) {
        console.error('Failed to parse JSON field for export response:', response.id, error);
        // Set defaults if parsing fails
        if (typeof response.strengths === 'string') (response as any).strengths = [];
        if (typeof response.improvements === 'string') (response as any).improvements = [];
        if (typeof response.nextSteps === 'string') (response as any).nextSteps = [];
        if (typeof response.criteriaFeedback === 'string') (response as any).criteriaFeedback = {};
      }
    });

    return {
      sessions,
      responses,
      exportedAt: new Date(),
      version: '1.0'
    };
  }

  async importUserData(data: ExportData): Promise<{
    importedSessions: number;
    importedResponses: number;
    skippedSessions: number;
    skippedResponses: number;
  }> {
    let importedSessions = 0;
    let importedResponses = 0;
    let skippedSessions = 0;
    let skippedResponses = 0;

    // Import sessions (skip if already exists by ID)
    for (const sessionData of data.sessions) {
      const existingSession = await this.sessionRepository.findOne({
        where: { id: sessionData.id }
      });

      if (existingSession) {
        skippedSessions++;
        continue;
      }

      await this.sessionRepository.save(sessionData);
      importedSessions++;
    }

    // Import responses (skip if already exists by ID)
    for (const responseData of data.responses) {
      const existingResponse = await this.responseRepository.findOne({
        where: { id: responseData.id }
      });

      if (existingResponse) {
        skippedResponses++;
        continue;
      }

      await this.responseRepository.save(responseData);
      importedResponses++;
    }

    return {
      importedSessions,
      importedResponses,
      skippedSessions,
      skippedResponses,
    };
  }

  async clearAllData(): Promise<void> {
    await this.responseRepository.clear();
    await this.sessionRepository.clear();
  }
}