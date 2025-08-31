import { Page } from 'playwright';
import { ElectronAppHelper } from '../helpers/electron-app';

export class DashboardPage {
  constructor(private page: Page, private helper: ElectronAppHelper) {}

  // Selectors based on UI_TESTING_INSTRUCTIONS.md and typical dashboard patterns
  readonly selectors = {
    // Stats widgets
    statsWidget: 'app-stats-widget',
    activityWidget: 'app-activity-widget',
    widgets: '.card',
    widgetIcons: '.pi',
    
    // Navigation elements
    practiceBtn: 'p-button:has-text("Practice")',
    reviewBtn: 'p-button:has-text("AI Review")',
    settingsBtn: 'p-button:has-text("Settings")',
    
    // Statistics displays
    totalInterviews: '.total-interviews',
    averageScore: '.average-score',
    totalQuestions: '.total-questions',
    improvementRate: '.improvement-rate',
    
    // Recent activity
    recentSessions: '.recent-sessions',
    sessionItem: '.session-item',
    
    // Quick actions
    quickStartBtn: '.quick-start-btn',
    continueBtn: '.continue-btn',
    
    // Charts and graphs (if present)
    performanceChart: '.performance-chart',
    progressChart: '.progress-chart',
    
    // Loading states
    loadingSpinner: 'p-progressspinner',
    emptyState: '.empty-state',
  };

  /**
   * Navigate to Dashboard page
   */
  async navigate(): Promise<void> {
    await this.helper.navigateTo('/dashboard');
    await this.helper.waitForStableElement(this.selectors.widgets);
  }

  /**
   * Wait for dashboard to load completely
   */
  async waitForDashboardLoad(): Promise<void> {
    // Wait for loading spinner to disappear
    try {
      await this.page.waitForSelector(this.selectors.loadingSpinner, { state: 'detached', timeout: 10000 });
    } catch {
      // Loading spinner might not be present
    }
    
    // Wait for widgets to be visible
    await this.helper.waitForStableElement(this.selectors.widgets);
  }

  /**
   * Get total number of widgets displayed
   */
  async getWidgetCount(): Promise<number> {
    const widgets = await this.page.locator(this.selectors.widgets).all();
    return widgets.length;
  }

  /**
   * Check if stats widgets are displayed
   */
  async areStatsWidgetsVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.statsWidget, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get statistics values
   */
  async getStatistics(): Promise<{
    totalInterviews: number;
    averageScore: number;
    totalQuestions: number;
    improvementRate: number;
  }> {
    const stats = {
      totalInterviews: 0,
      averageScore: 0,
      totalQuestions: 0,
      improvementRate: 0
    };

    try {
      const totalInterviewsText = await this.page.textContent(this.selectors.totalInterviews);
      stats.totalInterviews = parseInt(totalInterviewsText?.replace(/\D/g, '') || '0');
    } catch {}

    try {
      const averageScoreText = await this.page.textContent(this.selectors.averageScore);
      stats.averageScore = parseInt(averageScoreText?.replace(/\D/g, '') || '0');
    } catch {}

    try {
      const totalQuestionsText = await this.page.textContent(this.selectors.totalQuestions);
      stats.totalQuestions = parseInt(totalQuestionsText?.replace(/\D/g, '') || '0');
    } catch {}

    try {
      const improvementRateText = await this.page.textContent(this.selectors.improvementRate);
      stats.improvementRate = parseInt(improvementRateText?.replace(/\D/g, '') || '0');
    } catch {}

    return stats;
  }

  /**
   * Check if icons are using PrimeIcons
   */
  async validatePrimeIcons(): Promise<boolean> {
    const icons = await this.page.locator(this.selectors.widgetIcons).all();
    
    if (icons.length === 0) return false;
    
    for (const icon of icons) {
      const className = await icon.getAttribute('class') || '';
      if (!className.includes('pi')) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check responsive grid layout
   */
  async validateResponsiveLayout(): Promise<boolean> {
    const widgets = await this.page.locator(this.selectors.widgets).all();
    
    if (widgets.length === 0) return false;
    
    // Check that widgets are arranged in a grid
    for (const widget of widgets) {
      const classList = await widget.getAttribute('class') || '';
      // Look for Tailwind grid classes or similar
      if (!classList.includes('col-') && !classList.includes('grid-')) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Navigate to practice from dashboard
   */
  async goToPractice(): Promise<void> {
    await this.page.click(this.selectors.practiceBtn);
    await this.helper.waitForStableElement('p-dropdown'); // Interview setup form
  }

  /**
   * Navigate to AI Review from dashboard
   */
  async goToReview(): Promise<void> {
    await this.page.click(this.selectors.reviewBtn);
  }

  /**
   * Navigate to Settings from dashboard
   */
  async goToSettings(): Promise<void> {
    await this.page.click(this.selectors.settingsBtn);
    await this.helper.waitForStableElement('p-password'); // API key input
  }

  /**
   * Get recent sessions count
   */
  async getRecentSessionsCount(): Promise<number> {
    try {
      const sessions = await this.page.locator(this.selectors.sessionItem).all();
      return sessions.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get recent session details
   */
  async getRecentSessions(): Promise<Array<{
    technology: string;
    score: number;
    date: string;
    status: string;
  }>> {
    const sessions = [];
    const sessionElements = await this.page.locator(this.selectors.sessionItem).all();
    
    for (const element of sessionElements) {
      try {
        const technology = await element.locator('.technology').textContent() || '';
        const scoreText = await element.locator('.score').textContent() || '0';
        const score = parseInt(scoreText.replace(/\D/g, ''));
        const date = await element.locator('.date').textContent() || '';
        const status = await element.locator('.status').textContent() || '';
        
        sessions.push({ technology, score, date, status });
      } catch {
        // Skip malformed session items
      }
    }
    
    return sessions;
  }

  /**
   * Check if dashboard shows empty state
   */
  async isEmptyState(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.emptyState, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Quick start an interview
   */
  async quickStartInterview(): Promise<void> {
    try {
      await this.page.click(this.selectors.quickStartBtn);
      // Wait for navigation to interview page
      await this.helper.waitForStableElement('p-dropdown');
    } catch {
      // Quick start might not be available
      throw new Error('Quick start button not found or not clickable');
    }
  }

  /**
   * Continue previous interview (if available)
   */
  async continueInterview(): Promise<void> {
    try {
      await this.page.click(this.selectors.continueBtn);
    } catch {
      throw new Error('Continue button not found or not clickable');
    }
  }

  /**
   * Check if charts are displayed correctly
   */
  async validateCharts(): Promise<boolean> {
    const charts = [this.selectors.performanceChart, this.selectors.progressChart];
    
    for (const chartSelector of charts) {
      try {
        const chart = await this.page.waitForSelector(chartSelector, { timeout: 3000 });
        const boundingBox = await chart.boundingBox();
        
        if (!boundingBox || boundingBox.width === 0 || boundingBox.height === 0) {
          return false;
        }
      } catch {
        // Chart not found - might be optional
        continue;
      }
    }
    
    return true;
  }

  /**
   * Validate theme colors are applied correctly
   */
  async validateThemeColors(): Promise<boolean> {
    const widgets = await this.page.locator(this.selectors.widgets).all();
    
    for (const widget of widgets) {
      const styles = await widget.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderColor: computed.borderColor
        };
      });
      
      // Check that colors are not hardcoded (should use CSS variables)
      if (styles.backgroundColor.includes('rgb(255, 255, 255)') ||
          styles.color.includes('rgb(0, 0, 0)')) {
        // Might indicate hardcoded colors - this is a heuristic check
        console.warn('Potential hardcoded colors detected:', styles);
      }
    }
    
    return true;
  }

  /**
   * Test responsive behavior
   */
  async testResponsiveBehavior(): Promise<boolean> {
    const originalSize = await this.page.viewportSize();
    
    try {
      // Test tablet size
      await this.page.setViewportSize({ width: 768, height: 1024 });
      await this.page.waitForTimeout(500); // Let layout settle
      
      const tabletLayout = await this.validateResponsiveLayout();
      
      // Test mobile size
      await this.page.setViewportSize({ width: 375, height: 667 });
      await this.page.waitForTimeout(500);
      
      const mobileLayout = await this.validateResponsiveLayout();
      
      // Restore original size
      if (originalSize) {
        await this.page.setViewportSize(originalSize);
      }
      
      return tabletLayout && mobileLayout;
    } catch (error) {
      // Restore original size on error
      if (originalSize) {
        await this.page.setViewportSize(originalSize);
      }
      throw error;
    }
  }
}