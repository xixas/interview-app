import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestionsModule } from './questions/questions.module';
import { InterviewHistoryModule } from './interview-history/interview-history.module';
import { Tech } from './entities/tech.entity';
import { Question } from './entities/question.entity';
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewResponse } from './entities/interview-response.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: getDatabasePath(),
        entities: [Tech, Question, InterviewSession, InterviewResponse],
        synchronize: false, // Don't sync, use existing database
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    QuestionsModule,
    InterviewHistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

function getDatabasePath(): string {
  console.log(join(__dirname, 'assets', 'mock-interview-backup-2025-08-08.db'))
  // In production, look for database in the app's assets directory
  if (process.env.NODE_ENV === 'production') {
    return join(__dirname, '..', 'assets', 'mock-interview-backup-2025-08-08.db');
  }
  
  // In development, use the database from the current assets folder
  return join(__dirname, 'assets', 'mock-interview-backup-2025-08-08.db');
}
