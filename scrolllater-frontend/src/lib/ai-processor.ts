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

interface ModelConfig {
  name: string
  cost: number // cost per 1000 tokens
  speed: 'fast' | 'medium' | 'slow'
  accuracy: 'low' | 'medium' | 'high'
  maxTokens: number
}

export const AI_MODELS: Record<string, ModelConfig> = {
  'anthropic/claude-3-haiku': {
    name: 'Claude 3 Haiku',
    cost: 0.25,
    speed: 'fast',
    accuracy: 'medium',
    maxTokens: 200000
  },
  'anthropic/claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    cost: 3.0,
    speed: 'medium',
    accuracy: 'high',
    maxTokens: 200000
  },
  'mistralai/mistral-7b-instruct': {
    name: 'Mistral 7B',
    cost: 0.07,
    speed: 'fast',
    accuracy: 'medium',
    maxTokens: 32000
  },
  'openai/gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    cost: 0.5,
    speed: 'fast',
    accuracy: 'medium',
    maxTokens: 16000
  }
}

export enum TaskType {
  SUMMARIZE = 'summarize',
  CATEGORIZE = 'categorize',
  SCHEDULE_SUGGEST = 'schedule_suggest',
  BATCH_ANALYZE = 'batch_analyze'
}

export class AIProcessor {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions'
  private modelUsage: Map<string, number> = new Map()
  private totalCost: number = 0

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  // Select the best model based on task type and cost optimization
  private selectModel(taskType: TaskType): string {
    switch (taskType) {
      case TaskType.SUMMARIZE:
        return 'anthropic/claude-3-haiku' // Fast and cost-effective
      case TaskType.CATEGORIZE:
        return 'mistralai/mistral-7b-instruct' // Good balance
      case TaskType.SCHEDULE_SUGGEST:
        return 'anthropic/claude-3-sonnet' // Higher accuracy needed
      case TaskType.BATCH_ANALYZE:
        return 'mistralai/mistral-7b-instruct' // Cost-effective for bulk
      default:
        return 'openai/gpt-3.5-turbo' // Reliable fallback
    }
  }

  // Track model usage and costs
  private trackUsage(model: string, tokens: number) {
    const current = this.modelUsage.get(model) || 0
    this.modelUsage.set(model, current + tokens)
    
    const modelConfig = AI_MODELS[model]
    if (modelConfig) {
      this.totalCost += (tokens / 1000) * modelConfig.cost
    }
  }

  getUsageStats() {
    return {
      modelUsage: Object.fromEntries(this.modelUsage),
      totalCost: this.totalCost.toFixed(2),
      tokensUsed: Array.from(this.modelUsage.values()).reduce((a, b) => a + b, 0)
    }
  }

  async analyzeContent(content: string, url?: string): Promise<ContentAnalysis> {
    const prompt = this.buildAnalysisPrompt(content, url)
    const model = this.selectModel(TaskType.BATCH_ANALYZE)
    
    try {
      const response = await this.callOpenRouter({
        model,
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
      // Try fallback model
      if (model !== 'openai/gpt-3.5-turbo') {
        try {
          const fallbackResponse = await this.callOpenRouter({
            model: 'openai/gpt-3.5-turbo',
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
          return this.parseAnalysisResponse(fallbackResponse)
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError)
        }
      }
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
    
    // Track usage
    if (data.usage) {
      this.trackUsage(request.model, data.usage.total_tokens || 0)
    }
    
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

    const model = this.selectModel(TaskType.SCHEDULE_SUGGEST)
    
    try {
      const response = await this.callOpenRouter({
        model,
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

  // Batch processing for multiple entries
  async batchAnalyzeContent(
    entries: Array<{ id: string; content: string; url?: string }>,
    batchSize: number = 5
  ): Promise<Map<string, ContentAnalysis>> {
    const results = new Map<string, ContentAnalysis>()
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      const promises = batch.map(async (entry) => {
        try {
          const analysis = await this.analyzeContent(entry.content, entry.url)
          results.set(entry.id, analysis)
        } catch (error) {
          console.error(`Failed to analyze entry ${entry.id}:`, error)
          results.set(entry.id, this.getFallbackAnalysis(entry.content))
        }
      })
      
      await Promise.all(promises)
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return results
  }

  // Generate summary for multiple entries
  async generateCollectiveSummary(
    entries: Array<{ content: string; category: string }>
  ): Promise<string> {
    const prompt = `
Analyze the following collection of entries and provide a cohesive summary:

Entries:
${entries.map((entry, index) => `${index + 1}. [${entry.category}] ${entry.content.substring(0, 200)}...`).join('\n')}

Provide:
1. An overall theme or pattern across these entries
2. Key insights or connections between items
3. Actionable recommendations based on the content
4. Priority order for addressing these items

Keep the summary concise (max 300 words) and actionable.
    `

    try {
      const response = await this.callOpenRouter({
        model: this.selectModel(TaskType.SUMMARIZE),
        messages: [
          {
            role: 'system',
            content: 'You are an expert at identifying patterns and providing actionable insights from collections of information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.5
      })

      return response
    } catch (error) {
      console.error('Failed to generate collective summary:', error)
      return 'Unable to generate summary at this time.'
    }
  }
}
