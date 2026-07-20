import { test, expect, Page } from '@playwright/test';

// Test environments
const ENVIRONMENTS = {
  local: 'http://localhost:3000',
  production: 'https://scroll-later.vercel.app'
};

async function captureOAuthFlow(page: Page, baseUrl: string, environment: string) {
  console.log(`Testing OAuth flow for ${environment} environment at ${baseUrl}`);
  
  try {
    // Navigate to the login page
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Take screenshot of initial page
    await page.screenshot({ 
      path: `tests/__screenshots__/oauth-${environment}-01-initial-page.png`,
      fullPage: true 
    });
    
    // Look for login form or sign in button
    const googleButton = page.locator('button:has-text("Continue with Google")');
    const githubButton = page.locator('button:has-text("Continue with GitHub")');
    const signInText = page.locator('text=Sign In');
    
    // Wait for login elements to be visible
    try {
      await expect(googleButton.or(githubButton).or(signInText)).toBeVisible({ timeout: 10000 });
      console.log('Login elements found');
    } catch (error) {
      console.log('Login elements not immediately visible, taking screenshot...');
      await page.screenshot({ 
        path: `tests/__screenshots__/oauth-${environment}-02-no-login-elements.png`,
        fullPage: true 
      });
    }
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: `tests/__screenshots__/oauth-${environment}-03-login-page.png`,
      fullPage: true 
    });
    
    // Check if Google button is present and visible
    if (await googleButton.isVisible()) {
      console.log('Google button found, testing OAuth flow...');
      
      // Capture console logs before clicking
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      });
      
      // Click Google OAuth button and handle the popup/redirect
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
        googleButton.click()
      ]);
      
      // Take screenshot after clicking Google button
      await page.screenshot({ 
        path: `tests/__screenshots__/oauth-${environment}-04-after-google-click.png`,
        fullPage: true 
      });
      
      if (popup) {
        console.log('OAuth popup opened');
        await popup.waitForLoadState('networkidle', { timeout: 15000 });
        
        // Take screenshot of OAuth popup
        await popup.screenshot({ 
          path: `tests/__screenshots__/oauth-${environment}-05-oauth-popup.png`,
          fullPage: true 
        });
        
        // Check for Google OAuth page elements
        const googleSignIn = popup.locator('text=Sign in');
        const googleLogo = popup.locator('[alt*="Google"], [src*="google"]');
        
        if (await googleSignIn.isVisible() || await googleLogo.isVisible()) {
          console.log('Google OAuth page loaded successfully');
        } else {
          console.log('Unexpected OAuth page content');
          await popup.screenshot({ 
            path: `tests/__screenshots__/oauth-${environment}-06-unexpected-oauth.png`,
            fullPage: true 
          });
        }
        
        await popup.close();
      } else {
        console.log('No popup opened, checking for redirect...');
        
        // Wait for potential redirect
        await page.waitForTimeout(3000);
        
        // Take screenshot after redirect attempt
        await page.screenshot({ 
          path: `tests/__screenshots__/oauth-${environment}-07-after-redirect.png`,
          fullPage: true 
        });
      }
      
      // Capture console logs
      console.log('Console logs captured:', consoleLogs);
      
      // Save console logs to file
      const fs = require('fs');
      fs.writeFileSync(
        `tests/__screenshots__/oauth-${environment}-console-logs.txt`,
        consoleLogs.join('\n')
      );
      
    } else {
      console.log('Google button not visible');
      
      // Take screenshot showing what's actually visible
      await page.screenshot({ 
        path: `tests/__screenshots__/oauth-${environment}-08-no-google-button.png`,
        fullPage: true 
      });
      
      // Get page content for debugging
      const pageContent = await page.content();
      const fs = require('fs');
      fs.writeFileSync(
        `tests/__screenshots__/oauth-${environment}-page-content.html`,
        pageContent
      );
    }
    
    // Check for any error messages
    const errorElements = page.locator('[class*="error"], [class*="Error"], .text-red-600');
    if (await errorElements.count() > 0) {
      console.log('Error messages found on page');
      await page.screenshot({ 
        path: `tests/__screenshots__/oauth-${environment}-09-errors.png`,
        fullPage: true 
      });
      
      // Log error text
      const errorTexts = await errorElements.allTextContents();
      console.log('Error messages:', errorTexts);
    }
    
  } catch (error) {
    console.error(`Error testing ${environment}:`, error);
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: `tests/__screenshots__/oauth-${environment}-99-error-state.png`,
      fullPage: true 
    });
    
    throw error;
  }
}

// Test local environment
test('OAuth flow - Local Development', async ({ page }) => {
  await captureOAuthFlow(page, ENVIRONMENTS.local, 'local');
});

// Test production environment
test('OAuth flow - Production', async ({ page }) => {
  await captureOAuthFlow(page, ENVIRONMENTS.production, 'production');
});

// Additional test for different screen sizes
test('OAuth flow - Mobile View', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
  await captureOAuthFlow(page, ENVIRONMENTS.local, 'local-mobile');
});

// Test to check network requests
test('OAuth flow - Network Analysis', async ({ page }) => {
  const requests: Array<{ url: string, status: number }> = [];
  const responses: Array<{ url: string, status: number }> = [];
  
  page.on('request', request => {
    requests.push({ url: request.url(), status: 0 });
  });
  
  page.on('response', response => {
    responses.push({ url: response.url(), status: response.status() });
  });
  
  try {
    await page.goto(ENVIRONMENTS.local);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: `tests/__screenshots__/oauth-network-01-initial.png`,
      fullPage: true 
    });
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    if (await googleButton.isVisible()) {
      await googleButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Save network analysis
    const fs = require('fs');
    const networkData = {
      requests: requests,
      responses: responses,
      failedRequests: responses.filter(r => r.status >= 400)
    };
    
    fs.writeFileSync(
      `tests/__screenshots__/oauth-network-analysis.json`,
      JSON.stringify(networkData, null, 2)
    );
    
    console.log('Network requests:', requests.length);
    console.log('Failed requests:', networkData.failedRequests.length);
    
  } catch (error) {
    console.error('Network analysis error:', error);
  }
});

// Test environment variables and configuration
test('OAuth flow - Configuration Check', async ({ page }) => {
  await page.goto(ENVIRONMENTS.local);
  
  // Inject script to check environment variables
  const envCheck = await page.evaluate(() => {
    return {
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'undefined',
      windowOrigin: window.location.origin,
      userAgent: navigator.userAgent
    };
  });
  
  console.log('Environment check:', envCheck);
  
  // Save environment check
  const fs = require('fs');
  fs.writeFileSync(
    `tests/__screenshots__/oauth-env-check.json`,
    JSON.stringify(envCheck, null, 2)
  );
  
  await page.screenshot({ 
    path: `tests/__screenshots__/oauth-config-check.png`,
    fullPage: true 
  });
});