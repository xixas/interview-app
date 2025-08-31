import { Page } from 'playwright';
import { ElectronAppHelper } from '../helpers/electron-app';

export class InterviewPage {
  constructor(private page: Page, private helper: ElectronAppHelper) {}

  // Selectors based on UI_TESTING_INSTRUCTIONS.md
  readonly selectors = {
    // Setup phase
    technologyDropdown: 'p-dropdown[formControlName="technology"]',
    difficultyDropdown: 'p-dropdown[formControlName="difficulty"]',
    questionCountInput: 'input[type="number"]',
    startInterviewBtn: 'p-button:has-text("Start Interview")',
    
    // Interview phase
    questionText: '.question-text',
    answerTextarea: 'textarea[formControlName="answer"]',
    submitAnswerBtn: 'p-button:has-text("Submit")',
    skipQuestionBtn: 'p-button:has-text("Skip")',
    nextQuestionBtn: 'p-button:has-text("Next")',
    previousQuestionBtn: 'p-button:has-text("Previous")',
    endInterviewBtn: 'p-button:has-text("End Interview")',
    
    // Progress indicators
    progressBar: 'p-progressbar',
    questionCounter: '.question-counter',
    currentQuestionNumber: '.current-question',
    totalQuestions: '.total-questions',
    
    // Evaluation results
    evaluationResults: '.evaluation-results',
    scoreDisplay: '.score-display',
    feedbackText: '.feedback-text',
    strengthsList: '.strengths-list',
    improvementsList: '.improvements-list',
    
    // Example panel
    examplePanel: 'p-panel:has-text("Example")',
    exampleContent: '.example-content',
    
    // Error states
    errorMessage: 'p-message[severity="error"]',
    loadingSpinner: 'p-progressspinner',
    
    // Settings options
    allowSkipCheckbox: 'p-checkbox[inputId="allowSkip"]',
    enableAICheckbox: 'p-checkbox[inputId="enableAI"]',
    recordAudioCheckbox: 'p-checkbox[inputId="recordAudio"]',
  };

  /**
   * Navigate to Interview page
   */
  async navigate(): Promise<void> {
    await this.helper.navigateTo('/interview');
    await this.helper.waitForStableElement(this.selectors.technologyDropdown);
  }

  /**
   * Select technology from dropdown
   */
  async selectTechnology(technology: string): Promise<void> {
    await this.page.click(this.selectors.technologyDropdown);
    await this.page.click(`p-dropdown-item:has-text("${technology}")`);
  }

  /**
   * Select difficulty level
   */
  async selectDifficulty(difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed'): Promise<void> {
    await this.page.click(this.selectors.difficultyDropdown);
    await this.page.click(`p-dropdown-item:has-text("${difficulty}")`);
  }

  /**
   * Set number of questions
   */
  async setQuestionCount(count: number): Promise<void> {
    await this.page.fill(this.selectors.questionCountInput, count.toString());
  }

  /**
   * Toggle interview settings
   */
  async toggleSetting(setting: 'allowSkip' | 'enableAI' | 'recordAudio', enabled: boolean): Promise<void> {
    const checkbox = this.selectors[`${setting}Checkbox`];
    const currentState = await this.page.isChecked(checkbox);
    
    if (currentState !== enabled) {
      await this.page.click(checkbox);
    }
  }

  /**
   * Start interview session
   */
  async startInterview(): Promise<void> {
    await this.page.click(this.selectors.startInterviewBtn);
    await this.helper.waitForStableElement(this.selectors.questionText);
  }

  /**
   * Get current question text
   */
  async getCurrentQuestionText(): Promise<string> {
    return await this.page.textContent(this.selectors.questionText) || '';
  }

  /**
   * Check if example panel is available
   */
  async hasExample(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.examplePanel, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Expand example panel
   */
  async expandExample(): Promise<void> {
    if (await this.hasExample()) {
      const panel = this.page.locator(this.selectors.examplePanel);
      const isCollapsed = await panel.getAttribute('aria-expanded') === 'false';
      
      if (isCollapsed) {
        await panel.click();
      }
    }
  }

  /**
   * Get example content
   */
  async getExampleContent(): Promise<string> {
    await this.expandExample();
    return await this.page.textContent(this.selectors.exampleContent) || '';
  }

  /**
   * Submit answer
   */
  async submitAnswer(answer: string): Promise<void> {
    await this.page.fill(this.selectors.answerTextarea, answer);
    await this.page.click(this.selectors.submitAnswerBtn);
    await this.helper.waitForLoadingComplete();
  }

  /**
   * Skip current question
   */
  async skipQuestion(): Promise<void> {
    await this.page.click(this.selectors.skipQuestionBtn);
  }

  /**
   * Get current progress information
   */
  async getProgress(): Promise<{ current: number; total: number; percentage: number }> {
    const progressText = await this.page.textContent(this.selectors.questionCounter) || '';
    const matches = progressText.match(/(\d+) of (\d+)/);
    
    if (matches) {
      const current = parseInt(matches[1]);
      const total = parseInt(matches[2]);
      const percentage = Math.round((current / total) * 100);
      return { current, total, percentage };
    }
    
    return { current: 0, total: 0, percentage: 0 };
  }

  /**
   * Check if submit button is enabled
   */
  async canSubmitAnswer(): Promise<boolean> {
    return !(await this.page.locator(this.selectors.submitAnswerBtn).isDisabled());
  }

  /**
   * Check if skip button is available
   */
  async canSkipQuestion(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.skipQuestionBtn, { timeout: 2000 });
      return !(await this.page.locator(this.selectors.skipQuestionBtn).isDisabled());
    } catch {
      return false;
    }
  }

  /**
   * Wait for evaluation results
   */
  async waitForEvaluationResults(): Promise<void> {
    await this.page.waitForSelector(this.selectors.evaluationResults, { timeout: 30000 });
  }

  /**
   * Get evaluation score
   */
  async getEvaluationScore(): Promise<number> {
    const scoreText = await this.page.textContent(this.selectors.scoreDisplay) || '0';
    return parseInt(scoreText.replace(/\D/g, ''));
  }

  /**
   * Get evaluation feedback
   */
  async getEvaluationFeedback(): Promise<string> {
    return await this.page.textContent(this.selectors.feedbackText) || '';
  }

  /**
   * Get strengths list
   */
  async getStrengths(): Promise<string[]> {
    const elements = await this.page.locator(`${this.selectors.strengthsList} li`).all();
    const strengths = [];
    
    for (const element of elements) {
      const text = await element.textContent();
      if (text) strengths.push(text);
    }
    
    return strengths;
  }

  /**
   * Get improvements list
   */
  async getImprovements(): Promise<string[]> {
    const elements = await this.page.locator(`${this.selectors.improvementsList} li`).all();
    const improvements = [];
    
    for (const element of elements) {
      const text = await element.textContent();
      if (text) improvements.push(text);
    }
    
    return improvements;
  }

  /**
   * Navigate to next question
   */
  async nextQuestion(): Promise<void> {
    await this.page.click(this.selectors.nextQuestionBtn);
    await this.helper.waitForStableElement(this.selectors.questionText);
  }

  /**
   * Navigate to previous question
   */
  async previousQuestion(): Promise<void> {
    await this.page.click(this.selectors.previousQuestionBtn);
    await this.helper.waitForStableElement(this.selectors.questionText);
  }

  /**
   * End interview session
   */
  async endInterview(): Promise<void> {
    await this.page.click(this.selectors.endInterviewBtn);
    // Confirm in dialog if present
    try {
      await this.page.click('p-dialog p-button:has-text("End Interview")', { timeout: 5000 });
    } catch {
      // No confirmation dialog
    }
  }

  /**
   * Check for error message and get text
   */
  async getErrorMessage(): Promise<string> {
    try {
      await this.page.waitForSelector(this.selectors.errorMessage, { timeout: 5000 });
      return await this.page.textContent(this.selectors.errorMessage) || '';
    } catch {
      return '';
    }
  }

  /**
   * Complete interview setup and start
   */
  async setupAndStartInterview(options: {
    technology: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
    questionCount: number;
    allowSkip?: boolean;
    enableAI?: boolean;
  }): Promise<void> {
    await this.selectTechnology(options.technology);
    await this.selectDifficulty(options.difficulty);
    await this.setQuestionCount(options.questionCount);
    
    if (options.allowSkip !== undefined) {
      await this.toggleSetting('allowSkip', options.allowSkip);
    }
    
    if (options.enableAI !== undefined) {
      await this.toggleSetting('enableAI', options.enableAI);
    }
    
    await this.startInterview();
  }

  /**
   * Complete a full question cycle (answer and get evaluation)
   */
  async answerCurrentQuestion(answer: string): Promise<{
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }> {
    await this.submitAnswer(answer);
    await this.waitForEvaluationResults();
    
    return {
      score: await this.getEvaluationScore(),
      feedback: await this.getEvaluationFeedback(),
      strengths: await this.getStrengths(),
      improvements: await this.getImprovements()
    };
  }
}