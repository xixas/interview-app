import { IsString, IsEnum, IsOptional, MinLength, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProficiencyLevel, Role, QuestionType } from '@interview-app/shared-interfaces';

export class EvaluateAnswerDto {
  @ApiProperty({
    description: 'The interview question asked',
    example: 'What is the difference between React hooks and class components?',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  question: string;

  @ApiProperty({
    description: 'The candidate\'s answer to the question',
    example: 'React hooks are functions that allow you to use state and lifecycle methods in functional components...',
    minLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  answer: string;

  @ApiProperty({
    description: 'Role being interviewed for',
    enum: Role,
    example: Role.FRONTEND,
  })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    description: 'Expected proficiency level',
    enum: ProficiencyLevel,
    example: ProficiencyLevel.MID,
  })
  @IsEnum(ProficiencyLevel)
  proficiencyLevel: ProficiencyLevel;

  @ApiPropertyOptional({
    description: 'Type of question being asked',
    enum: QuestionType,
    example: QuestionType.TECHNICAL,
  })
  @IsEnum(QuestionType)
  @IsOptional()
  questionType?: QuestionType = QuestionType.TECHNICAL;

  @ApiPropertyOptional({
    description: 'Additional context about the position or company',
    example: 'This is for a React developer position at a fintech startup',
  })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({
    description: 'URL to audio recording of the answer (optional)',
    example: 'https://example.com/recording.mp3',
  })
  @IsUrl()
  @IsOptional()
  audioUrl?: string;
}

export class EvaluateAudioDto {
  @ApiProperty({
    description: 'The interview question asked',
    example: 'What is the difference between React hooks and class components?',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  question: string;

  @ApiProperty({
    description: 'Role being interviewed for',
    enum: Role,
    example: Role.FRONTEND,
  })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    description: 'Expected proficiency level',
    enum: ProficiencyLevel,
    example: ProficiencyLevel.MID,
  })
  @IsEnum(ProficiencyLevel)
  proficiencyLevel: ProficiencyLevel;

  @ApiPropertyOptional({
    description: 'Type of question being asked',
    enum: QuestionType,
    example: QuestionType.TECHNICAL,
  })
  @IsEnum(QuestionType)
  @IsOptional()
  questionType?: QuestionType = QuestionType.TECHNICAL;

  @ApiPropertyOptional({
    description: 'Additional context about the position or company',
    example: 'This is for a React developer position at a fintech startup',
  })
  @IsString()
  @IsOptional()
  context?: string;
}