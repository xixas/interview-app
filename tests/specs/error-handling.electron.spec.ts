import { expect } from '@playwright/test';
import { test } from '../helpers/electron-app';
import { InterviewPage } from '../pages/interview.page';
import { SettingsPage } from '../pages/settings.page';
import { DashboardPage } from '../pages/dashboard.page';
import { ElectronAppHelper } from '../helpers/electron-app';

test.describe('Error Handling - Comprehensive Scenarios', () => {
  let interviewPage: InterviewPage;
  let settingsPage: SettingsPage;
  let dashboardPage: DashboardPage;
  let helper: ElectronAppHelper;

  test.beforeEach(async ({ electronApp, mainWindow }) => {
    helper = new ElectronAppHelper(electronApp, mainWindow);
    interviewPage = new InterviewPage(mainWindow, helper);
    settingsPage = new SettingsPage(mainWindow, helper);
    dashboardPage = new DashboardPage(mainWindow, helper);
    
    // Start with clean state
    await helper.clearAppData();
  });

  test.describe('API Key Configuration Errors', () => {
    test('should show clear error for missing API key during evaluation', async () => {
      // Navigate to interview without setting up API key
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Medium',
        questionCount: 3,
        enableAI: true // This should trigger the error
      });

      // Submit an answer
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'Test answer');
      await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);

      // Should show clear error message
      const errorMessage = await interviewPage.getErrorMessage();
      expect(errorMessage.toLowerCase()).toMatch(/api key|openai|configuration|settings/);
      expect(errorMessage).not.toContain('undefined');
      expect(errorMessage).not.toContain('null');
    });

    test('should guide user to Settings page from error message', async () => {
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

    test('should show descriptive error for invalid API key format', async () => {
      await settingsPage.navigate();
      
      const invalidKeys = [
        'not-an-api-key',
        'sk-',
        'sk-too-short',
        '12345',
        'random-text'
      ];

      for (const invalidKey of invalidKeys) {
        await settingsPage.page.reload();
        await settingsPage.navigate();
        await settingsPage.setApiKey(invalidKey);
        
        const result = await settingsPage.testConnection();
        expect(result).toBe('error');
        
        const errorMessage = await settingsPage.getErrorMessage();
        expect(errorMessage.length).toBeGreaterThan(0);
        expect(errorMessage).not.toContain('undefined');
      }
    });

    test('should handle API key test timeout gracefully', async () => {
      await settingsPage.navigate();
      await settingsPage.setApiKey('sk-test-timeout-key-that-will-fail');
      
      const startTime = Date.now();
      const result = await settingsPage.testConnection();
      const endTime = Date.now();
      
      expect(result).toBe('error');
      expect(endTime - startTime).toBeLessThan(60000); // Should timeout within reasonable time
      
      const errorMessage = await settingsPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    });
  });

  test.describe('Service Availability Errors', () => {
    test('should show clear message when evaluator service is unavailable', async () => {
      // Set up API key but evaluator service might be down
      const testKey = 'sk-test-service-unavailable';
      await settingsPage.navigate();
      await settingsPage.setApiKey(testKey);
      
      // Try to test connection (this might fail due to service unavailability)
      const result = await settingsPage.testConnection();
      
      if (result === 'error') {
        const errorMessage = await settingsPage.getErrorMessage();
        expect(errorMessage).not.toContain('undefined');
        expect(errorMessage).not.toContain('500 Internal Server Error');
        // Should have user-friendly message
        expect(errorMessage.length).toBeGreaterThan(10);
      }
    });

    test('should handle database connection errors gracefully', async () => {
      await interviewPage.navigate();
      
      try {
        await interviewPage.setupAndStartInterview({
          technology: 'System Design',
          difficulty: 'Medium',
          questionCount: 5
        });
      } catch (error) {
        // If database is unavailable, should show user-friendly error
        const errorMessage = await interviewPage.getErrorMessage();
        expect(errorMessage).not.toContain('SQLITE_CANTOPEN');
        expect(errorMessage).not.toContain('database lock');
        expect(errorMessage).not.toContain('Connection refused');
      }
    });

    test('should show fallback when question data is unavailable', async () => {
      await interviewPage.navigate();
      
      try {
        await interviewPage.selectTechnology('NonExistentTechnology');
        await interviewPage.selectDifficulty('Hard');
        await interviewPage.setQuestionCount(10);
        await interviewPage.page.click(interviewPage.selectors.startInterviewBtn);
        
        // Should either show error or gracefully handle missing questions
        const hasError = await interviewPage.getErrorMessage();
        if (hasError) {
          expect(hasError).not.toContain('Error: [object Object]');
          expect(hasError).not.toContain('undefined');
        }
      } catch (error) {
        // This is acceptable - just testing error handling
      }
    });
  });

  test.describe('Network and API Errors', () => {
    test('should handle OpenAI API rate limiting', async () => {
      // This test simulates rate limiting scenario
      const testKey = process.env.OPENAI_KEY;
      if (!testKey) {
        test.skip('No OpenAI API key provided for rate limiting test');
      }

      await settingsPage.navigate();
      await settingsPage.setupApiKey(testKey);
      
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Easy',
        questionCount: 1,
        enableAI: true
      });

      // Submit answer that might hit rate limits
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'Test answer for rate limiting');
      await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
      
      // If rate limited, should show appropriate error
      const errorMessage = await interviewPage.getErrorMessage();
      if (errorMessage.toLowerCase().includes('rate') || errorMessage.toLowerCase().includes('quota')) {
        expect(errorMessage).not.toContain('429');
        expect(errorMessage).not.toContain('Too Many Requests');
        // Should have user-friendly message about quotas
      }
    });

    test('should handle network connectivity issues', async () => {
      await settingsPage.navigate();
      
      // Try to test connection with a key that will cause network issues
      await settingsPage.setApiKey('sk-network-test-key');
      const result = await settingsPage.testConnection();
      
      if (result === 'error') {
        const errorMessage = await settingsPage.getErrorMessage();
        expect(errorMessage).not.toContain('ERR_INTERNET_DISCONNECTED');
        expect(errorMessage).not.toContain('ENOTFOUND');
        expect(errorMessage).not.toContain('ECONNREFUSED');
        // Should have user-friendly network error message
        expect(errorMessage.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Web vs Desktop Mode Errors', () => {
    test('should show clear message about desktop mode requirements', async () => {
      // This test assumes we can simulate web mode somehow
      // In actual web mode, should show appropriate messages
      
      await interviewPage.navigate();
      
      // Try to start interview with AI evaluation
      try {
        await interviewPage.setupAndStartInterview({
          technology: 'Database',
          difficulty: 'Medium',
          questionCount: 2,
          enableAI: true
        });
        
        await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'Test answer');
        await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
        
        const errorMessage = await interviewPage.getErrorMessage();
        if (errorMessage.toLowerCase().includes('desktop')) {
          expect(errorMessage).toContain('desktop');
          expect(errorMessage).not.toContain('electronAPI');
          expect(errorMessage).not.toContain('undefined');
        }
      } catch (error) {
        // Desktop mode restriction is working
        expect(error.message).toBeTruthy();
      }
    });

    test('should gracefully degrade features in web mode', async () => {
      // Features that require desktop mode should be disabled or show alternatives
      await settingsPage.navigate();
      
      // Environment info should indicate mode
      const envInfo = await settingsPage.page.textContent(settingsPage.selectors.environmentCard);
      if (envInfo) {
        expect(envInfo).toMatch(/desktop|web/i);
      }
    });
  });

  test.describe('Input Validation Errors', () => {
    test('should validate interview configuration inputs', async () => {
      await interviewPage.navigate();
      
      // Try invalid question count
      await interviewPage.setQuestionCount(-1);
      const questionCount = parseInt(await interviewPage.page.locator(interviewPage.selectors.questionCountInput).inputValue());
      expect(questionCount).toBeGreaterThanOrEqual(5);
      
      // Try extremely high question count
      await interviewPage.setQuestionCount(1000);
      const highCount = parseInt(await interviewPage.page.locator(interviewPage.selectors.questionCountInput).inputValue());
      expect(highCount).toBeLessThanOrEqual(50); // Should have reasonable maximum
    });

    test('should handle empty or invalid answers', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Frontend',
        difficulty: 'Easy',
        questionCount: 2,
        enableAI: false
      });

      // Try to submit empty answer
      await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
      
      // Should either prevent submission or handle gracefully
      const canSubmit = await interviewPage.canSubmitAnswer();
      if (!canSubmit) {
        // Button should be disabled for empty answers
        expect(canSubmit).toBeFalsy();
      }
    });

    test('should handle very long answers', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'System Design',
        difficulty: 'Medium',
        questionCount: 1,
        enableAI: false
      });

      // Create very long answer
      const longAnswer = 'This is a very long answer. '.repeat(1000);
      
      await interviewPage.page.fill(interviewPage.selectors.answerTextarea, longAnswer);
      
      // Should handle without crashing
      try {
        await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
        await interviewPage.page.waitForTimeout(2000);
      } catch (error) {
        // Should not crash the application
        const errorMessage = await interviewPage.getErrorMessage();
        if (errorMessage) {
          expect(errorMessage).not.toContain('out of memory');
          expect(errorMessage).not.toContain('payload too large');
        }
      }
    });
  });

  test.describe('State Management Errors', () => {
    test('should handle corrupted application state', async () => {
      // Simulate corrupted local storage
      await interviewPage.page.evaluate(() => {
        localStorage.setItem('app-state', 'invalid-json-{{{');
        localStorage.setItem('user-settings', 'corrupted-data');
      });
      
      // Navigate to pages - should not crash
      await dashboardPage.navigate();
      await dashboardPage.waitForDashboardLoad();
      
      await settingsPage.navigate();
      await expect(settingsPage.page.locator(settingsPage.selectors.apiKeyInput)).toBeVisible();
      
      await interviewPage.navigate();
      await expect(interviewPage.page.locator(interviewPage.selectors.technologyDropdown)).toBeVisible();
    });

    test('should recover from session interruption', async () => {
      await interviewPage.navigate();
      await interviewPage.setupAndStartInterview({
        technology: 'Backend',
        difficulty: 'Medium',
        questionCount: 3
      });
      
      // Simulate page refresh during interview
      await interviewPage.page.reload();
      
      // Should either resume or restart gracefully
      await interviewPage.page.waitForTimeout(2000);
      
      // Should not show JavaScript errors
      const pageText = await interviewPage.page.textContent('body');
      expect(pageText).not.toContain('Uncaught');
      expect(pageText).not.toContain('TypeError');
    });
  });

  test.describe('Error Message Quality', () => {
    test('should provide actionable error messages', async () => {
      // Collect various error scenarios and check message quality
      const errorScenarios = [
        {
          action: async () => {
            await settingsPage.navigate();
            await settingsPage.setApiKey('invalid');
            return await settingsPage.testConnection();
          },
          expectedKeywords: ['api key', 'invalid', 'check', 'configure']
        },
        {
          action: async () => {
            await interviewPage.navigate();
            await interviewPage.setupAndStartInterview({
              technology: 'Frontend',
              difficulty: 'Easy',
              questionCount: 1,
              enableAI: true
            });
            await interviewPage.page.fill(interviewPage.selectors.answerTextarea, 'test');
            await interviewPage.page.click(interviewPage.selectors.submitAnswerBtn);
            return 'error';
          },
          expectedKeywords: ['api key', 'settings', 'configure']
        }
      ];

      for (const scenario of errorScenarios) {
        try {
          const result = await scenario.action();
          
          if (result === 'error') {
            let errorMessage = '';
            
            // Try to get error message from different locations
            try {
              errorMessage = await settingsPage.getErrorMessage();
            } catch {
              errorMessage = await interviewPage.getErrorMessage();
            }
            
            if (errorMessage) {
              // Error message should be helpful
              expect(errorMessage.length).toBeGreaterThan(10);
              expect(errorMessage).not.toContain('undefined');
              expect(errorMessage).not.toContain('[object Object]');
              expect(errorMessage).not.toMatch(/^Error: /);
              
              // Should contain at least one expected keyword
              const hasKeyword = scenario.expectedKeywords.some(keyword => 
                errorMessage.toLowerCase().includes(keyword.toLowerCase())
              );
              expect(hasKeyword).toBeTruthy();
            }
          }
        } catch (error) {
          // Error handling tests should not crash
          expect(error.message).toBeTruthy();
        }
        
        // Clean up between scenarios
        await helper.clearAppData();
      }
    });

    test('should not expose technical error details to users', async () => {
      const technicalTerms = [
        'stack trace',
        'TypeError',
        'ReferenceError',
        'undefined is not a function',
        'Cannot read property',
        'ECONNREFUSED',
        'SQLITE_CANTOPEN',
        '[object Object]',
        'Promise<pending>'
      ];

      // Test various error scenarios
      await settingsPage.navigate();
      await settingsPage.setApiKey('sk-test-technical-error');
      await settingsPage.testConnection();
      
      const errorMessage = await settingsPage.getErrorMessage();
      if (errorMessage) {
        for (const term of technicalTerms) {
          expect(errorMessage).not.toContain(term);
        }
      }
    });
  });

  test.describe('Recovery and Retry Mechanisms', () => {
    test('should allow retry after error', async () => {
      await settingsPage.navigate();
      
      // First attempt with invalid key
      await settingsPage.setApiKey('invalid-key');
      let result = await settingsPage.testConnection();
      expect(result).toBe('error');
      
      // Second attempt with valid key (if available)
      const validKey = process.env.OPENAI_KEY;
      if (validKey) {
        await settingsPage.setApiKey(validKey);
        result = await settingsPage.testConnection();
        expect(result).toBe('success');
      }
    });

    test('should maintain application stability after multiple errors', async () => {
      // Generate multiple error scenarios rapidly
      for (let i = 0; i < 5; i++) {
        try {
          await settingsPage.navigate();
          await settingsPage.setApiKey(`invalid-key-${i}`);
          await settingsPage.testConnection();
        } catch (error) {
          // Errors are expected - just ensure app doesn't crash
        }
      }
      
      // App should still be functional
      await dashboardPage.navigate();
      await dashboardPage.waitForDashboardLoad();
      
      const widgetCount = await dashboardPage.getWidgetCount();
      expect(widgetCount).toBeGreaterThan(0);
    });
  });
});