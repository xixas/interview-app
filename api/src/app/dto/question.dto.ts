import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionDifficulty } from '@interview-app/shared-interfaces';

export class GetQuestionsDto {
  @ApiPropertyOptional({
    description: 'Filter questions by technology name',
    example: 'JavaScript'
  })
  @IsOptional()
  @IsString()
  technology?: string;

  @ApiPropertyOptional({
    description: 'Filter questions by difficulty level',
    enum: QuestionDifficulty,
    example: QuestionDifficulty.FUNDAMENTAL
  })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({
    description: 'Maximum number of questions to return',
    minimum: 1,
    maximum: 100,
    example: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of questions to skip (for pagination)',
    minimum: 0,
    example: 0
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class GetRandomQuestionsDto {
  @ApiPropertyOptional({
    description: 'Number of random questions to return',
    minimum: 1,
    maximum: 50,
    default: 10,
    example: 5
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter questions by technology name',
    example: 'React'
  })
  @IsOptional()
  @IsString()
  technology?: string;

  @ApiPropertyOptional({
    description: 'Filter questions by difficulty level or get all',
    enum: [...Object.values(QuestionDifficulty), 'ALL'],
    default: 'ALL',
    example: QuestionDifficulty.ADVANCED
  })
  @IsOptional()
  @IsEnum([...Object.values(QuestionDifficulty), 'ALL'])
  difficulty?: QuestionDifficulty | 'ALL' = 'ALL';
}

export class TechnologyStatsDto {
  name!: string;
  totalQuestions!: number;
  fundamental!: number;
  advanced!: number;
  extensive!: number;
}