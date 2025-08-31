import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InterviewHistoryService, CreateSessionDto, CreateResponseDto, EvaluationData } from './interview-history.service';

@ApiTags('interview-history')
@Controller('interview-history')
export class InterviewHistoryController {
  constructor(private readonly interviewHistoryService: InterviewHistoryService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new interview session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(@Body() createSessionDto: CreateSessionDto) {
    return await this.interviewHistoryService.createSession(createSessionDto);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session details' })
  @ApiResponse({ status: 200, description: 'Session details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('id') sessionId: string) {
    const session = await this.interviewHistoryService.getSession(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found');
    }
    return session;
  }

  @Put('sessions/:id/progress')
  @ApiOperation({ summary: 'Update session progress' })
  @ApiResponse({ status: 200, description: 'Session progress updated' })
  async updateSessionProgress(
    @Param('id') sessionId: string,
    @Body() body: { completedQuestions: number }
  ) {
    await this.interviewHistoryService.updateSessionProgress(sessionId, body.completedQuestions);
    return { success: true };
  }

  @Put('sessions/:id/complete')
  @ApiOperation({ summary: 'Complete a session' })
  @ApiResponse({ status: 200, description: 'Session completed' })
  async completeSession(
    @Param('id') sessionId: string,
    @Body() body: { totalScore: number; maxScore: number; durationSeconds: number }
  ) {
    await this.interviewHistoryService.completeSession(
      sessionId,
      body.totalScore,
      body.maxScore,
      body.durationSeconds
    );
    return { success: true };
  }

  @Post('responses')
  @ApiOperation({ summary: 'Create a new response' })
  @ApiResponse({ status: 201, description: 'Response created successfully' })
  async createResponse(@Body() createResponseDto: CreateResponseDto) {
    return await this.interviewHistoryService.createResponse(createResponseDto);
  }

  @Put('responses/:id/evaluation')
  @ApiOperation({ summary: 'Update response with evaluation' })
  @ApiResponse({ status: 200, description: 'Response evaluation updated' })
  async updateResponseEvaluation(
    @Param('id') responseId: string,
    @Body() evaluation: EvaluationData
  ) {
    await this.interviewHistoryService.updateResponseEvaluation(responseId, evaluation);
    return { success: true };
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get session history' })
  @ApiResponse({ status: 200, description: 'Session history retrieved successfully' })
  async getSessionHistory(
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0'
  ) {
    return await this.interviewHistoryService.getSessionHistory(
      parseInt(limit),
      parseInt(offset)
    );
  }

  @Get('sessions/:id/details')
  @ApiOperation({ summary: 'Get detailed session with all responses' })
  @ApiResponse({ status: 200, description: 'Session details retrieved successfully' })
  async getSessionDetails(@Param('id') sessionId: string) {
    const session = await this.interviewHistoryService.getSessionDetails(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found');
    }
    return session;
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete a session' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  async deleteSession(@Param('id') sessionId: string) {
    await this.interviewHistoryService.deleteSession(sessionId);
    return { success: true };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics() {
    return await this.interviewHistoryService.getStatistics();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all user data' })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  async exportUserData() {
    return await this.interviewHistoryService.exportUserData();
  }

  @Post('import')
  @ApiOperation({ summary: 'Import user data' })
  @ApiResponse({ status: 200, description: 'User data imported successfully' })
  async importUserData(@Body() data: any) {
    if (!data.sessions || !Array.isArray(data.sessions)) {
      throw new BadRequestException('Invalid import data format');
    }
    
    return await this.interviewHistoryService.importUserData(data);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all user data' })
  @ApiResponse({ status: 200, description: 'All user data cleared successfully' })
  async clearAllData() {
    await this.interviewHistoryService.clearAllData();
    return { success: true, message: 'All interview data cleared' };
  }
}