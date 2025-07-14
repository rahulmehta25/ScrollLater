# ScrollLater: Full In-Depth Implementation Guide

This guide provides a comprehensive technical breakdown and step-by-step instructions for building ScrollLater, a social media content scheduling platform. It covers the frontend, backend, AI integration, and deployment, designed for immediate development.

## Table of Contents

1.  **Introduction & Project Overview**
2.  **System Architecture**
3.  **Backend Implementation (Supabase)**
    *   Database Schema
    *   Authentication
    *   Edge Functions (AI Summarization & Webhooks)
4.  **Frontend Implementation (Next.js & TailwindCSS)**
    *   Project Setup
    *   UI Components & Pages
    *   PWA Integration
5.  **AI Integration (OpenRouter)**
    *   API Configuration
    *   Summarization & Categorization Logic
6.  **Google Calendar Integration**
    *   OAuth Setup
    *   Event Creation
7.  **iOS Shortcut Integration**
    *   Webhook Endpoint
    *   Shortcut JSON Structure
8.  **Deployment & Infrastructure**
    *   Vercel (Frontend)
    *   Supabase (Backend)
    *   Google Cloud (OAuth)
    *   OpenRouter (API Key)
9.  **Future Enhancements**

---

## 1. Introduction & Project Overview

ScrollLater is a mobile-first application designed to help users quickly capture links, ideas, and tasks from various sources (e.g., Instagram Reels, LinkedIn, news apps) and intelligently schedule time to revisit them. The platform leverages AI for summarization and categorization, integrates with Google Calendar for smart scheduling, and provides a personal dashboard for managing captured content.

### Key Features:

*   **Link + Idea Capture:** Fast, mobile-friendly input form with tagging capabilities.
*   **AI Summary & Categorization:** Automated summarization, categorization, and scheduling suggestions using AI.
*   **Calendar Scheduling (Smart Blocks):** Integration with Google Calendar to auto-generate time blocks for saved items.
*   **Personal Dashboard:** Organized and searchable view of all captured content with different statuses (Inbox, Scheduled, Archived).
*   **Shortcut / Quick Input:** Seamless input via Apple Shortcuts for instant capture without opening the app.

### Technical Stack:

*   **Frontend:** Next.js, React, TailwindCSS
*   **Backend & Database:** Supabase (PostgreSQL, Auth, Edge Functions)
*   **AI:** OpenRouter (for various LLMs like Claude Instant, Mistral, LLaMA 3)
*   **Integrations:** Google Calendar API, Apple Shortcuts
*   **Deployment:** Vercel (Frontend), Supabase (Backend)

This guide will walk you through the implementation of each component, providing code examples and best practices.

---



## 2. System Architecture

ScrollLater follows a modern, scalable architecture that separates concerns between the frontend, backend, AI services, and external integrations. The system is designed to be mobile-first, serverless, and cost-effective while maintaining high performance and reliability.

### 2.1 High-Level Architecture Overview

The ScrollLater platform consists of five main components that work together to provide a seamless user experience:

**Frontend Layer (Next.js + TailwindCSS):** The user interface is built as a Progressive Web App (PWA) using Next.js and TailwindCSS. This layer handles user interactions, form submissions, data visualization, and provides offline capabilities. The frontend communicates with the backend through RESTful APIs and real-time subscriptions.

**Backend Layer (Supabase):** Supabase serves as the primary backend infrastructure, providing PostgreSQL database, authentication, real-time subscriptions, and serverless functions. The backend handles data persistence, user management, and orchestrates communication between different services.

**AI Processing Layer (OpenRouter):** The AI layer is responsible for content summarization, categorization, and intelligent scheduling suggestions. It integrates with various Large Language Models through OpenRouter, providing flexibility to use different models based on cost and performance requirements.

**External Integrations:** The system integrates with Google Calendar for scheduling and Apple Shortcuts for quick input. These integrations extend the platform's functionality beyond the core application.

**Deployment Infrastructure:** The frontend is deployed on Vercel for optimal performance and global distribution, while the backend runs on Supabase's managed infrastructure. This setup ensures scalability and minimal operational overhead.

### 2.2 Data Flow Architecture

The data flow in ScrollLater follows a clear pattern from input to processing to scheduling:

**Input Phase:** Users can input data through multiple channels - the web application, Apple Shortcuts, or direct API calls. All inputs are validated and sanitized before being stored in the database.

**Processing Phase:** Once data is captured, it triggers an AI processing pipeline that analyzes the content, generates summaries, assigns categories, and suggests scheduling options. This processing happens asynchronously to maintain responsive user experience.

**Scheduling Phase:** Based on AI suggestions and user preferences, the system can automatically create calendar events or present scheduling options to the user. The scheduling logic considers user availability, content type, and historical patterns.

**Retrieval Phase:** Users can access their captured content through the dashboard, which provides filtering, searching, and organization capabilities. The system supports real-time updates and offline access through PWA features.

### 2.3 Security Architecture

Security is implemented at multiple layers to protect user data and ensure privacy:

**Authentication:** Supabase Auth handles user authentication with support for email/password, OAuth providers, and magic links. Row-level security (RLS) ensures users can only access their own data.

**API Security:** All API endpoints are protected with authentication tokens, and rate limiting is implemented to prevent abuse. Input validation and sanitization protect against injection attacks.

**Data Privacy:** User data is encrypted at rest and in transit. The system follows GDPR principles with data minimization and user control over their information.

**External Integrations:** OAuth 2.0 is used for Google Calendar integration, ensuring secure access to user calendars without storing credentials. Apple Shortcuts use secure webhook endpoints with authentication tokens.

### 2.4 Scalability Considerations

The architecture is designed to scale horizontally as the user base grows:

**Database Scaling:** Supabase PostgreSQL can handle millions of records with proper indexing. The schema is designed to minimize joins and optimize for common query patterns.

**Serverless Functions:** Edge Functions in Supabase automatically scale based on demand, handling AI processing and webhook endpoints without manual intervention.

**CDN and Caching:** Vercel's global CDN ensures fast content delivery worldwide. Static assets are cached aggressively, and API responses use appropriate cache headers.

**AI Processing:** OpenRouter provides access to multiple AI models, allowing the system to balance cost and performance based on usage patterns. Batch processing can be implemented for non-urgent tasks.

---

## 3. Database Schema & Data Models

The database schema for ScrollLater is designed to be simple yet flexible, supporting the core functionality while allowing for future enhancements. The schema uses PostgreSQL features available in Supabase, including JSON columns for flexible data storage and built-in authentication integration.

### 3.1 Core Tables

#### 3.1.1 Users Table (Built-in Supabase Auth)

Supabase provides a built-in `auth.users` table that handles user authentication and basic profile information. We extend this with a custom `user_profiles` table for application-specific data:

```sql
-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- User preferences
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    default_calendar_id TEXT,
    
    -- Scheduling preferences
    preferred_scheduling_times JSONB DEFAULT '[]',
    default_block_duration INTEGER DEFAULT 30, -- minutes
    auto_schedule_enabled BOOLEAN DEFAULT false,
    
    -- Integration settings
    google_calendar_connected BOOLEAN DEFAULT false,
    google_refresh_token TEXT,
    apple_shortcut_token TEXT,
    
    -- Usage statistics
    total_entries INTEGER DEFAULT 0,
    total_scheduled INTEGER DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

#### 3.1.2 Entries Table (Core Content Storage)

The `entries` table is the heart of the application, storing all captured links, ideas, and tasks:

```sql
-- Main entries table
CREATE TABLE entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Content fields
    url TEXT,
    title TEXT,
    content TEXT NOT NULL,
    original_input TEXT NOT NULL, -- Store original user input
    
    -- AI-generated fields
    ai_summary TEXT,
    ai_category TEXT,
    ai_tags TEXT[] DEFAULT '{}',
    ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- User-defined fields
    user_category TEXT,
    user_tags TEXT[] DEFAULT '{}',
    user_notes TEXT,
    priority INTEGER DEFAULT 3, -- 1-5 scale
    
    -- Status and scheduling
    status TEXT DEFAULT 'inbox' CHECK (status IN ('inbox', 'scheduled', 'completed', 'archived')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Calendar integration
    calendar_event_id TEXT,
    calendar_event_url TEXT,
    
    -- Metadata
    source TEXT DEFAULT 'web', -- 'web', 'shortcut', 'api'
    metadata JSONB DEFAULT '{}', -- Flexible storage for additional data
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(content, '') || ' ' || 
            COALESCE(ai_summary, '') || ' ' ||
            COALESCE(user_notes, '')
        )
    ) STORED
);

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create policies for entries
CREATE POLICY "Users can view own entries" ON entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON entries
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_status ON entries(status);
CREATE INDEX idx_entries_scheduled_for ON entries(scheduled_for);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_search ON entries USING GIN(search_vector);
CREATE INDEX idx_entries_ai_category ON entries(ai_category);
CREATE INDEX idx_entries_user_category ON entries(user_category);
```

#### 3.1.3 Categories Table (Predefined Categories)

A reference table for predefined categories that the AI can use for classification:

```sql
-- Categories reference table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6B7280', -- Hex color for UI
    icon TEXT, -- Icon name or emoji
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_system BOOLEAN DEFAULT true -- System vs user-defined categories
);

-- Insert default categories
INSERT INTO categories (name, description, color, icon, is_system) VALUES
    ('Read Later', 'Articles, blog posts, and content to read', '#3B82F6', '📖', true),
    ('Build', 'Development tools, tutorials, and project ideas', '#10B981', '🔨', true),
    ('Explore', 'Interesting tools, websites, and discoveries', '#8B5CF6', '🔍', true),
    ('Todo', 'Tasks and action items to complete', '#F59E0B', '✅', true),
    ('Schedule', 'Events and time-sensitive items', '#EF4444', '📅', true),
    ('Creative', 'Design inspiration and creative resources', '#EC4899', '🎨', true),
    ('Learning', 'Educational content and courses', '#06B6D4', '🎓', true),
    ('Business', 'Professional and business-related content', '#84CC16', '💼', true),
    ('Personal', 'Personal interests and hobbies', '#F97316', '👤', true);

-- Allow public read access to categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable" ON categories
    FOR SELECT USING (true);
```

#### 3.1.4 Processing Queue Table (AI Processing)

A queue table to manage AI processing tasks asynchronously:

```sql
-- AI processing queue
CREATE TABLE processing_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing details
    task_type TEXT NOT NULL CHECK (task_type IN ('summarize', 'categorize', 'schedule_suggest')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 5, -- 1-10 scale
    
    -- Results and errors
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Processing metadata
    ai_model_used TEXT,
    processing_time_ms INTEGER,
    tokens_used INTEGER
);

-- Enable Row Level Security
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for processing queue
CREATE POLICY "Users can view own processing tasks" ON processing_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_created_at ON processing_queue(created_at);
CREATE INDEX idx_processing_queue_entry_id ON processing_queue(entry_id);
```

### 3.2 Database Functions and Triggers

#### 3.2.1 Automatic Timestamp Updates

```sql
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at 
    BEFORE UPDATE ON entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 3.2.2 Entry Processing Trigger

```sql
-- Function to queue AI processing for new entries
CREATE OR REPLACE FUNCTION queue_entry_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue summarization task
    INSERT INTO processing_queue (entry_id, user_id, task_type, priority)
    VALUES (NEW.id, NEW.user_id, 'summarize', 5);
    
    -- Queue categorization task
    INSERT INTO processing_queue (entry_id, user_id, task_type, priority)
    VALUES (NEW.id, NEW.user_id, 'categorize', 5);
    
    -- Queue scheduling suggestion task
    INSERT INTO processing_queue (entry_id, user_id, task_type, priority)
    VALUES (NEW.id, NEW.user_id, 'schedule_suggest', 3);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to entries table
CREATE TRIGGER queue_entry_processing_trigger
    AFTER INSERT ON entries
    FOR EACH ROW EXECUTE FUNCTION queue_entry_processing();
```

#### 3.2.3 User Statistics Update

```sql
-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_profiles 
        SET total_entries = total_entries + 1
        WHERE id = NEW.user_id;
        
        IF NEW.status = 'scheduled' THEN
            UPDATE user_profiles 
            SET total_scheduled = total_scheduled + 1
            WHERE id = NEW.user_id;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'scheduled' AND OLD.status != 'scheduled' THEN
                UPDATE user_profiles 
                SET total_scheduled = total_scheduled + 1
                WHERE id = NEW.user_id;
            ELSIF OLD.status = 'scheduled' AND NEW.status != 'scheduled' THEN
                UPDATE user_profiles 
                SET total_scheduled = total_scheduled - 1
                WHERE id = NEW.user_id;
            END IF;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_profiles 
        SET total_entries = total_entries - 1
        WHERE id = OLD.user_id;
        
        IF OLD.status = 'scheduled' THEN
            UPDATE user_profiles 
            SET total_scheduled = total_scheduled - 1
            WHERE id = OLD.user_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply trigger to entries table
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON entries
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();
```

### 3.3 Database Views for Common Queries

#### 3.3.1 Entry Summary View

```sql
-- View for entry summaries with category information
CREATE VIEW entry_summaries AS
SELECT 
    e.id,
    e.user_id,
    e.created_at,
    e.updated_at,
    e.title,
    e.url,
    SUBSTRING(e.content, 1, 200) || CASE WHEN LENGTH(e.content) > 200 THEN '...' ELSE '' END as content_preview,
    e.ai_summary,
    COALESCE(e.user_category, e.ai_category) as category,
    e.status,
    e.scheduled_for,
    e.priority,
    c.color as category_color,
    c.icon as category_icon,
    ARRAY_LENGTH(e.ai_tags, 1) + ARRAY_LENGTH(e.user_tags, 1) as tag_count
FROM entries e
LEFT JOIN categories c ON c.name = COALESCE(e.user_category, e.ai_category);
```

#### 3.3.2 User Dashboard View

```sql
-- View for user dashboard statistics
CREATE VIEW user_dashboard_stats AS
SELECT 
    up.id as user_id,
    up.display_name,
    up.total_entries,
    up.total_scheduled,
    COUNT(CASE WHEN e.status = 'inbox' THEN 1 END) as inbox_count,
    COUNT(CASE WHEN e.status = 'scheduled' THEN 1 END) as scheduled_count,
    COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN e.status = 'archived' THEN 1 END) as archived_count,
    COUNT(CASE WHEN e.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as entries_this_week,
    COUNT(CASE WHEN e.scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END) as scheduled_this_week
FROM user_profiles up
LEFT JOIN entries e ON e.user_id = up.id
GROUP BY up.id, up.display_name, up.total_entries, up.total_scheduled;
```

This comprehensive database schema provides a solid foundation for the ScrollLater application. The schema is designed with performance, security, and scalability in mind, using PostgreSQL features like Row Level Security, full-text search, and JSONB for flexible data storage. The triggers and functions automate common tasks like updating timestamps and maintaining statistics, while the views provide optimized queries for common dashboard operations.

---


## 4. Backend Implementation (Supabase)

The backend implementation for ScrollLater leverages Supabase as a comprehensive Backend-as-a-Service (BaaS) platform. Supabase provides PostgreSQL database, authentication, real-time subscriptions, edge functions, and storage capabilities. This section provides detailed implementation steps for setting up and configuring the backend infrastructure.

### 4.1 Supabase Project Setup

#### 4.1.1 Initial Project Creation

Begin by creating a new Supabase project through the Supabase dashboard. Navigate to [https://supabase.com](https://supabase.com) and sign up for an account if you haven't already. Once logged in, create a new project with the following configuration:

**Project Configuration:**
- **Project Name:** scrolllater-backend
- **Database Password:** Generate a strong password and store it securely
- **Region:** Choose the region closest to your target users
- **Pricing Plan:** Start with the free tier for development

After project creation, you'll receive the following essential credentials that will be used throughout the implementation:

```javascript
// Environment variables for your application
const supabaseConfig = {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'your-anon-key',
  serviceRoleKey: 'your-service-role-key' // Keep this secret
};
```

#### 4.1.2 Database Schema Implementation

Navigate to the SQL Editor in your Supabase dashboard and execute the database schema we defined in the previous section. Create a new SQL file called `initial_schema.sql` and run the following commands in sequence:

```sql
-- First, create the user_profiles table
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    default_calendar_id TEXT,
    preferred_scheduling_times JSONB DEFAULT '[]',
    default_block_duration INTEGER DEFAULT 30,
    auto_schedule_enabled BOOLEAN DEFAULT false,
    google_calendar_connected BOOLEAN DEFAULT false,
    google_refresh_token TEXT,
    apple_shortcut_token TEXT,
    total_entries INTEGER DEFAULT 0,
    total_scheduled INTEGER DEFAULT 0
);

-- Enable RLS and create policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

Continue with the entries table and other schema components as defined in the previous section. Execute each table creation, index creation, and policy definition separately to ensure proper error handling.

#### 4.1.3 Authentication Configuration

Supabase provides built-in authentication that supports multiple providers. Configure authentication settings in the Authentication section of your Supabase dashboard:

**Email Authentication:**
- Enable email confirmation for new signups
- Configure email templates for signup, password reset, and email confirmation
- Set up custom SMTP settings if you want to use your own email service

**OAuth Providers (Optional):**
- Google OAuth: Required for Google Calendar integration
- Apple OAuth: Useful for iOS users
- GitHub OAuth: Popular among developers

**Security Settings:**
- Set session timeout to 24 hours for mobile users
- Enable refresh token rotation for enhanced security
- Configure password requirements (minimum 8 characters, mixed case, numbers)

### 4.2 Edge Functions Implementation

Supabase Edge Functions provide serverless compute capabilities that run close to your users. These functions handle AI processing, webhook endpoints, and background tasks.

#### 4.2.1 AI Summarization Function

Create a new Edge Function for AI summarization by navigating to the Edge Functions section in your Supabase dashboard. Create a function called `ai-summarize` with the following implementation:

```typescript
// supabase/functions/ai-summarize/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SummarizeRequest {
  entryId: string;
  content: string;
  url?: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    }
  }>;
  usage: {
    total_tokens: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { entryId, content, url }: SummarizeRequest = await req.json()

    // Prepare the prompt for AI summarization
    const prompt = `
    Please analyze the following content and provide:
    1. A concise title (max 60 characters)
    2. A brief summary (max 150 words)
    3. A category from: Read Later, Build, Explore, Todo, Schedule, Creative, Learning, Business, Personal
    4. 3-5 relevant tags
    5. A confidence score (0-1) for the categorization

    Content: ${content}
    ${url ? `URL: ${url}` : ''}

    Respond in JSON format:
    {
      "title": "Generated title",
      "summary": "Brief summary",
      "category": "Category name",
      "tags": ["tag1", "tag2", "tag3"],
      "confidence": 0.85
    }
    `;

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scrolllater.app',
        'X-Title': 'ScrollLater'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.statusText}`)
    }

    const aiResponse: OpenRouterResponse = await openRouterResponse.json()
    const aiContent = aiResponse.choices[0]?.message?.content

    if (!aiContent) {
      throw new Error('No content received from AI')
    }

    // Parse AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiContent)
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      parsedResponse = {
        title: content.substring(0, 60),
        summary: content.substring(0, 150),
        category: 'Explore',
        tags: ['uncategorized'],
        confidence: 0.5
      }
    }

    // Update the entry in the database
    const { error: updateError } = await supabaseClient
      .from('entries')
      .update({
        title: parsedResponse.title,
        ai_summary: parsedResponse.summary,
        ai_category: parsedResponse.category,
        ai_tags: parsedResponse.tags,
        ai_confidence_score: parsedResponse.confidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('user_id', user.id)

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`)
    }

    // Update processing queue
    await supabaseClient
      .from('processing_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: parsedResponse,
        ai_model_used: 'anthropic/claude-3-haiku',
        tokens_used: aiResponse.usage?.total_tokens || 0
      })
      .eq('entry_id', entryId)
      .eq('task_type', 'summarize')

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: parsedResponse 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in ai-summarize function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

#### 4.2.2 Webhook Handler Function

Create another Edge Function called `webhook-handler` for processing incoming data from Apple Shortcuts and other external sources:

```typescript
// supabase/functions/webhook-handler/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookRequest {
  content: string;
  url?: string;
  source: string;
  userToken: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { content, url, source, userToken }: WebhookRequest = await req.json()

    // Validate required fields
    if (!content || !userToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: content and userToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find user by shortcut token
    const { data: userProfile, error: userError } = await supabaseClient
      .from('user_profiles')
      .select('id')
      .eq('apple_shortcut_token', userToken)
      .single()

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new entry
    const { data: newEntry, error: insertError } = await supabaseClient
      .from('entries')
      .insert({
        user_id: userProfile.id,
        content: content,
        original_input: content,
        url: url || null,
        source: source || 'shortcut',
        status: 'inbox'
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create entry: ${insertError.message}`)
    }

    // Trigger AI processing
    const summarizeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-summarize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entryId: newEntry.id,
        content: content,
        url: url
      })
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        entryId: newEntry.id,
        message: 'Entry created and queued for processing'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in webhook-handler:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

#### 4.2.3 Calendar Integration Function

Create a function called `calendar-integration` to handle Google Calendar operations:

```typescript
// supabase/functions/calendar-integration/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendarEventRequest {
  entryId: string;
  title: string;
  description: string;
  startTime: string;
  duration: number; // in minutes
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { entryId, title, description, startTime, duration }: CalendarEventRequest = await req.json()

    // Get user's Google Calendar refresh token
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('google_refresh_token, default_calendar_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.google_refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Exchange refresh token for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token: userProfile.google_refresh_token,
        grant_type: 'refresh_token'
      })
    })

    const tokenData = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${tokenData.error}`)
    }

    // Calculate end time
    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + duration * 60000)

    // Create calendar event
    const calendarEvent = {
      summary: title,
      description: description,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 }
        ]
      }
    }

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${userProfile.default_calendar_id || 'primary'}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      }
    )

    const eventData = await calendarResponse.json()

    if (!calendarResponse.ok) {
      throw new Error(`Calendar event creation failed: ${eventData.error?.message}`)
    }

    // Update entry with calendar information
    const { error: updateError } = await supabaseClient
      .from('entries')
      .update({
        calendar_event_id: eventData.id,
        calendar_event_url: eventData.htmlLink,
        scheduled_for: startTime,
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('user_id', user.id)

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventId: eventData.id,
        eventUrl: eventData.htmlLink
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in calendar-integration:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

### 4.3 Environment Variables and Secrets

Configure the following environment variables in your Supabase project settings under the Edge Functions section:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenRouter Configuration
OPENROUTER_API_KEY=your-openrouter-api-key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple Configuration (if needed)
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret
```

### 4.4 Real-time Subscriptions

Supabase provides real-time capabilities that allow the frontend to receive live updates when data changes. Configure real-time subscriptions for the entries table to provide instant feedback to users:

```sql
-- Enable real-time for entries table
ALTER PUBLICATION supabase_realtime ADD TABLE entries;

-- Enable real-time for processing_queue table
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;
```

### 4.5 Database Backup and Recovery

Configure automated backups in your Supabase project settings:

**Backup Configuration:**
- Enable daily automated backups
- Set backup retention to 30 days for production
- Configure point-in-time recovery for critical data
- Set up backup notifications to monitor backup status

**Recovery Procedures:**
- Document the process for restoring from backups
- Test recovery procedures regularly
- Maintain backup verification scripts
- Create disaster recovery runbooks

### 4.6 Performance Optimization

Implement performance optimizations for the backend:

**Database Optimization:**
- Monitor query performance using Supabase's built-in analytics
- Add additional indexes based on query patterns
- Implement database connection pooling
- Use prepared statements for frequently executed queries

**Edge Function Optimization:**
- Implement caching for AI responses to reduce API calls
- Use connection pooling for external API calls
- Implement retry logic with exponential backoff
- Monitor function execution times and optimize bottlenecks

**API Rate Limiting:**
```sql
-- Create a simple rate limiting table
CREATE TABLE api_rate_limits (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, endpoint)
);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_limit INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current count and window start
    SELECT request_count, window_start 
    INTO current_count, window_start
    FROM api_rate_limits 
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    
    -- If no record exists or window has expired, create/reset
    IF current_count IS NULL OR window_start < NOW() - INTERVAL '1 minute' * p_window_minutes THEN
        INSERT INTO api_rate_limits (user_id, endpoint, request_count, window_start)
        VALUES (p_user_id, p_endpoint, 1, NOW())
        ON CONFLICT (user_id, endpoint) 
        DO UPDATE SET request_count = 1, window_start = NOW();
        RETURN TRUE;
    END IF;
    
    -- Check if under limit
    IF current_count < p_limit THEN
        UPDATE api_rate_limits 
        SET request_count = request_count + 1
        WHERE user_id = p_user_id AND endpoint = p_endpoint;
        RETURN TRUE;
    END IF;
    
    -- Over limit
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

This comprehensive backend implementation provides a robust foundation for the ScrollLater application. The Supabase setup includes database schema, authentication, edge functions for AI processing and webhooks, calendar integration, and performance optimizations. The modular approach allows for easy maintenance and scaling as the application grows.

---


## 5. Frontend Implementation (Next.js & TailwindCSS)

The frontend implementation for ScrollLater focuses on creating a mobile-first, responsive Progressive Web App (PWA) using Next.js and TailwindCSS. The application prioritizes speed, usability, and offline capabilities to provide an excellent user experience across all devices.

### 5.1 Project Setup and Configuration

#### 5.1.1 Initial Next.js Setup

Begin by creating a new Next.js project with TypeScript and TailwindCSS. Execute the following commands in your terminal:

```bash
# Create a new Next.js project
npx create-next-app@latest scrolllater-frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Navigate to the project directory
cd scrolllater-frontend

# Install additional dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
npm install @headlessui/react @heroicons/react
npm install react-hook-form @hookform/resolvers zod
npm install date-fns clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast
npm install lucide-react framer-motion
npm install workbox-webpack-plugin next-pwa

# Install development dependencies
npm install -D @types/node @types/react @types/react-dom
```

#### 5.1.2 Environment Configuration

Create a `.env.local` file in the root directory with your Supabase configuration:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=ScrollLater
```

#### 5.1.3 Next.js Configuration

Update your `next.config.js` file to include PWA support and optimize for mobile:

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
```

#### 5.1.4 TailwindCSS Configuration

Update your `tailwind.config.js` to include custom colors and mobile-first breakpoints:

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### 5.2 Supabase Client Configuration

Create a Supabase client configuration that handles authentication and real-time subscriptions:

```typescript
// src/lib/supabase.ts
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Database type definitions
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          display_name: string | null
          timezone: string
          default_calendar_id: string | null
          preferred_scheduling_times: any[]
          default_block_duration: number
          auto_schedule_enabled: boolean
          google_calendar_connected: boolean
          google_refresh_token: string | null
          apple_shortcut_token: string | null
          total_entries: number
          total_scheduled: number
        }
        Insert: {
          id: string
          display_name?: string | null
          timezone?: string
          default_calendar_id?: string | null
          preferred_scheduling_times?: any[]
          default_block_duration?: number
          auto_schedule_enabled?: boolean
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          apple_shortcut_token?: string | null
        }
        Update: {
          display_name?: string | null
          timezone?: string
          default_calendar_id?: string | null
          preferred_scheduling_times?: any[]
          default_block_duration?: number
          auto_schedule_enabled?: boolean
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          apple_shortcut_token?: string | null
        }
      }
      entries: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          url: string | null
          title: string | null
          content: string
          original_input: string
          ai_summary: string | null
          ai_category: string | null
          ai_tags: string[]
          ai_confidence_score: number | null
          user_category: string | null
          user_tags: string[]
          user_notes: string | null
          priority: number
          status: 'inbox' | 'scheduled' | 'completed' | 'archived'
          scheduled_for: string | null
          completed_at: string | null
          calendar_event_id: string | null
          calendar_event_url: string | null
          source: string
          metadata: any
        }
        Insert: {
          user_id: string
          url?: string | null
          title?: string | null
          content: string
          original_input: string
          ai_summary?: string | null
          ai_category?: string | null
          ai_tags?: string[]
          ai_confidence_score?: number | null
          user_category?: string | null
          user_tags?: string[]
          user_notes?: string | null
          priority?: number
          status?: 'inbox' | 'scheduled' | 'completed' | 'archived'
          scheduled_for?: string | null
          source?: string
          metadata?: any
        }
        Update: {
          url?: string | null
          title?: string | null
          content?: string
          ai_summary?: string | null
          ai_category?: string | null
          ai_tags?: string[]
          ai_confidence_score?: number | null
          user_category?: string | null
          user_tags?: string[]
          user_notes?: string | null
          priority?: number
          status?: 'inbox' | 'scheduled' | 'completed' | 'archived'
          scheduled_for?: string | null
          completed_at?: string | null
          calendar_event_id?: string | null
          calendar_event_url?: string | null
          metadata?: any
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          icon: string | null
          created_at: string
          is_system: boolean
        }
      }
    }
  }
}

// Client-side Supabase client
export const createSupabaseClient = () => {
  return createClientComponentClient<Database>()
}

// Server-side Supabase client
export const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
}

// Service role client for server actions
export const createSupabaseServiceClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### 5.3 Authentication Implementation

Create a comprehensive authentication system with login, signup, and session management:

```typescript
// src/components/auth/AuthProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN') {
          // Create or update user profile
          if (session?.user) {
            await createUserProfile(session.user)
          }
          router.push('/dashboard')
        } else if (event === 'SIGNED_OUT') {
          router.push('/')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const createUserProfile = async (user: User) => {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        apple_shortcut_token: generateShortcutToken()
      })

    if (error) {
      console.error('Error creating user profile:', error)
    }
  }

  const generateShortcutToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
    })
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

#### 5.3.1 Login Component

```typescript
// src/components/auth/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    
    const { error } = await signIn(data.email, data.password)
    
    if (error) {
      setError('root', {
        message: error.message || 'Failed to sign in'
      })
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to ScrollLater
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Capture and schedule your ideas
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          {errors.root && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{errors.root.message}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/auth/signup"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Don't have an account? Sign up
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
```

### 5.4 Main Application Components

#### 5.4.1 Input Form Component

The core input form is the heart of the application, allowing users to quickly capture links and ideas:

```typescript
// src/components/forms/EntryForm.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { PlusIcon, LinkIcon, TagIcon } from '@heroicons/react/24/outline'

const entrySchema = z.object({
  content: z.string().min(1, 'Please enter some content'),
  url: z.string().url().optional().or(z.literal('')),
  category: z.string().optional(),
  tags: z.string().optional()
})

type EntryFormData = z.infer<typeof entrySchema>

const CATEGORIES = [
  { name: 'Read Later', icon: '📖', color: 'bg-blue-100 text-blue-800' },
  { name: 'Build', icon: '🔨', color: 'bg-green-100 text-green-800' },
  { name: 'Explore', icon: '🔍', color: 'bg-purple-100 text-purple-800' },
  { name: 'Todo', icon: '✅', color: 'bg-yellow-100 text-yellow-800' },
  { name: 'Schedule', icon: '📅', color: 'bg-red-100 text-red-800' },
  { name: 'Creative', icon: '🎨', color: 'bg-pink-100 text-pink-800' },
  { name: 'Learning', icon: '🎓', color: 'bg-cyan-100 text-cyan-800' },
  { name: 'Business', icon: '💼', color: 'bg-lime-100 text-lime-800' },
  { name: 'Personal', icon: '👤', color: 'bg-orange-100 text-orange-800' }
]

export function EntryForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const { user } = useAuth()
  const supabase = createSupabaseClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema)
  })

  const contentValue = watch('content')
  const urlValue = watch('url')

  const detectUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const matches = text.match(urlRegex)
    if (matches && matches.length > 0) {
      setValue('url', matches[0])
      setValue('content', text.replace(matches[0], '').trim())
    }
  }

  const onSubmit = async (data: EntryFormData) => {
    if (!user) return

    setIsLoading(true)

    try {
      // Parse tags
      const tags = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : []

      // Create entry
      const { error } = await supabase
        .from('entries')
        .insert({
          user_id: user.id,
          content: data.content,
          original_input: data.content,
          url: data.url || null,
          user_category: selectedCategory || null,
          user_tags: tags,
          source: 'web'
        })

      if (error) throw error

      // Reset form
      reset()
      setSelectedCategory('')
      onSuccess?.()

      // Show success message
      // You can implement a toast notification here

    } catch (error) {
      console.error('Error creating entry:', error)
      // Show error message
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Content Input */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to save?
          </label>
          <textarea
            {...register('content')}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Paste a link, write a note, or describe an idea..."
            onChange={(e) => {
              register('content').onChange(e)
              detectUrl(e.target.value)
            }}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        {/* URL Input */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            <LinkIcon className="inline h-4 w-4 mr-1" />
            URL (optional)
          </label>
          <input
            {...register('url')}
            type="url"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="https://example.com"
          />
          {errors.url && (
            <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => setSelectedCategory(
                  selectedCategory === category.name ? '' : category.name
                )}
                className={`p-2 rounded-md text-xs font-medium transition-colors ${
                  selectedCategory === category.name
                    ? category.color
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tags Input */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            <TagIcon className="inline h-4 w-4 mr-1" />
            Tags (comma-separated)
          </label>
          <input
            {...register('tags')}
            type="text"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="productivity, tools, inspiration"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !contentValue}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <PlusIcon className="h-5 w-5 mr-2" />
              Save Entry
            </>
          )}
        </button>
      </form>
    </div>
  )
}
```

#### 5.4.2 Dashboard Component

The dashboard provides an overview of all captured entries with filtering and search capabilities:

```typescript
// src/components/dashboard/Dashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { EntryCard } from './EntryCard'
import { SearchBar } from './SearchBar'
import { FilterTabs } from './FilterTabs'
import { StatsCards } from './StatsCards'
import type { Database } from '@/lib/supabase'

type Entry = Database['public']['Tables']['entries']['Row']

export function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchEntries()
      subscribeToChanges()
    }
  }, [user])

  useEffect(() => {
    filterEntries()
  }, [entries, activeFilter, searchQuery])

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToChanges = () => {
    const subscription = supabase
      .channel('entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEntries(prev => [payload.new as Entry, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setEntries(prev => 
              prev.map(entry => 
                entry.id === payload.new.id ? payload.new as Entry : entry
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setEntries(prev => 
              prev.filter(entry => entry.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  }

  const filterEntries = () => {
    let filtered = entries

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.status === activeFilter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(entry =>
        entry.title?.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        entry.ai_summary?.toLowerCase().includes(query) ||
        entry.ai_category?.toLowerCase().includes(query) ||
        entry.user_category?.toLowerCase().includes(query) ||
        entry.ai_tags.some(tag => tag.toLowerCase().includes(query)) ||
        entry.user_tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    setFilteredEntries(filtered)
  }

  const updateEntry = async (entryId: string, updates: Partial<Entry>) => {
    try {
      const { error } = await supabase
        .from('entries')
        .update(updates)
        .eq('id', entryId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating entry:', error)
    }
  }

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Cards */}
      <StatsCards entries={entries} />

      {/* Search and Filters */}
      <div className="mt-8 space-y-4">
        <SearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search entries..."
        />
        
        <FilterTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          entries={entries}
        />
      </div>

      {/* Entries Grid */}
      <div className="mt-8">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery || activeFilter !== 'all' 
                ? 'No entries match your filters'
                : 'No entries yet. Start by adding your first entry!'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onUpdate={updateEntry}
                onDelete={deleteEntry}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

#### 5.4.3 Entry Card Component

Individual entry cards display captured content with actions for scheduling and management:

```typescript
// src/components/dashboard/EntryCard.tsx
'use client'

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  CalendarIcon, 
  LinkIcon, 
  TagIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  ArchiveBoxIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import type { Database } from '@/lib/supabase'

type Entry = Database['public']['Tables']['entries']['Row']

interface EntryCardProps {
  entry: Entry
  onUpdate: (entryId: string, updates: Partial<Entry>) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}

const STATUS_COLORS = {
  inbox: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800'
}

const CATEGORY_COLORS = {
  'Read Later': 'bg-blue-100 text-blue-800',
  'Build': 'bg-green-100 text-green-800',
  'Explore': 'bg-purple-100 text-purple-800',
  'Todo': 'bg-yellow-100 text-yellow-800',
  'Schedule': 'bg-red-100 text-red-800',
  'Creative': 'bg-pink-100 text-pink-800',
  'Learning': 'bg-cyan-100 text-cyan-800',
  'Business': 'bg-lime-100 text-lime-800',
  'Personal': 'bg-orange-100 text-orange-800'
}

export function EntryCard({ entry, onUpdate, onDelete }: EntryCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleStatusChange = async (newStatus: Entry['status']) => {
    setIsLoading(true)
    try {
      const updates: Partial<Entry> = { status: newStatus }
      
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
      
      await onUpdate(entry.id, updates)
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this entry?')) {
      setIsLoading(true)
      try {
        await onDelete(entry.id)
      } catch (error) {
        console.error('Error deleting entry:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const category = entry.user_category || entry.ai_category
  const allTags = [...(entry.user_tags || []), ...(entry.ai_tags || [])]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {entry.title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {entry.title}
            </h3>
          )}
          
          <div className="flex items-center space-x-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status]}`}>
              {entry.status}
            </span>
            
            {category && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                {category}
              </span>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <Menu as="div" className="relative">
          <Menu.Button className="p-2 text-gray-400 hover:text-gray-600">
            <EllipsisVerticalIcon className="h-5 w-5" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                {entry.status !== 'completed' && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Mark as Complete
                      </button>
                    )}
                  </Menu.Item>
                )}
                
                {entry.status !== 'archived' && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleStatusChange('archived')}
                        className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                      >
                        <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                        Archive
                      </button>
                    )}
                  </Menu.Item>
                )}
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleDelete}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-700`}
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          {entry.ai_summary || entry.content}
        </p>
      </div>

      {/* URL */}
      {entry.url && (
        <div className="mb-4">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            Visit Link
          </a>
        </div>
      )}

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center flex-wrap gap-1">
            <TagIcon className="h-4 w-4 text-gray-400" />
            {allTags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
            {allTags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{allTags.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scheduling Info */}
      {entry.scheduled_for && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center text-sm text-blue-800">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Scheduled for {format(new Date(entry.scheduled_for), 'MMM d, yyyy h:mm a')}
          </div>
          {entry.calendar_event_url && (
            <a
              href={entry.calendar_event_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
            >
              View in Calendar
            </a>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
        </span>
        <span className="capitalize">
          {entry.source}
        </span>
      </div>
    </div>
  )
}
```

### 5.5 Progressive Web App (PWA) Configuration

Configure PWA capabilities to enable offline access and mobile app-like experience:

```json
// public/manifest.json
{
  "name": "ScrollLater",
  "short_name": "ScrollLater",
  "description": "Capture and schedule your ideas",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "categories": ["productivity", "utilities"],
  "screenshots": [
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "375x812",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

This comprehensive frontend implementation provides a solid foundation for the ScrollLater application. The Next.js setup includes authentication, real-time data synchronization, responsive design, and PWA capabilities. The component architecture is modular and scalable, allowing for easy maintenance and feature additions as the application grows.

---


## 6. AI Integration (OpenRouter)

The AI integration layer is crucial for ScrollLater's intelligent content processing capabilities. OpenRouter provides access to multiple Large Language Models (LLMs) through a unified API, allowing the application to leverage different models based on cost, performance, and specific use cases.

### 6.1 OpenRouter Setup and Configuration

#### 6.1.1 Account Creation and API Key

Begin by creating an account at [OpenRouter.ai](https://openrouter.ai) and obtaining your API key. OpenRouter offers competitive pricing and access to various models including Claude, GPT-4, Mistral, and open-source alternatives.

**Account Setup Steps:**
1. Visit [https://openrouter.ai](https://openrouter.ai) and create an account
2. Navigate to the API Keys section in your dashboard
3. Generate a new API key with appropriate permissions
4. Add credits to your account for API usage
5. Review the pricing for different models to optimize costs

**Model Selection Strategy:**
For ScrollLater, we recommend using different models for different tasks to balance cost and performance:

- **Summarization:** Claude 3 Haiku (fast and cost-effective)
- **Categorization:** Mistral 7B (good balance of speed and accuracy)
- **Complex Analysis:** Claude 3 Sonnet (higher accuracy for complex content)
- **Fallback:** OpenAI GPT-3.5 Turbo (reliable and well-tested)

#### 6.1.2 Environment Configuration

Add your OpenRouter API key to your environment variables:

```bash
# .env.local (Frontend)
NEXT_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key

# Supabase Edge Functions Environment
OPENROUTER_API_KEY=your-openrouter-api-key
```

### 6.2 AI Processing Pipeline

#### 6.2.1 Content Analysis Function

Create a comprehensive AI analysis function that handles multiple processing tasks:

```typescript
// src/lib/ai-processor.ts
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
```

#### 6.2.2 Batch Processing for Performance

Implement batch processing to handle multiple entries efficiently:

```typescript
// src/lib/batch-processor.ts
export class BatchProcessor {
  private aiProcessor: AIProcessor
  private batchSize = 5
  private processingQueue: Array<{
    entryId: string
    content: string
    url?: string
    priority: number
  }> = []

  constructor(aiProcessor: AIProcessor) {
    this.aiProcessor = aiProcessor
  }

  addToQueue(entry: {
    entryId: string
    content: string
    url?: string
    priority?: number
  }) {
    this.processingQueue.push({
      ...entry,
      priority: entry.priority || 5
    })

    // Sort by priority (lower number = higher priority)
    this.processingQueue.sort((a, b) => a.priority - b.priority)
  }

  async processBatch(): Promise<Array<{
    entryId: string
    analysis: ContentAnalysis
    error?: string
  }>> {
    const batch = this.processingQueue.splice(0, this.batchSize)
    const results = []

    // Process entries in parallel with rate limiting
    const promises = batch.map(async (entry, index) => {
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, index * 1000))

      try {
        const analysis = await this.aiProcessor.analyzeContent(entry.content, entry.url)
        return {
          entryId: entry.entryId,
          analysis
        }
      } catch (error) {
        return {
          entryId: entry.entryId,
          analysis: this.aiProcessor.getFallbackAnalysis(entry.content),
          error: error.message
        }
      }
    })

    const batchResults = await Promise.allSettled(promises)
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error('Batch processing error:', result.reason)
      }
    })

    return results
  }

  getQueueLength(): number {
    return this.processingQueue.length
  }

  clearQueue(): void {
    this.processingQueue = []
  }
}
```

### 6.3 Smart Scheduling Algorithm

#### 6.3.1 Intelligent Time Slot Selection

Implement an algorithm that considers user behavior patterns and content characteristics:

```typescript
// src/lib/smart-scheduler.ts
interface TimeSlot {
  start: Date
  end: Date
  score: number
  reason: string
}

interface UserPattern {
  preferredTimes: Array<{ hour: number; score: number }>
  categoryPreferences: Record<string, { timeOfDay: string; score: number }>
  completionRates: Record<string, number>
  averageSessionDuration: number
}

export class SmartScheduler {
  private aiProcessor: AIProcessor

  constructor(aiProcessor: AIProcessor) {
    this.aiProcessor = aiProcessor
  }

  async findOptimalTimeSlots(
    entry: {
      content: string
      category: string
      urgency: string
      estimatedDuration: number
    },
    userPattern: UserPattern,
    availableSlots: Array<{ start: Date; end: Date }>,
    existingEvents: Array<{ start: Date; end: Date }>
  ): Promise<TimeSlot[]> {
    const candidates: TimeSlot[] = []

    for (const slot of availableSlots) {
      // Check if slot is long enough
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60)
      if (slotDuration < entry.estimatedDuration) continue

      // Check for conflicts with existing events
      const hasConflict = existingEvents.some(event => 
        this.timeRangesOverlap(slot, event)
      )
      if (hasConflict) continue

      // Calculate score based on multiple factors
      const score = this.calculateSlotScore(slot, entry, userPattern)
      
      candidates.push({
        start: slot.start,
        end: new Date(slot.start.getTime() + entry.estimatedDuration * 60000),
        score,
        reason: this.generateScoreReason(slot, entry, userPattern, score)
      })
    }

    // Sort by score (highest first) and return top candidates
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  private calculateSlotScore(
    slot: { start: Date; end: Date },
    entry: { category: string; urgency: string },
    userPattern: UserPattern
  ): number {
    let score = 0

    // Time of day preference
    const hour = slot.start.getHours()
    const timePreference = userPattern.preferredTimes.find(p => p.hour === hour)
    if (timePreference) {
      score += timePreference.score * 0.3
    }

    // Category-specific time preferences
    const categoryPref = userPattern.categoryPreferences[entry.category]
    if (categoryPref) {
      const timeOfDay = this.getTimeOfDay(hour)
      if (timeOfDay === categoryPref.timeOfDay) {
        score += categoryPref.score * 0.25
      }
    }

    // Urgency factor
    const urgencyMultiplier = {
      'high': 1.5,
      'medium': 1.0,
      'low': 0.7
    }[entry.urgency] || 1.0
    score *= urgencyMultiplier

    // Completion rate for this time slot
    const completionRate = userPattern.completionRates[hour.toString()] || 0.5
    score += completionRate * 0.2

    // Avoid scheduling too early or too late
    if (hour < 7 || hour > 22) {
      score *= 0.5
    }

    // Prefer weekday mornings for productive tasks
    const dayOfWeek = slot.start.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 11) {
      if (['Build', 'Learning', 'Business'].includes(entry.category)) {
        score *= 1.2
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  private getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    return 'evening'
  }

  private timeRangesOverlap(
    range1: { start: Date; end: Date },
    range2: { start: Date; end: Date }
  ): boolean {
    return range1.start < range2.end && range2.start < range1.end
  }

  private generateScoreReason(
    slot: { start: Date; end: Date },
    entry: { category: string; urgency: string },
    userPattern: UserPattern,
    score: number
  ): string {
    const hour = slot.start.getHours()
    const timeOfDay = this.getTimeOfDay(hour)
    
    const reasons = []

    if (score > 80) {
      reasons.push('Optimal time based on your patterns')
    } else if (score > 60) {
      reasons.push('Good time for this type of content')
    } else {
      reasons.push('Available slot')
    }

    const categoryPref = userPattern.categoryPreferences[entry.category]
    if (categoryPref && timeOfDay === categoryPref.timeOfDay) {
      reasons.push(`${timeOfDay} is ideal for ${entry.category.toLowerCase()} tasks`)
    }

    if (entry.urgency === 'high') {
      reasons.push('Prioritized due to high urgency')
    }

    return reasons.join('. ')
  }

  async generateWeeklySchedule(
    entries: Array<{
      id: string
      content: string
      category: string
      urgency: string
      estimatedDuration: number
    }>,
    userPattern: UserPattern,
    weekStart: Date
  ): Promise<Array<{
    entryId: string
    scheduledTime: Date
    confidence: number
    reason: string
  }>> {
    const schedule = []
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // Generate available slots for the week
    const availableSlots = this.generateWeeklySlots(weekStart, weekEnd, userPattern)
    const scheduledSlots: Array<{ start: Date; end: Date }> = []

    // Sort entries by priority (urgency + AI confidence)
    const sortedEntries = entries.sort((a, b) => {
      const urgencyScore = { 'high': 3, 'medium': 2, 'low': 1 }
      return (urgencyScore[b.urgency] || 1) - (urgencyScore[a.urgency] || 1)
    })

    for (const entry of sortedEntries) {
      const timeSlots = await this.findOptimalTimeSlots(
        entry,
        userPattern,
        availableSlots,
        scheduledSlots
      )

      if (timeSlots.length > 0) {
        const bestSlot = timeSlots[0]
        schedule.push({
          entryId: entry.id,
          scheduledTime: bestSlot.start,
          confidence: bestSlot.score / 100,
          reason: bestSlot.reason
        })

        // Mark this slot as used
        scheduledSlots.push({
          start: bestSlot.start,
          end: bestSlot.end
        })

        // Remove overlapping available slots
        this.removeOverlappingSlots(availableSlots, bestSlot)
      }
    }

    return schedule
  }

  private generateWeeklySlots(
    weekStart: Date,
    weekEnd: Date,
    userPattern: UserPattern
  ): Array<{ start: Date; end: Date }> {
    const slots = []
    const current = new Date(weekStart)

    while (current < weekEnd) {
      // Skip weekends if user prefers weekdays
      const dayOfWeek = current.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        current.setDate(current.getDate() + 1)
        continue
      }

      // Generate slots for working hours
      for (let hour = 9; hour <= 17; hour++) {
        const slotStart = new Date(current)
        slotStart.setHours(hour, 0, 0, 0)
        
        const slotEnd = new Date(slotStart)
        slotEnd.setHours(hour + 1, 0, 0, 0)

        slots.push({ start: slotStart, end: slotEnd })
      }

      current.setDate(current.getDate() + 1)
    }

    return slots
  }

  private removeOverlappingSlots(
    availableSlots: Array<{ start: Date; end: Date }>,
    usedSlot: { start: Date; end: Date }
  ): void {
    for (let i = availableSlots.length - 1; i >= 0; i--) {
      if (this.timeRangesOverlap(availableSlots[i], usedSlot)) {
        availableSlots.splice(i, 1)
      }
    }
  }
}
```

This comprehensive AI integration provides ScrollLater with intelligent content analysis, categorization, and scheduling capabilities. The system uses multiple AI models through OpenRouter for different tasks, implements batch processing for efficiency, and includes a smart scheduling algorithm that learns from user patterns to suggest optimal times for different types of content.

---

## 7. Google Calendar Integration

The Google Calendar integration is a core feature of ScrollLater that automatically creates time blocks for saved content. This integration requires OAuth 2.0 authentication and careful handling of user permissions and calendar events.

### 7.1 Google Cloud Console Setup

#### 7.1.1 Project Creation and API Configuration

Begin by setting up a Google Cloud Console project with the necessary APIs and credentials:

**Step 1: Create Google Cloud Project**
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Calendar API in the API Library
4. Configure the OAuth consent screen with your application details

**Step 2: Create OAuth 2.0 Credentials**
1. Navigate to Credentials in the Google Cloud Console
2. Create OAuth 2.0 Client IDs for web application
3. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback/google` (development)
   - `https://your-domain.com/auth/callback/google` (production)
4. Download the client configuration JSON

**Step 3: Configure OAuth Consent Screen**
```json
{
  "application_name": "ScrollLater",
  "application_logo": "https://your-domain.com/logo.png",
  "scopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
  ],
  "authorized_domains": [
    "your-domain.com",
    "localhost"
  ]
}
```

#### 7.1.2 Environment Variables Configuration

Add the Google OAuth credentials to your environment configuration:

```bash
# .env.local
GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback/google

# For production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret
```

### 7.2 OAuth Implementation

#### 7.2.1 NextAuth.js Configuration

Implement Google OAuth using NextAuth.js for secure authentication flow:

```typescript
// src/pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar',
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const supabase = createSupabaseServiceClient()
          
          // Store Google tokens in user profile
          const { error } = await supabase
            .from('user_profiles')
            .upsert({
              id: user.id,
              google_calendar_connected: true,
              google_refresh_token: account.refresh_token,
              google_access_token: account.access_token,
              google_token_expires_at: account.expires_at
            })

          if (error) {
            console.error('Error storing Google tokens:', error)
            return false
          }

          return true
        } catch (error) {
          console.error('Sign in error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
}

export default NextAuth(authOptions)
```

#### 7.2.2 Google Calendar Service Class

Create a comprehensive service class for Google Calendar operations:

```typescript
// src/lib/google-calendar.ts
interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  colorId?: string
  attendees?: Array<{
    email: string
    optional?: boolean
  }>
}

interface CalendarList {
  id: string
  summary: string
  primary?: boolean
  accessRole: string
  backgroundColor?: string
}

export class GoogleCalendarService {
  private accessToken: string
  private refreshToken: string
  private clientId: string
  private clientSecret: string

  constructor(tokens: {
    accessToken: string
    refreshToken: string
    clientId: string
    clientSecret: string
  }) {
    this.accessToken = tokens.accessToken
    this.refreshToken = tokens.refreshToken
    this.clientId = tokens.clientId
    this.clientSecret = tokens.clientSecret
  }

  async refreshAccessToken(): Promise<string> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      return data.access_token
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw error
    }
  }

  private async makeCalendarRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `https://www.googleapis.com/calendar/v3${endpoint}`
    
    let response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    // If token expired, refresh and retry
    if (response.status === 401) {
      await this.refreshAccessToken()
      response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Calendar API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    return response.json()
  }

  async getCalendarList(): Promise<CalendarList[]> {
    const data = await this.makeCalendarRequest('/users/me/calendarList')
    return data.items || []
  }

  async createEvent(
    calendarId: string,
    event: CalendarEvent
  ): Promise<{ id: string; htmlLink: string }> {
    const data = await this.makeCalendarRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(event)
      }
    )

    return {
      id: data.id,
      htmlLink: data.htmlLink
    }
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<{ id: string; htmlLink: string }> {
    const data = await this.makeCalendarRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(event)
      }
    )

    return {
      id: data.id,
      htmlLink: data.htmlLink
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.makeCalendarRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE'
      }
    )
  }

  async getEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime'
    })

    const data = await this.makeCalendarRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    )

    return data.items || []
  }

  async findFreeTimeSlots(
    calendarId: string,
    startDate: Date,
    endDate: Date,
    duration: number // in minutes
  ): Promise<Array<{ start: Date; end: Date }>> {
    const events = await this.getEvents(
      calendarId,
      startDate.toISOString(),
      endDate.toISOString()
    )

    const freeSlots: Array<{ start: Date; end: Date }> = []
    const workingHours = { start: 9, end: 17 } // 9 AM to 5 PM

    const current = new Date(startDate)
    while (current < endDate) {
      // Skip weekends
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1)
        continue
      }

      // Check each hour during working hours
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        const slotStart = new Date(current)
        slotStart.setHours(hour, 0, 0, 0)
        
        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + duration)

        // Check if this slot conflicts with any existing events
        const hasConflict = events.some(event => {
          const eventStart = new Date(event.start.dateTime)
          const eventEnd = new Date(event.end.dateTime)
          return slotStart < eventEnd && eventStart < slotEnd
        })

        if (!hasConflict) {
          freeSlots.push({ start: slotStart, end: slotEnd })
        }
      }

      current.setDate(current.getDate() + 1)
    }

    return freeSlots
  }

  async createScrollLaterEvent(entry: {
    title: string
    content: string
    url?: string
    category: string
    estimatedDuration: number
  }, scheduledTime: Date, calendarId: string = 'primary'): Promise<{
    id: string
    htmlLink: string
  }> {
    const endTime = new Date(scheduledTime.getTime() + entry.estimatedDuration * 60000)
    
    const event: CalendarEvent = {
      summary: `📖 ${entry.title}`,
      description: this.buildEventDescription(entry),
      start: {
        dateTime: scheduledTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 60 }
        ]
      },
      colorId: this.getCategoryColorId(entry.category)
    }

    return this.createEvent(calendarId, event)
  }

  private buildEventDescription(entry: {
    content: string
    url?: string
    category: string
  }): string {
    let description = `ScrollLater: ${entry.category}\n\n`
    description += `${entry.content}\n\n`
    
    if (entry.url) {
      description += `🔗 Link: ${entry.url}\n\n`
    }
    
    description += `Created by ScrollLater - https://scrolllater.app`
    
    return description
  }

  private getCategoryColorId(category: string): string {
    const colorMap: Record<string, string> = {
      'Read Later': '1', // Blue
      'Build': '2', // Green
      'Explore': '3', // Purple
      'Todo': '5', // Yellow
      'Schedule': '11', // Red
      'Creative': '4', // Pink
      'Learning': '7', // Cyan
      'Business': '10', // Lime
      'Personal': '6' // Orange
    }
    
    return colorMap[category] || '1'
  }
}
```

### 7.3 Calendar Integration Components

#### 7.3.1 Calendar Connection Component

Create a user-friendly interface for connecting Google Calendar:

```typescript
// src/components/calendar/CalendarConnection.tsx
'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { createSupabaseClient } from '@/lib/supabase'
import { CalendarIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface CalendarConnectionProps {
  onConnectionChange?: (connected: boolean) => void
}

export function CalendarConnection({ onConnectionChange }: CalendarConnectionProps) {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [calendars, setCalendars] = useState<Array<{ id: string; name: string; primary?: boolean }>>([])
  const [selectedCalendar, setSelectedCalendar] = useState<string>('')
  const [error, setError] = useState<string>('')
  const supabase = createSupabaseClient()

  useEffect(() => {
    checkConnectionStatus()
  }, [session])

  const checkConnectionStatus = async () => {
    if (!session?.user) return

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('google_calendar_connected, default_calendar_id')
        .eq('id', session.user.id)
        .single()

      if (profile?.google_calendar_connected) {
        setIsConnected(true)
        setSelectedCalendar(profile.default_calendar_id || 'primary')
        await loadCalendars()
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  const loadCalendars = async () => {
    try {
      const response = await fetch('/api/calendar/list', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars)
      }
    } catch (error) {
      console.error('Error loading calendars:', error)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    setError('')

    try {
      await signIn('google', {
        callbackUrl: '/settings?calendar=connected'
      })
    } catch (error) {
      setError('Failed to connect to Google Calendar')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          google_calendar_connected: false,
          google_refresh_token: null,
          default_calendar_id: null
        })
        .eq('id', session?.user?.id)

      if (error) throw error

      setIsConnected(false)
      setCalendars([])
      setSelectedCalendar('')
      onConnectionChange?.(false)
    } catch (error) {
      setError('Failed to disconnect Google Calendar')
    }
  }

  const handleCalendarChange = async (calendarId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ default_calendar_id: calendarId })
        .eq('id', session?.user?.id)

      if (error) throw error

      setSelectedCalendar(calendarId)
    } catch (error) {
      setError('Failed to update calendar selection')
    }
  }

  if (!session) {
    return (
      <div className="text-center text-gray-500">
        Please sign in to connect your Google Calendar
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <CalendarIcon className="h-6 w-6 text-gray-400 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Google Calendar</h3>
            <p className="text-sm text-gray-500">
              Automatically schedule time for your saved content
            </p>
          </div>
        </div>
        
        {isConnected ? (
          <CheckCircleIcon className="h-6 w-6 text-green-500" />
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {!isConnected ? (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              What happens when you connect?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ScrollLater can create calendar events for your saved content</li>
              <li>• Events include links and descriptions from your entries</li>
              <li>• You can choose which calendar to use</li>
              <li>• You can disconnect at any time</li>
            </ul>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isConnecting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Connect Google Calendar'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-sm text-green-800">
              ✅ Google Calendar is connected and ready to use
            </p>
          </div>

          {calendars.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Calendar
              </label>
              <select
                value={selectedCalendar}
                onChange={(e) => handleCalendarChange(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name} {calendar.primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Disconnect Calendar
          </button>
        </div>
      )}
    </div>
  )
}
```

#### 7.3.2 Scheduling Interface Component

Create an interface for users to schedule entries to their calendar:

```typescript
// src/components/calendar/SchedulingInterface.tsx
'use client'

import { useState } from 'react'
import { format, addDays, startOfDay, addMinutes } from 'date-fns'
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'
import { GoogleCalendarService } from '@/lib/google-calendar'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'

interface SchedulingInterfaceProps {
  entry: {
    id: string
    title: string
    content: string
    url?: string
    category: string
    ai_summary?: string
    estimatedDuration?: number
  }
  onScheduled?: (eventData: { id: string; url: string; scheduledTime: Date }) => void
  onClose?: () => void
}

export function SchedulingInterface({ entry, onScheduled, onClose }: SchedulingInterfaceProps) {
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [duration, setDuration] = useState(entry.estimatedDuration || 30)
  const [isScheduling, setIsScheduling] = useState(false)
  const [suggestedSlots, setSuggestedSlots] = useState<Array<{
    start: Date
    end: Date
    score: number
    reason: string
  }>>([])
  const [error, setError] = useState('')
  
  const { user } = useAuth()
  const supabase = createSupabaseClient()

  const handleSchedule = async () => {
    if (!user) return

    setIsScheduling(true)
    setError('')

    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
      
      // Get user's Google tokens
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('google_refresh_token, default_calendar_id')
        .eq('id', user.id)
        .single()

      if (!profile?.google_refresh_token) {
        throw new Error('Google Calendar not connected')
      }

      // Create calendar service
      const calendarService = new GoogleCalendarService({
        accessToken: '', // Will be refreshed
        refreshToken: profile.google_refresh_token,
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!
      })

      // Create calendar event
      const eventData = await calendarService.createScrollLaterEvent(
        {
          title: entry.title || entry.content.substring(0, 50),
          content: entry.ai_summary || entry.content,
          url: entry.url,
          category: entry.category,
          estimatedDuration: duration
        },
        scheduledDateTime,
        profile.default_calendar_id || 'primary'
      )

      // Update entry in database
      const { error: updateError } = await supabase
        .from('entries')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledDateTime.toISOString(),
          calendar_event_id: eventData.id,
          calendar_event_url: eventData.htmlLink
        })
        .eq('id', entry.id)

      if (updateError) throw updateError

      onScheduled?.({
        id: eventData.id,
        url: eventData.htmlLink,
        scheduledTime: scheduledDateTime
      })

    } catch (error) {
      console.error('Scheduling error:', error)
      setError(error.message || 'Failed to schedule entry')
    } finally {
      setIsScheduling(false)
    }
  }

  const loadSuggestedSlots = async () => {
    try {
      // Call AI service to get suggested time slots
      const response = await fetch('/api/ai/suggest-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry: {
            content: entry.content,
            category: entry.category,
            estimatedDuration: duration
          },
          preferences: {
            startDate: selectedDate,
            duration: duration
          }
        })
      })

      if (response.ok) {
        const suggestions = await response.json()
        setSuggestedSlots(suggestions.slots || [])
      }
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }

  const selectSuggestedSlot = (slot: { start: Date }) => {
    setSelectedDate(format(slot.start, 'yyyy-MM-dd'))
    setSelectedTime(format(slot.start, 'HH:mm'))
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg bg-white rounded-lg shadow-lg">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Schedule: {entry.title || entry.content.substring(0, 50)}
          </h3>
          <p className="text-sm text-gray-600">
            {entry.ai_summary || entry.content.substring(0, 100)}...
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="inline h-4 w-4 mr-1" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ClockIcon className="inline h-4 w-4 mr-1" />
              Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Suggested Time Slots */}
          {suggestedSlots.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggested Times
              </label>
              <div className="space-y-2">
                {suggestedSlots.slice(0, 3).map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => selectSuggestedSlot(slot)}
                    className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {format(slot.start, 'MMM d, yyyy h:mm a')}
                        </p>
                        <p className="text-xs text-gray-500">{slot.reason}</p>
                      </div>
                      <div className="text-xs text-blue-600">
                        {Math.round(slot.score)}% match
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={isScheduling}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isScheduling ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
              ) : (
                'Schedule'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

This comprehensive Google Calendar integration provides seamless scheduling capabilities for ScrollLater users. The implementation includes OAuth 2.0 authentication, calendar management, event creation and management, and intelligent scheduling suggestions. The system respects user preferences and provides a smooth user experience for connecting and managing calendar events.

---


## 8. iOS Shortcut Integration

The iOS Shortcut integration is a key feature that allows users to quickly capture content from anywhere on their iPhone without opening the ScrollLater app. This integration uses Apple's Shortcuts app to send data directly to the ScrollLater backend via webhooks.

### 8.1 Shortcut Design and Implementation

#### 8.1.1 Shortcut Architecture

The iOS Shortcut works by capturing user input (text, URLs, or clipboard content) and sending it to a secure webhook endpoint in the ScrollLater backend. The shortcut is designed to be fast, reliable, and user-friendly.

**Shortcut Flow:**
1. User triggers the shortcut (via Siri, widget, or share sheet)
2. Shortcut prompts for input or uses clipboard content
3. Data is sent to ScrollLater webhook with user authentication token
4. Backend processes the entry and triggers AI analysis
5. User receives confirmation of successful capture

#### 8.1.2 Shortcut JSON Configuration

Create the iOS Shortcut using the following configuration. This JSON can be imported into the Shortcuts app:

```json
{
  "WFWorkflowActions": [
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.detect.text",
      "WFWorkflowActionParameters": {
        "WFInput": {
          "Value": {
            "WFTextActionText": {
              "Value": "",
              "WFSerializationType": "WFTextTokenString"
            }
          },
          "WFSerializationType": "WFTextTokenAttachment"
        }
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.ask.for.input",
      "WFWorkflowActionParameters": {
        "WFAskActionPrompt": "What would you like to save to ScrollLater?",
        "WFInputType": "Text",
        "WFAskActionDefaultAnswer": {
          "Value": {
            "string": "￼"
          },
          "WFSerializationType": "WFTextTokenString"
        }
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.gettext",
      "WFWorkflowActionParameters": {
        "WFTextActionText": {
          "Value": {
            "string": "￼"
          },
          "WFSerializationType": "WFTextTokenString"
        }
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.url",
      "WFWorkflowActionParameters": {
        "WFURLActionURL": "https://your-supabase-project.supabase.co/functions/v1/webhook-handler"
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.downloadurl",
      "WFWorkflowActionParameters": {
        "WFHTTPMethod": "POST",
        "WFHTTPHeaders": {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_USER_TOKEN_HERE"
        },
        "WFHTTPBodyType": "JSON",
        "WFJSONValues": {
          "content": {
            "Value": {
              "string": "￼"
            },
            "WFSerializationType": "WFTextTokenString"
          },
          "source": "shortcut",
          "userToken": "YOUR_USER_TOKEN_HERE"
        }
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.getvalueforkey",
      "WFWorkflowActionParameters": {
        "WFDictionaryKey": "success"
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.conditional",
      "WFWorkflowActionParameters": {
        "WFCondition": 1,
        "WFConditionalActionString": true,
        "GroupingIdentifier": "success_check"
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.shownotification",
      "WFWorkflowActionParameters": {
        "WFNotificationActionTitle": "✅ Saved to ScrollLater",
        "WFNotificationActionBody": "Your entry has been captured and will be processed shortly."
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.conditional",
      "WFWorkflowActionParameters": {
        "WFCondition": 1,
        "GroupingIdentifier": "success_check"
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.shownotification",
      "WFWorkflowActionParameters": {
        "WFNotificationActionTitle": "❌ ScrollLater Error",
        "WFNotificationActionBody": "Failed to save entry. Please try again or use the app."
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.conditional",
      "WFWorkflowActionParameters": {
        "GroupingIdentifier": "success_check"
      }
    }
  ],
  "WFWorkflowName": "Save to ScrollLater",
  "WFWorkflowIcon": {
    "WFWorkflowIconStartColor": 2071128575,
    "WFWorkflowIconGlyphNumber": 59511
  },
  "WFWorkflowMinimumClientVersion": 900,
  "WFWorkflowMinimumClientVersionString": "900",
  "WFWorkflowInputContentItemClasses": [
    "WFAppStoreAppContentItem",
    "WFArticleContentItem",
    "WFContactContentItem",
    "WFDateContentItem",
    "WFEmailAddressContentItem",
    "WFGenericFileContentItem",
    "WFImageContentItem",
    "WFiTunesProductContentItem",
    "WFLocationContentItem",
    "WFDCMapsLinkContentItem",
    "WFAVAssetContentItem",
    "WFPDFContentItem",
    "WFPhoneNumberContentItem",
    "WFRichTextContentItem",
    "WFSafariWebPageContentItem",
    "WFStringContentItem",
    "WFURLContentItem"
  ],
  "WFWorkflowTypes": [
    "Watch",
    "ActionExtension"
  ]
}
```

#### 8.1.3 User Token Management

Implement a secure token system for authenticating shortcut requests:

```typescript
// src/lib/shortcut-tokens.ts
import { createSupabaseServiceClient } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export class ShortcutTokenManager {
  private supabase = createSupabaseServiceClient()

  async generateUserToken(userId: string): Promise<string> {
    // Generate a secure random token
    const token = randomBytes(32).toString('hex')
    
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({ apple_shortcut_token: token })
        .eq('id', userId)

      if (error) throw error
      return token
    } catch (error) {
      console.error('Error generating shortcut token:', error)
      throw new Error('Failed to generate shortcut token')
    }
  }

  async validateToken(token: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('id')
        .eq('apple_shortcut_token', token)
        .single()

      if (error || !data) return null
      return data.id
    } catch (error) {
      console.error('Error validating token:', error)
      return null
    }
  }

  async revokeToken(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({ apple_shortcut_token: null })
        .eq('id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error revoking token:', error)
      throw new Error('Failed to revoke shortcut token')
    }
  }
}
```

#### 8.1.4 Shortcut Setup Component

Create a user interface for setting up the iOS Shortcut:

```typescript
// src/components/shortcuts/ShortcutSetup.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createSupabaseClient } from '@/lib/supabase'
import { ShortcutTokenManager } from '@/lib/shortcut-tokens'
import { 
  DevicePhoneMobileIcon, 
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'

export function ShortcutSetup() {
  const [userToken, setUserToken] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const supabase = createSupabaseClient()
  const tokenManager = new ShortcutTokenManager()

  useEffect(() => {
    loadExistingToken()
  }, [user])

  const loadExistingToken = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('apple_shortcut_token')
        .eq('id', user.id)
        .single()

      if (data?.apple_shortcut_token) {
        setUserToken(data.apple_shortcut_token)
      }
    } catch (error) {
      console.error('Error loading token:', error)
    }
  }

  const generateToken = async () => {
    if (!user) return

    setIsGenerating(true)
    setError('')

    try {
      const token = await tokenManager.generateUserToken(user.id)
      setUserToken(token)
    } catch (error) {
      setError('Failed to generate token. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(userToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      setError('Failed to copy token')
    }
  }

  const revokeToken = async () => {
    if (!user || !confirm('Are you sure you want to revoke this token? Your existing shortcuts will stop working.')) {
      return
    }

    try {
      await tokenManager.revokeToken(user.id)
      setUserToken('')
    } catch (error) {
      setError('Failed to revoke token')
    }
  }

  const downloadShortcut = () => {
    const shortcutUrl = `https://www.icloud.com/shortcuts/your-shortcut-id`
    window.open(shortcutUrl, '_blank')
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/webhook-handler`

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <DevicePhoneMobileIcon className="h-6 w-6 text-gray-400 mr-3" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">iOS Shortcut</h3>
          <p className="text-sm text-gray-500">
            Quickly save content from anywhere on your iPhone
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Step 1: Generate Token */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Step 1: Generate Authentication Token
          </h4>
          
          {!userToken ? (
            <button
              onClick={generateToken}
              disabled={isGenerating}
              className="inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Generate Token
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-800">Token generated successfully</span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-800 break-all">
                    {userToken.substring(0, 20)}...
                  </code>
                  <button
                    onClick={copyToken}
                    className="ml-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                onClick={revokeToken}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Revoke Token
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Download Shortcut */}
        {userToken && (
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Step 2: Download and Install Shortcut
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Download the pre-configured shortcut and install it on your iPhone.
            </p>
            
            <button
              onClick={downloadShortcut}
              className="inline-flex items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Download Shortcut
            </button>
          </div>
        )}

        {/* Step 3: Manual Setup Instructions */}
        {userToken && (
          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Step 3: Manual Setup (Alternative)
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              If the download doesn't work, you can manually create the shortcut:
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Webhook URL:
                </label>
                <code className="block text-xs text-gray-800 bg-white p-2 rounded border break-all">
                  {webhookUrl}
                </code>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Authorization Header:
                </label>
                <code className="block text-xs text-gray-800 bg-white p-2 rounded border break-all">
                  Bearer {userToken}
                </code>
              </div>
            </div>

            <details className="mt-3">
              <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                Show detailed setup instructions
              </summary>
              <div className="mt-3 text-sm text-gray-600 space-y-2">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open the Shortcuts app on your iPhone</li>
                  <li>Tap the "+" to create a new shortcut</li>
                  <li>Add "Ask for Input" action (set to Text)</li>
                  <li>Add "Get Contents of URL" action</li>
                  <li>Set URL to the webhook URL above</li>
                  <li>Set Method to POST</li>
                  <li>Add Authorization header with your token</li>
                  <li>Set request body to JSON with content field</li>
                  <li>Add notification actions for success/failure</li>
                  <li>Save the shortcut as "Save to ScrollLater"</li>
                </ol>
              </div>
            </details>
          </div>
        )}

        {/* Usage Instructions */}
        {userToken && (
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              How to Use Your Shortcut
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Say "Hey Siri, Save to ScrollLater" to capture via voice</li>
              <li>• Use the share sheet in Safari, Instagram, or other apps</li>
              <li>• Add the shortcut to your home screen for quick access</li>
              <li>• Run it from the Shortcuts app or widget</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 8.2 Enhanced Webhook Handler

Update the webhook handler to support additional features and better error handling:

```typescript
// supabase/functions/webhook-handler/index.ts (Enhanced Version)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookRequest {
  content: string
  url?: string
  source: string
  userToken: string
  metadata?: {
    appName?: string
    timestamp?: string
    location?: {
      latitude: number
      longitude: number
    }
  }
}

interface WebhookResponse {
  success: boolean
  entryId?: string
  message: string
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse and validate request
    const requestData: WebhookRequest = await req.json()
    const { content, url, source, userToken, metadata } = requestData

    // Validate required fields
    if (!content || !userToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: content and userToken',
          message: 'Invalid request data'
        } as WebhookResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate content length
    if (content.length > 5000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Content too long (max 5000 characters)',
          message: 'Content exceeds maximum length'
        } as WebhookResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Find user by shortcut token
    const { data: userProfile, error: userError } = await supabaseClient
      .from('user_profiles')
      .select('id, total_entries')
      .eq('apple_shortcut_token', userToken)
      .single()

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid user token',
          message: 'Authentication failed'
        } as WebhookResponse),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check rate limiting (max 100 entries per day)
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabaseClient
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)
      .gte('created_at', `${today}T00:00:00.000Z`)

    if (todayCount && todayCount >= 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Daily limit exceeded (100 entries per day)',
          message: 'You have reached your daily limit'
        } as WebhookResponse),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract URL from content if not provided
    let extractedUrl = url
    if (!extractedUrl) {
      const urlRegex = /(https?:\/\/[^\s]+)/g
      const matches = content.match(urlRegex)
      if (matches && matches.length > 0) {
        extractedUrl = matches[0]
      }
    }

    // Create new entry
    const entryData = {
      user_id: userProfile.id,
      content: content.trim(),
      original_input: content.trim(),
      url: extractedUrl || null,
      source: source || 'shortcut',
      status: 'inbox' as const,
      metadata: {
        ...metadata,
        webhook_timestamp: new Date().toISOString(),
        user_agent: req.headers.get('user-agent') || 'unknown'
      }
    }

    const { data: newEntry, error: insertError } = await supabaseClient
      .from('entries')
      .insert(entryData)
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to save entry',
          message: 'Database error occurred'
        } as WebhookResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Trigger AI processing asynchronously (don't wait for completion)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-summarize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        entryId: newEntry.id,
        content: content,
        url: extractedUrl
      })
    }).catch(error => {
      console.error('AI processing trigger failed:', error)
    })

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        entryId: newEntry.id,
        message: 'Entry saved successfully and queued for processing'
      } as WebhookResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook handler error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      } as WebhookResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

---

## 9. Deployment & Infrastructure

This section covers the complete deployment process for ScrollLater, including frontend deployment on Vercel, backend configuration on Supabase, and setting up all necessary integrations and monitoring.

### 9.1 Frontend Deployment (Vercel)

#### 9.1.1 Vercel Project Setup

Vercel provides an excellent platform for deploying Next.js applications with automatic deployments, edge functions, and global CDN distribution.

**Step 1: Connect Repository**
1. Push your ScrollLater frontend code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Visit [vercel.com](https://vercel.com) and sign up or log in
3. Click "New Project" and import your repository
4. Vercel will automatically detect it's a Next.js project

**Step 2: Configure Environment Variables**
In your Vercel project settings, add the following environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret

# OpenRouter Configuration
NEXT_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key

# App Configuration
NEXT_PUBLIC_APP_NAME=ScrollLater
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Step 3: Configure Build Settings**
Vercel automatically detects Next.js build settings, but you can customize them:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

#### 9.1.2 Custom Domain Configuration

**Step 1: Add Custom Domain**
1. In your Vercel project dashboard, go to Settings > Domains
2. Add your custom domain (e.g., scrolllater.app)
3. Configure DNS records as instructed by Vercel

**Step 2: SSL Certificate**
Vercel automatically provisions SSL certificates for custom domains. Ensure your domain is properly configured and the certificate is active.

**Step 3: Redirect Configuration**
Create a `vercel.json` file in your project root for custom redirects and headers:

```json
{
  "redirects": [
    {
      "source": "/app",
      "destination": "/dashboard",
      "permanent": true
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "functions": {
    "src/pages/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

#### 9.1.3 Performance Optimization

**Image Optimization:**
Configure Next.js image optimization in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react', 'date-fns'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}
```

**Bundle Analysis:**
Add bundle analyzer to monitor build size:

```bash
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
```

### 9.2 Backend Deployment (Supabase)

#### 9.2.1 Production Database Setup

**Step 1: Upgrade to Production Plan**
For production use, upgrade your Supabase project to a paid plan to get:
- Dedicated resources
- Daily backups
- Point-in-time recovery
- Custom domains
- Increased API limits

**Step 2: Database Optimization**
Apply production-ready database configurations:

```sql
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Optimize for read-heavy workloads
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET random_page_cost = 1.1;

-- Enable query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create additional indexes for performance
CREATE INDEX CONCURRENTLY idx_entries_user_status_created 
ON entries(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_entries_scheduled_for_status 
ON entries(scheduled_for, status) WHERE scheduled_for IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_processing_queue_status_priority 
ON processing_queue(status, priority, created_at);
```

**Step 3: Row Level Security Policies**
Ensure all RLS policies are properly configured for production:

```sql
-- Audit existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Add additional security policies
CREATE POLICY "Prevent unauthorized access" ON entries
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Limit processing queue access" ON processing_queue
    FOR ALL USING (auth.uid() = user_id);
```

#### 9.2.2 Edge Functions Deployment

**Step 1: Deploy Edge Functions**
Use the Supabase CLI to deploy your edge functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy ai-summarize
supabase functions deploy webhook-handler
supabase functions deploy calendar-integration
```

**Step 2: Configure Function Secrets**
Set up environment variables for your edge functions:

```bash
# Set secrets for edge functions
supabase secrets set OPENROUTER_API_KEY=your-openrouter-api-key
supabase secrets set GOOGLE_CLIENT_ID=your-google-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Step 3: Monitor Function Performance**
Set up monitoring for your edge functions:

```sql
-- Create function logs table
CREATE TABLE function_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    function_name TEXT NOT NULL,
    execution_time_ms INTEGER,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE function_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for function logs
CREATE POLICY "Service role can manage function logs" ON function_logs
    USING (auth.jwt() ->> 'role' = 'service_role');
```

### 9.3 Third-Party Service Configuration

#### 9.3.1 OpenRouter Production Setup

**Step 1: Production API Key**
1. Upgrade to a paid OpenRouter plan for production usage
2. Generate a production API key with appropriate rate limits
3. Configure billing alerts and usage monitoring

**Step 2: Model Selection Strategy**
Implement a cost-effective model selection strategy:

```typescript
// src/lib/model-selector.ts
export class ModelSelector {
  private models = {
    summarization: {
      primary: 'anthropic/claude-3-haiku',
      fallback: 'mistralai/mistral-7b-instruct',
      cost: 0.25 // per 1M tokens
    },
    categorization: {
      primary: 'mistralai/mistral-7b-instruct',
      fallback: 'openai/gpt-3.5-turbo',
      cost: 0.20
    },
    scheduling: {
      primary: 'anthropic/claude-3-sonnet',
      fallback: 'anthropic/claude-3-haiku',
      cost: 3.00
    }
  }

  selectModel(task: string, priority: 'high' | 'medium' | 'low' = 'medium'): string {
    const modelConfig = this.models[task]
    if (!modelConfig) return 'anthropic/claude-3-haiku'

    // Use fallback for low priority tasks to save costs
    if (priority === 'low') {
      return modelConfig.fallback
    }

    return modelConfig.primary
  }

  estimateCost(task: string, tokenCount: number): number {
    const modelConfig = this.models[task]
    if (!modelConfig) return 0

    return (tokenCount / 1000000) * modelConfig.cost
  }
}
```

#### 9.3.2 Google Cloud Production Configuration

**Step 1: Production OAuth Credentials**
1. Create a new OAuth 2.0 client ID for production
2. Add your production domain to authorized origins
3. Configure the OAuth consent screen for public use

**Step 2: API Quotas and Limits**
1. Enable the Google Calendar API for your project
2. Request quota increases if needed for high-volume usage
3. Set up monitoring and alerting for API usage

**Step 3: Service Account Setup (Optional)**
For server-side calendar operations, create a service account:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "scrolllater@your-project-id.iam.gserviceaccount.com",
  "client_id": "client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### 9.4 Monitoring and Analytics

#### 9.4.1 Application Monitoring

**Vercel Analytics:**
Enable Vercel Analytics for frontend monitoring:

```bash
npm install @vercel/analytics
```

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Error Tracking:**
Implement error tracking with Sentry:

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

#### 9.4.2 Database Monitoring

**Performance Monitoring:**
Set up database performance monitoring:

```sql
-- Create performance monitoring view
CREATE VIEW performance_metrics AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public';

-- Monitor slow queries
CREATE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

**Usage Analytics:**
Track application usage patterns:

```sql
-- Create analytics table
CREATE TABLE analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_analytics_events_type_created ON analytics_events(event_type, created_at);
CREATE INDEX idx_analytics_events_user_created ON analytics_events(user_id, created_at);
```

### 9.5 Security and Compliance

#### 9.5.1 Security Headers

Configure security headers in your Next.js application:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://openrouter.ai https://accounts.google.com https://oauth2.googleapis.com;"
  )

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

#### 9.5.2 Data Privacy and GDPR Compliance

**Privacy Policy Implementation:**
Create comprehensive privacy controls:

```typescript
// src/lib/privacy-manager.ts
export class PrivacyManager {
  private supabase = createSupabaseServiceClient()

  async exportUserData(userId: string): Promise<any> {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const { data: entries } = await this.supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)

    return {
      profile,
      entries,
      exportedAt: new Date().toISOString()
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    // Delete in correct order due to foreign key constraints
    await this.supabase.from('processing_queue').delete().eq('user_id', userId)
    await this.supabase.from('entries').delete().eq('user_id', userId)
    await this.supabase.from('user_profiles').delete().eq('id', userId)
    await this.supabase.auth.admin.deleteUser(userId)
  }

  async anonymizeUserData(userId: string): Promise<void> {
    await this.supabase
      .from('user_profiles')
      .update({
        display_name: 'Anonymous User',
        google_refresh_token: null,
        apple_shortcut_token: null
      })
      .eq('id', userId)

    await this.supabase
      .from('entries')
      .update({
        content: '[Content Anonymized]',
        original_input: '[Content Anonymized]',
        url: null,
        user_notes: null
      })
      .eq('user_id', userId)
  }
}
```

### 9.6 Backup and Disaster Recovery

#### 9.6.1 Database Backup Strategy

**Automated Backups:**
Supabase provides automated daily backups, but implement additional backup strategies:

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="scrolllater_backup_$DATE.sql"

# Export database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to cloud storage
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/database/

# Clean up local file
rm $BACKUP_FILE

# Keep only last 30 days of backups
aws s3 ls s3://your-backup-bucket/database/ | while read -r line; do
  createDate=`echo $line|awk {'print $1" "$2'}`
  createDate=`date -d"$createDate" +%s`
  olderThan=`date -d"30 days ago" +%s`
  if [[ $createDate -lt $olderThan ]]; then
    fileName=`echo $line|awk {'print $4'}`
    if [[ $fileName != "" ]]; then
      aws s3 rm s3://your-backup-bucket/database/$fileName
    fi
  fi
done
```

#### 9.6.2 Disaster Recovery Plan

**Recovery Procedures:**
Document step-by-step recovery procedures:

1. **Database Recovery:**
   - Restore from latest Supabase backup
   - Apply any missing transactions from logs
   - Verify data integrity

2. **Application Recovery:**
   - Redeploy from Git repository
   - Restore environment variables
   - Test all integrations

3. **DNS and Domain Recovery:**
   - Update DNS records if needed
   - Verify SSL certificates
   - Test all endpoints

**Recovery Testing:**
Regularly test your disaster recovery procedures:

```bash
# Test script for disaster recovery
#!/bin/bash

echo "Starting disaster recovery test..."

# Test database connectivity
psql $DATABASE_URL -c "SELECT 1;" || exit 1

# Test API endpoints
curl -f https://your-domain.com/api/health || exit 1

# Test authentication
curl -f https://your-domain.com/api/auth/session || exit 1

# Test integrations
curl -f https://your-domain.com/api/calendar/test || exit 1

echo "Disaster recovery test completed successfully!"
```

This comprehensive deployment and infrastructure guide ensures that ScrollLater is production-ready with proper monitoring, security, and disaster recovery procedures. The setup provides scalability, reliability, and maintainability for a growing user base.

---


## 10. Future Enhancements

ScrollLater is designed with extensibility in mind. This section outlines potential future enhancements that can be implemented to expand the platform's capabilities and user value.

### 10.1 Advanced AI Features

#### 10.1.1 Intelligent Content Clustering

Implement machine learning algorithms to automatically group related content and suggest connections between saved items:

```typescript
// src/lib/content-clustering.ts
interface ContentCluster {
  id: string
  name: string
  entries: string[]
  centroid: number[]
  coherenceScore: number
}

export class ContentClusteringService {
  async clusterEntries(entries: Array<{
    id: string
    content: string
    ai_summary: string
    category: string
  }>): Promise<ContentCluster[]> {
    // Use TF-IDF vectorization and K-means clustering
    const vectors = await this.vectorizeContent(entries)
    const clusters = await this.performKMeansClustering(vectors, 5)
    
    return clusters.map(cluster => ({
      id: `cluster_${Date.now()}_${Math.random()}`,
      name: this.generateClusterName(cluster.entries),
      entries: cluster.entries,
      centroid: cluster.centroid,
      coherenceScore: this.calculateCoherence(cluster)
    }))
  }

  private async vectorizeContent(entries: any[]): Promise<number[][]> {
    // Implement TF-IDF vectorization or use OpenAI embeddings
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: entries.map(e => e.content + ' ' + e.ai_summary)
      })
    })

    const data = await response.json()
    return data.data.map((item: any) => item.embedding)
  }
}
```

#### 10.1.2 Predictive Scheduling

Develop AI models that learn from user behavior to predict optimal scheduling times:

```typescript
// src/lib/predictive-scheduler.ts
interface UserBehaviorPattern {
  userId: string
  completionRates: Record<string, number>
  preferredTimes: Array<{ hour: number; dayOfWeek: number; score: number }>
  categoryPreferences: Record<string, { timeOfDay: string; completionRate: number }>
  seasonalPatterns: Record<string, number>
}

export class PredictiveScheduler {
  async trainUserModel(userId: string): Promise<UserBehaviorPattern> {
    const historicalData = await this.getHistoricalData(userId)
    
    return {
      userId,
      completionRates: this.calculateCompletionRates(historicalData),
      preferredTimes: this.identifyPreferredTimes(historicalData),
      categoryPreferences: this.analyzeCategoryPreferences(historicalData),
      seasonalPatterns: this.detectSeasonalPatterns(historicalData)
    }
  }

  async predictOptimalTime(
    entry: { category: string; urgency: string; estimatedDuration: number },
    userPattern: UserBehaviorPattern,
    availableSlots: Array<{ start: Date; end: Date }>
  ): Promise<{ time: Date; confidence: number; reasoning: string }> {
    // Implement machine learning prediction algorithm
    const scores = availableSlots.map(slot => ({
      slot,
      score: this.calculatePredictionScore(slot, entry, userPattern),
      reasoning: this.generateReasoning(slot, entry, userPattern)
    }))

    const bestSlot = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    )

    return {
      time: bestSlot.slot.start,
      confidence: bestSlot.score,
      reasoning: bestSlot.reasoning
    }
  }
}
```

### 10.2 Enhanced Integrations

#### 10.2.1 Notion Integration

Allow users to sync their ScrollLater entries with Notion databases:

```typescript
// src/lib/notion-integration.ts
export class NotionIntegration {
  private notionClient: Client

  constructor(accessToken: string) {
    this.notionClient = new Client({ auth: accessToken })
  }

  async syncEntriesToNotion(
    entries: Entry[],
    databaseId: string
  ): Promise<void> {
    for (const entry of entries) {
      await this.notionClient.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Title': {
            title: [{ text: { content: entry.title || entry.content.substring(0, 100) } }]
          },
          'Content': {
            rich_text: [{ text: { content: entry.content } }]
          },
          'Category': {
            select: { name: entry.ai_category || entry.user_category || 'Uncategorized' }
          },
          'Status': {
            select: { name: entry.status }
          },
          'Created': {
            date: { start: entry.created_at }
          },
          'URL': {
            url: entry.url
          }
        }
      })
    }
  }

  async createScrollLaterDatabase(): Promise<string> {
    const response = await this.notionClient.databases.create({
      parent: { type: 'page_id', page_id: 'parent-page-id' },
      title: [{ text: { content: 'ScrollLater Entries' } }],
      properties: {
        'Title': { title: {} },
        'Content': { rich_text: {} },
        'Category': { 
          select: { 
            options: [
              { name: 'Read Later', color: 'blue' },
              { name: 'Build', color: 'green' },
              { name: 'Explore', color: 'purple' }
            ]
          }
        },
        'Status': {
          select: {
            options: [
              { name: 'Inbox', color: 'gray' },
              { name: 'Scheduled', color: 'blue' },
              { name: 'Completed', color: 'green' }
            ]
          }
        },
        'Created': { date: {} },
        'URL': { url: {} }
      }
    })

    return response.id
  }
}
```

#### 10.2.2 Slack Integration

Enable team collaboration by sharing entries to Slack channels:

```typescript
// src/lib/slack-integration.ts
export class SlackIntegration {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async shareEntry(entry: Entry, channel: string): Promise<void> {
    const message = {
      channel,
      username: 'ScrollLater',
      icon_emoji: ':bookmark:',
      attachments: [
        {
          color: this.getCategoryColor(entry.ai_category || entry.user_category),
          title: entry.title || entry.content.substring(0, 100),
          text: entry.ai_summary || entry.content,
          fields: [
            {
              title: 'Category',
              value: entry.ai_category || entry.user_category || 'Uncategorized',
              short: true
            },
            {
              title: 'Status',
              value: entry.status,
              short: true
            }
          ],
          actions: entry.url ? [
            {
              type: 'button',
              text: 'View Link',
              url: entry.url
            }
          ] : [],
          footer: 'ScrollLater',
          ts: Math.floor(new Date(entry.created_at).getTime() / 1000)
        }
      ]
    }

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })
  }
}
```

### 10.3 Mobile Applications

#### 10.3.1 React Native App

Develop native mobile applications for iOS and Android:

```typescript
// mobile/src/components/QuickCapture.tsx
import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { captureEntry } from '../services/api'

export const QuickCapture: React.FC = () => {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handleCapture = async () => {
    if (!content.trim()) return

    setIsLoading(true)
    try {
      await captureEntry({
        content: content.trim(),
        source: 'mobile_app',
        userId: user.id
      })
      
      setContent('')
      Alert.alert('Success', 'Entry captured successfully!')
    } catch (error) {
      Alert.alert('Error', 'Failed to capture entry')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="What would you like to save?"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={4}
      />
      
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleCapture}
        disabled={isLoading || !content.trim()}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Saving...' : 'Capture'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

#### 10.3.2 Offline Capabilities

Implement offline functionality for mobile apps:

```typescript
// mobile/src/services/offline-manager.ts
export class OfflineManager {
  private storage = new AsyncStorage()
  private syncQueue: Array<{ action: string; data: any; timestamp: number }> = []

  async queueAction(action: string, data: any): Promise<void> {
    const queueItem = {
      action,
      data,
      timestamp: Date.now()
    }

    this.syncQueue.push(queueItem)
    await this.storage.setItem('syncQueue', JSON.stringify(this.syncQueue))
  }

  async syncWhenOnline(): Promise<void> {
    if (!this.isOnline()) return

    const queue = await this.getSyncQueue()
    
    for (const item of queue) {
      try {
        await this.executeAction(item)
        this.removeFromQueue(item)
      } catch (error) {
        console.error('Sync failed for item:', item, error)
      }
    }
  }

  private async executeAction(item: any): Promise<void> {
    switch (item.action) {
      case 'CREATE_ENTRY':
        await captureEntry(item.data)
        break
      case 'UPDATE_ENTRY':
        await updateEntry(item.data.id, item.data.updates)
        break
      case 'DELETE_ENTRY':
        await deleteEntry(item.data.id)
        break
    }
  }
}
```

### 10.4 Advanced Analytics and Insights

#### 10.4.1 Personal Productivity Analytics

Provide users with insights into their content consumption and productivity patterns:

```typescript
// src/lib/analytics-engine.ts
interface ProductivityInsights {
  capturePatterns: {
    dailyAverage: number
    peakHours: number[]
    weeklyTrends: Record<string, number>
  }
  completionRates: {
    overall: number
    byCategory: Record<string, number>
    byTimeOfDay: Record<string, number>
  }
  contentAnalysis: {
    topCategories: Array<{ category: string; count: number }>
    averageProcessingTime: number
    mostProductiveDays: string[]
  }
  recommendations: string[]
}

export class AnalyticsEngine {
  async generateInsights(userId: string): Promise<ProductivityInsights> {
    const entries = await this.getUserEntries(userId)
    const completedEntries = entries.filter(e => e.status === 'completed')
    
    return {
      capturePatterns: this.analyzeCapturePatterns(entries),
      completionRates: this.calculateCompletionRates(entries, completedEntries),
      contentAnalysis: this.analyzeContent(entries),
      recommendations: this.generateRecommendations(entries, completedEntries)
    }
  }

  private generateRecommendations(
    allEntries: Entry[],
    completedEntries: Entry[]
  ): string[] {
    const recommendations = []
    
    const completionRate = completedEntries.length / allEntries.length
    if (completionRate < 0.5) {
      recommendations.push('Consider scheduling shorter time blocks to improve completion rates')
    }

    const avgTimeToComplete = this.calculateAverageTimeToComplete(completedEntries)
    if (avgTimeToComplete > 7) {
      recommendations.push('Try to schedule entries sooner after capturing them')
    }

    const topCategory = this.getTopCategory(allEntries)
    const categoryCompletionRate = this.getCategoryCompletionRate(topCategory, allEntries, completedEntries)
    
    if (categoryCompletionRate > 0.8) {
      recommendations.push(`You're very productive with ${topCategory} content - consider capturing more!`)
    }

    return recommendations
  }
}
```

#### 10.4.2 Team Analytics (Enterprise Feature)

For enterprise users, provide team-level analytics and collaboration insights:

```typescript
// src/lib/team-analytics.ts
interface TeamInsights {
  teamId: string
  memberCount: number
  totalEntries: number
  sharedEntries: number
  collaborationScore: number
  topCategories: Array<{ category: string; count: number; members: string[] }>
  productivityTrends: Record<string, number>
}

export class TeamAnalyticsEngine {
  async generateTeamInsights(teamId: string): Promise<TeamInsights> {
    const teamMembers = await this.getTeamMembers(teamId)
    const allEntries = await this.getTeamEntries(teamId)
    const sharedEntries = allEntries.filter(e => e.shared_with_team)

    return {
      teamId,
      memberCount: teamMembers.length,
      totalEntries: allEntries.length,
      sharedEntries: sharedEntries.length,
      collaborationScore: this.calculateCollaborationScore(teamMembers, sharedEntries),
      topCategories: this.analyzeTeamCategories(allEntries),
      productivityTrends: this.calculateTeamProductivityTrends(allEntries)
    }
  }

  private calculateCollaborationScore(
    members: any[],
    sharedEntries: Entry[]
  ): number {
    const sharingRate = sharedEntries.length / members.length
    const engagementRate = this.calculateEngagementRate(sharedEntries)
    
    return Math.min(100, (sharingRate * 0.6 + engagementRate * 0.4) * 100)
  }
}
```

### 10.5 Enterprise Features

#### 10.5.1 Single Sign-On (SSO) Integration

Implement enterprise SSO for organizations:

```typescript
// src/lib/sso-integration.ts
export class SSOIntegration {
  async configureSAML(
    organizationId: string,
    samlConfig: {
      entityId: string
      ssoUrl: string
      certificate: string
      attributeMapping: Record<string, string>
    }
  ): Promise<void> {
    // Configure SAML SSO for organization
    await this.supabase
      .from('organization_sso_config')
      .upsert({
        organization_id: organizationId,
        provider: 'saml',
        config: samlConfig,
        enabled: true
      })
  }

  async handleSAMLResponse(
    samlResponse: string,
    organizationId: string
  ): Promise<{ user: any; session: any }> {
    // Validate and process SAML response
    const userData = await this.validateSAMLResponse(samlResponse, organizationId)
    
    // Create or update user
    const { data: user } = await this.supabase.auth.admin.createUser({
      email: userData.email,
      user_metadata: {
        full_name: userData.fullName,
        organization_id: organizationId,
        sso_provider: 'saml'
      }
    })

    return { user, session: await this.createSession(user) }
  }
}
```

#### 10.5.2 Advanced Security Features

Implement enterprise-grade security features:

```typescript
// src/lib/security-manager.ts
export class SecurityManager {
  async enableTwoFactorAuth(userId: string): Promise<{ qrCode: string; backupCodes: string[] }> {
    const secret = speakeasy.generateSecret({
      name: 'ScrollLater',
      account: userId,
      issuer: 'ScrollLater'
    })

    const backupCodes = this.generateBackupCodes()

    await this.supabase
      .from('user_security')
      .upsert({
        user_id: userId,
        totp_secret: secret.base32,
        backup_codes: backupCodes,
        two_factor_enabled: true
      })

    return {
      qrCode: secret.otpauth_url!,
      backupCodes
    }
  }

  async auditUserActivity(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    return data || []
  }

  async detectAnomalousActivity(userId: string): Promise<{
    riskScore: number
    anomalies: string[]
    recommendations: string[]
  }> {
    const recentActivity = await this.getUserActivity(userId, 30)
    const baseline = await this.getUserBaseline(userId)

    const anomalies = []
    let riskScore = 0

    // Check for unusual login patterns
    if (this.hasUnusualLoginPattern(recentActivity, baseline)) {
      anomalies.push('Unusual login times detected')
      riskScore += 20
    }

    // Check for unusual locations
    if (this.hasUnusualLocations(recentActivity, baseline)) {
      anomalies.push('Logins from new locations')
      riskScore += 30
    }

    // Check for unusual API usage
    if (this.hasUnusualAPIUsage(recentActivity, baseline)) {
      anomalies.push('Unusual API usage patterns')
      riskScore += 25
    }

    const recommendations = this.generateSecurityRecommendations(riskScore, anomalies)

    return { riskScore, anomalies, recommendations }
  }
}
```

### 10.6 API and Developer Platform

#### 10.6.1 Public API

Develop a comprehensive API for third-party integrations:

```typescript
// src/pages/api/v1/entries/index.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGetEntries(req, res)
    case 'POST':
      return handleCreateEntry(req, res)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}

async function handleGetEntries(req: NextApiRequest, res: NextApiResponse) {
  const { page = 1, limit = 20, category, status } = req.query
  
  // Validate API key
  const apiKey = req.headers.authorization?.replace('Bearer ', '')
  const user = await validateApiKey(apiKey)
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  // Build query
  let query = supabase
    .from('entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (category) query = query.eq('ai_category', category)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  res.status(200).json({
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: data.length === limit
    }
  })
}
```

#### 10.6.2 Webhook System

Implement webhooks for real-time integrations:

```typescript
// src/lib/webhook-manager.ts
export class WebhookManager {
  async registerWebhook(
    userId: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<string> {
    const webhookId = crypto.randomUUID()
    
    await this.supabase
      .from('webhooks')
      .insert({
        id: webhookId,
        user_id: userId,
        url,
        events,
        secret,
        active: true
      })

    return webhookId
  }

  async triggerWebhooks(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    const { data: webhooks } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .contains('events', [event])

    for (const webhook of webhooks || []) {
      await this.sendWebhook(webhook, event, data)
    }
  }

  private async sendWebhook(
    webhook: any,
    event: string,
    data: any
  ): Promise<void> {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      webhook_id: webhook.id
    }

    const signature = webhook.secret 
      ? this.generateSignature(JSON.stringify(payload), webhook.secret)
      : undefined

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ScrollLater-Webhooks/1.0',
          ...(signature && { 'X-ScrollLater-Signature': signature })
        },
        body: JSON.stringify(payload)
      })

      // Log webhook delivery
      await this.logWebhookDelivery(webhook.id, response.status, response.ok)
    } catch (error) {
      await this.logWebhookDelivery(webhook.id, 0, false, error.message)
    }
  }
}
```

---

## 11. Conclusion

ScrollLater represents a comprehensive solution for modern content management and productivity enhancement. This implementation guide has provided detailed technical specifications, code examples, and best practices for building a production-ready application that addresses the growing need for intelligent content curation and scheduling.

### 11.1 Key Achievements

The ScrollLater platform successfully addresses several critical pain points in modern digital consumption:

**Seamless Content Capture:** The multi-channel input system, including web interface, iOS Shortcuts, and API endpoints, ensures users can capture content from any source without friction. The mobile-first design philosophy ensures optimal performance across all devices.

**Intelligent Processing:** The AI-powered summarization and categorization system leverages state-of-the-art language models through OpenRouter to provide accurate content analysis while maintaining cost efficiency through intelligent model selection.

**Smart Scheduling:** The integration with Google Calendar, combined with machine learning algorithms that learn from user behavior patterns, creates a personalized scheduling system that optimizes for user productivity and completion rates.

**Scalable Architecture:** The serverless architecture using Supabase and Vercel provides automatic scaling, global distribution, and minimal operational overhead while maintaining high performance and reliability.

### 11.2 Technical Excellence

The implementation demonstrates several technical best practices:

**Security-First Design:** Row-level security, OAuth 2.0 integration, comprehensive input validation, and GDPR compliance ensure user data protection and privacy.

**Performance Optimization:** Database indexing, query optimization, CDN utilization, and progressive web app features provide fast, responsive user experiences.

**Maintainable Codebase:** TypeScript implementation, modular architecture, comprehensive error handling, and extensive documentation ensure long-term maintainability.

**Monitoring and Observability:** Integrated analytics, error tracking, performance monitoring, and audit logging provide visibility into application health and user behavior.

### 11.3 Business Value

ScrollLater addresses a significant market opportunity in the productivity and knowledge management space:

**Market Demand:** The increasing volume of digital content and the need for better organization tools create a substantial addressable market.

**Competitive Advantages:** The combination of AI-powered processing, intelligent scheduling, and seamless mobile integration differentiates ScrollLater from existing solutions.

**Monetization Opportunities:** The platform supports multiple revenue streams including subscription tiers, enterprise features, and API access.

**Scalability Potential:** The technical architecture supports growth from individual users to enterprise teams without significant infrastructure changes.

### 11.4 Implementation Roadmap

For teams implementing ScrollLater, we recommend the following phased approach:

**Phase 1 (Weeks 1-4): Core Foundation**
- Set up development environment and basic project structure
- Implement Supabase backend with database schema and authentication
- Create basic Next.js frontend with essential components
- Deploy to staging environment for testing

**Phase 2 (Weeks 5-8): AI Integration**
- Implement OpenRouter integration for content analysis
- Create AI processing pipeline with queue management
- Add intelligent categorization and summarization features
- Test and optimize AI model performance

**Phase 3 (Weeks 9-12): Calendar Integration**
- Implement Google OAuth and Calendar API integration
- Create scheduling interface and smart time slot detection
- Add calendar event management and synchronization
- Test calendar integration across different user scenarios

**Phase 4 (Weeks 13-16): Mobile and Shortcuts**
- Implement iOS Shortcut integration with webhook handlers
- Create mobile-optimized interfaces and PWA features
- Add offline capabilities and background synchronization
- Test mobile experience across different devices

**Phase 5 (Weeks 17-20): Production Deployment**
- Set up production infrastructure and monitoring
- Implement security hardening and compliance measures
- Create comprehensive testing and quality assurance processes
- Launch beta program with selected users

**Phase 6 (Weeks 21-24): Enhancement and Scale**
- Gather user feedback and implement improvements
- Add advanced features based on user needs
- Optimize performance and scalability
- Prepare for public launch

### 11.5 Success Metrics

To measure the success of ScrollLater implementation, track these key metrics:

**User Engagement:**
- Daily and monthly active users
- Content capture frequency and volume
- Feature adoption rates
- Session duration and depth

**Product Performance:**
- Content processing accuracy and speed
- Calendar integration success rates
- Mobile app performance metrics
- API response times and reliability

**Business Metrics:**
- User acquisition and retention rates
- Conversion from free to paid plans
- Customer satisfaction scores
- Revenue growth and unit economics

### 11.6 Final Recommendations

**Development Best Practices:**
- Maintain comprehensive test coverage throughout development
- Implement continuous integration and deployment pipelines
- Regular security audits and penetration testing
- User feedback integration and iterative improvement

**Operational Excellence:**
- Establish robust monitoring and alerting systems
- Create detailed runbooks for common operational tasks
- Implement automated backup and disaster recovery procedures
- Regular performance optimization and capacity planning

**User Experience Focus:**
- Conduct regular user research and usability testing
- Maintain responsive customer support channels
- Create comprehensive documentation and onboarding materials
- Continuously gather and act on user feedback

ScrollLater represents more than just a productivity tool—it embodies a new approach to digital content management that respects users' time and cognitive resources while leveraging artificial intelligence to enhance human productivity. The comprehensive implementation guide provided here serves as a blueprint for creating not just a functional application, but a platform that can evolve and scale with changing user needs and technological advances.

The future of content management lies in intelligent systems that understand context, learn from behavior, and proactively assist users in achieving their goals. ScrollLater is positioned to be at the forefront of this evolution, providing a foundation for continued innovation in the productivity and knowledge management space.

---

**Author:** Manus AI  
**Document Version:** 1.0  
**Last Updated:** January 2024  
**Total Implementation Time:** Approximately 24 weeks for full feature set  
**Recommended Team Size:** 3-5 developers (1 backend, 2 frontend, 1 mobile, 1 DevOps)

---

## References

[1] Supabase Documentation - https://supabase.com/docs  
[2] Next.js Documentation - https://nextjs.org/docs  
[3] OpenRouter API Documentation - https://openrouter.ai/docs  
[4] Google Calendar API Reference - https://developers.google.com/calendar/api  
[5] Apple Shortcuts User Guide - https://support.apple.com/guide/shortcuts/  
[6] Vercel Deployment Guide - https://vercel.com/docs  
[7] TailwindCSS Documentation - https://tailwindcss.com/docs  
[8] TypeScript Handbook - https://www.typescriptlang.org/docs  
[9] React Hook Form Documentation - https://react-hook-form.com  
[10] NextAuth.js Documentation - https://next-auth.js.org

---

