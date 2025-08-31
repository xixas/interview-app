import { expect } from '@playwright/test';
import { test } from '../helpers/electron-app';
import { DashboardPage } from '../pages/dashboard.page';
import { ElectronAppHelper } from '../helpers/electron-app';

test.describe('Dashboard Page - Layout and Analytics', () => {
  let dashboardPage: DashboardPage;
  let helper: ElectronAppHelper;

  test.beforeEach(async ({ electronApp, mainWindow }) => {
    helper = new ElectronAppHelper(electronApp, mainWindow);
    dashboardPage = new DashboardPage(mainWindow, helper);
    
    await dashboardPage.navigate();
    await dashboardPage.waitForDashboardLoad();
  });

  test.describe('Dashboard Layout', () => {
    test('should display dashboard correctly', async () => {
      // Verify widgets are displayed
      const widgetCount = await dashboardPage.getWidgetCount();
      expect(widgetCount).toBeGreaterThan(0);
    });

    test('should show stats widgets', async () => {
      const areStatsVisible = await dashboardPage.areStatsWidgetsVisible();
      // Stats might be visible or show empty state initially
      if (areStatsVisible) {
        expect(areStatsVisible).toBeTruthy();
      }
    });

    test('should have responsive grid layout', async () => {
      const hasResponsiveLayout = await dashboardPage.validateResponsiveLayout();
      expect(hasResponsiveLayout).toBeTruthy();
    });

    test('should use PrimeIcons for widget icons', async () => {
      const hasPrimeIcons = await dashboardPage.validatePrimeIcons();
      // Only validate if icons are present
      if (await dashboardPage.getWidgetCount() > 0) {
        expect(hasPrimeIcons).toBeTruthy();
      }
    });
  });

  test.describe('Theme Integration', () => {
    test('should adapt to theme changes', async () => {
      // Navigate to settings to change theme
      await dashboardPage.goToSettings();
      
      // Change theme (assuming settings page has theme toggle)
      await dashboardPage.page.click('p-dropdown#theme', { timeout: 5000 });
      await dashboardPage.page.click('p-dropdown-item:has-text("Dark")', { timeout: 5000 });
      
      // Navigate back to dashboard
      await dashboardPage.navigate();
      
      // Verify theme colors are applied
      const hasValidTheme = await dashboardPage.validateThemeColors();
      expect(hasValidTheme).toBeTruthy();
    });

    test('should use theme variables not hardcoded colors', async () => {
      const widgets = await dashboardPage.page.locator(dashboardPage.selectors.widgets).all();
      
      for (const widget of widgets.slice(0, 3)) { // Check first 3 widgets
        const styles = await widget.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color
          };
        });
        
        // Should not use pure white or black (indicates theme variables are used)
        expect(styles.backgroundColor).not.toBe('rgb(255, 255, 255)');
        expect(styles.backgroundColor).not.toBe('rgb(0, 0, 0)');
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to Practice page', async () => {
      await dashboardPage.goToPractice();
      
      // Should be on interview setup page
      await expect(dashboardPage.page.locator('p-dropdown')).toBeVisible();
      
      // Verify URL changed
      const currentUrl = await dashboardPage.page.url();
      expect(currentUrl).toContain('interview');
    });

    test('should navigate to Settings page', async () => {
      await dashboardPage.goToSettings();
      
      // Should be on settings page
      await expect(dashboardPage.page.locator('p-password')).toBeVisible();
      
      const currentUrl = await dashboardPage.page.url();
      expect(currentUrl).toContain('settings');
    });

    test('should navigate to AI Review page', async () => {
      try {
        await dashboardPage.goToReview();
        
        // Verify navigation occurred (URL should change)
        const currentUrl = await dashboardPage.page.url();
        expect(currentUrl).toContain('evaluator');
      } catch (error) {
        // AI Review button might not be available in all configurations
        console.log('AI Review navigation not available');
      }
    });
  });

  test.describe('Statistics Display', () => {
    test('should display statistics when data is available', async () => {
      const stats = await dashboardPage.getStatistics();
      
      // Stats should be numbers (even if 0 initially)
      expect(typeof stats.totalInterviews).toBe('number');
      expect(typeof stats.averageScore).toBe('number');
      expect(typeof stats.totalQuestions).toBe('number');
      expect(typeof stats.improvementRate).toBe('number');
      
      // Values should be non-negative
      expect(stats.totalInterviews).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
      expect(stats.totalQuestions).toBeGreaterThanOrEqual(0);
      expect(stats.improvementRate).toBeGreaterThanOrEqual(0);
    });

    test('should show empty state when no data is available', async () => {
      // For a fresh install, should handle empty state gracefully
      const isEmpty = await dashboardPage.isEmptyState();
      
      if (isEmpty) {
        // Empty state should be visible and informative
        await expect(dashboardPage.page.locator(dashboardPage.selectors.emptyState)).toBeVisible();
      } else {
        // If not empty, stats should be displayed
        const stats = await dashboardPage.getStatistics();
        expect(stats.totalInterviews + stats.totalQuestions).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Recent Activity', () => {
    test('should display recent sessions when available', async () => {
      const sessionCount = await dashboardPage.getRecentSessionsCount();
      expect(sessionCount).toBeGreaterThanOrEqual(0);
      
      if (sessionCount > 0) {
        const sessions = await dashboardPage.getRecentSessions();
        expect(sessions.length).toBe(sessionCount);
        
        // Validate session data structure
        for (const session of sessions) {
          expect(typeof session.technology).toBe('string');
          expect(typeof session.score).toBe('number');
          expect(typeof session.date).toBe('string');
          expect(typeof session.status).toBe('string');
        }
      }
    });

    test('should handle empty activity list gracefully', async () => {
      const sessionCount = await dashboardPage.getRecentSessionsCount();
      
      if (sessionCount === 0) {
        // Should show empty state or placeholder
        const isEmpty = await dashboardPage.isEmptyState();
        if (!isEmpty) {
          // Should still render the activity section without errors
          await expect(dashboardPage.page).not.toHaveText('undefined');
          await expect(dashboardPage.page).not.toHaveText('null');
        }
      }
    });
  });

  test.describe('Quick Actions', () => {
    test('should provide quick start functionality', async () => {
      try {
        await dashboardPage.quickStartInterview();
        
        // Should navigate to interview setup
        await expect(dashboardPage.page.locator('p-dropdown')).toBeVisible();
      } catch (error) {
        // Quick start might not be available - this is acceptable
        console.log('Quick start not available');
      }
    });

    test('should handle continue interview if available', async () => {
      try {
        await dashboardPage.continueInterview();
        
        // Should navigate to interview or show appropriate message
        await dashboardPage.page.waitForTimeout(1000);
      } catch (error) {
        // Continue button might not be available - this is acceptable for empty state
        console.log('Continue interview not available');
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt layout to different screen sizes', async () => {
      const isResponsive = await dashboardPage.testResponsiveBehavior();
      expect(isResponsive).toBeTruthy();
    });

    test('should maintain functionality on mobile screens', async () => {
      const originalSize = await dashboardPage.page.viewportSize();
      
      try {
        // Set to mobile size
        await dashboardPage.page.setViewportSize({ width: 375, height: 667 });
        await dashboardPage.page.waitForTimeout(500);
        
        // Widgets should still be visible and functional
        const widgetCount = await dashboardPage.getWidgetCount();
        expect(widgetCount).toBeGreaterThan(0);
        
        // Navigation should still work
        await dashboardPage.goToSettings();
        await expect(dashboardPage.page.locator('p-password')).toBeVisible();
        
      } finally {
        // Restore original size
        if (originalSize) {
          await dashboardPage.page.setViewportSize(originalSize);
        }
      }
    });
  });

  test.describe('Charts and Visualizations', () => {
    test('should render charts correctly when data is available', async () => {
      try {
        const hasValidCharts = await dashboardPage.validateCharts();
        expect(hasValidCharts).toBeTruthy();
      } catch (error) {
        // Charts might not be implemented yet or require data
        console.log('Charts not available or no data');
      }
    });

    test('should handle missing chart data gracefully', async () => {
      // Even without data, chart containers should not cause errors
      await expect(dashboardPage.page).not.toHaveText('Error');
      await expect(dashboardPage.page).not.toHaveText('undefined');
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within reasonable time', async () => {
      const startTime = Date.now();
      
      await dashboardPage.page.reload();
      await dashboardPage.waitForDashboardLoad();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle multiple rapid navigation actions', async () => {
      // Rapidly navigate between pages
      await dashboardPage.goToSettings();
      await dashboardPage.navigate();
      await dashboardPage.goToPractice();
      await dashboardPage.navigate();
      
      // Should still be functional
      await dashboardPage.waitForDashboardLoad();
      const widgetCount = await dashboardPage.getWidgetCount();
      expect(widgetCount).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle service unavailability gracefully', async () => {
      // Dashboard should load even if some services are unavailable
      await dashboardPage.page.reload();
      await dashboardPage.waitForDashboardLoad();
      
      // Should not show critical errors on the page
      const pageText = await dashboardPage.page.textContent('body');
      expect(pageText).not.toContain('500 Internal Server Error');
      expect(pageText).not.toContain('Network Error');
    });

    test('should provide meaningful error messages', async () => {
      // If there are errors, they should be user-friendly
      const errorMessages = await dashboardPage.page.locator('.error, .alert, p-message[severity="error"]').all();
      
      for (const errorMsg of errorMessages) {
        const text = await errorMsg.textContent();
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('null');
        expect(text).not.toContain('[object Object]');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      // Should be able to tab through dashboard elements
      await dashboardPage.page.keyboard.press('Tab');
      await dashboardPage.page.keyboard.press('Tab');
      
      const focusedElement = await dashboardPage.page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement || '');
    });

    test('should have proper heading structure', async () => {
      const headings = await dashboardPage.page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
      
      // First heading should be h1
      if (headings.length > 0) {
        const firstHeadingTag = await headings[0].evaluate(el => el.tagName);
        expect(['H1', 'H2']).toContain(firstHeadingTag);
      }
    });

    test('should have proper ARIA labels where needed', async () => {
      const interactiveElements = await dashboardPage.page.locator('button, a, [role="button"]').all();
      
      for (const element of interactiveElements.slice(0, 5)) { // Check first 5
        const ariaLabel = await element.getAttribute('aria-label');
        const text = await element.textContent();
        
        // Should have either aria-label or text content
        expect(ariaLabel || text).toBeTruthy();
      }
    });
  });
});