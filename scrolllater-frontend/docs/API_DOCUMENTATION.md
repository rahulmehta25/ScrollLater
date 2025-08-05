# ScrollLater API Documentation

## Overview

ScrollLater provides a RESTful API for managing entries, AI analysis, scheduling, and integrations. All API endpoints are accessible at `https://scroll-later.vercel.app/api/`.

## Authentication

Most API endpoints require authentication using Supabase JWT tokens.

### Headers

```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

## API Endpoints

### Authentication

#### OAuth Callback

Handle OAuth authentication callbacks.

```http
GET /api/auth/callback?code={auth_code}
```

**Response:**
- `302 Redirect` to dashboard on success
- `400 Bad Request` if code is missing

---

#### Google Calendar OAuth Callback

Handle Google Calendar OAuth flow.

```http
GET /api/auth/google-callback?code={auth_code}&state={state}
```

**Query Parameters:**
- `code` (required): Authorization code from Google
- `state` (required): State parameter for session validation

**Response:**
- `302 Redirect` to `/dashboard/settings?calendar=connected` on success
- `302 Redirect` to `/dashboard/settings?calendar=error` on failure

---

### AI Services

#### Analyze Entry

Analyze entry content using AI to extract metadata.

```http
POST /api/ai/analyze
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "entryId": "uuid",
  "content": "Entry content to analyze",
  "url": "https://example.com" // optional
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "title": "Generated title",
    "summary": "AI-generated summary",
    "category": "Suggested category",
    "tags": ["tag1", "tag2"],
    "confidence_score": 0.85,
    "priority": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: AI service error

---

#### Schedule Suggestions

Get AI-powered scheduling suggestions for entries.

```http
POST /api/ai/schedule-suggest
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "entries": [
    {
      "id": "entry-uuid",
      "content": "Entry content",
      "category": "Todo",
      "urgency": "high" // high, medium, low
    }
  ],
  "weekStart": "2024-01-14",
  "weekEnd": "2024-01-20"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "entryId": "entry-uuid",
      "suggestedTime": "2024-01-15T10:00:00Z",
      "confidence": 0.8,
      "reason": "Best time for focused work based on your patterns",
      "duration": 30
    }
  ]
}
```

---

### Calendar Integration

#### Schedule Entry

Create a calendar event for an entry.

```http
POST /api/calendar/schedule
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "entryId": "uuid",
  "scheduledFor": "2024-01-15T10:00:00Z",
  "duration": 30 // minutes
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "google-event-id",
    "htmlLink": "https://calendar.google.com/event?eid=...",
    "start": "2024-01-15T10:00:00Z",
    "end": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User not authenticated
- `400 Bad Request`: Calendar not connected
- `500 Internal Server Error`: Google Calendar API error

---

### iOS Shortcuts Integration

#### Webhook Endpoint

Create entries via iOS Shortcuts.

```http
POST /api/shortcuts/webhook
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "your-shortcut-token",
  "content": "Entry content",
  "source": "ios-shortcut" // optional
}
```

**Response:**
```json
{
  "success": true,
  "entry": {
    "id": "entry-uuid",
    "content": "Entry content",
    "created_at": "2024-01-15T10:00:00Z",
    "status": "inbox"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid content type
- `401 Unauthorized`: Invalid token
- `500 Internal Server Error`: Database error

---

### Testing Endpoints

#### OpenRouter Test

Test OpenRouter AI integration.

```http
GET /api/test/openrouter
POST /api/test/openrouter
```

**GET Response:**
```json
{
  "status": "ok",
  "hasApiKey": true,
  "timestamp": "2024-01-15T10:00:00Z"
}
```

**POST Request Body:**
```json
{
  "content": "Test content for analysis"
}
```

**POST Response:**
```json
{
  "success": true,
  "analysis": {
    "summary": "AI-generated summary",
    "category": "Suggested category",
    "processingTime": "1234ms"
  }
}
```

---

## Rate Limiting

API endpoints are subject to the following rate limits:
- **AI Analysis**: 100 requests per hour per user
- **Schedule Suggestions**: 50 requests per hour per user
- **Webhook**: 500 requests per hour per token

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE", // optional
  "details": {} // optional additional information
}
```

### Common Error Codes

- `UNAUTHORIZED`: Missing or invalid authentication
- `INVALID_REQUEST`: Request validation failed
- `RATE_LIMITED`: Rate limit exceeded
- `SERVER_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: External service unavailable

## Webhooks

### Entry Processing Webhook

ScrollLater can notify your application when entries are processed.

**Webhook Payload:**
```json
{
  "event": "entry.processed",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "entryId": "uuid",
    "userId": "uuid",
    "analysis": {
      "title": "Generated title",
      "summary": "Summary",
      "category": "Category",
      "tags": ["tag1", "tag2"]
    }
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Create an entry via webhook
const createEntry = async (token: string, content: string) => {
  const response = await fetch('https://scroll-later.vercel.app/api/shortcuts/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      content,
      source: 'api-client'
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
};

// Analyze content
const analyzeContent = async (token: string, entryId: string, content: string) => {
  const response = await fetch('https://scroll-later.vercel.app/api/ai/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entryId,
      content
    })
  });
  
  return response.json();
};
```

### Python

```python
import requests
import json

class ScrollLaterAPI:
    def __init__(self, base_url="https://scroll-later.vercel.app/api"):
        self.base_url = base_url
    
    def create_entry(self, token, content):
        """Create an entry via webhook"""
        response = requests.post(
            f"{self.base_url}/shortcuts/webhook",
            headers={"Content-Type": "application/json"},
            json={
                "token": token,
                "content": content,
                "source": "python-sdk"
            }
        )
        response.raise_for_status()
        return response.json()
    
    def analyze_entry(self, auth_token, entry_id, content):
        """Analyze entry content"""
        response = requests.post(
            f"{self.base_url}/ai/analyze",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "entryId": entry_id,
                "content": content
            }
        )
        response.raise_for_status()
        return response.json()
```

### cURL Examples

```bash
# Create entry via webhook
curl -X POST https://scroll-later.vercel.app/api/shortcuts/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-token-here",
    "content": "Check out this interesting article"
  }'

# Analyze content
curl -X POST https://scroll-later.vercel.app/api/ai/analyze \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "entryId": "entry-uuid",
    "content": "Article content here"
  }'

# Get scheduling suggestions
curl -X POST https://scroll-later.vercel.app/api/ai/schedule-suggest \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [{
      "id": "entry-uuid",
      "content": "Review quarterly reports",
      "category": "Business"
    }],
    "weekStart": "2024-01-14",
    "weekEnd": "2024-01-20"
  }'
```

## Best Practices

1. **Authentication**: Always use HTTPS and keep tokens secure
2. **Rate Limiting**: Implement exponential backoff for retries
3. **Error Handling**: Check response status codes and handle errors gracefully
4. **Validation**: Validate input data before sending requests
5. **Batch Operations**: Use bulk endpoints when available to reduce API calls

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- AI analysis endpoints
- Calendar integration
- iOS Shortcuts webhook
- Authentication endpoints

---

For questions or support, please contact the ScrollLater team or open an issue on GitHub.