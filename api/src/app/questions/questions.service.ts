import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { Tech } from '../entities/tech.entity';
import { GetQuestionsDto, GetRandomQuestionsDto, TechnologyStatsDto } from '../dto/question.dto';
import { QuestionDifficulty } from '@interview-app/shared-interfaces';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Tech)
    private readonly techRepository: Repository<Tech>,
  ) {}

  // ---------- 1) Tech stats via one SQL, no full object graph ----------
  async getTechnologies(): Promise<TechnologyStatsDto[]> {
    // Ensure Tech entity has @Entity('tech') and relation Question.tech -> Tech
    const rows = await this.techRepository
      .createQueryBuilder('t')
      .leftJoin('t.questions', 'q')
      .select('t.name', 'name')
      .addSelect('COUNT(q.id)', 'total')
      .addSelect(`SUM(CASE WHEN q.difficulty = :f THEN 1 ELSE 0 END)`, 'fundamental')
      .addSelect(`SUM(CASE WHEN q.difficulty = :a THEN 1 ELSE 0 END)`, 'advanced')
      .addSelect(`SUM(CASE WHEN q.difficulty = :e THEN 1 ELSE 0 END)`, 'extensive')
      .setParameters({
        f: QuestionDifficulty.FUNDAMENTAL,
        a: QuestionDifficulty.ADVANCED,
        e: QuestionDifficulty.EXTENSIVE,
      })
      .groupBy('t.id')
      .orderBy('t.name', 'ASC')
      .getRawMany<{
        name: string;
        total: string;
        fundamental: string;
        advanced: string;
        extensive: string;
      }>();

    return rows.map(r => ({
      name: r.name,
      totalQuestions: Number(r.total) || 0,
      fundamental: Number(r.fundamental) || 0,
      advanced: Number(r.advanced) || 0,
      extensive: Number(r.extensive) || 0,
    }));
  }

  // ---------- 2) List with filters + portable pagination ----------
  async getQuestions(dto: GetQuestionsDto): Promise<Question[]> {
    const qb = this.questionRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.tech', 't');

    if (dto.technology) {
      qb.andWhere('t.name = :technology', { technology: dto.technology });
    }

    if (dto.difficulty) {
      qb.andWhere('q.difficulty = :difficulty', { difficulty: dto.difficulty });
    }

    if (dto.limit) qb.take(dto.limit);
    if (dto.offset) qb.skip(dto.offset);

    return qb.getMany();
  }

  // ---------- 3) Random sample (SQLite RANDOM()) ----------
  async getRandomQuestions(dto: GetRandomQuestionsDto): Promise<Question[]> {
    console.log({dto})
    const count = dto.count && dto.count > 0 ? dto.count : 10;

    const qb = this.questionRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.tech', 't');

    if (dto.technology) {
      qb.andWhere('t.name = :technology', { technology: dto.technology });
    }

    // Accept dto.difficulty as enum or 'ALL'
    if (dto.difficulty && dto.difficulty !== 'ALL') {
      qb.andWhere('q.difficulty = :difficulty', { difficulty: dto.difficulty });
    }

    return qb.orderBy('RANDOM()').take(count).getMany();
  }

  // ---------- 4) By id ----------
  async getQuestionById(id: number): Promise<Question> {
    const question = await this.questionRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.tech', 't')
      .where('q.id = :id', { id })
      .getOne();

    if (!question) throw new NotFoundException(`Question with ID ${id} not found`);
    return question;
  }

  // ---------- 5) By technology ----------
  async getQuestionsByTechnology(technology: string): Promise<Question[]> {
    return this.questionRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.tech', 't')
      .where('t.name = :technology', { technology })
      .orderBy('q.id', 'ASC')
      .getMany();
  }

  // ---------- 6) Search ----------
  async searchQuestions(searchTerm: string, dto: GetQuestionsDto): Promise<Question[]> {
    const qb = this.questionRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.tech', 't')
      .where('(q.question LIKE :search OR q.answer LIKE :search)', { search: `%${searchTerm}%` });

    if (dto.technology) qb.andWhere('t.name = :technology', { technology: dto.technology });
    if (dto.difficulty) qb.andWhere('q.difficulty = :difficulty', { difficulty: dto.difficulty });
    if (dto.limit) qb.take(dto.limit);
    if (dto.offset) qb.skip(dto.offset);

    return qb.getMany();
  }

  // ---------- 7) DB stats ----------
  async getDatabaseStats(): Promise<{
    totalQuestions: number;
    totalTechnologies: number;
    questionsByDifficulty: Record<QuestionDifficulty, number>;
  }> {
    const [totalQuestions, totalTechnologies, f, a, e] = await Promise.all([
      this.questionRepository.count(),
      this.techRepository.count(),
      this.questionRepository.count({ where: { difficulty: QuestionDifficulty.FUNDAMENTAL } }),
      this.questionRepository.count({ where: { difficulty: QuestionDifficulty.ADVANCED } }),
      this.questionRepository.count({ where: { difficulty: QuestionDifficulty.EXTENSIVE } }),
    ]);

    return {
      totalQuestions,
      totalTechnologies,
      questionsByDifficulty: {
        [QuestionDifficulty.FUNDAMENTAL]: f,
        [QuestionDifficulty.ADVANCED]: a,
        [QuestionDifficulty.EXTENSIVE]: e,
      },
    };
  }
}
