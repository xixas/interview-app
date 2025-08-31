import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewHistoryController } from './interview-history.controller';
import { InterviewHistoryService } from './interview-history.service';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewResponse } from '../entities/interview-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InterviewSession, InterviewResponse])],
  controllers: [InterviewHistoryController],
  providers: [InterviewHistoryService],
  exports: [InterviewHistoryService],
})
export class InterviewHistoryModule {}