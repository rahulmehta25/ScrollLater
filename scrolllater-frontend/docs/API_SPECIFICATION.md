# ScrollLater API Specification v2

## Base URL
```
Production: https://scrolllater.app/api/v2
Development: http://localhost:3000/api/v2
```

## Authentication

All API endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## API Versioning

The API supports multiple versioning strategies:

1. **URL Path** (Recommended): `/api/v2/entries`
2. **Header**: `API-Version: v2`
3. **Query Parameter**: `?version=v2`

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456",
    "version": "v2"
  }
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456",
    "details": {
      // Additional error context
    }
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Data Models

### Entry

```typescript
interface Entry {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  url?: string
  title?: string
  content: string
  original_input: string
  ai_summary?: string
  ai_category?: string
  ai_tags?: string[]
  ai_confidence_score?: number
  user_category?: string
  user_tags?: string[]
  user_notes?: string
  priority: number // 1-5
  status: 'inbox' | 'scheduled' | 'completed' | 'archived'
  scheduled_for?: string
  completed_at?: string
  calendar_event_id?: string
  source: string
  estimated_read_time?: number
}
```

### User Profile

```typescript
interface UserProfile {
  id: string
  created_at: string
  updated_at: string
  display_name?: string
  timezone: string
  default_calendar_id?: string
  preferred_scheduling_times?: object[]
  default_block_duration: number
  auto_schedule_enabled: boolean
  google_calendar_connected: boolean
  total_entries: number
  total_scheduled: number
}
```

### Processing Queue

```typescript
interface ProcessingTask {
  id: string
  entry_id: string
  user_id: string
  created_at: string
  started_at?: string
  completed_at?: string
  task_type: 'summarize' | 'categorize' | 'schedule_suggest'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  priority: number
  result?: object
  error_message?: string
  retry_count: number
  processing_time_ms?: number
}
```

## Endpoints

### Entries

#### List Entries

```http
GET /api/v2/entries
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `status` | string | - | Filter by status |
| `category` | string | - | Filter by category |
| `tags` | string | - | Comma-separated tags |
| `priority` | number | - | Filter by priority |
| `date_from` | string | - | ISO date string |
| `date_to` | string | - | ISO date string |
| `q` | string | - | Search query |
| `sort_by` | string | created_at | Sort field |
| `sort_order` | string | desc | asc or desc |

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Example Entry",
        "content": "Entry content...",
        "status": "inbox",
        "priority": 3,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "filters": {
      "status": "inbox"
    },
    "pagination": {
      "page": 1,
      "limit": 20
    }
  }
}
```

#### Create Entry

```http
POST /api/v2/entries
```

**Request Body:**
```json
{
  "content": "Entry content",
  "originalInput": "Original user input",
  "url": "https://example.com",
  "source": "api",
  "userCategory": "Read Later",
  "userTags": ["tag1", "tag2"],
  "userNotes": "Additional notes",
  "priority": 3,
  "processWithAI": true
}
```

**Required Fields:**
- `content` (string): Main entry content
- `originalInput` (string): Original user input

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "content": "Entry content",
    "original_input": "Original user input",
    "status": "inbox",
    "priority": 3,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "metadata": {
    "aiProcessing": "queued"
  }
}
```

#### Get Entry

```http
GET /api/v2/entries/{id}
```

**Path Parameters:**
- `id` (string): Entry UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Entry Title",
    "content": "Entry content...",
    "ai_summary": "AI-generated summary",
    "status": "inbox",
    "priority": 3,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Update Entry

```http
PUT /api/v2/entries/{id}
```

**Request Body:**
```json
{
  "title": "Updated title",
  "userCategory": "Updated category",
  "userTags": ["new-tag"],
  "userNotes": "Updated notes",
  "priority": 4,
  "status": "scheduled",
  "scheduledFor": "2024-01-16T14:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Updated title",
    "priority": 4,
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Delete Entry

```http
DELETE /api/v2/entries/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

#### Entry Actions

```http
PATCH /api/v2/entries/{id}
```

**Schedule Entry:**
```json
{
  "action": "schedule",
  "scheduledFor": "2024-01-16T14:00:00Z",
  "calendarEventId": "calendar_event_123"
}
```

**Complete Entry:**
```json
{
  "action": "complete"
}
```

**Archive Entry:**
```json
{
  "action": "archive"
}
```

#### Bulk Operations

**Bulk Update:**
```http
PATCH /api/v2/entries
```

```json
{
  "entryIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "223e4567-e89b-12d3-a456-426614174001"
  ],
  "updateData": {
    "status": "archived",
    "userNotes": "Bulk archived"
  }
}
```

**Bulk Delete:**
```http
DELETE /api/v2/entries
```

```json
{
  "entryIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "223e4567-e89b-12d3-a456-426614174001"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 2,
    "successful": 2,
    "failed": 0,
    "errors": []
  }
}
```

### AI Processing

#### Analyze Entry

```http
POST /api/v2/ai/analyze
```

**Request Body:**
```json
{
  "entryId": "123e4567-e89b-12d3-a456-426614174000",
  "content": "Content to analyze",
  "url": "https://example.com",
  "useQueue": true
}
```

**Response (Queued):**
```json
{
  "success": true,
  "data": {
    "queued": true,
    "taskId": "task_123",
    "message": "Analysis task has been queued for processing"
  }
}
```

**Response (Direct):**
```json
{
  "success": true,
  "data": {
    "title": "AI-generated title",
    "summary": "AI-generated summary",
    "category": "Read Later",
    "tags": ["ai", "analysis"],
    "confidence": 0.85,
    "sentiment": "neutral",
    "urgency": "medium",
    "estimatedReadTime": 15
  }
}
```

#### Batch Processing

```http
POST /api/v2/ai/batch
```

**Request Body:**
```json
{
  "entryIds": [
    "123e4567-e89b-12d3-a456-426614174000",
    "223e4567-e89b-12d3-a456-426614174001"
  ],
  "tasks": ["summarize", "categorize"],
  "priority": 5
}
```

#### Queue Statistics

```http
GET /api/v2/ai/queue/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 15,
    "processing": 3,
    "completed": 245,
    "failed": 8,
    "avgProcessingTime": 2500
  }
}
```

### User Statistics

```http
GET /api/v2/users/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "inbox": 45,
      "scheduled": 30,
      "completed": 65,
      "archived": 10
    },
    "byCategory": {
      "Read Later": 60,
      "Build": 35,
      "Explore": 25,
      "Todo": 30
    },
    "avgReadTime": 12,
    "totalReadTime": 1800
  }
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **AI processing**: 100 requests per hour
- **Bulk operations**: 50 requests per hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642247400
```

## Pagination

List endpoints support cursor-based pagination:

**Request:**
```
GET /api/v2/entries?page=2&limit=20
```

**Response includes pagination metadata:**
```json
{
  "data": [...],
  "total": 150,
  "page": 2,
  "limit": 20,
  "totalPages": 8,
  "hasNext": true,
  "hasPrev": true
}
```

## Search

Full-text search is available using the `q` parameter:

```
GET /api/v2/entries?q=javascript tutorial
```

**Search operators:**
- `AND`: Default operator (javascript tutorial)
- `OR`: Use pipe symbol (javascript|python)
- `NOT`: Use minus sign (-deprecated)
- Phrases: Use quotes ("exact phrase")

## Filtering

Multiple filters can be combined:

```
GET /api/v2/entries?status=inbox&category=Read%20Later&priority=5&tags=urgent,important
```

## Webhooks (Future)

Webhook support for real-time updates:

**Events:**
- `entry.created`
- `entry.updated`
- `entry.deleted`
- `entry.scheduled`
- `entry.completed`
- `ai.processing.completed`

## SDK Examples

### JavaScript/TypeScript

```typescript
import { ScrollLaterAPI } from '@scrolllater/sdk'

const api = new ScrollLaterAPI({
  baseURL: 'https://scrolllater.app/api/v2',
  accessToken: 'your_access_token'
})

// Create entry
const entry = await api.entries.create({
  content: 'Article content',
  originalInput: 'Article link',
  processWithAI: true
})

// List entries
const entries = await api.entries.list({
  status: 'inbox',
  limit: 20
})

// Search entries
const searchResults = await api.entries.search('javascript tutorial')
```

### Python

```python
from scrolllater import ScrollLaterAPI

api = ScrollLaterAPI(
    base_url='https://scrolllater.app/api/v2',
    access_token='your_access_token'
)

# Create entry
entry = api.entries.create(
    content='Article content',
    original_input='Article link',
    process_with_ai=True
)

# List entries
entries = api.entries.list(status='inbox', limit=20)
```

### cURL Examples

**Create Entry:**
```bash
curl -X POST https://scrolllater.app/api/v2/entries \
  -H "Authorization: Bearer your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Article content",
    "originalInput": "Article link",
    "processWithAI": true
  }'
```

**List Entries:**
```bash
curl -X GET "https://scrolllater.app/api/v2/entries?status=inbox&limit=20" \
  -H "Authorization: Bearer your_access_token"
```

## Testing

Test your API integration using our test endpoints:

**Base URL:** `https://api-test.scrolllater.app/v2`

Test data is automatically cleaned up after 24 hours.

## Support

- **Documentation**: https://docs.scrolllater.app
- **Support**: support@scrolllater.app
- **Status Page**: https://status.scrolllater.app