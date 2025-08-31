import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewResponse } from '../entities/interview-response.entity';

export interface CreateSessionDto {
  technology: string;
  difficulty: string;
  totalQuestions: number;
}

export interface CreateResponseDto {
  sessionId: string;
  questionId: number;
  questionOrder: number;
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
    @InjectRepository(InterviewSession)
    private sessionRepository: Repository<InterviewSession>,
    @InjectRepository(InterviewResponse)
    private responseRepository: Repository<InterviewResponse>,
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
      relations: ['responses', 'responses.question'],
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
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    await this.sessionRepository.update(sessionId, {
      status: 'completed',
      totalScore,
      maxScore,
      percentage,
      durationSeconds,
      completedAt: new Date(),
    });
  }

  async createResponse(dto: CreateResponseDto): Promise<InterviewResponse> {
    const response = this.responseRepository.create({
      sessionId: dto.sessionId,
      questionId: dto.questionId,
      questionOrder: dto.questionOrder,
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
      evaluatedAt: new Date(),
    });
  }

  async getSessionHistory(limit: number = 20, offset: number = 0): Promise<SessionSummary[]> {
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
    return await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['responses', 'responses.question'],
      order: {
        responses: { questionOrder: 'ASC' }
      }
    });
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
      relations: ['responses', 'responses.question'],
      order: { startedAt: 'DESC' }
    });

    const responses = await this.responseRepository.find({
      relations: ['question', 'session'],
      order: { answeredAt: 'DESC' }
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