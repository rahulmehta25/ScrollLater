// src/lib/ai-processor.ts

// Removed unused import

interface ContentAnalysis {
  title: string
  summary: string
  category: string
  tags: string[]
  confidence: number
  sentiment: 'positive' | 'neutral' | 'negative'
  urgency: 'low' | 'medium' | 'high'
  estimatedReadTime: number
  suggestedScheduling: {
    timeOfDay: 'morning' | 'afternoon' | 'evening'
    duration: number
    priority: number
  }
}

interface OpenRouterRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  max_tokens?: number
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

export class AIProcessor {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyzeContent(content: string, url?: string): Promise<ContentAnalysis> {
    const prompt = this.buildAnalysisPrompt(content, url)
    
    try {
      const response = await this.callOpenRouter({
        model: 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyst specializing in categorizing and summarizing digital content for productivity applications.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      })

      return this.parseAnalysisResponse(response)
    } catch (error) {
      console.error('AI analysis failed:', error)
      return this.getFallbackAnalysis(content)
    }
  }

  private buildAnalysisPrompt(content: string, url?: string): string {
    return `
Analyze the following content and provide a comprehensive analysis in JSON format:

Content: "${content}"
${url ? `URL: ${url}` : ''}

Please provide:
1. A concise, engaging title (max 60 characters)
2. A brief summary (max 150 words)
3. The most appropriate category from: Read Later, Build, Explore, Todo, Schedule, Creative, Learning, Business, Personal
4. 3-5 relevant tags
5. Confidence score (0-1) for the categorization
6. Sentiment analysis (positive/neutral/negative)
7. Urgency level (low/medium/high)
8. Estimated reading/completion time in minutes
9. Suggested scheduling preferences

Consider the following when analyzing:
- If it's a link to an article, focus on the topic and value
- If it's a task or todo item, identify the urgency and complexity
- If it's a creative idea, emphasize the inspirational aspects
- If it's a tool or resource, highlight its practical applications

Respond in this exact JSON format:
{
  "title": "Generated title",
  "summary": "Brief summary of the content",
  "category": "Category name",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.85,
  "sentiment": "positive",
  "urgency": "medium",
  "estimatedReadTime": 15,
  "suggestedScheduling": {
    "timeOfDay": "afternoon",
    "duration": 30,
    "priority": 3
  }
}
    `
  }

  private async callOpenRouter(request: OpenRouterRequest): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scrolllater.app',
        'X-Title': 'ScrollLater'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  private parseAnalysisResponse(response: string): ContentAnalysis {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate required fields
      if (!parsed.title || !parsed.summary || !parsed.category) {
        throw new Error('Missing required fields in AI response')
      }

      return {
        title: parsed.title.substring(0, 60),
        summary: parsed.summary.substring(0, 150),
        category: parsed.category,
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) 
          ? parsed.sentiment : 'neutral',
        urgency: ['low', 'medium', 'high'].includes(parsed.urgency) 
          ? parsed.urgency : 'medium',
        estimatedReadTime: Math.max(1, Math.min(120, parsed.estimatedReadTime || 10)),
        suggestedScheduling: {
          timeOfDay: ['morning', 'afternoon', 'evening'].includes(parsed.suggestedScheduling?.timeOfDay)
            ? parsed.suggestedScheduling.timeOfDay : 'afternoon',
          duration: Math.max(5, Math.min(180, parsed.suggestedScheduling?.duration || 30)),
          priority: Math.max(1, Math.min(5, parsed.suggestedScheduling?.priority || 3))
        }
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw new Error('Invalid AI response format')
    }
  }

  private getFallbackAnalysis(content: string): ContentAnalysis {
    // Simple fallback analysis when AI fails
    const words = content.split(' ').length
    const estimatedReadTime = Math.max(1, Math.ceil(words / 200))

    return {
      title: content.substring(0, 60),
      summary: content.substring(0, 150),
      category: 'Explore',
      tags: ['uncategorized'],
      confidence: 0.3,
      sentiment: 'neutral',
      urgency: 'medium',
      estimatedReadTime,
      suggestedScheduling: {
        timeOfDay: 'afternoon',
        duration: Math.min(30, estimatedReadTime * 2),
        priority: 3
      }
    }
  }

  async generateSchedulingSuggestions(
    entries: Array<{ content: string; category: string; urgency: string }>,
    userPreferences: {
      availableHours: Array<{ start: string; end: string }>
      preferredDuration: number
      timezone: string
    }
  ): Promise<Array<{ entryId: string; suggestedTime: string; reason: string }>> {
    const prompt = `
Based on the following entries and user preferences, suggest optimal scheduling times:

Entries:
${entries.map((entry, index) => `${index + 1}. ${entry.content} (Category: ${entry.category}, Urgency: ${entry.urgency})`).join('\n')}

User Preferences:
- Available hours: ${userPreferences.availableHours.map(h => `${h.start}-${h.end}`).join(', ')}
- Preferred session duration: ${userPreferences.preferredDuration} minutes
- Timezone: ${userPreferences.timezone}

Provide scheduling suggestions that:
1. Respect user's available hours
2. Prioritize urgent items
3. Group similar categories when possible
4. Consider optimal times for different types of content (e.g., learning in morning, creative work in afternoon)
5. Avoid scheduling conflicts

Respond in JSON format with an array of suggestions:
[
  {
    "entryId": "1",
    "suggestedTime": "2024-01-15T09:00:00Z",
    "reason": "Morning slot optimal for learning content"
  }
]
    `

    try {
      const response = await this.callOpenRouter({
        model: 'anthropic/claude-3-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are a productivity expert specializing in optimal scheduling and time management.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.4
      })

      const suggestions = JSON.parse(response)
      return Array.isArray(suggestions) ? suggestions : []
    } catch (error) {
      console.error('Failed to generate scheduling suggestions:', error)
      return []
    }
  }
}
