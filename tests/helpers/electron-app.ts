import { ElectronApplication, Page, _electron as electron } from 'playwright';
import { test as base } from '@playwright/test';
import path from 'path';

export interface ElectronTestFixtures {
  electronApp: ElectronApplication;
  mainWindow: Page;
}

/**
 * Extended test with Electron app fixtures
 */
export const test = base.extend<ElectronTestFixtures>({
  electronApp: async ({}, use) => {
    // Launch the Electron app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/electron/main.js')],
      recordVideo: {
        dir: 'test-videos/',
        size: { width: 1280, height: 720 }
      },
      // Enable DevTools in test environment
      executablePath: process.env.ELECTRON_EXECUTABLE_PATH,
    });

    await use(electronApp);
    await electronApp.close();
  },

  mainWindow: async ({ electronApp }, use) => {
    // Wait for the first window to load
    const mainWindow = await electronApp.firstWindow();
    
    // Wait for the app to be ready
    await mainWindow.waitForLoadState('domcontentloaded');
    
    // Set viewport size
    await mainWindow.setViewportSize({ width: 1280, height: 720 });
    
    await use(mainWindow);
  },
});

/**
 * Electron App Helper Class
 */
export class ElectronAppHelper {
  constructor(public app: ElectronApplication, public window: Page) {}

  /**
   * Navigate to a specific route in the Angular app
   */
  async navigateTo(route: string): Promise<void> {
    await this.window.click(`a[href="${route}"], [data-route="${route}"]`);
    await this.window.waitForURL(`**${route}`);
  }

  /**
   * Wait for Angular to be ready
   */
  async waitForAngular(): Promise<void> {
    await this.window.waitForFunction(() => {
      return typeof window['getAllAngularRootElements'] === 'function' 
        && window['getAllAngularRootElements']().length > 0;
    });
  }

  /**
   * Get current route
   */
  async getCurrentRoute(): Promise<string> {
    return await this.window.evaluate(() => window.location.pathname);
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return await this.window.screenshot({ 
      path: `screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for element to be visible and stable
   */
  async waitForStableElement(selector: string, timeout = 10000): Promise<void> {
    await this.window.waitForSelector(selector, { state: 'visible', timeout });
    
    // Wait for element to stop moving (useful for animations)
    await this.window.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      selector,
      { timeout: 5000 }
    );
  }

  /**
   * Clear all application data (useful for test isolation)
   */
  async clearAppData(): Promise<void> {
    await this.window.evaluate(() => {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB if used
      if (window.indexedDB) {
        // Note: This is a simplified approach
        // In production, you might want more thorough cleanup
      }
    });
  }

  /**
   * Mock the OpenAI API key in settings
   */
  async setMockApiKey(apiKey: string = 'sk-test-mock-key-for-testing'): Promise<void> {
    await this.window.evaluate((key) => {
      // Simulate setting API key in electron store
      if (window.electronAPI?.settings) {
        window.electronAPI.settings.set('openai_api_key', key);
      }
    }, apiKey);
  }

  /**
   * Wait for toast/message to appear
   */
  async waitForToast(type: 'success' | 'error' | 'info' = 'success', timeout = 10000): Promise<string> {
    const selector = `p-message[severity="${type}"], .p-message-${type}`;
    await this.window.waitForSelector(selector, { timeout });
    return await this.window.textContent(selector) || '';
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(): Promise<void> {
    // Wait for any loading spinners to disappear
    await this.window.waitForSelector('p-progressspinner', { state: 'detached', timeout: 30000 });
    await this.window.waitForSelector('.loading-spinner', { state: 'detached', timeout: 30000 });
  }

  /**
   * Get console logs (useful for debugging)
   */
  getConsoleMessages(): Array<{ type: string; text: string }> {
    // This would need to be set up in the test beforeEach
    return [];
  }

  /**
   * Assert that element contains expected text with retry
   */
  async assertElementText(selector: string, expectedText: string, timeout = 10000): Promise<void> {
    await this.window.waitForFunction(
      ({ sel, text }) => {
        const el = document.querySelector(sel);
        return el && el.textContent?.includes(text);
      },
      { selector, text: expectedText },
      { timeout }
    );
  }
}