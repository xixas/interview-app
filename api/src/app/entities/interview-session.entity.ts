import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { InterviewResponse } from './interview-response.entity';

@Entity('interview_sessions')
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  technology!: string;

  @Column('text')
  difficulty!: string;

  @Column('integer', { name: 'total_questions' })
  totalQuestions!: number;

  @Column('integer', { name: 'completed_questions', default: 0 })
  completedQuestions!: number;

  @Column('text', { default: 'in_progress' })
  status!: 'in_progress' | 'completed' | 'cancelled';

  @Column('integer', { name: 'total_score', nullable: true })
  totalScore?: number;

  @Column('integer', { name: 'max_score', nullable: true })
  maxScore?: number;

  @Column('real', { name: 'percentage', nullable: true })
  percentage?: number;

  @Column('integer', { name: 'duration_seconds', nullable: true })
  durationSeconds?: number;

  @CreateDateColumn({ name: 'started_at' })
  startedAt!: Date;

  @UpdateDateColumn({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column('text', { nullable: true })
  notes?: string;

  @OneToMany(() => InterviewResponse, (response) => response.session)
  responses!: InterviewResponse[];
}