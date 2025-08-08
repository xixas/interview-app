import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QuestionsModule } from './questions/questions.module';
import { Tech } from './entities/tech.entity';
import { Question } from './entities/question.entity';

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
        entities: [Tech, Question],
        synchronize: false, // Don't sync, use existing database
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    QuestionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

function getDatabasePath(): string {
  // In production, look for database in the app's assets directory
  if (process.env.NODE_ENV === 'production') {
    return join(__dirname, '..', 'assets', 'mock-interview-backup-2025-08-08.db');
  }
  
  // In development, use the database from the current assets folder
  return join(__dirname, 'assets', 'mock-interview-backup-2025-08-08.db');
}
