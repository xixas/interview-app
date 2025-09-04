import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionDataToResponses1725441000000 implements MigrationInterface {
    name = 'AddQuestionDataToResponses1725441000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add columns to store question data at time of interview for historical accuracy
        await queryRunner.query(`
            ALTER TABLE "interview_responses" 
            ADD COLUMN "question_text" TEXT DEFAULT '';
        `);

        await queryRunner.query(`
            ALTER TABLE "interview_responses" 
            ADD COLUMN "question_answer" TEXT NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE "interview_responses" 
            ADD COLUMN "question_example" TEXT NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE "interview_responses" 
            ADD COLUMN "question_difficulty" TEXT NULL;
        `);

        // Make question_text NOT NULL after adding the column
        await queryRunner.query(`
            UPDATE "interview_responses" 
            SET "question_text" = 'Question data not available' 
            WHERE "question_text" = '';
        `);

        // Note: We cannot make it NOT NULL in SQLite with ALTER TABLE, 
        // but the entity definition will enforce it for new records
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the added columns
        await queryRunner.query(`ALTER TABLE "interview_responses" DROP COLUMN "question_difficulty"`);
        await queryRunner.query(`ALTER TABLE "interview_responses" DROP COLUMN "question_example"`);
        await queryRunner.query(`ALTER TABLE "interview_responses" DROP COLUMN "question_answer"`);
        await queryRunner.query(`ALTER TABLE "interview_responses" DROP COLUMN "question_text"`);
    }
}