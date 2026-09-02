import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/ScrollLater/)
  })

  test('displays main content', async ({ page }) => {
    await page.goto('/')

    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('quiet reading room', { exact: false })).toBeVisible()
  })

  test('has working navigation', async ({ page }) => {
    await page.goto('/')

    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('link', { name: /Open library|Explore the demo library/i }).first()).toBeVisible()
  })

  test('is mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await page.waitForLoadState('networkidle')

    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
