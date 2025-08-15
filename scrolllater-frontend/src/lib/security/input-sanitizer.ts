import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Enhanced input validation and sanitization
 * Prevents XSS, SQL injection, and other input-based attacks
 */
export class InputSanitizer {
  private static instance: InputSanitizer
  
  // SQL injection patterns
  private readonly sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)/gi,
    /(--|#|\/\*|\*\/|@@|@|char|nchar|varchar|nvarchar|alter|begin|cast|cursor|declare|delete|drop|exec|execute|fetch|insert|kill|select|sys|sysobjects|syscolumns|table|update)/gi,
    /(\x00|\x1a|\\|\'|\"|\;)/g
  ]

  // XSS patterns
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi
  ]

  // Path traversal patterns
  private readonly pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\\/g,
    /%2e%2e%2f/gi,
    /%252e%252e%252f/gi
  ]

  private constructor() {}

  static getInstance(): InputSanitizer {
    if (!InputSanitizer.instance) {
      InputSanitizer.instance = new InputSanitizer()
    }
    return InputSanitizer.instance
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  sanitizeHTML(input: string): string {
    if (!input) return ''
    
    // Use DOMPurify for comprehensive HTML sanitization
    const clean = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      SAFE_FOR_TEMPLATES: true
    })

    return clean
  }

  /**
   * Sanitize plain text input
   */
  sanitizeText(input: string): string {
    if (!input) return ''
    
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '')
    
    // Escape special characters
    sanitized = this.escapeSpecialChars(sanitized)
    
    // Check for SQL injection patterns
    for (const pattern of this.sqlPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Potential SQL injection detected')
      }
    }
    
    return sanitized
  }

  /**
   * Sanitize URL input
   */
  sanitizeURL(input: string): string {
    if (!input) return ''
    
    try {
      const url = new URL(input)
      
      // Only allow http(s) protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid URL protocol')
      }
      
      // Check for javascript: and data: URLs
      if (input.toLowerCase().includes('javascript:') || 
          input.toLowerCase().includes('data:')) {
        throw new Error('Potentially malicious URL')
      }
      
      // Check for path traversal
      for (const pattern of this.pathTraversalPatterns) {
        if (pattern.test(url.pathname)) {
          throw new Error('Path traversal detected')
        }
      }
      
      return url.toString()
    } catch (error) {
      if (error instanceof Error && error.message.includes('URL')) {
        // Try to construct a valid URL
        const sanitized = input.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]/g, '')
        return `https://${sanitized}`
      }
      throw error
    }
  }

  /**
   * Sanitize email input
   */
  sanitizeEmail(input: string): string {
    if (!input) return ''
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const sanitized = input.toLowerCase().trim()
    
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format')
    }
    
    return sanitized
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(input: string): string {
    if (!input) return ''
    
    // Remove path traversal attempts
    let sanitized = input.replace(/\.\./g, '')
    
    // Remove special characters except dots, dashes, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop()
      sanitized = sanitized.substring(0, 250) + '.' + ext
    }
    
    return sanitized
  }

  /**
   * Escape special characters for safe display
   */
  private escapeSpecialChars(input: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    }
    
    return input.replace(/[&<>"'`=/]/g, (char) => escapeMap[char] || char)
  }

  /**
   * Validate and sanitize JSON input
   */
  sanitizeJSON(input: string): object {
    try {
      const parsed = JSON.parse(input)
      
      // Recursively sanitize all string values
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return this.sanitizeText(obj)
        } else if (Array.isArray(obj)) {
          return obj.map(item => sanitizeObject(item))
        } else if (obj !== null && typeof obj === 'object') {
          const sanitized: any = {}
          for (const [key, value] of Object.entries(obj)) {
            // Sanitize keys as well
            const sanitizedKey = this.sanitizeText(key)
            sanitized[sanitizedKey] = sanitizeObject(value)
          }
          return sanitized
        }
        return obj
      }
      
      return sanitizeObject(parsed)
    } catch (error) {
      throw new Error('Invalid JSON input')
    }
  }

  /**
   * Create enhanced Zod schemas with sanitization
   */
  createSanitizedSchema<T extends z.ZodTypeAny>(schema: T) {
    return schema.transform((data) => {
      if (typeof data === 'string') {
        return this.sanitizeText(data)
      }
      return data
    })
  }

  /**
   * Validate array size to prevent resource exhaustion
   */
  validateArraySize(array: any[], maxSize = 100): void {
    if (!Array.isArray(array)) {
      throw new Error('Input must be an array')
    }
    
    if (array.length > maxSize) {
      throw new Error(`Array size exceeds maximum allowed (${maxSize})`)
    }
  }

  /**
   * Validate object depth to prevent deep nesting attacks
   */
  validateObjectDepth(obj: any, maxDepth = 10, currentDepth = 0): void {
    if (currentDepth > maxDepth) {
      throw new Error(`Object nesting exceeds maximum depth (${maxDepth})`)
    }
    
    if (obj !== null && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        if (typeof value === 'object') {
          this.validateObjectDepth(value, maxDepth, currentDepth + 1)
        }
      }
    }
  }

  /**
   * Rate limit check for input (prevent spam)
   */
  checkInputRate(identifier: string, input: string): boolean {
    // This would integrate with the rate limiter
    // For now, just check input length
    if (input.length > 10000) {
      throw new Error('Input exceeds maximum allowed length')
    }
    return true
  }
}

// Export singleton instance
export const inputSanitizer = InputSanitizer.getInstance()

// Enhanced validation schemas with sanitization
export const enhancedSchemas = {
  // Entry validation with sanitization
  entryForm: z.object({
    content: z.string()
      .min(1, 'Content is required')
      .max(5000, 'Content must be less than 5000 characters')
      .transform(val => inputSanitizer.sanitizeText(val)),
    url: z.string()
      .optional()
      .transform(val => val ? inputSanitizer.sanitizeURL(val) : undefined),
    category: z.string()
      .optional()
      .transform(val => val ? inputSanitizer.sanitizeText(val) : undefined),
    tags: z.array(z.string().transform(val => inputSanitizer.sanitizeText(val)))
      .optional(),
    priority: z.number().min(1).max(5).default(3)
  }),

  // User input validation
  userInput: z.object({
    display_name: z.string()
      .max(100, 'Display name must be less than 100 characters')
      .transform(val => inputSanitizer.sanitizeText(val))
      .optional(),
    email: z.string()
      .email('Invalid email format')
      .transform(val => inputSanitizer.sanitizeEmail(val))
      .optional()
  }),

  // Search query validation
  searchQuery: z.string()
    .max(100, 'Search query is too long')
    .transform(val => inputSanitizer.sanitizeText(val))
}