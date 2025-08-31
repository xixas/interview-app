import { Controller, Post, Body, Get, UseInterceptors, UploadedFile, BadRequestException, Headers } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { Express } from 'express';
import { memoryStorage } from 'multer';
import { EvaluatorService } from './evaluator.service';
import { EvaluateAnswerDto, EvaluateAudioDto } from './dto/evaluate-answer.dto';
import { EvaluationResult, AudioEvaluationResult } from '@interview-app/shared-interfaces';

@ApiTags('evaluator')
@Controller('evaluator')
export class EvaluatorController {
  constructor(private readonly evaluatorService: EvaluatorService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('evaluate')
  @ApiOperation({ 
    summary: 'Evaluate interview answer',
    description: 'Analyzes an interview answer and provides detailed feedback with scoring'
  })
  @ApiHeader({
    name: 'X-OpenAI-API-Key',
    description: 'OpenAI API key for evaluation',
    required: true,
  })
  @ApiBody({ type: EvaluateAnswerDto })
  @ApiResponse({
    status: 200,
    description: 'Evaluation completed successfully',
    schema: {
      type: 'object',
      properties: {
        overallScore: { type: 'number', example: 42 },
        maxScore: { type: 'number', example: 60 },
        percentage: { type: 'number', example: 70 },
        criteria: {
          type: 'object',
          properties: {
            technicalAccuracy: { type: 'number', example: 8 },
            clarity: { type: 'number', example: 7 },
            completeness: { type: 'number', example: 6 },
            problemSolving: { type: 'number', example: 8 },
            communication: { type: 'number', example: 7 },
            bestPractices: { type: 'number', example: 6 },
          },
        },
        strengths: {
          type: 'array',
          items: { type: 'string' },
          example: ['Clear technical explanation', 'Good use of examples'],
        },
        improvements: {
          type: 'array',
          items: { type: 'string' },
          example: ['Could mention edge cases', 'Add performance considerations'],
        },
        detailedFeedback: {
          type: 'string',
          example: 'The answer demonstrates solid understanding...',
        },
        recommendation: {
          type: 'string',
          enum: ['PASS', 'CONDITIONAL', 'FAIL'],
          example: 'PASS',
        },
        nextSteps: {
          type: 'array',
          items: { type: 'string' },
          example: ['Practice system design', 'Review performance optimization'],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or missing API key' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async evaluateAnswer(
    @Body() evaluateAnswerDto: EvaluateAnswerDto,
    @Headers('x-openai-api-key') apiKey?: string,
  ): Promise<EvaluationResult> {
    if (!apiKey) {
      throw new BadRequestException('OpenAI API key is required. Please provide X-OpenAI-API-Key header.');
    }
    return this.evaluatorService.evaluateAnswer(evaluateAnswerDto, apiKey);
  }

  @Post('evaluate-audio')
  @ApiOperation({ 
    summary: 'Evaluate interview answer from audio',
    description: 'Transcribes audio file and evaluates the interview answer with AI-powered feedback'
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', {
    storage: memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('audio/') || 
          file.mimetype === 'video/webm' || 
          file.mimetype === 'application/octet-stream') {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only audio files are allowed'), false);
      }
    },
  }))
  @ApiResponse({
    status: 200,
    description: 'Audio evaluation completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid audio file or data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async evaluateAudioAnswer(
    @UploadedFile() audioFile: Express.Multer.File,
    @Body() evaluateAudioDto: EvaluateAudioDto,
    @Headers('x-openai-api-key') apiKey?: string,
  ): Promise<AudioEvaluationResult> {
    if (!audioFile) {
      throw new BadRequestException('Audio file is required');
    }

    if (!apiKey) {
      throw new BadRequestException('OpenAI API key is required. Please provide X-OpenAI-API-Key header.');
    }

    return this.evaluatorService.evaluateAudioAnswer(audioFile, evaluateAudioDto, apiKey);
  }

  @Get('demo')
  @ApiOperation({ 
    summary: 'Get demo evaluation data',
    description: 'Returns sample data for testing the evaluator UI'
  })
  @ApiResponse({
    status: 200,
    description: 'Demo data returned successfully',
  })
  getDemoData(): any {
    return {
      sampleQuestion: 'Explain the difference between var, let, and const in JavaScript.',
      sampleAnswer: 'var is function-scoped and can be redeclared, let is block-scoped and cannot be redeclared in the same scope, and const is also block-scoped but cannot be reassigned after declaration. const is used for values that should not change, while let is used for variables that may be reassigned.',
      availableRoles: ['frontend', 'backend', 'fullstack', 'devops', 'mobile', 'data-science', 'qa'],
      availableProficiencyLevels: ['junior', 'mid', 'senior', 'lead'],
      questionTypes: ['technical', 'behavioral', 'system-design', 'coding'],
    };
  }

  @Get('validate-key')
  @ApiOperation({ 
    summary: 'Validate API key format',
    description: 'Simple validation of OpenAI API key format without making API calls'
  })
  @ApiHeader({
    name: 'X-OpenAI-API-Key',
    description: 'OpenAI API key to validate',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'API key validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        message: { type: 'string', example: 'API key format is valid' },
        keyPreview: { type: 'string', example: 'sk-proj-...' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Missing or invalid API key' })
  validateApiKey(
    @Headers('x-openai-api-key') apiKey?: string,
  ): any {
    if (!apiKey || !apiKey.trim()) {
      throw new BadRequestException('OpenAI API key is required. Please provide X-OpenAI-API-Key header.');
    }

    const trimmedKey = apiKey.trim();
    const isValidFormat = trimmedKey.startsWith('sk-') && trimmedKey.length > 20;
    
    return {
      valid: isValidFormat,
      message: isValidFormat 
        ? 'API key format is valid' 
        : 'Invalid API key format. OpenAI API keys should start with "sk-"',
      keyPreview: `${trimmedKey.substring(0, 7)}...${trimmedKey.slice(-4)}`
    };
  }

  @Post('transcribe')
  @ApiOperation({ 
    summary: 'Transcribe audio to text',
    description: 'Transcribes uploaded audio file to text using OpenAI Whisper'
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', {
    storage: memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('audio/') || 
          file.mimetype === 'video/webm' || 
          file.mimetype === 'application/octet-stream') {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only audio files are allowed'), false);
      }
    },
  }))
  @ApiResponse({
    status: 200,
    description: 'Audio transcribed successfully',
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'This is the transcribed text from the audio file' },
        duration: { type: 'number', example: 12.5 },
        language: { type: 'string', example: 'en' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid audio file' })
  @ApiResponse({ status: 500, description: 'Transcription failed' })
  async transcribeAudio(
    @UploadedFile() audioFile: Express.Multer.File,
    @Headers('x-openai-api-key') apiKey?: string,
  ): Promise<{ text: string; duration?: number; language?: string }> {
    if (!audioFile) {
      throw new BadRequestException('Audio file is required');
    }

    if (!apiKey) {
      throw new BadRequestException('OpenAI API key is required. Please provide X-OpenAI-API-Key header.');
    }

    return this.evaluatorService.transcribeAudio(audioFile, apiKey);
  }
}