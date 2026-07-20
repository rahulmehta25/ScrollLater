import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Complete OAuth Flow', () => {
  test('Test OAuth callback handling', async ({ page, context }) => {
    // Test the callback route directly
    await page.goto('http://localhost:3000/api/auth/callback');
    
    await page.screenshot({ 
      path: 'tests/__screenshots__/oauth-callback-direct.png',
      fullPage: true 
    });
    
    // Check if callback route exists and responds
    const response = await page.evaluate(() => {
      return {
        url: window.location.href,
        status: document.title,
        body: document.body.innerText
      };
    });
    
    console.log('Callback route response:', response);
  });

  test('Test authentication state management', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check authentication state
    const authState = await page.evaluate(() => {
      return {
        hasAuthProvider: !!window.__AUTH_PROVIDER_STATE,
        localStorage: JSON.stringify(localStorage),
        sessionStorage: JSON.stringify(sessionStorage)
      };
    });
    
    console.log('Auth state:', authState);
    
    await page.screenshot({ 
      path: 'tests/__screenshots__/auth-state-check.png',
      fullPage: true 
    });
  });

  test('Test Supabase client initialization', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check if Supabase is properly initialized
    const supabaseState = await page.evaluate(async () => {
      try {
        // Try to access Supabase client
        const response = await fetch('/api/auth/session');
        return {
          sessionEndpointStatus: response.status,
          sessionEndpointHeaders: Object.fromEntries(response.headers.entries()),
          hasSupabase: 'supabase' in window || 'SUPABASE_URL' in process.env
        };
      } catch (error) {
        return {
          error: error.message,
          hasSupabase: false
        };
      }
    });
    
    console.log('Supabase state:', supabaseState);
  });

  test('Test OAuth with manual flow simulation', async ({ page, context }) => {
    // Disable popup blocking and enable manual OAuth simulation
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Capture initial state
    await page.screenshot({ 
      path: 'tests/__screenshots__/oauth-manual-01-start.png',
      fullPage: true 
    });
    
    // Get the OAuth URL without actually clicking
    const oauthUrl = await page.evaluate(async () => {
      // Simulate the OAuth URL generation logic
      const supabaseUrl = 'https://emvuhkatpbayvhpvnwxm.supabase.co';
      const redirectUrl = window.location.origin + '/api/auth/callback';
      
      return {
        generatedUrl: `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`,
        currentOrigin: window.location.origin,
        expectedCallback: redirectUrl
      };
    });
    
    console.log('OAuth URL analysis:', oauthUrl);
    
    // Test the callback endpoint separately
    const callbackResponse = await page.request.get('http://localhost:3000/api/auth/callback');
    console.log('Callback endpoint test:', {
      status: callbackResponse.status(),
      headers: callbackResponse.headers(),
      url: callbackResponse.url()
    });
  });

  test('Check environment variables and configuration', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check if environment variables are accessible
    const envCheck = await page.evaluate(() => {
      return {
        nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not found',
        nextPublicSupabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'not found',
        nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'not found',
        location: {
          origin: window.location.origin,
          hostname: window.location.hostname,
          protocol: window.location.protocol
        }
      };
    });
    
    console.log('Environment configuration:', envCheck);
    
    // Save configuration to file
    const fs = require('fs');
    fs.writeFileSync(
      'tests/__screenshots__/oauth-env-config.json',
      JSON.stringify(envCheck, null, 2)
    );
  });
});

test.describe('Production OAuth Testing', () => {
  test('Test production OAuth URL generation', async ({ page }) => {
    await page.goto('https://scroll-later.vercel.app');
    await page.waitForLoadState('networkidle');
    
    // Check production OAuth configuration
    const prodConfig = await page.evaluate(() => {
      return {
        currentOrigin: window.location.origin,
        expectedCallback: window.location.origin + '/api/auth/callback',
        userAgent: navigator.userAgent,
        isProduction: window.location.hostname !== 'localhost'
      };
    });
    
    console.log('Production OAuth config:', prodConfig);
    
    await page.screenshot({ 
      path: 'tests/__screenshots__/oauth-production-config.png',
      fullPage: true 
    });
  });
});

test.describe('OAuth Error Scenarios', () => {
  test('Test with blocked third-party cookies', async ({ context, page }) => {
    // Block third-party cookies
    await context.route('https://accounts.google.com/**', route => {
      route.abort();
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Try OAuth with blocked cookies
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    if (await googleButton.isVisible()) {
      await googleButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'tests/__screenshots__/oauth-blocked-cookies.png',
        fullPage: true 
      });
    }
  });

  test('Test popup blocker scenario', async ({ page }) => {
    // Simulate popup blocking by intercepting window.open
    await page.addInitScript(() => {
      window.open = () => null;
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const googleButton = page.locator('button:has-text("Continue with Google")');
    
    if (await googleButton.isVisible()) {
      await googleButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'tests/__screenshots__/oauth-popup-blocked.png',
        fullPage: true 
      });
    }
  });
});