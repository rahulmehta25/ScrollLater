/**
 * Base Repository Interface
 * Provides common CRUD operations for all repositories
 */
export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>
  findAll(filters?: Record<string, any>): Promise<T[]>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T | null>
  delete(id: string): Promise<boolean>
  count(filters?: Record<string, any>): Promise<number>
}

/**
 * Repository Result Type for consistent error handling
 */
export type RepositoryResult<T> = {
  success: true
  data: T
} | {
  success: false
  error: RepositoryError
}

/**
 * Repository Error Types
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: RepositoryErrorCode,
    public originalError?: any
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export enum RepositoryErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Query filters
 */
export interface QueryFilters {
  [key: string]: any
}

/**
 * Enhanced Base Repository with pagination and advanced features
 */
export interface EnhancedBaseRepository<T> extends BaseRepository<T> {
  findWithPagination(
    filters?: QueryFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<T>>
  
  findByIds(ids: string[]): Promise<T[]>
  
  exists(id: string): Promise<boolean>
  
  createMany(data: Partial<T>[]): Promise<T[]>
  
  updateMany(
    filters: QueryFilters,
    data: Partial<T>
  ): Promise<T[]>
  
  deleteMany(filters: QueryFilters): Promise<number>
  
  findOne(filters: QueryFilters): Promise<T | null>
}