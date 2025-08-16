# ScrollLater Backend Architecture

## Overview

The ScrollLater backend follows a layered architecture pattern with clear separation of concerns, implementing industry best practices for scalability, maintainability, and security.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│                 (Web, Mobile, API)                          │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway Layer                          │
│         (Middleware, Auth, Rate Limiting)                   │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│            (Business Logic, Validation)                     │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                 Repository Layer                            │
│              (Data Access, Queries)                         │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                             │
│                (PostgreSQL via Supabase)                    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. API Gateway Layer

**Location**: `/src/lib/middleware/`

- **API Versioning**: Handles version detection and routing
- **Error Handling**: Centralized error processing and response formatting
- **Security Middleware**: Authentication, authorization, and security headers
- **Rate Limiting**: Request throttling and abuse prevention

#### Key Files:
- `api-versioning.ts` - API version management
- `error-handler.ts` - Global error handling
- `auth-middleware.ts` - Authentication and security

### 2. Service Layer

**Location**: `/src/lib/services/`

The service layer contains business logic and orchestrates operations between the API and repository layers.

#### Features:
- Input validation and sanitization
- Business rule enforcement
- Transaction management
- Integration with external services (AI processing)
- Error handling and logging

#### Key Files:
- `base.service.ts` - Base service with common functionality
- `entries.service.ts` - Entry management business logic

### 3. Repository Layer

**Location**: `/src/lib/repositories/`

The repository layer provides data access abstraction and encapsulates database operations.

#### Features:
- CRUD operations with consistent interfaces
- Query optimization and performance monitoring
- Error handling and type safety
- Pagination and filtering support

#### Key Files:
- `base.repository.ts` - Base repository interface and utilities
- `entries.repository.ts` - Entry data access implementation

### 4. Database Layer

**Location**: `/supabase/`

PostgreSQL database with optimized schema and performance considerations.

#### Features:
- Normalized data structure
- Optimized indexes for common queries
- Row Level Security (RLS) policies
- Database functions for complex operations
- Full-text search capabilities

## API Design Principles

### RESTful Design

All endpoints follow REST conventions:

- `GET` - Retrieve resources
- `POST` - Create new resources
- `PUT` - Update entire resources
- `PATCH` - Partial updates or actions
- `DELETE` - Remove resources

### Versioning Strategy

API versioning is implemented through multiple strategies:

1. **URL Path**: `/api/v2/entries`
2. **Header**: `API-Version: v2`
3. **Query Parameter**: `?version=v2`

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {...},
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456",
    "version": "v2"
  }
}
```

Error responses:

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456",
    "details": {...}
  }
}
```

## Database Schema

### Core Tables

#### `user_profiles`
- User account information and preferences
- Links to Supabase auth.users
- Stores scheduling preferences and integrations

#### `entries`
- Main content storage
- AI analysis results
- User categorization and notes
- Full-text search vector

#### `processing_queue`
- AI processing task queue
- Status tracking and error handling
- Performance metrics

#### `categories`
- System and user-defined categories
- Color coding and icons

### Indexes and Performance

Optimized indexes for common query patterns:

```sql
-- Composite index for user entries by status and date
CREATE INDEX idx_entries_user_status_created 
ON entries(user_id, status, created_at DESC);

-- GIN index for tag searches
CREATE INDEX idx_entries_tags_gin 
ON entries USING GIN((ai_tags || user_tags));

-- Full-text search index
CREATE INDEX idx_entries_search 
ON entries USING GIN(search_vector);
```

## Security Architecture

### Authentication

- JWT-based authentication via Supabase Auth
- Session validation and refresh token handling
- User context injection for downstream services

### Authorization

- Row Level Security (RLS) policies
- User ownership validation
- Resource-level access controls

### Security Headers

Standard security headers applied to all responses:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Input Validation

- Request body validation and sanitization
- SQL injection prevention
- XSS protection through content encoding

## Performance Optimization

### Database Optimization

1. **Query Monitoring**: Real-time query performance tracking
2. **Efficient Indexes**: Composite indexes for common query patterns
3. **Connection Pooling**: Managed by Supabase
4. **Query Optimization**: Monitoring slow queries and optimization

### Caching Strategy

1. **Application-level Caching**: In-memory caching for frequently accessed data
2. **Database Query Caching**: Supabase built-in query caching
3. **CDN Caching**: Static asset caching

### Background Processing

AI processing is handled asynchronously through a queue system:

1. **Task Enqueueing**: New entries trigger AI processing tasks
2. **Background Workers**: Cron jobs process queued tasks
3. **Result Storage**: Processed results stored back to database
4. **Error Handling**: Failed tasks tracked and retried

## Error Handling Strategy

### Error Classification

1. **Validation Errors** (4xx): Client-side errors
2. **Authentication Errors** (401): Invalid or missing auth
3. **Authorization Errors** (403): Insufficient permissions
4. **Not Found Errors** (404): Resource doesn't exist
5. **Server Errors** (5xx): Internal system errors

### Error Logging

- Structured logging with request context
- Error aggregation and monitoring
- Performance impact tracking
- Security event logging

## Testing Architecture

### Unit Tests

- Service layer business logic testing
- Repository layer data access testing
- Utility function testing

### Integration Tests

- End-to-end API testing
- Database integration testing
- External service integration testing

### Performance Tests

- Load testing for high-traffic scenarios
- Database performance testing
- Memory and resource usage testing

## Deployment and Scalability

### Horizontal Scaling

- Stateless application design
- Database connection pooling
- Load balancer compatibility

### Monitoring and Observability

- Request/response logging
- Performance metrics collection
- Error rate monitoring
- Database performance tracking

### Health Checks

- Application health endpoints
- Database connectivity checks
- External service availability

## Development Guidelines

### Code Organization

```
src/
├── app/api/              # Next.js API routes
│   ├── v1/              # Version 1 endpoints
│   └── v2/              # Version 2 endpoints
├── lib/
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer
│   ├── middleware/      # Request processing
│   ├── database/        # Database utilities
│   ├── security/        # Security utilities
│   └── testing/         # Test utilities
└── middleware.ts        # Global middleware
```

### Best Practices

1. **Separation of Concerns**: Each layer has specific responsibilities
2. **Dependency Injection**: Services can be easily mocked and tested
3. **Error Handling**: Consistent error handling across all layers
4. **Validation**: Input validation at service layer
5. **Documentation**: Comprehensive API documentation
6. **Testing**: Unit and integration tests for all components

## API Endpoints Documentation

### Entries API (v2)

#### `GET /api/v2/entries`
Retrieve user entries with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (max: 100, default: 20)
- `status` (string): Filter by status (inbox, scheduled, completed, archived)
- `category` (string): Filter by category
- `tags` (string): Comma-separated tags
- `q` (string): Search query
- `sort_by` (string): Sort field (default: created_at)
- `sort_order` (string): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### `POST /api/v2/entries`
Create a new entry.

**Request Body:**
```json
{
  "content": "Entry content",
  "originalInput": "Original user input",
  "url": "https://example.com",
  "userCategory": "Read Later",
  "userTags": ["tag1", "tag2"],
  "priority": 3,
  "processWithAI": true
}
```

#### `PUT /api/v2/entries/{id}`
Update an existing entry.

#### `DELETE /api/v2/entries/{id}`
Delete an entry.

#### `PATCH /api/v2/entries`
Bulk operations on multiple entries.

**Request Body:**
```json
{
  "entryIds": ["id1", "id2", "id3"],
  "updateData": {
    "status": "archived",
    "userNotes": "Bulk archived"
  }
}
```

## Migration Guides

### From v1 to v2

**Breaking Changes:**
1. Error response format updated
2. Pagination parameters renamed (`page_size` → `limit`)
3. Bulk operations moved to separate endpoints

**Migration Steps:**
1. Update error handling to use new format
2. Update pagination parameter names
3. Migrate bulk operations to new endpoints
4. Test with v2 endpoints

## Future Considerations

### Planned Improvements

1. **Microservices Migration**: Split services for better scalability
2. **Event-Driven Architecture**: Implement event sourcing for audit trails
3. **Advanced Caching**: Redis integration for improved performance
4. **Real-time Updates**: WebSocket support for live updates
5. **Advanced Analytics**: Enhanced metrics and reporting

### Scaling Considerations

1. **Database Sharding**: Horizontal database scaling strategy
2. **Read Replicas**: Separate read/write database instances
3. **Service Mesh**: Advanced service-to-service communication
4. **Container Orchestration**: Kubernetes deployment strategy