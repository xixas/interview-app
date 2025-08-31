import { expect } from '@playwright/test';
import { test } from '../helpers/electron-app';
import { SettingsPage } from '../pages/settings.page';
import { ElectronAppHelper } from '../helpers/electron-app';

test.describe('Settings Page - OpenAI API Key Configuration', () => {
  let settingsPage: SettingsPage;
  let helper: ElectronAppHelper;

  test.beforeEach(async ({ electronApp, mainWindow }) => {
    helper = new ElectronAppHelper(electronApp, mainWindow);
    settingsPage = new SettingsPage(mainWindow, helper);
    
    // Clear any existing API key
    await helper.clearAppData();
    await settingsPage.navigate();
  });

  test('should display Settings page correctly', async () => {
    await expect(settingsPage.page.locator(settingsPage.selectors.apiKeyInput)).toBeVisible();
    await expect(settingsPage.page.locator(settingsPage.selectors.testConnectionBtn)).toBeVisible();
    await expect(settingsPage.page.locator(settingsPage.selectors.saveApiKeyBtn)).toBeVisible();
  });

  test('should show test button disabled when input is empty', async () => {
    expect(await settingsPage.isTestButtonEnabled()).toBeFalsy();
  });

  test('should enable test button when API key is entered', async () => {
    await settingsPage.setApiKey('sk-test-key-12345');
    expect(await settingsPage.isTestButtonEnabled()).toBeTruthy();
  });

  test('should show save button disabled initially', async () => {
    expect(await settingsPage.isSaveButtonEnabled()).toBeFalsy();
  });

  test.describe('Valid API Key Flow', () => {
    test('should successfully test valid API key', async () => {
      // Using the test OpenAI key from environment variable only
      const testKey = process.env.OPENAI_KEY || 'sk-test-mock-key-for-testing-only';
      
      await settingsPage.setApiKey(testKey);
      const result = await settingsPage.testConnection();
      
      expect(result).toBe('success');
      
      const successMessage = await settingsPage.getSuccessMessage();
      expect(successMessage).toContain('success');
    });

    test('should enable save button after successful test', async () => {
      const testKey = process.env.OPENAI_KEY || 'sk-test-valid-key';
      
      await settingsPage.setApiKey(testKey);
      await settingsPage.testConnection();
      
      expect(await settingsPage.isSaveButtonEnabled()).toBeTruthy();
    });

    test('should save API key successfully', async () => {
      const testKey = process.env.OPENAI_KEY || 'sk-test-valid-key';
      
      const success = await settingsPage.setupApiKey(testKey);
      expect(success).toBeTruthy();
      
      const status = await settingsPage.getApiKeyStatus();
      expect(status).toContain('OpenAI GPT-4');
    });
  });

  test.describe('Invalid API Key Handling', () => {
    test('should show error for invalid API key', async () => {
      await settingsPage.setApiKey('invalid-key');
      const result = await settingsPage.testConnection();
      
      expect(result).toBe('error');
      
      const errorMessage = await settingsPage.getErrorMessage();
      expect(errorMessage).toContain('invalid');
    });

    test('should keep save button disabled for invalid key', async () => {
      await settingsPage.setApiKey('invalid-key');
      await settingsPage.testConnection();
      
      expect(await settingsPage.isSaveButtonEnabled()).toBeFalsy();
    });

    test('should show proper error message format', async () => {
      await settingsPage.setApiKey('invalid-key');
      await settingsPage.testConnection();
      
      const errorMessage = await settingsPage.getErrorMessage();
      expect(errorMessage.length).toBeGreaterThan(0);
      expect(errorMessage).not.toContain('undefined');
    });
  });

  test.describe('Theme System', () => {
    test('should change theme from Light to Dark', async () => {
      await settingsPage.changeTheme('Dark');
      
      // Verify theme was applied by checking CSS classes or computed styles
      const bodyClass = await settingsPage.page.getAttribute('body', 'class');
      expect(bodyClass).toContain('dark');
    });

    test('should change theme from Dark to Light', async () => {
      await settingsPage.changeTheme('Dark');
      await settingsPage.changeTheme('Light');
      
      const bodyClass = await settingsPage.page.getAttribute('body', 'class');
      expect(bodyClass).not.toContain('dark');
    });

    test('should apply System theme', async () => {
      await settingsPage.changeTheme('System');
      
      const currentTheme = await settingsPage.getCurrentTheme();
      expect(currentTheme).toBe('System');
    });

    test('should have immediate theme application', async () => {
      const startTime = Date.now();
      await settingsPage.changeTheme('Dark');
      const endTime = Date.now();
      
      // Theme change should be nearly instantaneous (< 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  test.describe('Environment Information', () => {
    test('should show desktop mode status', async () => {
      const isDesktop = await settingsPage.isDesktopMode();
      expect(isDesktop).toBeTruthy();
    });

    test('should display environment information correctly', async () => {
      // Environment card should be visible and contain relevant info
      await expect(settingsPage.page.locator(settingsPage.selectors.environmentCard)).toBeVisible();
    });
  });

  test.describe('API Key Management', () => {
    test('should clear API key', async () => {
      // First set and save a key
      const testKey = 'sk-test-key-to-clear';
      await settingsPage.setApiKey(testKey);
      // Skip actual testing for this test
      await settingsPage.saveApiKey();
      
      // Then clear it
      await settingsPage.clearApiKey();
      
      const status = await settingsPage.getApiKeyStatus();
      expect(status).toContain('Not Configured');
    });

    test('should reset form state after clearing', async () => {
      await settingsPage.setApiKey('sk-test-key');
      await settingsPage.clearApiKey();
      
      expect(await settingsPage.isTestButtonEnabled()).toBeFalsy();
      expect(await settingsPage.isSaveButtonEnabled()).toBeFalsy();
    });
  });

  test.describe('Validation and Error States', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network issues by using a malformed key that will cause network errors
      await settingsPage.setApiKey('sk-network-error-test');
      
      const result = await settingsPage.testConnection();
      expect(result).toBe('error');
      
      const errorMessage = await settingsPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    });

    test('should show loading state during validation', async () => {
      await settingsPage.setApiKey('sk-test-loading');
      
      // Click test and immediately check for loading state
      const testPromise = settingsPage.testConnection();
      
      // Check for loading spinner or disabled state
      await settingsPage.page.waitForSelector('p-progressspinner, .loading', { timeout: 2000 });
      
      await testPromise;
    });

    test('should validate API key format', async () => {
      // Test various invalid formats
      const invalidKeys = [
        '',
        'not-an-api-key',
        '12345',
        'api-key-without-sk',
        'sk-',
        'sk-too-short'
      ];

      for (const key of invalidKeys) {
        await settingsPage.page.reload();
        await settingsPage.navigate();
        await settingsPage.setApiKey(key);
        
        if (key.length > 0) {
          const result = await settingsPage.testConnection();
          expect(result).toBe('error');
        }
      }
    });
  });

  test.describe('Status Indicators', () => {
    test('should show correct status indicator colors', async () => {
      // Test with invalid key first
      await settingsPage.setApiKey('invalid-key');
      await settingsPage.testConnection();
      
      const errorIndicator = settingsPage.page.locator('.text-red-500');
      await expect(errorIndicator).toBeVisible();
    });

    test('should update status text correctly', async () => {
      const initialStatus = await settingsPage.getApiKeyStatus();
      expect(initialStatus).toContain('Not Configured');
      
      // After successful setup
      const testKey = process.env.OPENAI_KEY || 'sk-test-status';
      if (await settingsPage.setupApiKey(testKey)) {
        const updatedStatus = await settingsPage.getApiKeyStatus();
        expect(updatedStatus).not.toBe(initialStatus);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async () => {
      // Check that form inputs have associated labels
      const apiKeyInput = settingsPage.page.locator(settingsPage.selectors.apiKeyInput);
      const labelId = await apiKeyInput.getAttribute('aria-labelledby');
      
      if (labelId) {
        const label = settingsPage.page.locator(`#${labelId}`);
        await expect(label).toBeVisible();
      }
    });

    test('should be keyboard navigable', async () => {
      // Tab through form elements
      await settingsPage.page.keyboard.press('Tab');
      await settingsPage.page.keyboard.press('Tab');
      
      // Should be able to reach the test button
      const focusedElement = await settingsPage.page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'INPUT']).toContain(focusedElement || '');
    });
  });
});