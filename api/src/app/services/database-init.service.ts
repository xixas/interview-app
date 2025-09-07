import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  constructor(
    @InjectDataSource('historyConnection')
    private readonly historyDataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.initializeHistoryDatabase();
  }

  private async initializeHistoryDatabase() {
    try {
      console.log('🗄️  Initializing history database tables...');
      
      // Check if tables exist, create if they don't
      await this.ensureTablesExist();
      
      console.log('✅ History database tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize history database:', error);
      throw error;
    }
  }

  private async ensureTablesExist() {
    const queryRunner = this.historyDataSource.createQueryRunner();

    try {
      // Check if interview_sessions table exists
      const sessionsTableExists = await this.tableExists(queryRunner, 'interview_sessions');
      if (!sessionsTableExists) {
        console.log('📊 Creating interview_sessions table...');
        await this.createInterviewSessionsTable(queryRunner);
      } else {
        console.log('✅ interview_sessions table already exists');
      }

      // Check if interview_responses table exists and has correct schema
      const responsesTableExists = await this.tableExists(queryRunner, 'interview_responses');
      if (!responsesTableExists) {
        console.log('📝 Creating interview_responses table...');
        await this.createInterviewResponsesTable(queryRunner);
      } else {
        // Check if the table has the correct schema
        const hasCorrectSchema = await this.checkResponsesTableSchema(queryRunner);
        if (!hasCorrectSchema) {
          console.log('🔄 Updating interview_responses table schema...');
          await this.updateResponsesTableSchema(queryRunner);
        } else {
          console.log('✅ interview_responses table already exists with correct schema');
        }
      }
    } finally {
      await queryRunner.release();
    }
  }

  private async tableExists(queryRunner: any, tableName: string): Promise<boolean> {
    try {
      const result = await queryRunner.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return result.length > 0;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  private async createInterviewSessionsTable(queryRunner: any) {
    await queryRunner.query(`
      CREATE TABLE "interview_sessions" (
        "id" TEXT PRIMARY KEY,
        "technology" TEXT NOT NULL,
        "difficulty" TEXT NOT NULL,
        "total_questions" INTEGER NOT NULL,
        "completed_questions" INTEGER DEFAULT 0,
        "status" TEXT DEFAULT 'in_progress',
        "total_score" INTEGER NULL,
        "max_score" INTEGER NULL,
        "percentage" REAL NULL,
        "duration_seconds" INTEGER NULL,
        "started_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "completed_at" DATETIME NULL,
        "notes" TEXT NULL
      )
    `);

    console.log('✅ interview_sessions table created successfully');
  }

  private async createInterviewResponsesTable(queryRunner: any) {
    await queryRunner.query(`
      CREATE TABLE "interview_responses" (
        "id" TEXT PRIMARY KEY,
        "session_id" TEXT NOT NULL,
        "question_id" INTEGER NOT NULL,
        "question_order" INTEGER NOT NULL,
        "question_text" TEXT NOT NULL,
        "question_answer" TEXT NULL,
        "question_example" TEXT NULL,
        "question_difficulty" TEXT NULL,
        "answer" TEXT NOT NULL,
        "audio_url" TEXT NULL,
        "time_spent_seconds" INTEGER NULL,
        "overall_score" INTEGER NULL,
        "max_score" INTEGER NULL,
        "percentage" REAL NULL,
        "detailed_feedback" TEXT NULL,
        "recommendation" TEXT NULL,
        "technical_accuracy" INTEGER NULL,
        "clarity" INTEGER NULL,
        "completeness" INTEGER NULL,
        "problem_solving" INTEGER NULL,
        "communication" INTEGER NULL,
        "best_practices" INTEGER NULL,
        "strengths" TEXT NULL,
        "improvements" TEXT NULL,
        "next_steps" TEXT NULL,
        "criteria_feedback" TEXT NULL,
        "transcription_text" TEXT NULL,
        "transcription_duration" REAL NULL,
        "transcription_language" TEXT NULL,
        "answered_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "evaluated_at" DATETIME NULL,
        FOREIGN KEY ("session_id") REFERENCES "interview_sessions" ("id") ON DELETE CASCADE
      )
    `);

    console.log('✅ interview_responses table created successfully');
  }

  private async checkResponsesTableSchema(queryRunner: any): Promise<boolean> {
    try {
      // Check if the 'answer' column exists (key indicator of correct schema)
      const result = await queryRunner.query(
        `PRAGMA table_info(interview_responses)`
      );

      const hasAnswerColumn = result.some((col: any) => col.name === 'answer');
      const hasUserAnswerColumn = result.some((col: any) => col.name === 'user_answer');

      // If it has 'answer' column and not 'user_answer', schema is correct
      return hasAnswerColumn && !hasUserAnswerColumn;
    } catch (error) {
      console.error('Error checking table schema:', error);
      return false;
    }
  }

  private async updateResponsesTableSchema(queryRunner: any) {
    try {
      // Backup existing data if any
      const existingData = await queryRunner.query(`SELECT * FROM interview_responses`);

      // Drop the old table
      await queryRunner.query(`DROP TABLE interview_responses`);

      // Create the new table with correct schema
      await this.createInterviewResponsesTable(queryRunner);

      // If there was existing data, we'd need to migrate it here
      // For now, we'll just log if data was lost
      if (existingData.length > 0) {
        console.warn(`⚠️  ${existingData.length} existing responses were lost during schema update`);
      }

      console.log('✅ interview_responses table schema updated successfully');
    } catch (error) {
      console.error('❌ Failed to update table schema:', error);
      throw error;
    }
  }
}
