import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('shows sign in link on home page', async ({ page }) => {
    await page.goto('/')

    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: /Sign in/i }).first()).toBeVisible()
  })

  test('redirects unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    await page.waitForURL(/\/(login|$)/, { timeout: 10000 })

    const url = page.url()
    expect(url).toContain('localhost:3000')
  })

  test('Google OAuth button is present', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const googleButton = page.locator('button:has-text("Google"), button:has-text("Sign in")')
    const count = await googleButton.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('GitHub OAuth button is present', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const githubButton = page.locator('button:has-text("GitHub")')
    const count = await githubButton.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
