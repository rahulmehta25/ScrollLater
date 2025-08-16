import { NextRequest, NextResponse } from 'next/server'
import { ServiceError, ServiceErrorCode } from '@/lib/services/base.service'

export interface ApiVersion {
  version: string
  releaseDate: string
  deprecated?: boolean
  deprecationDate?: string
  sunsetDate?: string
  supportLevel: 'active' | 'maintenance' | 'deprecated' | 'sunset'
  changelog?: string[]
}

export interface VersioningConfig {
  defaultVersion: string
  supportedVersions: Map<string, ApiVersion>
  headerName: string
  pathPrefix?: string
}

/**
 * API Versioning Middleware
 * Handles version detection, validation, and deprecation warnings
 */
export class ApiVersioningMiddleware {
  private static instance: ApiVersioningMiddleware
  private config: VersioningConfig

  private constructor() {
    this.config = this.initializeVersioningConfig()
  }

  static getInstance(): ApiVersioningMiddleware {
    if (!ApiVersioningMiddleware.instance) {
      ApiVersioningMiddleware.instance = new ApiVersioningMiddleware()
    }
    return ApiVersioningMiddleware.instance
  }

  /**
   * Initialize versioning configuration
   */
  private initializeVersioningConfig(): VersioningConfig {
    const supportedVersions = new Map<string, ApiVersion>([
      ['v1', {
        version: 'v1',
        releaseDate: '2024-01-01',
        supportLevel: 'active',
        changelog: [
          'Initial API release',
          'Basic CRUD operations for entries',
          'User authentication',
          'AI processing queue'
        ]
      }],
      ['v2', {
        version: 'v2',
        releaseDate: '2024-06-01',
        supportLevel: 'active',
        changelog: [
          'Enhanced search capabilities',
          'Bulk operations',
          'Improved error handling',
          'Rate limiting',
          'API versioning support'
        ]
      }]
    ])

    return {
      defaultVersion: 'v2',
      supportedVersions,
      headerName: 'API-Version',
      pathPrefix: '/api'
    }
  }

  /**
   * Extract version from request
   */
  extractVersion(request: NextRequest): string {
    const pathname = request.nextUrl.pathname

    // Check for version in URL path (e.g., /api/v1/entries)
    const pathVersionMatch = pathname.match(/\/api\/(v\d+)\//)
    if (pathVersionMatch) {
      return pathVersionMatch[1]
    }

    // Check for version in header
    const headerVersion = request.headers.get(this.config.headerName)
    if (headerVersion) {
      return headerVersion
    }

    // Check for version in query parameter
    const queryVersion = request.nextUrl.searchParams.get('version')
    if (queryVersion) {
      return queryVersion
    }

    // Return default version
    return this.config.defaultVersion
  }

  /**
   * Validate version support
   */
  validateVersion(version: string): {
    isValid: boolean
    apiVersion?: ApiVersion
    error?: string
  } {
    const apiVersion = this.config.supportedVersions.get(version)

    if (!apiVersion) {
      return {
        isValid: false,
        error: `Unsupported API version: ${version}. Supported versions: ${Array.from(this.config.supportedVersions.keys()).join(', ')}`
      }
    }

    // Check if version is sunset
    if (apiVersion.supportLevel === 'sunset') {
      return {
        isValid: false,
        error: `API version ${version} has been sunset and is no longer available`
      }
    }

    return {
      isValid: true,
      apiVersion
    }
  }

  /**
   * Process version and add appropriate headers
   */
  processVersion(request: NextRequest): {
    version: string
    response: NextResponse | null
    warnings: string[]
  } {
    const version = this.extractVersion(request)
    const validation = this.validateVersion(version)
    const warnings: string[] = []

    if (!validation.isValid) {
      const errorResponse = NextResponse.json(
        {
          error: {
            message: validation.error,
            code: ServiceErrorCode.VALIDATION_ERROR,
            statusCode: 400,
            supportedVersions: Array.from(this.config.supportedVersions.keys()),
            defaultVersion: this.config.defaultVersion
          }
        },
        { status: 400 }
      )

      return {
        version,
        response: errorResponse,
        warnings
      }
    }

    const apiVersion = validation.apiVersion!

    // Add deprecation warnings
    if (apiVersion.supportLevel === 'deprecated') {
      warnings.push(
        `API version ${version} is deprecated and will be sunset on ${apiVersion.sunsetDate}`
      )
    }

    if (apiVersion.supportLevel === 'maintenance') {
      warnings.push(
        `API version ${version} is in maintenance mode. Consider upgrading to version ${this.config.defaultVersion}`
      )
    }

    return {
      version,
      response: null,
      warnings
    }
  }

  /**
   * Add versioning headers to response
   */
  addVersioningHeaders(
    response: NextResponse,
    version: string,
    warnings: string[] = []
  ): NextResponse {
    const apiVersion = this.config.supportedVersions.get(version)

    // Add version headers
    response.headers.set('API-Version', version)
    response.headers.set('API-Supported-Versions', Array.from(this.config.supportedVersions.keys()).join(', '))
    response.headers.set('API-Default-Version', this.config.defaultVersion)

    if (apiVersion) {
      response.headers.set('API-Version-Release-Date', apiVersion.releaseDate)
      response.headers.set('API-Version-Support-Level', apiVersion.supportLevel)

      // Add deprecation warnings
      if (warnings.length > 0) {
        response.headers.set('API-Deprecation-Warning', warnings.join('; '))
      }

      // Add sunset warning if applicable
      if (apiVersion.sunsetDate) {
        response.headers.set('API-Sunset-Date', apiVersion.sunsetDate)
      }
    }

    return response
  }

  /**
   * Middleware function
   */
  middleware(request: NextRequest): NextResponse | null {
    // Only process API routes
    if (!request.nextUrl.pathname.startsWith(this.config.pathPrefix!)) {
      return null
    }

    const { version, response, warnings } = this.processVersion(request)

    // If there's an error response, return it
    if (response) {
      return this.addVersioningHeaders(response, version, warnings)
    }

    // Add version info to request for downstream use
    const requestWithVersion = request as any
    requestWithVersion.apiVersion = version
    requestWithVersion.apiWarnings = warnings

    return null // Continue to next middleware/handler
  }

  /**
   * Get version information for documentation
   */
  getVersionInfo(): {
    defaultVersion: string
    supportedVersions: ApiVersion[]
    versioningStrategies: string[]
  } {
    return {
      defaultVersion: this.config.defaultVersion,
      supportedVersions: Array.from(this.config.supportedVersions.values()),
      versioningStrategies: [
        'URL Path: /api/v1/endpoint',
        `Header: ${this.config.headerName}: v1`,
        'Query Parameter: ?version=v1'
      ]
    }
  }

  /**
   * Create version-aware endpoint wrapper
   */
  versionedEndpoint(handlers: Record<string, Function>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const version = this.extractVersion(request)
      const validation = this.validateVersion(version)

      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: {
              message: validation.error,
              code: ServiceErrorCode.VALIDATION_ERROR,
              statusCode: 400
            }
          },
          { status: 400 }
        )
      }

      const handler = handlers[version] || handlers[this.config.defaultVersion]

      if (!handler) {
        return NextResponse.json(
          {
            error: {
              message: `No handler available for version ${version}`,
              code: ServiceErrorCode.INTERNAL_ERROR,
              statusCode: 500
            }
          },
          { status: 500 }
        )
      }

      try {
        const response = await handler(request)
        return this.addVersioningHeaders(response, version)
      } catch (error) {
        throw error // Let global error handler deal with it
      }
    }
  }

  /**
   * Feature flag based on version
   */
  isFeatureAvailable(feature: string, version: string): boolean {
    const featureMatrix: Record<string, string[]> = {
      'bulk-operations': ['v2'],
      'advanced-search': ['v2'],
      'rate-limiting': ['v2'],
      'webhooks': [] // Not yet available
    }

    return featureMatrix[feature]?.includes(version) ?? false
  }

  /**
   * Get migration guide for version upgrade
   */
  getMigrationGuide(fromVersion: string, toVersion: string): {
    changes: string[]
    breakingChanges: string[]
    migrationSteps: string[]
  } | null {
    const migrationGuides: Record<string, any> = {
      'v1-to-v2': {
        changes: [
          'Enhanced error responses with detailed error codes',
          'Added pagination metadata to list endpoints',
          'New bulk operation endpoints',
          'Improved search with full-text capabilities'
        ],
        breakingChanges: [
          'Error response format changed',
          'Pagination parameters renamed (page_size -> limit)',
          'Some endpoints moved to different paths'
        ],
        migrationSteps: [
          'Update error handling to use new error format',
          'Update pagination parameter names',
          'Test all endpoints with new version',
          'Update API client libraries'
        ]
      }
    }

    const migrationKey = `${fromVersion}-to-${toVersion}`
    return migrationGuides[migrationKey] || null
  }
}

// Export singleton
export const apiVersioning = ApiVersioningMiddleware.getInstance()

/**
 * Utility function to create versioned API response
 */
export function createVersionedResponse<T>(
  data: T,
  request: NextRequest,
  statusCode = 200
): NextResponse {
  const version = apiVersioning.extractVersion(request)
  const response = NextResponse.json(data, { status: statusCode })
  
  return apiVersioning.addVersioningHeaders(response, version)
}