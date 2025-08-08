import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Question } from './question.entity';

@Entity('tech')
export class Tech {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text', { unique: true })
  name!: string;

  @Column('datetime', { name: 'created_at', nullable: true })
  createdAt!: Date;

  @OneToMany(() => Question, (question) => question.tech)
  questions!: Question[];
}