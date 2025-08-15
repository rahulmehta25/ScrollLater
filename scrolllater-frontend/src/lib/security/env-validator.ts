import { z } from 'zod'

/**
 * Environment variable validation and security
 * Ensures all required environment variables are present and valid
 */

// Define environment variable schema
const envSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),
  
  // OpenRouter AI Configuration
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API key is required').optional(),
  
  // Redis Configuration (for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Redis URL').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'Redis token is required').optional(),
  
  // Security Configuration
  CRON_SECRET: z.string().min(32, 'CRON secret must be at least 32 characters').optional(),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters').optional(),
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters').optional(),
  
  // Application Configuration
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google client ID is required').optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google client secret is required').optional(),
  
  // Monitoring Configuration
  SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1, 'Sentry auth token is required').optional(),
})

type EnvConfig = z.infer<typeof envSchema>

class EnvironmentValidator {
  private static instance: EnvironmentValidator
  private config: EnvConfig | null = null
  private validated = false

  private constructor() {}

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator()
    }
    return EnvironmentValidator.instance
  }

  /**
   * Validate environment variables
   */
  validate(): EnvConfig {
    if (this.validated && this.config) {
      return this.config
    }

    try {
      // Parse and validate environment variables
      const env = envSchema.parse(process.env)
      
      // Additional security checks
      this.performSecurityChecks(env)
      
      this.config = env
      this.validated = true
      
      // Log validation success (without exposing sensitive data)
      console.info('Environment variables validated successfully', {
        environment: env.NODE_ENV || 'development',
        hasSupabase: !!env.NEXT_PUBLIC_SUPABASE_URL,
        hasRedis: !!env.UPSTASH_REDIS_REST_URL,
        hasAI: !!env.OPENROUTER_API_KEY,
        timestamp: new Date().toISOString()
      })
      
      return env
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Environment validation failed:')
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`)
        })
        
        // In production, fail fast
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Critical environment variables are missing or invalid')
        }
      }
      throw error
    }
  }

  /**
   * Perform additional security checks on environment variables
   */
  private performSecurityChecks(env: EnvConfig): void {
    // Check for exposed secrets in public variables
    const publicVars = Object.entries(env).filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
    
    publicVars.forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Check for potential secrets in public variables
        const secretPatterns = [
          /secret/i,
          /password/i,
          /token/i,
          /private/i,
          /key/i
        ]
        
        const lowerKey = key.toLowerCase()
        
        // Skip known safe public keys
        const safeKeys = ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_APP_URL']
        if (!safeKeys.includes(key)) {
          secretPatterns.forEach(pattern => {
            if (pattern.test(lowerKey)) {
              console.warn(`Warning: Potential secret in public variable: ${key}`)
            }
          })
        }
      }
    })

    // Validate API key formats
    if (env.OPENROUTER_API_KEY && !this.isValidAPIKey(env.OPENROUTER_API_KEY)) {
      console.warn('OpenRouter API key format appears invalid')
    }

    // Check for default/example values
    const defaultValues = ['your-api-key', 'xxx', 'change-me', 'secret', 'password']
    Object.entries(env).forEach(([key, value]) => {
      if (typeof value === 'string' && defaultValues.includes(value.toLowerCase())) {
        console.warn(`Warning: Default value detected for ${key}`)
      }
    })

    // Ensure production has all required security variables
    if (env.NODE_ENV === 'production') {
      const requiredProdVars = [
        'CRON_SECRET',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'NEXT_PUBLIC_APP_URL'
      ]
      
      requiredProdVars.forEach(varName => {
        if (!env[varName as keyof EnvConfig]) {
          throw new Error(`${varName} is required in production`)
        }
      })
    }
  }

  /**
   * Validate API key format
   */
  private isValidAPIKey(key: string): boolean {
    // Basic format validation (adjust based on actual API key format)
    return key.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(key)
  }

  /**
   * Get a specific environment variable with type safety
   */
  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    if (!this.config) {
      this.validate()
    }
    return this.config![key]
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.get('NODE_ENV') === 'production'
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development'
  }

  /**
   * Get safe environment variables for client-side
   */
  getPublicConfig() {
    if (!this.config) {
      this.validate()
    }
    
    const publicConfig: Record<string, any> = {}
    
    Object.entries(this.config!).forEach(([key, value]) => {
      if (key.startsWith('NEXT_PUBLIC_')) {
        publicConfig[key] = value
      }
    })
    
    return publicConfig
  }

  /**
   * Mask sensitive values for logging
   */
  maskSensitiveValue(value: string): string {
    if (value.length <= 8) {
      return '***'
    }
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
  }
}

// Export singleton instance
export const envValidator = EnvironmentValidator.getInstance()

// Export validated environment configuration
export const env = envValidator.validate()

// Type-safe environment variable access
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  return envValidator.get(key)
}

// Environment checks
export const isProduction = () => envValidator.isProduction()
export const isDevelopment = () => envValidator.isDevelopment()