import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { InterviewSession } from './interview-session.entity';
import { Question } from './question.entity';

@Entity('interview_responses')
export class InterviewResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => InterviewSession, (session) => session.responses)
  @JoinColumn({ name: 'session_id' })
  session!: InterviewSession;

  @Column('text', { name: 'session_id' })
  sessionId!: string;

  @Column('integer', { name: 'question_id' })
  questionId!: number;

  @Column('integer', { name: 'question_order' })
  questionOrder!: number;

  // Store actual question data at time of interview to preserve historical accuracy
  @Column('text', { name: 'question_text' })
  questionText!: string;

  @Column('text', { name: 'question_answer', nullable: true })
  questionAnswer?: string;

  @Column('text', { name: 'question_example', nullable: true })
  questionExample?: string;

  @Column('text', { name: 'question_difficulty', nullable: true })
  questionDifficulty?: string;

  @Column('text')
  answer!: string;

  @Column('text', { name: 'audio_url', nullable: true })
  audioUrl?: string;

  @Column('integer', { name: 'time_spent_seconds', nullable: true })
  timeSpentSeconds?: number;

  // Evaluation results
  @Column('integer', { name: 'overall_score', nullable: true })
  overallScore?: number;

  @Column('integer', { name: 'max_score', nullable: true })
  maxScore?: number;

  @Column('real', { name: 'percentage', nullable: true })
  percentage?: number;

  @Column('text', { name: 'detailed_feedback', nullable: true })
  detailedFeedback?: string;

  @Column('text', { name: 'recommendation', nullable: true })
  recommendation?: string;

  // Individual criteria scores
  @Column('integer', { name: 'technical_accuracy', nullable: true })
  technicalAccuracy?: number;

  @Column('integer', { name: 'clarity', nullable: true })
  clarity?: number;

  @Column('integer', { name: 'completeness', nullable: true })
  completeness?: number;

  @Column('integer', { name: 'problem_solving', nullable: true })
  problemSolving?: number;

  @Column('integer', { name: 'communication', nullable: true })
  communication?: number;

  @Column('integer', { name: 'best_practices', nullable: true })
  bestPractices?: number;

  // Strengths and improvements as JSON
  @Column('text', { name: 'strengths', nullable: true })
  strengths?: string; // JSON array of strings

  @Column('text', { name: 'improvements', nullable: true })
  improvements?: string; // JSON array of strings

  @Column('text', { name: 'next_steps', nullable: true })
  nextSteps?: string; // JSON array of strings

  @Column('text', { name: 'criteria_feedback', nullable: true })
  criteriaFeedback?: string; // JSON object

  // Audio transcription data
  @Column('text', { name: 'transcription_text', nullable: true })
  transcriptionText?: string;

  @Column('real', { name: 'transcription_duration', nullable: true })
  transcriptionDuration?: number;

  @Column('text', { name: 'transcription_language', nullable: true })
  transcriptionLanguage?: string;

  @CreateDateColumn({ name: 'answered_at' })
  answeredAt!: Date;

  @Column('datetime', { name: 'evaluated_at', nullable: true })
  evaluatedAt?: Date;
}