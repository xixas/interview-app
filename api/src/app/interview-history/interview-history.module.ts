import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewHistoryController } from './interview-history.controller';
import { InterviewHistoryService } from './interview-history.service';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewResponse } from '../entities/interview-response.entity';
import { Question } from '../entities/question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterviewSession, InterviewResponse], 'historyConnection'),
    TypeOrmModule.forFeature([Question], 'questionsConnection'),
  ],
  controllers: [InterviewHistoryController],
  providers: [InterviewHistoryService],
  exports: [InterviewHistoryService],
})
export class InterviewHistoryModule {}