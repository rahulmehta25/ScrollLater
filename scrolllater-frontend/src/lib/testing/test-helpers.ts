import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Test Database Helper
 * Provides utilities for setting up and tearing down test data
 */
export class TestDatabaseHelper {
  private supabase: any
  private testData: Map<string, any[]> = new Map()

  constructor() {
    // Use test database configuration
    this.supabase = createClient<Database>(
      process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Create a test user
   */
  async createTestUser(userData?: Partial<{
    email: string
    password: string
    displayName: string
  }>): Promise<{ user: any; session: any }> {
    const testEmail = userData?.email || `test-${Date.now()}@example.com`
    const testPassword = userData?.password || 'testpassword123'

    const { data, error } = await this.supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    if (error) throw error

    // Create user profile
    if (data.user) {
      await this.supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          display_name: userData?.displayName || 'Test User',
          timezone: 'UTC'
        })

      this.trackTestData('users', [data.user.id])
    }

    return { user: data.user, session: data.session }
  }

  /**
   * Create test entries
   */
  async createTestEntries(userId: string, count = 5): Promise<any[]> {
    const entries = Array.from({ length: count }, (_, i) => ({
      user_id: userId,
      content: `Test content ${i + 1}`,
      original_input: `Test input ${i + 1}`,
      title: `Test Entry ${i + 1}`,
      status: i % 2 === 0 ? 'inbox' : 'scheduled',
      priority: Math.floor(Math.random() * 5) + 1,
      ai_category: ['Read Later', 'Build', 'Explore'][i % 3],
      ai_tags: [`tag${i}`, `category${i % 3}`],
      estimated_read_time: Math.floor(Math.random() * 30) + 5
    }))

    const { data, error } = await this.supabase
      .from('entries')
      .insert(entries)
      .select()

    if (error) throw error

    this.trackTestData('entries', data.map((entry: any) => entry.id))
    return data
  }

  /**
   * Create test processing queue items
   */
  async createTestProcessingQueue(entryId: string, userId: string): Promise<any[]> {
    const queueItems = [
      {
        entry_id: entryId,
        user_id: userId,
        task_type: 'summarize',
        status: 'pending',
        priority: 5
      },
      {
        entry_id: entryId,
        user_id: userId,
        task_type: 'categorize',
        status: 'completed',
        priority: 5,
        result: { category: 'Test Category' },
        processing_time_ms: 1500
      }
    ]

    const { data, error } = await this.supabase
      .from('processing_queue')
      .insert(queueItems)
      .select()

    if (error) throw error

    this.trackTestData('processing_queue', data.map((item: any) => item.id))
    return data
  }

  /**
   * Track test data for cleanup
   */
  private trackTestData(table: string, ids: string[]): void {
    const existing = this.testData.get(table) || []
    this.testData.set(table, [...existing, ...ids])
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<any>[] = []

    // Clean up in reverse dependency order
    const tables = ['processing_queue', 'entries', 'user_profiles']

    for (const table of tables) {
      const ids = this.testData.get(table)
      if (ids && ids.length > 0) {
        cleanupPromises.push(
          this.supabase
            .from(table)
            .delete()
            .in('id', ids)
        )
      }
    }

    // Clean up users (auth)
    const userIds = this.testData.get('users')
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        cleanupPromises.push(
          this.supabase.auth.admin.deleteUser(userId)
        )
      }
    }

    await Promise.allSettled(cleanupPromises)
    this.testData.clear()
  }

  /**
   * Reset database to clean state
   */
  async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset database in production')
    }

    // Delete all test data
    await this.supabase.from('processing_queue').delete().neq('id', '')
    await this.supabase.from('entries').delete().neq('id', '')
    await this.supabase.from('user_profiles').delete().neq('id', '')
  }

  /**
   * Get test database stats
   */
  async getTestStats(): Promise<{
    users: number
    entries: number
    processingQueue: number
  }> {
    const [usersResult, entriesResult, queueResult] = await Promise.all([
      this.supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      this.supabase.from('entries').select('id', { count: 'exact', head: true }),
      this.supabase.from('processing_queue').select('id', { count: 'exact', head: true })
    ])

    return {
      users: usersResult.count || 0,
      entries: entriesResult.count || 0,
      processingQueue: queueResult.count || 0
    }
  }
}

/**
 * Mock Services for Testing
 */
export class MockAIProcessor {
  async analyzeContent(content: string, url?: string): Promise<any> {
    return {
      title: `Mock Title for ${content.substring(0, 20)}...`,
      summary: `Mock summary for content: ${content.substring(0, 50)}...`,
      category: 'Test Category',
      tags: ['mock', 'test'],
      confidence: 0.85,
      sentiment: 'neutral',
      urgency: 'medium',
      estimatedReadTime: 5,
      suggestedScheduling: {
        timeOfDay: 'afternoon',
        duration: 30,
        priority: 3
      }
    }
  }

  async batchAnalyzeContent(): Promise<Map<string, any>> {
    return new Map()
  }

  getUsageStats() {
    return {
      modelUsage: { 'mock-model': 10 },
      totalCost: '0.50',
      tokensUsed: 1000
    }
  }
}

/**
 * Test Utilities
 */
export class TestUtils {
  /**
   * Generate random UUID for testing
   */
  static generateTestId(): string {
    return 'test-' + Math.random().toString(36).substring(2, 15)
  }

  /**
   * Create test request object
   */
  static createTestRequest(options: {
    method?: string
    url?: string
    headers?: Record<string, string>
    body?: any
  } = {}): Request {
    const {
      method = 'GET',
      url = 'http://localhost:3000/api/test',
      headers = {},
      body
    } = options

    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (body) {
      init.body = JSON.stringify(body)
    }

    return new Request(url, init)
  }

  /**
   * Create test context
   */
  static createTestContext(): any {
    return {
      requestId: TestUtils.generateTestId(),
      path: '/api/test',
      method: 'GET',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Wait for a specified time (for async testing)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Assert that an async function throws
   */
  static async assertThrows(
    fn: () => Promise<any>,
    expectedError?: string | RegExp
  ): Promise<void> {
    try {
      await fn()
      throw new Error('Expected function to throw, but it did not')
    } catch (error) {
      if (expectedError) {
        const message = error instanceof Error ? error.message : String(error)
        if (typeof expectedError === 'string') {
          if (!message.includes(expectedError)) {
            throw new Error(`Expected error to contain "${expectedError}", but got: ${message}`)
          }
        } else if (!expectedError.test(message)) {
          throw new Error(`Expected error to match ${expectedError}, but got: ${message}`)
        }
      }
    }
  }

  /**
   * Create performance timer for testing
   */
  static createTimer(): { start: () => void; stop: () => number } {
    let startTime: number

    return {
      start: () => {
        startTime = Date.now()
      },
      stop: () => {
        return Date.now() - startTime
      }
    }
  }
}

/**
 * Integration Test Helper
 */
export class IntegrationTestHelper {
  private dbHelper: TestDatabaseHelper
  private testUsers: Array<{ user: any; session: any }> = []

  constructor() {
    this.dbHelper = new TestDatabaseHelper()
  }

  /**
   * Setup integration test environment
   */
  async setup(): Promise<void> {
    // Create test users with different scenarios
    this.testUsers = await Promise.all([
      this.dbHelper.createTestUser({ email: 'user1@test.com', displayName: 'Test User 1' }),
      this.dbHelper.createTestUser({ email: 'user2@test.com', displayName: 'Test User 2' })
    ])

    // Create test data for each user
    for (const { user } of this.testUsers) {
      await this.dbHelper.createTestEntries(user.id, 10)
    }
  }

  /**
   * Cleanup integration test environment
   */
  async cleanup(): Promise<void> {
    await this.dbHelper.cleanup()
    this.testUsers = []
  }

  /**
   * Get test user by index
   */
  getTestUser(index = 0): { user: any; session: any } {
    return this.testUsers[index]
  }

  /**
   * Get all test users
   */
  getTestUsers(): Array<{ user: any; session: any }> {
    return this.testUsers
  }

  /**
   * Test API endpoint with authentication
   */
  async testAuthenticatedEndpoint(
    endpoint: string,
    options: {
      method?: string
      body?: any
      userIndex?: number
    } = {}
  ): Promise<Response> {
    const { method = 'GET', body, userIndex = 0 } = options
    const { session } = this.getTestUser(userIndex)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const requestInit: RequestInit = {
      method,
      headers
    }

    if (body) {
      requestInit.body = JSON.stringify(body)
    }

    return fetch(`http://localhost:3000${endpoint}`, requestInit)
  }
}

// Export test helpers
export const testDb = new TestDatabaseHelper()
export const testUtils = TestUtils
export const mockAI = new MockAIProcessor()