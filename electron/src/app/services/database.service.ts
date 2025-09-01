import { DataSource, Repository } from 'typeorm';
import { join } from 'path';
import { app } from 'electron';
import { existsSync } from 'fs';

// Define Question interface matching current API structure
export interface Question {
  id: number;
  question: string;
  difficulty: 'Fundamental' | 'Advanced' | 'Extensive';
  category: string;
  example?: string;
  expectedTopics?: string[];
  hints?: string[];
  timeLimit?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Technology {
  id: number;
  name: string;
  totalQuestions?: number;
}

export class DatabaseService {
  private dataSource: DataSource | null = null;
  private questionRepository: Repository<any> | null = null;
  private technologyRepository: Repository<any> | null = null;

  async initialize(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      return;
    }

    try {
      // Get the database path - check multiple possible locations
      const dbPath = this.getDatabasePath();
      console.log('Initializing database at path:', dbPath);

      if (!existsSync(dbPath)) {
        throw new Error(`Database file not found at: ${dbPath}. Please ensure the database file is properly placed.`);
      }

      this.dataSource = new DataSource({
        type: 'sqlite',
        database: dbPath,
        entities: [],
        synchronize: false,
        logging: false,
      });
      
      await this.dataSource.initialize();
      console.log('Database initialized successfully in main process');

      // Create repositories (using raw query approach)
      this.questionRepository = this.dataSource.manager.getRepository('questions');
      this.technologyRepository = this.dataSource.manager.getRepository('tech');
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }


  private getDatabasePath(): string {
    return join(__dirname, '..', '..', 'api', 'src', 'assets', 'mock-interview-backup-2025-08-08.db');
  }

  private ensureInitialized(): void {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

 // 2) getTechnologies(): derive counts via tech_id
async getTechnologies(): Promise<Array<{ name: string; totalQuestions: number }>> {
  this.ensureInitialized();
  try {
    const result = await this.dataSource!.query(`
      SELECT 
        t.name AS name,
        COUNT(q.id) AS totalQuestions
      FROM tech t
      LEFT JOIN questions q ON q.tech_id = t.id
      GROUP BY t.id, t.name
      ORDER BY t.name ASC
    `);

    return result.map((row: any) => ({
      name: row.name,
      totalQuestions: parseInt(row.totalQuestions, 10) || 0
    }));
  } catch (error) {
    console.error('DatabaseService: Error getting technologies:', error);
    throw new Error(`Failed to get technologies from database: ${error.message}`);
  }
}
// 3) getRandomQuestions(): filter by tech name via subquery; join to return category name
async getRandomQuestions(filters: { count?: number; technology?: string; difficulty?: string; }): Promise<Question[]> {
  console.log({filters2: filters})
  this.ensureInitialized();

  try {
    let query = `
      SELECT q.*, t.name AS category
      FROM questions q
      LEFT JOIN tech t ON t.id = q.tech_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.technology && filters.technology !== 'ALL') {
      query += ` AND q.tech_id = (SELECT id FROM tech WHERE name = ?)`;
      params.push(filters.technology);
    }

    if (filters.difficulty && filters.difficulty !== 'ALL') {
      query += ` AND q.difficulty = ?`;
      params.push(filters.difficulty);
    }

    query += ` ORDER BY RANDOM() LIMIT ?`;
    params.push(filters.count || 10);

    const rows = await this.dataSource!.query(query, params);

    return rows.map((r: any) => ({
      id: r.id,
      question: r.question,
      difficulty: (r.difficulty as 'Fundamental'|'Advanced'|'Extensive') ?? 'Advanced',
      category: r.category ?? 'General',
      example: r.example || undefined,
      expectedTopics: r.expectedTopics ? JSON.parse(r.expectedTopics) : [],
      hints: r.hints ? JSON.parse(r.hints) : [],
      timeLimit: r.timeLimit || 300,
      createdAt: r.created_at ? new Date(r.created_at) : undefined,
      updatedAt: r.updated_at ? new Date(r.updated_at) : undefined
    }));
  } catch (error) {
    console.error('Error getting random questions:', error);
    throw new Error(`Failed to get random questions from database: ${error.message}`);
  }
}


  async getQuestionsByTechnology(technology: string): Promise<Question[]> {
    this.ensureInitialized();

    try {
      const questions = await this.dataSource!.query(
        'SELECT q.*, t.name AS category FROM questions q LEFT JOIN tech t ON t.id = q.tech_id WHERE t.name = ? ORDER BY q.id',
        [technology]
      );

      return questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        difficulty: q.difficulty || 'Advanced',
        category: q.category || technology,
        example: q.example || undefined,
        expectedTopics: q.expectedTopics ? JSON.parse(q.expectedTopics) : [],
        hints: q.hints ? JSON.parse(q.hints) : [],
        timeLimit: q.timeLimit || 300,
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
        updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date()
      }));

    } catch (error) {
      console.error('Error getting questions by technology:', error);
      throw new Error(`Failed to get questions by technology '${technology}': ${error.message}`);
    }
  }


  async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
      this.questionRepository = null;
      this.technologyRepository = null;
      console.log('Database connection closed');
    }
  }
}