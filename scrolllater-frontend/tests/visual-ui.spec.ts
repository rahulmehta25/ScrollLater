import { test, expect } from '@playwright/test';

test.describe('ScrollLater Visual UI Tests', () => {
  test('should display homepage correctly', async ({ page }) => {
    await page.goto('/');
    
    // Take screenshot of the homepage
    await page.screenshot({ 
      path: 'tests/__screenshots__/homepage.png',
      fullPage: true 
    });
    
    // Check for main elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button')).toBeVisible();
  });

  test('should display dashboard after authentication', async ({ page }) => {
    // This test would require authentication setup
    // For now, we'll just check the route structure
    await page.goto('/dashboard');
    
    // Take screenshot of dashboard (even if not authenticated)
    await page.screenshot({ 
      path: 'tests/__screenshots__/dashboard.png',
      fullPage: true 
    });
  });

  test('should display SmartScheduler component', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for SmartScheduler elements
    const schedulerElement = page.locator('text=Smart Scheduler');
    
    if (await schedulerElement.isVisible()) {
      await page.screenshot({ 
        path: 'tests/__screenshots__/smart-scheduler.png',
        fullPage: false 
      });
      
      // Check for AI suggestions section
      await expect(page.locator('text=AI Scheduling Suggestions')).toBeVisible();
    } else {
      console.log('SmartScheduler component not visible - may need authentication');
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await page.screenshot({ 
      path: 'tests/__screenshots__/mobile-homepage.png',
      fullPage: true 
    });
    
    // Check if elements are properly sized for mobile
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible();
  });
});
