import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { Question } from '../entities/question.entity';
import { Tech } from '../entities/tech.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Tech])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}