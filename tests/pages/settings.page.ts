import { Page } from 'playwright';
import { ElectronAppHelper } from '../helpers/electron-app';

export class SettingsPage {
  constructor(private page: Page, private helper: ElectronAppHelper) {}

  // Selectors based on UI_TESTING_INSTRUCTIONS.md
  readonly selectors = {
    // OpenAI Configuration
    apiKeyInput: 'p-password input[type="password"]',
    testConnectionBtn: 'p-button:has-text("Test Connection")',
    saveApiKeyBtn: 'p-button:has-text("Save API Key")',
    clearApiKeyBtn: 'p-button:has-text("Clear API Key")',
    
    // Status indicators
    successMessage: 'p-message[severity="success"]',
    errorMessage: 'p-message[severity="error"]',
    statusIndicator: '.text-green-500, .text-red-500',
    
    // Theme settings
    themeDropdown: 'p-dropdown#theme',
    themeOptions: 'p-dropdown-item',
    
    // Environment info
    environmentCard: '.environment-info-card',
    apiKeyStatus: '.api-key-status',
    serviceStatus: '.service-status',
  };

  /**
   * Navigate to Settings page
   */
  async navigate(): Promise<void> {
    await this.helper.navigateTo('/settings');
    await this.helper.waitForStableElement(this.selectors.apiKeyInput);
  }

  /**
   * Set OpenAI API Key
   */
  async setApiKey(apiKey: string): Promise<void> {
    await this.page.fill(this.selectors.apiKeyInput, apiKey);
  }

  /**
   * Click Test Connection button and wait for result
   */
  async testConnection(): Promise<'success' | 'error'> {
    await this.page.click(this.selectors.testConnectionBtn);
    await this.helper.waitForLoadingComplete();
    
    try {
      await this.page.waitForSelector(this.selectors.successMessage, { timeout: 15000 });
      return 'success';
    } catch {
      await this.page.waitForSelector(this.selectors.errorMessage, { timeout: 5000 });
      return 'error';
    }
  }

  /**
   * Save API Key
   */
  async saveApiKey(): Promise<void> {
    await this.page.click(this.selectors.saveApiKeyBtn);
    await this.helper.waitForToast('success');
  }

  /**
   * Clear API Key
   */
  async clearApiKey(): Promise<void> {
    await this.page.click(this.selectors.clearApiKeyBtn);
    await this.helper.waitForToast('success');
  }

  /**
   * Get API key status text
   */
  async getApiKeyStatus(): Promise<string> {
    return await this.page.textContent(this.selectors.apiKeyStatus) || '';
  }

  /**
   * Check if save button is enabled
   */
  async isSaveButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.saveApiKeyBtn);
    return !(await button.isDisabled());
  }

  /**
   * Check if test button is enabled
   */
  async isTestButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.testConnectionBtn);
    return !(await button.isDisabled());
  }

  /**
   * Get current theme selection
   */
  async getCurrentTheme(): Promise<string> {
    const dropdown = this.page.locator(this.selectors.themeDropdown);
    return await dropdown.textContent() || '';
  }

  /**
   * Change theme
   */
  async changeTheme(theme: 'Light' | 'Dark' | 'System'): Promise<void> {
    await this.page.click(this.selectors.themeDropdown);
    await this.page.click(`${this.selectors.themeOptions}:has-text("${theme}")`);
    
    // Wait for theme to apply
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get error message text
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
   * Get success message text
   */
  async getSuccessMessage(): Promise<string> {
    try {
      await this.page.waitForSelector(this.selectors.successMessage, { timeout: 5000 });
      return await this.page.textContent(this.selectors.successMessage) || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if environment info shows desktop mode
   */
  async isDesktopMode(): Promise<boolean> {
    const envText = await this.page.textContent(this.selectors.environmentCard) || '';
    return envText.includes('Desktop') && !envText.includes('Web');
  }

  /**
   * Wait for API key validation to complete
   */
  async waitForValidation(): Promise<void> {
    // Wait for either success or error message
    await Promise.race([
      this.page.waitForSelector(this.selectors.successMessage, { timeout: 15000 }),
      this.page.waitForSelector(this.selectors.errorMessage, { timeout: 15000 })
    ]);
  }

  /**
   * Perform complete API key setup flow
   */
  async setupApiKey(apiKey: string): Promise<boolean> {
    await this.setApiKey(apiKey);
    const testResult = await this.testConnection();
    
    if (testResult === 'success') {
      await this.saveApiKey();
      return true;
    }
    
    return false;
  }
}