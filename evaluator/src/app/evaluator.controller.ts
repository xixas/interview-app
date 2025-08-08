import { Controller, Post, Body, Get, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
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
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async evaluateAnswer(
    @Body() evaluateAnswerDto: EvaluateAnswerDto,
  ): Promise<EvaluationResult> {
    return this.evaluatorService.evaluateAnswer(evaluateAnswerDto);
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
  ): Promise<AudioEvaluationResult> {
    if (!audioFile) {
      throw new BadRequestException('Audio file is required');
    }

    return this.evaluatorService.evaluateAudioAnswer(audioFile, evaluateAudioDto);
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
  ): Promise<{ text: string; duration?: number; language?: string }> {
    if (!audioFile) {
      throw new BadRequestException('Audio file is required');
    }

    return this.evaluatorService.transcribeAudio(audioFile);
  }
}