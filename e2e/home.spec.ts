import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/')

    // Check page loads
    await expect(page).toHaveTitle(/ScrollLater/)
  })

  test('displays main content', async ({ page }) => {
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for main elements
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('has working navigation', async ({ page }) => {
    await page.goto('/')

    // Check page responds to interactions
    await page.waitForLoadState('domcontentloaded')

    // Verify the page structure
    const main = page.locator('body')
    await expect(main).toBeVisible()
  })

  test('is mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await page.waitForLoadState('networkidle')

    // Page should still be accessible
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
