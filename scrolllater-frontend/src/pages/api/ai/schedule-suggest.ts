import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

interface Entry {
  id: string
  content: string
  category: string
  urgency: string
}

interface SchedulingRequest {
  entries: Entry[]
  weekStart: string
  weekEnd: string
}

interface SchedulingSuggestion {
  entryId: string
  suggestedTime: string
  confidence: number
  reason: string
  duration: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Debug logging for environment variables
  console.log('DEBUG: schedule-suggest OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
  console.log('DEBUG: schedule-suggest OPENROUTER_API_KEY length:', process.env.OPENROUTER_API_KEY?.length || 0);

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { entries, weekStart, weekEnd }: SchedulingRequest = req.body

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'No entries provided' })
    }

    // Get user preferences and patterns
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('preferred_scheduling_times, default_block_duration, timezone')
      .eq('id', user.id)
      .single()

    // Get existing scheduled entries for the week
    const { data: existingScheduled } = await supabase
      .from('entries')
      .select('scheduled_for')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .gte('scheduled_for', weekStart)
      .lte('scheduled_for', weekEnd)

    // Generate scheduling suggestions using AI
    const suggestions = await generateAISuggestions(
      entries,
      new Date(weekStart),
      new Date(weekEnd),
      userProfile,
      existingScheduled || []
    )

    return res.status(200).json({ suggestions })

  } catch (error) {
    console.error('Error in schedule-suggest API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function generateAISuggestions(
  entries: Entry[],
  weekStart: Date,
  weekEnd: Date,
  userProfile: any,
  existingScheduled: any[]
): Promise<SchedulingSuggestion[]> {
  try {
    // Prepare the prompt for AI
    const prompt = `
Based on the following entries and user preferences, suggest optimal scheduling times for the week of ${weekStart.toDateString()} to ${weekEnd.toDateString()}.

Entries to schedule:
${entries.map((entry, index) => `${index + 1}. ${entry.content.substring(0, 100)}... (Category: ${entry.category}, Urgency: ${entry.urgency})`).join('\n')}

User Preferences:
- Preferred scheduling times: ${userProfile?.preferred_scheduling_times || 'Not specified'}
- Default block duration: ${userProfile?.default_block_duration || 30} minutes
- Timezone: ${userProfile?.timezone || 'UTC'}

Existing scheduled items for this week:
${existingScheduled.map(item => `- ${new Date(item.scheduled_for).toLocaleString()}`).join('\n')}

Please suggest optimal scheduling times that:
1. Respect user's preferred times when available
2. Prioritize high-urgency items
3. Group similar categories when possible
4. Avoid conflicts with existing scheduled items
5. Consider optimal times for different content types:
   - Learning content: Morning hours
   - Creative work: Afternoon hours
   - Reading/Review: Evening hours
   - High-urgency tasks: Earlier in the week

Respond in JSON format:
[
  {
    "entryId": "entry-id",
    "suggestedTime": "2024-01-15T09:00:00Z",
    "confidence": 0.85,
    "reason": "Morning slot optimal for learning content",
    "duration": 30
  }
]
    `

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scrolllater.app',
        'X-Title': 'ScrollLater'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'system',
            content: 'You are a productivity expert specializing in optimal scheduling and time management. Provide practical, actionable scheduling suggestions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No content received from AI')
    }

    // Parse AI response
    let suggestions: SchedulingSuggestion[]
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON array found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Fallback: generate basic suggestions
      suggestions = generateFallbackSuggestions(entries, weekStart, weekEnd)
    }

    // Validate and clean suggestions
    return suggestions
      .filter(suggestion => {
        const suggestedTime = new Date(suggestion.suggestedTime)
        return suggestedTime >= weekStart && suggestedTime <= weekEnd
      })
      .map(suggestion => ({
        ...suggestion,
        confidence: Math.max(0, Math.min(1, suggestion.confidence || 0.5)),
        duration: Math.max(15, Math.min(120, suggestion.duration || 30))
      }))
      .slice(0, 10) // Limit to 10 suggestions

  } catch (error) {
    console.error('Error generating AI suggestions:', error)
    return generateFallbackSuggestions(entries, weekStart, weekEnd)
  }
}

function generateFallbackSuggestions(
  entries: Entry[],
  weekStart: Date,
  weekEnd: Date
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = []
  const workingHours = [9, 10, 11, 14, 15, 16] // 9 AM, 10 AM, 11 AM, 2 PM, 3 PM, 4 PM
  
  entries.forEach((entry, index) => {
    if (index >= 6) return // Limit to 6 suggestions
    
    const dayOffset = Math.floor(index / 2) // Spread across 3 days
    const hourIndex = index % 2 * 3 // Alternate between morning and afternoon
    
    const suggestedTime = new Date(weekStart)
    suggestedTime.setDate(suggestedTime.getDate() + dayOffset)
    suggestedTime.setHours(workingHours[hourIndex], 0, 0, 0)
    
    // Skip weekends
    if (suggestedTime.getDay() === 0 || suggestedTime.getDay() === 6) {
      suggestedTime.setDate(suggestedTime.getDate() + 1)
    }
    
    suggestions.push({
      entryId: entry.id,
      suggestedTime: suggestedTime.toISOString(),
      confidence: 0.6,
      reason: `Scheduled during optimal ${suggestedTime.getHours() < 12 ? 'morning' : 'afternoon'} hours`,
      duration: 30
    })
  })
  
  return suggestions
} 