import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { GetQuestionsDto, GetRandomQuestionsDto } from '../dto/question.dto';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('technologies')
  @ApiOperation({ 
    summary: 'Get all available technologies with question counts',
    description: 'Returns a list of all available technologies along with the count of questions in each difficulty level'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of technologies with statistics',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'JavaScript' },
          totalQuestions: { type: 'number', example: 150 },
          fundamental: { type: 'number', example: 50 },
          advanced: { type: 'number', example: 70 },
          extensive: { type: 'number', example: 30 }
        }
      }
    }
  })
  async getTechnologies() {
    return this.questionsService.getTechnologies();
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get database statistics and summary information',
    description: 'Returns overall statistics about the questions database including totals by difficulty'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Database statistics',
    schema: {
      type: 'object',
      properties: {
        totalQuestions: { type: 'number', example: 500 },
        totalTechnologies: { type: 'number', example: 15 },
        questionsByDifficulty: {
          type: 'object',
          properties: {
            Fundamental: { type: 'number', example: 200 },
            Advanced: { type: 'number', example: 250 },
            Extensive: { type: 'number', example: 50 }
          }
        }
      }
    }
  })
  async getDatabaseStats() {
    return this.questionsService.getDatabaseStats();
  }

  @Get('random')
  @ApiOperation({ 
    summary: 'Get random interview questions with optional filters',
    description: 'Returns a specified number of random questions, optionally filtered by technology and difficulty'
  })
  @ApiQuery({ name: 'count', required: false, description: 'Number of questions to return (default: 10, max: 50)' })
  @ApiQuery({ name: 'technology', required: false, description: 'Filter by technology name (e.g., JavaScript, React)' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Filter by difficulty level or ALL for any difficulty' })
  @ApiResponse({ 
    status: 200, 
    description: 'Random questions matching criteria',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          question: { type: 'string', example: 'What is a closure in JavaScript?' },
          answer: { type: 'string', example: 'A closure is a function that has access to...' },
          difficulty: { type: 'string', enum: ['Fundamental', 'Advanced', 'Extensive'] },
          example: { type: 'string', nullable: true },
          tech: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getRandomQuestions(@Query() dto: GetRandomQuestionsDto) {
    return this.questionsService.getRandomQuestions(dto);
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search questions by text content',
    description: 'Searches through question text and answers for the specified term with optional filters'
  })
  @ApiQuery({ name: 'q', description: 'Search term to look for in questions and answers' })
  @ApiQuery({ name: 'technology', required: false, description: 'Filter results by technology' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Filter results by difficulty' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results to return' })
  @ApiResponse({ 
    status: 200, 
    description: 'Questions matching search criteria',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          question: { type: 'string' },
          answer: { type: 'string' },
          difficulty: { type: 'string' },
          example: { type: 'string', nullable: true },
          tech: { type: 'object' }
        }
      }
    }
  })
  async searchQuestions(
    @Query('q') searchTerm: string,
    @Query() dto: GetQuestionsDto
  ) {
    return this.questionsService.searchQuestions(searchTerm, dto);
  }

  @Get('technology/:technology')
  @ApiOperation({ 
    summary: 'Get all questions for a specific technology',
    description: 'Returns all questions associated with the specified technology'
  })
  @ApiParam({ 
    name: 'technology', 
    description: 'Technology name (e.g., JavaScript, Angular, React)',
    example: 'JavaScript'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Questions for the specified technology' 
  })
  async getQuestionsByTechnology(@Param('technology') technology: string) {
    return this.questionsService.getQuestionsByTechnology(technology);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a specific question by ID',
    description: 'Returns detailed information about a specific question including its technology and answer'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Unique question identifier',
    type: 'number',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Question details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        question: { type: 'string', example: 'Explain the concept of hoisting in JavaScript' },
        answer: { type: 'string', example: 'Hoisting is JavaScript\'s default behavior...' },
        difficulty: { type: 'string', example: 'Advanced' },
        example: { type: 'string', nullable: true },
        tech: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'JavaScript' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async getQuestionById(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.getQuestionById(id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get questions with optional filtering and pagination',
    description: 'Returns a list of questions with support for filtering by technology, difficulty, and pagination'
  })
  @ApiQuery({ name: 'technology', required: false, description: 'Filter by technology name' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Filter by difficulty level' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results (1-100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip for pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of questions matching the specified criteria' 
  })
  async getQuestions(@Query() dto: GetQuestionsDto) {
    return this.questionsService.getQuestions(dto);
  }
}