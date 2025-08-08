import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EvaluateAnswerDto, EvaluateAudioDto } from './dto/evaluate-answer.dto';
import { 
  EvaluationResult, 
  EvaluationCriteria, 
  AudioEvaluationResult, 
  AudioEvaluationCriteria, 
  AudioAnalysisInfo, 
  ProficiencyLevel, 
  Role, 
  QuestionType,
  TranscriptionInfo,
  ReadingAnomalies
} from '@interview-app/shared-interfaces';

@Injectable()
export class EvaluatorService {
  private readonly logger = new Logger(EvaluatorService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OpenAI API key not found. Using mock evaluation.');
    }
  }

  async evaluateAnswer(dto: EvaluateAnswerDto): Promise<EvaluationResult> {
    this.logger.log(`Evaluating answer for ${dto.role} ${dto.proficiencyLevel} role`);

    if (this.openai) {
      this.logger.log('Using AI evaluation with OpenAI');
      return this.evaluateWithAI(dto);
    } else {
      this.logger.log('Using mock evaluation (no OpenAI API key)');
      return this.createMockEvaluation(dto);
    }
  }

  private async evaluateWithAI(dto: EvaluateAnswerDto): Promise<EvaluationResult> {
    try {
      this.logger.log('Starting AI evaluation...');
      const applicableCriteria = this.getApplicableCriteria(dto.questionType, dto.question);
      this.logger.log(`Applicable criteria for question "${dto.question}": ${applicableCriteria.join(', ')}`);
      
      const prompt = this.buildEvaluationPrompt(dto, applicableCriteria);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical interviewer and software engineering manager with 15+ years of experience. Provide detailed, constructive feedback on interview answers. ONLY evaluate the criteria specified in the prompt - do not include other criteria.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      this.logger.log('AI evaluation completed, parsing response...');
      return this.parseAIResponse(aiResponse, dto, applicableCriteria);
    } catch (error) {
      this.logger.error('AI evaluation failed, falling back to mock:', error.message);
      // Fallback to mock evaluation
      return this.createMockEvaluation(dto);
    }
  }

  private getApplicableCriteria(questionType: string, question: string): string[] {
    const questionLower = question.toLowerCase();
    
    // Check for specific question patterns first
    if (questionLower.includes('tell me about yourself') || 
        questionLower.includes('introduce yourself')) {
      return ['clarity', 'communication', 'completeness'];
    }
    
    if (questionLower.includes('describe a time') ||
        questionLower.includes('tell me about a situation') ||
        questionLower.includes('give me an example of when')) {
      // Behavioral/situational questions
      return ['clarity', 'completeness', 'communication', 'problemSolving'];
    }

    // Detect knowledge-based technical questions (no problem solving needed)
    if (questionLower.includes('explain') || 
        questionLower.includes('what is') ||
        questionLower.includes('what are') ||
        questionLower.includes('how does') ||
        questionLower.includes('difference between') ||
        questionLower.includes('define') ||
        questionLower.includes('describe the concept')) {
      // Pure knowledge questions - no problem solving
      return ['technicalAccuracy', 'clarity', 'completeness', 'communication'];
    }

    // Detect problem-solving technical questions
    if (questionLower.includes('how would you') ||
        questionLower.includes('how can you') ||
        questionLower.includes('solve') ||
        questionLower.includes('implement') ||
        questionLower.includes('build') ||
        questionLower.includes('optimize') ||
        questionLower.includes('debug') ||
        questionLower.includes('fix')) {
      // Problem-solving questions
      return ['technicalAccuracy', 'problemSolving', 'clarity', 'completeness', 'bestPractices'];
    }
    
    // Based on formal question type
    switch (questionType) {
      case 'behavioral':
        return ['clarity', 'completeness', 'communication', 'problemSolving'];
      
      case 'system-design':
        return ['technicalAccuracy', 'completeness', 'problemSolving', 'bestPractices', 'clarity'];
      
      case 'coding':
        return ['technicalAccuracy', 'problemSolving', 'bestPractices', 'clarity', 'completeness'];
      
      case 'technical':
      default:
        // Default to knowledge-based for technical questions
        return ['technicalAccuracy', 'clarity', 'completeness', 'communication'];
    }
  }

  private buildEvaluationPrompt(dto: EvaluateAnswerDto, applicableCriteria?: string[]): string {
    const proficiencyExpectations = this.getProficiencyExpectations(dto.proficiencyLevel);
    const roleSpecificCriteria = this.getRoleSpecificCriteria(dto.role);
    const criteria = applicableCriteria || ['technicalAccuracy', 'clarity', 'completeness', 'problemSolving', 'communication', 'bestPractices'];
    
    const criteriaDescriptions = {
      technicalAccuracy: 'Technical Accuracy - Correctness of information and concepts',
      clarity: 'Clarity - How well the answer is communicated',
      completeness: 'Completeness - Coverage of key points and thoroughness', 
      problemSolving: 'Problem Solving - Analytical thinking and approach',
      communication: 'Communication - Professional communication skills',
      bestPractices: 'Best Practices - Knowledge of industry standards'
    };

    const relevantCriteriaList = criteria.map((criterion, index) => 
      `${index + 1}. ${criteriaDescriptions[criterion] || criterion}`
    ).join('\n');

    const jsonCriteria = criteria.reduce((acc, criterion) => {
      acc[criterion] = criterion === 'technicalAccuracy' ? 8 : 7; // Example scores
      return acc;
    }, {});

    return `
Evaluate this interview answer for a ${dto.proficiencyLevel} ${dto.role} developer position.

QUESTION: ${dto.question}

ANSWER: ${dto.answer}

CONTEXT: ${dto.context || 'Standard interview setting'}

QUESTION TYPE: ${dto.questionType}

PROFICIENCY EXPECTATIONS (${dto.proficiencyLevel.toUpperCase()}):
${proficiencyExpectations}

ROLE-SPECIFIC CRITERIA (${dto.role.toUpperCase()}):
${roleSpecificCriteria}

IMPORTANT: This is a ${dto.questionType} question. Please evaluate based ONLY on these relevant criteria (score 1-10 for each):
${relevantCriteriaList}

Note: Some criteria may not apply to this question type. Focus only on the listed criteria above.

Provide your response in this JSON format:
{
  "criteria": ${JSON.stringify(jsonCriteria, null, 4)},
  "criteriaFeedback": {
    "technicalAccuracy": "Score explanation for technical accuracy...",
    "clarity": "Score explanation for clarity...",
    "completeness": "Score explanation for completeness...",
    "communication": "Score explanation for communication..."
  },
  "strengths": ["Clear explanation of key concepts", "Good examples provided"],
  "improvements": ["Could mention edge cases", "Missing security considerations"],
  "detailedFeedback": "Detailed analysis of the answer...",
  "recommendation": "PASS",
  "nextSteps": ["Practice system design questions", "Review performance optimization"]
}

IMPORTANT: In criteriaFeedback, explain WHY each score was given. If a score is below 8, clearly explain what was missing or could be improved.
`;
  }

  private parseAIResponse(aiResponse: string, dto: EvaluateAnswerDto, applicableCriteria?: string[]): EvaluationResult {
    try {
      this.logger.log('Parsing AI response...');
      this.logger.log(`Raw AI Response: ${aiResponse.substring(0, 500)}...`);
      
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      this.logger.log(`Parsed AI criteria: ${JSON.stringify(parsed.criteria)}`);
      
      // Create complete criteria object with defaults for missing ones
      const applicableCriteriaSet = new Set(applicableCriteria || ['technicalAccuracy', 'clarity', 'completeness', 'problemSolving', 'communication', 'bestPractices']);
      this.logger.log(`Applicable criteria set: ${Array.from(applicableCriteriaSet).join(', ')}`);
      
      // Only include applicable criteria in the response
      const criteria: Partial<EvaluationCriteria> = {};
      let totalScore = 0;
      let criteriaCount = 0;
      
      if (applicableCriteriaSet.has('technicalAccuracy')) {
        criteria.technicalAccuracy = parsed.criteria.technicalAccuracy || 5;
        totalScore += criteria.technicalAccuracy;
        criteriaCount++;
      }
      if (applicableCriteriaSet.has('clarity')) {
        criteria.clarity = parsed.criteria.clarity || 7;
        totalScore += criteria.clarity;
        criteriaCount++;
      }
      if (applicableCriteriaSet.has('completeness')) {
        criteria.completeness = parsed.criteria.completeness || 6;
        totalScore += criteria.completeness;
        criteriaCount++;
      }
      if (applicableCriteriaSet.has('problemSolving')) {
        criteria.problemSolving = parsed.criteria.problemSolving || 6;
        totalScore += criteria.problemSolving;
        criteriaCount++;
      }
      if (applicableCriteriaSet.has('communication')) {
        criteria.communication = parsed.criteria.communication || 7;
        totalScore += criteria.communication;
        criteriaCount++;
      }
      if (applicableCriteriaSet.has('bestPractices')) {
        criteria.bestPractices = parsed.criteria.bestPractices || 5;
        totalScore += criteria.bestPractices;
        criteriaCount++;
      }
      
      const maxScore = criteriaCount * 10; // Number of applicable criteria × 10 points each
      const percentage = Math.round((totalScore / maxScore) * 100);

      this.logger.log(`AI Parsing complete: ${totalScore}/${maxScore} (${percentage}%) with ${criteriaCount} criteria`);

      const result = {
        overallScore: totalScore,
        maxScore,
        percentage,
        criteria,
        criteriaFeedback: parsed.criteriaFeedback || {},
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        detailedFeedback: parsed.detailedFeedback || 'Evaluation completed successfully.',
        recommendation: parsed.recommendation || 'CONDITIONAL',
        nextSteps: parsed.nextSteps || [],
      };
      
      // Add applicable criteria info for frontend display
      (result as any).applicableCriteria = Array.from(applicableCriteriaSet);
      
      return result;
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error.message);
      this.logger.log('Falling back to mock evaluation');
      return this.createMockEvaluation(dto);
    }
  }

  private createMockEvaluation(dto: EvaluateAnswerDto): EvaluationResult {
    const applicableCriteria = this.getApplicableCriteria(dto.questionType, dto.question);
    const applicableCriteriaSet = new Set(applicableCriteria);
    // Create realistic mock evaluation based on answer length and keywords
    const answerLength = dto.answer.length;
    const hasCodeExamples = dto.answer.includes('function') || dto.answer.includes('=>') || dto.answer.includes('class');
    const mentionsBestPractices = dto.answer.toLowerCase().includes('best practice') || 
                                  dto.answer.toLowerCase().includes('optimize') ||
                                  dto.answer.toLowerCase().includes('performance');

    // Base scores adjusted by proficiency level
    const baseScores = this.getBaseScores(dto.proficiencyLevel);
    
    // Adjust scores based on answer quality indicators
    const lengthBonus = Math.min(answerLength / 100, 2); // Up to 2 points for longer answers
    const codeBonus = hasCodeExamples ? 1 : 0;
    const practicesBonus = mentionsBestPractices ? 1 : 0;

    // Only include applicable criteria in the criteria object
    const criteria: Partial<EvaluationCriteria> = {};
    let totalScore = 0;
    let criteriaCount = 0;

    if (applicableCriteriaSet.has('technicalAccuracy')) {
      criteria.technicalAccuracy = Math.min(10, baseScores.technical + lengthBonus + codeBonus);
      totalScore += criteria.technicalAccuracy;
      criteriaCount++;
    }
    if (applicableCriteriaSet.has('clarity')) {
      criteria.clarity = Math.min(10, baseScores.clarity + (answerLength > 200 ? 1 : 0));
      totalScore += criteria.clarity;
      criteriaCount++;
    }
    if (applicableCriteriaSet.has('completeness')) {
      criteria.completeness = Math.min(10, baseScores.completeness + lengthBonus);
      totalScore += criteria.completeness;
      criteriaCount++;
    }
    if (applicableCriteriaSet.has('problemSolving')) {
      criteria.problemSolving = Math.min(10, baseScores.problemSolving + codeBonus + practicesBonus);
      totalScore += criteria.problemSolving;
      criteriaCount++;
    }
    if (applicableCriteriaSet.has('communication')) {
      criteria.communication = Math.min(10, baseScores.communication + (answerLength > 150 ? 1 : 0));
      totalScore += criteria.communication;
      criteriaCount++;
    }
    if (applicableCriteriaSet.has('bestPractices')) {
      criteria.bestPractices = Math.min(10, baseScores.bestPractices + practicesBonus + codeBonus);
      totalScore += criteria.bestPractices;
      criteriaCount++;
    }
    
    const maxScore = criteriaCount * 10;
    const percentage = Math.round((totalScore / maxScore) * 100);

    const result = {
      overallScore: totalScore,
      maxScore,
      percentage,
      criteria,
      criteriaFeedback: this.generateCriteriaFeedback(criteria as EvaluationCriteria, applicableCriteriaSet),
      strengths: this.generateStrengths(dto, criteria as EvaluationCriteria),
      improvements: this.generateImprovements(dto, criteria as EvaluationCriteria),
      detailedFeedback: this.generateDetailedFeedback(dto, criteria as EvaluationCriteria, percentage),
      recommendation: this.getRecommendation(percentage),
      nextSteps: this.generateNextSteps(dto, criteria as EvaluationCriteria),
    };
    
    // Add applicable criteria info for frontend display
    (result as any).applicableCriteria = Array.from(applicableCriteriaSet);
    
    return result;
  }

  private getProficiencyExpectations(level: ProficiencyLevel): string {
    const expectations = {
      [ProficiencyLevel.JUNIOR]: 'Basic understanding of concepts, willingness to learn, can implement simple solutions with guidance',
      [ProficiencyLevel.MID]: 'Solid grasp of fundamentals, independent problem solving, awareness of best practices, some experience with complex projects',
      [ProficiencyLevel.SENIOR]: 'Deep technical expertise, system design skills, mentoring ability, strong architectural knowledge, performance optimization',
      [ProficiencyLevel.LEAD]: 'Strategic technical leadership, cross-team collaboration, technology selection, complex system architecture, business alignment',
    };
    return expectations[level];
  }

  private getRoleSpecificCriteria(role: Role): string {
    const criteria = {
      [Role.FRONTEND]: 'UI/UX knowledge, browser APIs, performance optimization, responsive design, accessibility, state management',
      [Role.BACKEND]: 'Server architecture, databases, APIs, security, scalability, data modeling, caching strategies',
      [Role.FULLSTACK]: 'Both frontend and backend skills, system integration, end-to-end thinking, deployment knowledge',
      [Role.DEVOPS]: 'Infrastructure, CI/CD, monitoring, security, cloud platforms, automation, containerization',
      [Role.MOBILE]: 'Platform-specific knowledge, mobile UX patterns, performance on mobile devices, app store guidelines',
      [Role.DATA_SCIENCE]: 'Statistical knowledge, ML algorithms, data processing, visualization, model evaluation',
      [Role.QA]: 'Testing strategies, automation tools, quality metrics, bug tracking, test case design',
    };
    return criteria[role];
  }

  private getBaseScores(level: ProficiencyLevel): Record<string, number> {
    const scores = {
      [ProficiencyLevel.JUNIOR]: { technical: 5, clarity: 6, completeness: 5, problemSolving: 5, communication: 6, bestPractices: 4 },
      [ProficiencyLevel.MID]: { technical: 6, clarity: 7, completeness: 6, problemSolving: 7, communication: 7, bestPractices: 6 },
      [ProficiencyLevel.SENIOR]: { technical: 8, clarity: 8, completeness: 7, problemSolving: 8, communication: 8, bestPractices: 8 },
      [ProficiencyLevel.LEAD]: { technical: 9, clarity: 9, completeness: 8, problemSolving: 9, communication: 9, bestPractices: 9 },
    };
    return scores[level];
  }

  private generateStrengths(dto: EvaluateAnswerDto, criteria: EvaluationCriteria): string[] {
    const strengths = [];
    if (criteria.technicalAccuracy && criteria.technicalAccuracy >= 7) strengths.push('Solid technical understanding demonstrated');
    if (criteria.clarity && criteria.clarity >= 7) strengths.push('Clear and well-structured explanation');
    if (criteria.communication && criteria.communication >= 7) strengths.push('Good communication skills');
    if (dto.answer.length > 300) strengths.push('Comprehensive and detailed response');
    if (dto.answer.includes('example') || dto.answer.includes('instance')) strengths.push('Provided relevant examples');
    
    return strengths.length ? strengths : ['Shows understanding of the topic'];
  }

  private generateImprovements(dto: EvaluateAnswerDto, criteria: EvaluationCriteria): string[] {
    const improvements = [];
    if (criteria.technicalAccuracy && criteria.technicalAccuracy < 7) improvements.push('Strengthen technical knowledge in this area');
    if (criteria.bestPractices && criteria.bestPractices < 7) improvements.push('Consider industry best practices and standards');
    if (criteria.completeness && criteria.completeness < 7) improvements.push('Provide more comprehensive coverage of the topic');
    if (dto.answer.length < 150) improvements.push('Expand on key points with more detail');
    
    return improvements.length ? improvements : ['Continue practicing technical communication'];
  }

  private generateDetailedFeedback(dto: EvaluateAnswerDto, criteria: EvaluationCriteria, percentage: number): string {
    const level = dto.proficiencyLevel;
    const role = dto.role;
    
    let feedback = `This answer demonstrates a ${percentage >= 80 ? 'strong' : percentage >= 60 ? 'good' : 'basic'} understanding for a ${level} ${role} position. `;
    
    if (percentage >= 80) {
      feedback += 'The response shows excellent technical depth and communication skills. ';
    } else if (percentage >= 60) {
      feedback += 'The response covers key concepts but could benefit from more depth in certain areas. ';
    } else {
      feedback += 'The response shows foundational knowledge but needs strengthening in several areas. ';
    }

    const applicableCriteriaCount = Object.keys(criteria).filter(key => criteria[key] > 0).length;
    feedback += `Evaluated based on ${applicableCriteriaCount} applicable criteria for this question type. `;
    
    if (criteria.technicalAccuracy) feedback += `Technical accuracy: ${criteria.technicalAccuracy}/10. `;
    if (criteria.clarity) feedback += `Clarity: ${criteria.clarity}/10. `;
    if (criteria.completeness) feedback += `Completeness: ${criteria.completeness}/10. `;
    if (criteria.communication) feedback += `Communication: ${criteria.communication}/10. `;

    return feedback;
  }

  private getRecommendation(percentage: number): 'PASS' | 'CONDITIONAL' | 'FAIL' {
    if (percentage >= 75) return 'PASS';
    if (percentage >= 60) return 'CONDITIONAL';
    return 'FAIL';
  }

  private generateCriteriaFeedback(criteria: EvaluationCriteria, applicableCriteriaSet: Set<string>): Record<string, string> {
    const feedback: Record<string, string> = {};
    
    if (applicableCriteriaSet.has('technicalAccuracy')) {
      const score = criteria.technicalAccuracy;
      if (score >= 8) feedback.technicalAccuracy = `Excellent technical knowledge demonstrated (${score}/10)`;
      else if (score >= 6) feedback.technicalAccuracy = `Good technical understanding with some gaps (${score}/10)`;
      else feedback.technicalAccuracy = `Technical accuracy needs improvement - consider reviewing core concepts (${score}/10)`;
    }
    
    if (applicableCriteriaSet.has('clarity')) {
      const score = criteria.clarity;
      if (score >= 8) feedback.clarity = `Very clear and well-structured explanation (${score}/10)`;
      else if (score >= 6) feedback.clarity = `Generally clear but could be more organized (${score}/10)`;
      else feedback.clarity = `Explanation lacks clarity - work on structuring thoughts better (${score}/10)`;
    }
    
    if (applicableCriteriaSet.has('completeness')) {
      const score = criteria.completeness;
      if (score >= 8) feedback.completeness = `Comprehensive answer covering all key aspects (${score}/10)`;
      else if (score >= 6) feedback.completeness = `Covers main points but missing some details (${score}/10)`;
      else feedback.completeness = `Answer is incomplete - several important aspects not covered (${score}/10)`;
    }
    
    if (applicableCriteriaSet.has('problemSolving')) {
      const score = criteria.problemSolving;
      if (score >= 8) feedback.problemSolving = `Strong analytical approach and problem-solving methodology (${score}/10)`;
      else if (score >= 6) feedback.problemSolving = `Decent problem-solving approach with room for improvement (${score}/10)`;
      else feedback.problemSolving = `Problem-solving approach needs strengthening - consider more systematic thinking (${score}/10)`;
    }
    
    if (applicableCriteriaSet.has('communication')) {
      const score = criteria.communication;
      if (score >= 8) feedback.communication = `Excellent communication skills and professional presentation (${score}/10)`;
      else if (score >= 6) feedback.communication = `Good communication with minor areas for improvement (${score}/10)`;
      else feedback.communication = `Communication skills need development - work on clarity and flow (${score}/10)`;
    }
    
    if (applicableCriteriaSet.has('bestPractices')) {
      const score = criteria.bestPractices;
      if (score >= 8) feedback.bestPractices = `Strong knowledge of industry best practices and standards (${score}/10)`;
      else if (score >= 6) feedback.bestPractices = `Some awareness of best practices but could be stronger (${score}/10)`;
      else feedback.bestPractices = `Limited knowledge of best practices - review industry standards (${score}/10)`;
    }
    
    return feedback;
  }

  private generateNextSteps(dto: EvaluateAnswerDto, criteria: EvaluationCriteria): string[] {
    const nextSteps = [];
    
    if (criteria.technicalAccuracy && criteria.technicalAccuracy < 7) {
      nextSteps.push(`Study core ${dto.role} concepts and fundamentals`);
    }
    
    if (criteria.bestPractices && criteria.bestPractices < 7) {
      nextSteps.push('Review industry best practices and coding standards');
    }
    
    if (criteria.problemSolving && criteria.problemSolving < 7) {
      nextSteps.push('Practice problem-solving with coding challenges');
    }
    
    if (dto.proficiencyLevel === ProficiencyLevel.SENIOR || dto.proficiencyLevel === ProficiencyLevel.LEAD) {
      nextSteps.push('Focus on system design and architectural patterns');
    }
    
    nextSteps.push('Continue practicing technical interview questions');
    
    return nextSteps.slice(0, 3); // Return top 3 recommendations
  }

  async transcribeAudio(audioFile: Express.Multer.File): Promise<TranscriptionInfo> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI service not available. Please check API key configuration.');
    }

    try {
      this.logger.log(`Received audio file: ${audioFile.originalname}, mime: ${audioFile.mimetype}, size: ${audioFile.size}`);
      this.logger.log(`Buffer available: ${!!audioFile.buffer}, buffer length: ${audioFile.buffer?.length || 'undefined'}`);
      
      if (!audioFile.buffer) {
        throw new BadRequestException('Audio file buffer is empty. Please ensure the file is properly uploaded.');
      }

      // Create a temporary file for the audio
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio_${Date.now()}_${audioFile.originalname}`);
      
      // Write the buffer to a temporary file
      fs.writeFileSync(tempFilePath, audioFile.buffer);

      // Transcribe using OpenAI Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: 'en', // Can be made configurable
        response_format: 'verbose_json',
      });

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      return {
        text: transcription.text,
        duration: transcription.duration,
        language: transcription.language
      };
    } catch (error) {
      this.logger.error('Failed to transcribe audio:', error);
      throw new BadRequestException('Failed to transcribe audio. Please ensure the audio file is valid.');
    }
  }

  async evaluateAudioAnswer(audioFile: Express.Multer.File, evaluateAudioDto: EvaluateAudioDto): Promise<AudioEvaluationResult> {
    try {
      this.logger.log('Starting comprehensive audio evaluation');
      
      // First, transcribe the audio to get the text content
      const transcriptionResult = await this.transcribeAudio(audioFile);
      
      // Perform direct audio analysis using AI
      const audioAnalysis = await this.analyzeAudioDirectly(audioFile, transcriptionResult, evaluateAudioDto);
      
      // Then evaluate the content and communication together
      const evaluation = await this.evaluateAudioWithContext(
        transcriptionResult,
        audioAnalysis,
        evaluateAudioDto
      );
      
      return evaluation;
    } catch (error) {
      this.logger.error('Failed to evaluate audio answer:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process audio answer. Please try again.');
    }
  }

  private async analyzeAudioDirectly(
    audioFile: Express.Multer.File,
    transcription: TranscriptionInfo,
    evaluateAudioDto: EvaluateAudioDto
  ): Promise<AudioAnalysisInfo> {
    if (!this.openai) {
      // Return basic analysis based on transcription
      return this.createBasicAudioAnalysis(transcription);
    }

    try {
      const audioAnalysisPrompt = this.buildAudioAnalysisPrompt(transcription, evaluateAudioDto);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert communication analyst specializing in interview speech patterns, confidence assessment, and professional presentation skills. Analyze audio transcriptions for communication quality indicators.'
          },
          {
            role: 'user',
            content: audioAnalysisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 800,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI audio analysis');
      }

      return this.parseAudioAnalysisResponse(aiResponse, transcription);
    } catch (error) {
      this.logger.error('AI audio analysis failed, using basic analysis:', error);
      return this.createBasicAudioAnalysis(transcription);
    }
  }

  private buildAudioAnalysisPrompt(
    transcription: TranscriptionInfo,
    evaluateAudioDto: EvaluateAudioDto
  ): string {
    const duration = transcription.duration || 0;
    const wordCount = transcription.text.trim().split(/\s+/).length;
    const speakingRate = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

    return `
Analyze this interview audio transcription for communication quality, professional presentation, and authenticity:

INTERVIEW CONTEXT:
- Question: ${evaluateAudioDto.question}
- Role: ${evaluateAudioDto.proficiencyLevel} ${evaluateAudioDto.role}
- Duration: ${duration} seconds
- Word Count: ${wordCount}
- Speaking Rate: ${speakingRate} words/minute

TRANSCRIPTION:
"${transcription.text}"

Please analyze the communication patterns and provide insights in this JSON format:
{
  "speakingRate": ${speakingRate},
  "pauseCount": 5,
  "averagePauseLength": 1.2,
  "fillerWordCount": 3,
  "confidenceMarkers": ["clear statements", "definitive language"],
  "hesitationMarkers": ["um", "uh", "I think maybe"],
  "readingAnomalies": {
    "isLikelyReading": false,
    "readingIndicators": [],
    "naturalityScore": 8,
    "explanation": "Natural conversational flow with appropriate pauses"
  }
}

Focus on:
1. Filler words (um, uh, like, you know, I mean)
2. Hesitation patterns and uncertainty markers
3. Confidence indicators (definitive statements, clear explanations)
4. Speaking pace appropriateness for interview setting
5. Professional communication markers
6. ANOMALY DETECTION - Signs of reading from script:
   - Monotone/robotic delivery patterns
   - Unusual lack of natural pauses or filler words
   - Perfect grammar without natural speech patterns
   - Consistent rhythm without variation
   - Complete sentences without natural breaks
   - Lack of self-corrections or natural hesitations
   - Overly formal language inconsistent with conversational style

Rate naturalityScore 1-10 where:
- 1-3: Strong indicators of reading from script
- 4-6: Some artificial elements, possibly reading
- 7-10: Natural conversational delivery

IMPORTANT: Be strict in detecting reading behavior. Look for these red flags:
- Zero filler words in responses over 30 words
- Perfect grammar without natural speech patterns
- Long average sentence length (>18 words)
- No self-corrections or false starts
- Overly formal transitions and connectors
`;
  }

  private parseAudioAnalysisResponse(
    aiResponse: string, 
    transcription: TranscriptionInfo
  ): AudioAnalysisInfo {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI audio analysis response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        speakingRate: parsed.speakingRate || 0,
        pauseCount: parsed.pauseCount || 0,
        averagePauseLength: parsed.averagePauseLength || 0,
        fillerWordCount: parsed.fillerWordCount || 0,
        confidenceMarkers: parsed.confidenceMarkers || [],
        hesitationMarkers: parsed.hesitationMarkers || [],
        readingAnomalies: parsed.readingAnomalies ? {
          isLikelyReading: parsed.readingAnomalies.isLikelyReading || false,
          readingIndicators: parsed.readingAnomalies.readingIndicators || [],
          naturalityScore: parsed.readingAnomalies.naturalityScore || 8,
          explanation: parsed.readingAnomalies.explanation || 'Natural conversational flow'
        } : undefined
      };
    } catch (error) {
      this.logger.error('Failed to parse AI audio analysis response:', error);
      return this.createBasicAudioAnalysis(transcription);
    }
  }

  private createBasicAudioAnalysis(transcription: TranscriptionInfo): AudioAnalysisInfo {
    const text = transcription.text.toLowerCase();
    const wordCount = transcription.text.trim().split(/\s+/).length;
    const duration = transcription.duration || 0;
    
    // Basic filler word detection
    const fillerWords = ['um', 'uh', 'like', 'you know', 'i mean', 'so', 'well'];
    let fillerCount = 0;
    const hesitationMarkers: string[] = [];
    
    fillerWords.forEach(filler => {
      const matches = text.match(new RegExp(filler, 'g'));
      if (matches) {
        fillerCount += matches.length;
        if (matches.length > 0) {
          hesitationMarkers.push(`${filler} (${matches.length}x)`);
        }
      }
    });

    // Basic confidence markers
    const confidenceMarkers: string[] = [];
    if (text.includes('i believe') || text.includes('i know')) {
      confidenceMarkers.push('assertive statements');
    }
    if (text.includes('definitely') || text.includes('certainly')) {
      confidenceMarkers.push('definitive language');
    }

    // Enhanced anomaly detection for reading behavior
    const readingIndicators: string[] = [];
    let naturalityScore = 8; // Start with natural assumption
    
    // Strong indicators of reading
    if (fillerCount === 0 && wordCount > 30) {
      readingIndicators.push('No filler words in extended response');
      naturalityScore -= 3; // More aggressive penalty
    }
    
    // Check for perfect grammar patterns
    if (!text.includes(' uh ') && !text.includes(' um ') && !text.includes(' like ') && wordCount > 50) {
      readingIndicators.push('Unusually perfect speech without natural hesitations');
      naturalityScore -= 2;
    }
    
    // Long, complex sentences without breaks
    const sentences = transcription.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    if (avgSentenceLength > 18) {
      readingIndicators.push(`Very long average sentence length (${Math.round(avgSentenceLength)} words)`);
      naturalityScore -= 2;
    }
    
    // Check for overly formal language
    if (text.includes('furthermore') || text.includes('moreover') || text.includes('consequently') || 
        text.includes('therefore') || text.includes('however') || text.includes('specifically')) {
      readingIndicators.push('Overly formal written language patterns');
      naturalityScore -= 1;
    }
    
    // Check for run-on sentences (commas without natural breaks)
    const commaCount = (transcription.text.match(/,/g) || []).length;
    if (commaCount > wordCount / 20) { // More than 1 comma per 20 words
      readingIndicators.push('Excessive use of commas suggesting written text');
      naturalityScore -= 1;
    }
    
    // No self-corrections or false starts
    if (!text.includes(' i mean ') && !text.includes(' actually ') && !text.includes(' well ') && 
        !text.includes(' you know ') && wordCount > 40) {
      readingIndicators.push('No self-corrections or natural speech patterns');
      naturalityScore -= 1;
    }

    const isLikelyReading = naturalityScore <= 6; // More sensitive threshold
    
    return {
      speakingRate: duration > 0 ? Math.round((wordCount / duration) * 60) : 0,
      pauseCount: Math.max(0, Math.floor(duration / 10)), // Estimate based on duration
      averagePauseLength: 1.0,
      fillerWordCount: fillerCount,
      confidenceMarkers,
      hesitationMarkers,
      readingAnomalies: {
        isLikelyReading,
        readingIndicators,
        naturalityScore: Math.max(1, Math.min(10, naturalityScore)),
        explanation: isLikelyReading ? 
          'Response may be read from a script - lacks natural speech patterns' :
          'Response appears naturally delivered with appropriate speech patterns'
      }
    };
  }

  private async evaluateAudioWithContext(
    transcription: TranscriptionInfo,
    audioAnalysis: AudioAnalysisInfo,
    evaluateAudioDto: EvaluateAudioDto
  ): Promise<AudioEvaluationResult> {
    // Get base text evaluation
    const textEvaluateDto: EvaluateAnswerDto = {
      question: evaluateAudioDto.question,
      answer: transcription.text,
      role: evaluateAudioDto.role,
      proficiencyLevel: evaluateAudioDto.proficiencyLevel,
      questionType: evaluateAudioDto.questionType,
      context: evaluateAudioDto.context
    };

    const baseEvaluation = await this.evaluateAnswer(textEvaluateDto);
    
    // Calculate audio-specific criteria
    const audioSpecificCriteria = this.calculateAudioCriteria(audioAnalysis, transcription.duration || 0);
    
    // Get the applicable criteria from base evaluation
    const applicableCriteriaArray = (baseEvaluation as any).applicableCriteria || [];
    const applicableCriteriaSet = new Set(applicableCriteriaArray);
    
    // Only include applicable base criteria (exclude ones with 0 scores)
    const filteredBaseCriteria: Partial<EvaluationCriteria> = {};
    Object.entries(baseEvaluation.criteria).forEach(([key, value]) => {
      if (applicableCriteriaSet.has(key) && value > 0) {
        filteredBaseCriteria[key] = value;
      }
    });
    
    // Combine only applicable criteria + audio criteria  
    const combinedCriteria: Partial<AudioEvaluationCriteria> = {
      ...filteredBaseCriteria,    // Only applicable criteria from base evaluation
      ...audioSpecificCriteria    // All 4 audio-specific criteria
    };

    // Calculate total score from actual criteria included
    const totalScore = Object.values(combinedCriteria).reduce((sum, score) => sum + score, 0);
    const baseCriteriaCount = Object.keys(filteredBaseCriteria).length;
    const audioCriteriaCount = 4; // speakingPace, confidence, articulation, professionalPresence
    const maxScore = (baseCriteriaCount + audioCriteriaCount) * 10;
    const percentage = Math.round((totalScore / maxScore) * 100);

    // Enhanced feedback with audio insights
    const enhancedFeedback = this.generateAudioEnhancedFeedback(
      baseEvaluation,
      audioAnalysis,
      combinedCriteria as AudioEvaluationCriteria,
      percentage
    );

    // Log the evaluation details for debugging
    this.logger.log(`Audio Evaluation Complete:`);
    this.logger.log(`- Base criteria: ${Object.keys(filteredBaseCriteria).join(', ')}`);
    this.logger.log(`- Audio criteria: ${Object.keys(audioSpecificCriteria).join(', ')}`);
    this.logger.log(`- Total score: ${totalScore}/${maxScore} (${percentage}%)`);
    this.logger.log(`- Reading detected: ${audioAnalysis.readingAnomalies?.isLikelyReading || false}`);

    return {
      overallScore: totalScore,
      maxScore,
      percentage,
      criteria: combinedCriteria,
      criteriaFeedback: (baseEvaluation as any).criteriaFeedback || {},
      strengths: enhancedFeedback.strengths,
      improvements: enhancedFeedback.improvements,
      detailedFeedback: enhancedFeedback.detailedFeedback,
      recommendation: this.getRecommendation(percentage),
      nextSteps: enhancedFeedback.nextSteps,
      transcription,
      audioAnalysis
    };
  }

  private calculateAudioCriteria(audioAnalysis: AudioAnalysisInfo, duration: number): { speakingPace: number; confidence: number; articulation: number; professionalPresence: number } {
    const speakingPace = this.evaluateSpeakingPace(audioAnalysis.speakingRate);
    const confidence = this.evaluateConfidence(audioAnalysis);
    const articulation = this.evaluateArticulation(audioAnalysis);
    const professionalPresence = this.evaluateProfessionalPresence(audioAnalysis, duration);

    return {
      speakingPace,
      confidence,
      articulation,
      professionalPresence
    };
  }

  private evaluateSpeakingPace(speakingRate: number): number {
    // Optimal speaking rate for interviews: 140-160 WPM
    if (speakingRate >= 140 && speakingRate <= 160) return 10;
    if (speakingRate >= 120 && speakingRate <= 180) return 8;
    if (speakingRate >= 100 && speakingRate <= 200) return 6;
    if (speakingRate >= 80 && speakingRate <= 220) return 4;
    return 2;
  }

  private evaluateConfidence(audioAnalysis: AudioAnalysisInfo): number {
    let score = 8; // Start with good confidence
    
    // Reduce for excessive filler words
    if (audioAnalysis.fillerWordCount > 5) score -= 2;
    else if (audioAnalysis.fillerWordCount > 3) score -= 1;
    
    // Boost for confidence markers
    if (audioAnalysis.confidenceMarkers.length > 2) score += 1;
    
    // Reduce for hesitation markers
    if (audioAnalysis.hesitationMarkers.length > 3) score -= 1;
    
    return Math.max(1, Math.min(10, score));
  }

  private evaluateArticulation(audioAnalysis: AudioAnalysisInfo): number {
    let score = 7; // Start with reasonable articulation
    
    // Filler words indicate less clear articulation
    if (audioAnalysis.fillerWordCount > 4) score -= 2;
    else if (audioAnalysis.fillerWordCount > 2) score -= 1;
    
    // Good speaking pace indicates better articulation
    if (audioAnalysis.speakingRate >= 120 && audioAnalysis.speakingRate <= 180) {
      score += 1;
    }
    
    return Math.max(1, Math.min(10, score));
  }

  private evaluateProfessionalPresence(audioAnalysis: AudioAnalysisInfo, duration: number): number {
    let score = 7; // Base professional presence score
    
    // Appropriate speaking pace
    if (audioAnalysis.speakingRate >= 130 && audioAnalysis.speakingRate <= 170) {
      score += 1;
    }
    
    // Low filler words indicate professionalism
    if (audioAnalysis.fillerWordCount <= 2) score += 1;
    else if (audioAnalysis.fillerWordCount > 5) score -= 2;
    
    // Confidence markers boost professionalism
    if (audioAnalysis.confidenceMarkers.length > 1) score += 1;
    
    // Reasonable answer length shows preparation
    if (duration >= 30 && duration <= 180) score += 1;
    
    return Math.max(1, Math.min(10, score));
  }

  private generateAudioEnhancedFeedback(
    baseEvaluation: EvaluationResult,
    audioAnalysis: AudioAnalysisInfo,
    criteria: AudioEvaluationCriteria,
    percentage: number
  ) {
    const strengths = [...baseEvaluation.strengths];
    const improvements = [...baseEvaluation.improvements];
    const nextSteps = [...baseEvaluation.nextSteps];

    // Audio-specific feedback
    if (criteria.speakingPace >= 8) {
      strengths.push('Excellent speaking pace for interview setting');
    } else if (criteria.speakingPace <= 5) {
      improvements.push('Adjust speaking pace for better communication flow');
    }

    if (criteria.confidence >= 8) {
      strengths.push('Confident and assured communication style');
    } else if (criteria.confidence <= 5) {
      improvements.push('Work on reducing hesitation and filler words');
      nextSteps.push('Practice speaking with more confidence and certainty');
    }

    if (audioAnalysis.fillerWordCount <= 2) {
      strengths.push('Minimal use of filler words - very professional');
    } else if (audioAnalysis.fillerWordCount > 5) {
      improvements.push('Reduce filler words (um, uh, like) for clearer communication');
    }

    if (criteria.professionalPresence >= 8) {
      strengths.push('Strong professional presence and interview demeanor');
    }

    // Speaking rate specific feedback
    if (audioAnalysis.speakingRate < 120) {
      improvements.push('Consider speaking slightly faster to maintain engagement');
    } else if (audioAnalysis.speakingRate > 180) {
      improvements.push('Slow down slightly to ensure clarity and comprehension');
    }

    // Anomaly detection feedback
    if (audioAnalysis.readingAnomalies) {
      if (audioAnalysis.readingAnomalies.isLikelyReading) {
        improvements.push('READING DETECTED: Speech patterns strongly suggest reading from a script');
        improvements.push('Practice delivering answers spontaneously without written notes');
        nextSteps.push('Record yourself answering questions without any preparation materials');
        nextSteps.push('Focus on natural speech patterns with appropriate hesitations and corrections');
        
        // More aggressive penalty for reading
        if (criteria.professionalPresence > 3) {
          criteria.professionalPresence = Math.max(3, criteria.professionalPresence - 3);
        }
        if (criteria.confidence > 5) {
          criteria.confidence = Math.max(5, criteria.confidence - 2);
        }
      } else if (audioAnalysis.readingAnomalies.naturalityScore < 7) {
        improvements.push('Some speech patterns may indicate prepared response - aim for more natural delivery');
        nextSteps.push('Practice impromptu responses to build natural speaking confidence');
      } else if (audioAnalysis.readingAnomalies.naturalityScore >= 8) {
        strengths.push('Natural, conversational delivery style');
      }
    }

    let detailedFeedback = `${baseEvaluation.detailedFeedback}\n\nAudio Communication Analysis: Your speaking rate was ${audioAnalysis.speakingRate} words per minute with ${audioAnalysis.fillerWordCount} filler words. Communication confidence scored ${criteria.confidence}/10, and professional presence scored ${criteria.professionalPresence}/10.`;

    if (audioAnalysis.confidenceMarkers.length > 0) {
      detailedFeedback += ` Positive confidence indicators detected: ${audioAnalysis.confidenceMarkers.join(', ')}.`;
    }

    if (audioAnalysis.readingAnomalies) {
      detailedFeedback += ` Speech Authenticity: ${audioAnalysis.readingAnomalies.explanation} (Naturality score: ${audioAnalysis.readingAnomalies.naturalityScore}/10).`;
      
      if (audioAnalysis.readingAnomalies.readingIndicators.length > 0) {
        detailedFeedback += ` Note: ${audioAnalysis.readingAnomalies.readingIndicators.join(', ')}.`;
      }
    }

    return {
      strengths: strengths.slice(0, 6), // Limit to top strengths
      improvements: improvements.slice(0, 6), // Limit to top improvements  
      nextSteps: nextSteps.slice(0, 4), // Limit to top next steps
      detailedFeedback
    };
  }
}