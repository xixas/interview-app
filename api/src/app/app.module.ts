import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestionsModule } from './questions/questions.module';
import { InterviewHistoryModule } from './interview-history/interview-history.module';
import { DatabaseInitService } from './services/database-init.service';
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
    // Questions Database (Read-only)
    TypeOrmModule.forRootAsync({
      name: 'questionsConnection',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: getQuestionsDbPath(),
        entities: [Tech, Question],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        extra: {
          journal_mode: 'WAL',
          foreign_keys: 'ON',
          busy_timeout: 30000,
        },
        pool: {
          max: 1,
        },
      }),
      inject: [ConfigService],
    }),
    // User History Database (Read-Write)
    TypeOrmModule.forRootAsync({
      name: 'historyConnection',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: getUserHistoryDbPath(),
        entities: [InterviewSession, InterviewResponse],
        migrations: [join(__dirname, '..', 'migrations', '*.js')],
        synchronize: false,
        migrationsRun: true, // Auto-run migrations on startup
        logging: process.env.NODE_ENV === 'development',
        extra: {
          journal_mode: 'WAL',
          foreign_keys: 'ON',
          busy_timeout: 30000,
        },
        pool: {
          max: 1,
        },
      }),
      inject: [ConfigService],
    }),
    QuestionsModule,
    InterviewHistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseInitService],
})
export class AppModule {}

function getQuestionsDbPath(): string {
  // Use environment variable set by Electron service manager, fallback to default
  const envPath = process.env.QUESTIONS_DB_PATH;
  if (envPath) {
    console.log('Questions DB path (from env):', envPath);
    return envPath;
  }
  
  // Fallback: From dist/api, go up two levels to get to project root
  const rootPath = join(__dirname, '..', '..');
  const dbPath = join(rootPath, 'api', 'src', 'assets', 'questions.db');
  console.log('Questions DB path (fallback):', dbPath);
  return dbPath;
}

function getUserHistoryDbPath(): string {
  // Use environment variable set by Electron service manager, fallback to default
  const envPath = process.env.USER_HISTORY_DB_PATH;
  if (envPath) {
    console.log('User History DB path (from env):', envPath);
    return envPath;
  }
  
  // Fallback: From dist/api, go up two levels to get to project root
  const rootPath = join(__dirname, '..', '..');
  const dbPath = join(rootPath, 'data', 'user-history.db');
  console.log('User History DB path (fallback):', dbPath);
  return dbPath;
}
