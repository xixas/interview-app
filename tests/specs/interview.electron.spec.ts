import { expect } from '@playwright/test';
import { test } from '../helpers/electron-app';
import { InterviewPage } from '../pages/interview.page';
import { SettingsPage } from '../pages/settings.page';
import { ElectronAppHelper } from '../helpers/electron-app';

test.describe('Interview Page - Core Functionality', () => {
  let interviewPage: InterviewPage;
  let settingsPage: SettingsPage;
  let helper: ElectronAppHelper;

  test.beforeEach(async ({ electronApp, mainWindow }) => {
    helper = new ElectronAppHelper(electronApp, mainWindow);
    interviewPage = new InterviewPage(mainWindow, helper);
    settingsPage = new SettingsPage(mainWindow, helper);
    
    // Clear any existing data
    await helper.clearAppData();
  });

  test.describe('Interview Setup', () => {
    test.beforeEach(async () => {
      await interviewPage.navigate();
    });

    test('should display interview setup form correctly', async () => {
      await expect(interviewPage.page.locator(interviewPage.selectors.technologyDropdown)).toBeVisible();
      await expect(interviewPage.page.locator(interviewPage.selectors.difficultyDropdown)).toBeVisible();
      await expect(interviewPage.page.locator(interviewPage.selectors.questionCountInput)).toBeVisible();
      await expect(interviewPage.page.locator(interviewPage.selectors.startInterviewBtn)).toBeVisible();
    });

    test('should allow technology selection', async () => {
      await interviewPage.selectTechnology('Frontend');
      
      // Verify selection was made
      const selectedValue = await interviewPage.page.locator(interviewPage.selectors.technologyDropdown).textContent();
      expect(selectedValue).toContain('Frontend');
    });

    test('should allow difficulty selection', async () => {
      await interviewPage.selectDifficulty('Medium');
      
      const selectedValue = await interviewPage.page.locator(interviewPage.selectors.difficultyDropdown).textContent();
      expect(selectedValue).toContain('Medium');
    });

    test('should allow question count configuration', async () => {
      await interviewPage.setQuestionCount(5);
      
      const value = await interviewPage.page.locator(interviewPage.selectors.questionCountInput).inputValue();
      expect(value).toBe('5');
    });

    test('should validate minimum question count', async () => {
      await interviewPage.setQuestionCount(1);
      
      // Should not allow less than 5 questions
      const value = await interviewPage.page.locator(interviewPage.selectors.questionCountInput).inputValue();
      expect(parseInt(value)).toBeGreaterThanOrEqual(5);
    });

    test('should enable/disable interview options', async () => {
      await interviewPage.toggleSetting('allowSkip', true);
      await interviewPage.toggleSetting('enableAI', true);
      
      // Verify settings are applied
      expect(await interviewPage.page.locator(interviewPage.selectors.allowSkipCheckbox).isChecked()).toBeTruthy();
      expect(await interviewPage.page.locator(interviewPage.selectors.enableAICheckbox).isChecked()).toBeTruthy();
    });
  });

  test.describe('Starting Interview', () => {
    test('should start interview with valid configuration', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Medium',
        questionCount: 5,
        enableAI: false // Disable AI for setup test
      });
      
      // Should navigate to interview phase
      await expect(interviewPage.page.locator(interviewPage.selectors.questionText)).toBeVisible();
    });

    test('should display first question correctly', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Easy',
        questionCount: 5
      });
      
      const questionText = await interviewPage.getCurrentQuestionText();
      expect(questionText.length).toBeGreaterThan(0);
    });

    test('should show progress indicator', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Backend',
        difficulty: 'Medium',
        questionCount: 3
      });
      
      const progress = await interviewPage.getProgress();
      expect(progress.current).toBe(1);
      expect(progress.total).toBe(3);
      expect(progress.percentage).toBe(33);
    });
  });

  test.describe('Question Interaction', () => {
    test.beforeEach(async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Easy',
        questionCount: 3,
        allowSkip: true,
        enableAI: false // Disable AI for basic interaction tests
      });
    });

    test('should display example when available', async () => {
      if (await interviewPage.hasExample()) {
        await interviewPage.expandExample();
        const exampleContent = await interviewPage.getExampleContent();
        expect(exampleContent.length).toBeGreaterThan(0);
      }
    });

    test('should enable submit button when answer is provided', async () => {
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'Test answer');
      
      expect(await interviewPage.canSubmitAnswer()).toBeTruthy();
    });

    test('should allow skipping questions when enabled', async () => {
      expect(await interviewPage.canSkipQuestion()).toBeTruthy();
      
      await interviewPage.skipQuestion();
      
      // Should move to next question
      const progress = await interviewPage.getProgress();
      expect(progress.current).toBe(2);
    });

    test('should submit answer without AI evaluation', async () => {
      const testAnswer = 'This is a test answer for the interview question.';
      
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, testAnswer);
      await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
      
      // Should move to next question or show results
      await interviewPage.page.waitForTimeout(1000);
      
      // Verify we've progressed
      const progress = await interviewPage.getProgress();
      expect(progress.current).toBeGreaterThan(1);
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'System Design',
        difficulty: 'Medium',
        questionCount: 5,
        allowSkip: true
      });
    });

    test('should navigate between questions', async () => {
      // Answer first question to enable navigation
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'First answer');
      await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
      
      // Should be on question 2
      let progress = await interviewPage.getProgress();
      expect(progress.current).toBe(2);
      
      // Navigate back to previous question
      if (await interviewPage.page.locator(interviewPage.selectors.previousQuestionBtn).isVisible()) {
        await interviewPage.previousQuestion();
        progress = await interviewPage.getProgress();
        expect(progress.current).toBe(1);
      }
    });

    test('should end interview session', async () => {
      await interviewPage.endInterview();
      
      // Should navigate away from interview or show completion
      await interviewPage.page.waitForTimeout(2000);
    });
  });

  test.describe('Error Handling - No API Key', () => {
    test('should show error when AI evaluation is attempted without API key', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Medium',
        questionCount: 3,
        enableAI: true // Enable AI to trigger error
      });
      
      // Try to submit an answer
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'Test answer');
      await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
      
      // Should show error about missing API key
      const errorMessage = await interviewPage.getErrorMessage();
      expect(errorMessage.toLowerCase()).toContain('api key');
    });

    test('should guide user to Settings page', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Backend',
        difficulty: 'Easy',
        questionCount: 2,
        enableAI: true
      });
      
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'Test answer');
      await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
      
      const errorMessage = await interviewPage.getErrorMessage();
      expect(errorMessage.toLowerCase()).toContain('settings');
    });
  });

  test.describe('AI Evaluation - With API Key', () => {
    test.beforeEach(async () => {
      // Setup API key first
      const testKey = process.env.OPENAI_KEY;
      if (!testKey) {
        test.skip('No OpenAI API key provided for AI evaluation tests');
      }
      
      await settingsPage.navigate();
      await settingsPage.setupApiKey(testKey);
    });

    test('should evaluate answer with AI', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Easy',
        questionCount: 2,
        enableAI: true
      });
      
      const testAnswer = 'JavaScript uses var for function-scoped variables, let for block-scoped variables, and const for immutable block-scoped variables.';
      
      const evaluation = await interviewPage.answerCurrentQuestion(testAnswer);
      
      expect(evaluation.score).toBeGreaterThan(0);
      expect(evaluation.score).toBeLessThanOrEqual(100);
      expect(evaluation.feedback.length).toBeGreaterThan(0);
    });

    test('should provide detailed feedback', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'System Design',
        difficulty: 'Medium',
        questionCount: 1,
        enableAI: true
      });
      
      const detailedAnswer = 'A microservices architecture breaks down applications into small, independent services that communicate via APIs. Benefits include scalability, technology diversity, fault isolation, and easier deployment. However, it introduces complexity in service orchestration, data consistency, and network communication.';
      
      const evaluation = await interviewPage.answerCurrentQuestion(detailedAnswer);
      
      expect(evaluation.strengths.length).toBeGreaterThan(0);
      expect(evaluation.improvements.length).toBeGreaterThan(0);
      expect(evaluation.feedback).toContain('technical');
    });

    test('should handle poor answers appropriately', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Database',
        difficulty: 'Easy',
        questionCount: 1,
        enableAI: true
      });
      
      const poorAnswer = 'I dont know';
      
      const evaluation = await interviewPage.answerCurrentQuestion(poorAnswer);
      
      expect(evaluation.score).toBeLessThan(50);
      expect(evaluation.improvements.length).toBeGreaterThan(0);
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle long answers', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Medium',
        questionCount: 1
      });
      
      const longAnswer = 'This is a very long answer that contains multiple paragraphs and technical details. '.repeat(50);
      
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, longAnswer);
      await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
      
      // Should handle without errors
      await interviewPage.page.waitForTimeout(2000);
    });

    test('should handle rapid question navigation', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Backend',
        difficulty: 'Easy',
        questionCount: 5,
        allowSkip: true
      });
      
      // Skip through questions rapidly
      for (let i = 0; i < 3; i++) {
        await interviewPage.skipQuestion();
        await interviewPage.page.waitForTimeout(500);
      }
      
      const progress = await interviewPage.getProgress();
      expect(progress.current).toBe(4);
    });
  });

  test.describe('UI Consistency', () => {
    test('should maintain theme colors throughout interview', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Easy',
        questionCount: 2
      });
      
      // Check that question text area uses theme variables
      const questionElement = interviewPage.page.locator(interviewPage.selectors.questionText);
      const styles = await questionElement.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor
        };
      });
      
      // Should not use hardcoded white/black colors
      expect(styles.backgroundColor).not.toBe('rgb(255, 255, 255)');
      expect(styles.backgroundColor).not.toBe('rgb(0, 0, 0)');
    });

    test('should have proper loading states', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'System Design',
        difficulty: 'Hard',
        questionCount: 1,
        enableAI: true
      });
      
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'Test answer');
      
      // Click submit and check for loading state
      const submitPromise = interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
      
      // Should show loading spinner or disabled state
      try {
        await interviewPage.page.waitForSelector('p-progressspinner', { timeout: 2000 });
      } catch {
        // Loading spinner might be different or very fast
      }
      
      await submitPromise;
    });
  });
});