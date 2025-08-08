import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Tech } from './tech.entity';
import { QuestionDifficulty } from '@interview-app/shared-interfaces';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Tech, (tech) => tech.questions)
  @JoinColumn({ name: 'tech_id' })
  tech!: Tech;

  @Column('integer', { name: 'tech_id' })
  techId!: number;

  @Column('text')
  question!: string;

  @Column('text')
  answer!: string;

  @Column('text', { name: 'difficulty', default: 'Fundamental' })
  difficulty!: QuestionDifficulty;

  @Column('text', { nullable: true })
  example?: string;

  @Column('datetime', { name: 'created_at', nullable: true })
  createdAt!: Date;
}