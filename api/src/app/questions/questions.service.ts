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
    private questionRepository: Repository<Question>,
    @InjectRepository(Tech)
    private techRepository: Repository<Tech>,
  ) {}

  async getTechnologies(): Promise<TechnologyStatsDto[]> {
    const technologies = await this.techRepository
      .createQueryBuilder('tech')
      .leftJoinAndSelect('tech.questions', 'question')
      .getMany();

    return technologies.map(tech => {
      const fundamental = tech.questions.filter(q => q.difficulty === QuestionDifficulty.FUNDAMENTAL).length;
      const advanced = tech.questions.filter(q => q.difficulty === QuestionDifficulty.ADVANCED).length;
      const extensive = tech.questions.filter(q => q.difficulty === QuestionDifficulty.EXTENSIVE).length;

      return {
        name: tech.name,
        totalQuestions: tech.questions.length,
        fundamental,
        advanced,
        extensive
      };
    });
  }

  async getQuestions(dto: GetQuestionsDto): Promise<Question[]> {
    let query = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.tech', 'tech');

    if (dto.technology) {
      query = query.where('tech.name = :technology', { technology: dto.technology });
    }

    if (dto.difficulty) {
      const whereClause = dto.technology ? 'question.difficulty = :difficulty' : 'question.difficulty = :difficulty';
      query = query.andWhere(whereClause, { difficulty: dto.difficulty });
    }

    if (dto.limit) {
      query = query.limit(dto.limit);
    }

    if (dto.offset) {
      query = query.offset(dto.offset);
    }

    return query.getMany();
  }

  async getRandomQuestions(dto: GetRandomQuestionsDto): Promise<Question[]> {
    let query = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.tech', 'tech');

    if (dto.technology) {
      query = query.where('tech.name = :technology', { technology: dto.technology });
    }

    if (dto.difficulty && dto.difficulty !== 'ALL') {
      const whereClause = dto.technology ? 'question.difficulty = :difficulty' : 'question.difficulty = :difficulty';
      query = query.andWhere(whereClause, { difficulty: dto.difficulty });
    }

    // Use RANDOM() for SQLite
    query = query.orderBy('RANDOM()').limit(dto.count || 10);

    return query.getMany();
  }

  async getQuestionById(id: number): Promise<Question> {
    const question = await this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.tech', 'tech')
      .where('question.id = :id', { id })
      .getOne();

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return question;
  }

  async getQuestionsByTechnology(technology: string): Promise<Question[]> {
    const questions = await this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.tech', 'tech')
      .where('tech.name = :technology', { technology })
      .getMany();

    return questions;
  }

  async searchQuestions(searchTerm: string, dto: GetQuestionsDto): Promise<Question[]> {
    let query = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.tech', 'tech')
      .where('question.question LIKE :search OR question.answer LIKE :search', {
        search: `%${searchTerm}%`
      });

    if (dto.technology) {
      query = query.andWhere('tech.name = :technology', { technology: dto.technology });
    }

    if (dto.difficulty) {
      query = query.andWhere('question.difficulty = :difficulty', { difficulty: dto.difficulty });
    }

    if (dto.limit) {
      query = query.limit(dto.limit);
    }

    return query.getMany();
  }

  async getDatabaseStats(): Promise<{
    totalQuestions: number;
    totalTechnologies: number;
    questionsByDifficulty: Record<QuestionDifficulty, number>;
  }> {
    const totalQuestions = await this.questionRepository.count();
    const totalTechnologies = await this.techRepository.count();

    const questionsByDifficulty = {
      [QuestionDifficulty.FUNDAMENTAL]: await this.questionRepository.count({
        where: { difficulty: QuestionDifficulty.FUNDAMENTAL }
      }),
      [QuestionDifficulty.ADVANCED]: await this.questionRepository.count({
        where: { difficulty: QuestionDifficulty.ADVANCED }
      }),
      [QuestionDifficulty.EXTENSIVE]: await this.questionRepository.count({
        where: { difficulty: QuestionDifficulty.EXTENSIVE }
      })
    };

    return {
      totalQuestions,
      totalTechnologies,
      questionsByDifficulty
    };
  }
}