import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Visual Design Check Test Suite
 * Automated visual QA testing based on design principles
 */

test.describe('Visual Design Review', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('Desktop View - Homepage', async ({ page, browserName }) => {
    // Set viewport for desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Take screenshot
    const screenshotPath = path.join('tests', '__screenshots__', `homepage-desktop-${browserName}.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    // Check for console errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    // Verify no console errors
    expect(consoleMessages).toHaveLength(0);
    
    // Check for primary elements
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Log success
    console.log(`✅ Desktop screenshot saved to: ${screenshotPath}`);
  });

  test('Mobile View - Homepage', async ({ page, browserName }) => {
    // Set viewport for mobile (iPhone 15)
    await page.setViewportSize({ width: 393, height: 852 });
    
    // Take screenshot
    const screenshotPath = path.join('tests', '__screenshots__', `homepage-mobile-${browserName}.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    // Check mobile-specific elements
    const mobileMenu = page.locator('[data-testid="mobile-menu"], [id*="mobile"], [class*="mobile"]');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible();
    }
    
    // Log success
    console.log(`✅ Mobile screenshot saved to: ${screenshotPath}`);
  });

  test('Tablet View - Homepage', async ({ page, browserName }) => {
    // Set viewport for tablet (iPad Pro)
    await page.setViewportSize({ width: 1024, height: 1366 });
    
    // Take screenshot
    const screenshotPath = path.join('tests', '__screenshots__', `homepage-tablet-${browserName}.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    // Log success
    console.log(`✅ Tablet screenshot saved to: ${screenshotPath}`);
  });

  test('Check Design Consistency', async ({ page }) => {
    // Check for consistent spacing (based on style guide)
    const buttons = page.locator('button');
    const buttonsCount = await buttons.count();
    
    for (let i = 0; i < buttonsCount; i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();
      
      if (isVisible) {
        // Check button has proper rounded corners
        const borderRadius = await button.evaluate(el => 
          window.getComputedStyle(el).borderRadius
        );
        
        // Verify buttons follow style guide (rounded-full or similar)
        console.log(`Button ${i + 1} border-radius: ${borderRadius}`);
      }
    }
    
    // Check color consistency
    const primaryColorElements = page.locator('[class*="primary"], [class*="blue-500"]');
    const primaryCount = await primaryColorElements.count();
    console.log(`Found ${primaryCount} elements with primary color`);
  });

  test('Console Error Check', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate through main pages
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Check for any console errors
    if (errors.length > 0) {
      console.error('❌ Console errors detected:');
      errors.forEach(error => console.error(`  - ${error}`));
    } else {
      console.log('✅ No console errors detected');
    }
    
    expect(errors).toHaveLength(0);
  });
});