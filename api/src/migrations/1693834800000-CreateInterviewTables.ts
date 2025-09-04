import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInterviewTables1693834800000 implements MigrationInterface {
    name = 'CreateInterviewTables1693834800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create interview_sessions table
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

        // Create interview_responses table
        await queryRunner.query(`
            CREATE TABLE "interview_responses" (
                "id" TEXT PRIMARY KEY,
                "session_id" TEXT NOT NULL,
                "question_id" INTEGER NOT NULL,
                "question_order" INTEGER NOT NULL,
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
                "answered_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "evaluated_at" DATETIME NULL,
                FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id"),
                FOREIGN KEY ("question_id") REFERENCES "questions"("id")
            )
        `);

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX "idx_interview_responses_session_id" ON "interview_responses"("session_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_interview_responses_question_id" ON "interview_responses"("question_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_interview_sessions_technology" ON "interview_sessions"("technology")
        `);

        await queryRunner.query(`
            CREATE INDEX "idx_interview_sessions_status" ON "interview_sessions"("status")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_interview_sessions_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_interview_sessions_technology"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_interview_responses_question_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_interview_responses_session_id"`);
        
        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS "interview_responses"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "interview_sessions"`);
    }
}