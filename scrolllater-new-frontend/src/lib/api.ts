// API service layer for connecting to existing Vercel backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://scroll-later.vercel.app';

export interface Entry {
  id: number;
  user_id: string;
  title: string;
  url: string;
  summary?: string;
  category?: string;
  tags?: string[];
  priority?: 'high' | 'medium' | 'low';
  read_time?: number;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  ai_analysis?: {
    summary?: string;
    tags?: string[];
    category?: string;
    priority?: string;
    read_time?: number;
    sentiment?: string;
    urgency?: string;
  };
}

export interface CreateEntryRequest {
  title: string;
  url: string;
  category?: string;
  tags?: string[];
  priority?: 'high' | 'medium' | 'low';
  scheduled_for?: string;
}

export interface AIAnalysisResponse {
  summary: string;
  tags: string[];
  category: string;
  priority: 'high' | 'medium' | 'low';
  read_time: number;
  sentiment: string;
  urgency: string;
}

export interface ScheduleSuggestion {
  entry_id: number;
  suggested_time: string;
  confidence: number;
  reasoning: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Entry Management
  async getEntries(): Promise<Entry[]> {
    return this.request<Entry[]>('/api/entries');
  }

  async createEntry(entry: CreateEntryRequest): Promise<Entry> {
    return this.request<Entry>('/api/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async updateEntry(id: number, updates: Partial<Entry>): Promise<Entry> {
    return this.request<Entry>(`/api/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteEntry(id: number): Promise<void> {
    return this.request<void>(`/api/entries/${id}`, {
      method: 'DELETE',
    });
  }

  // AI Analysis
  async analyzeEntry(entryId: number): Promise<AIAnalysisResponse> {
    return this.request<AIAnalysisResponse>(`/api/ai/analyze`, {
      method: 'POST',
      body: JSON.stringify({ entry_id: entryId }),
    });
  }

  async getScheduleSuggestions(): Promise<ScheduleSuggestion[]> {
    return this.request<ScheduleSuggestion[]>('/api/ai/schedule-suggest');
  }

  // Calendar Integration
  async scheduleEntry(entryId: number, scheduledTime: string): Promise<void> {
    return this.request<void>('/api/calendar/schedule', {
      method: 'POST',
      body: JSON.stringify({
        entry_id: entryId,
        scheduled_time: scheduledTime,
      }),
    });
  }

  // Stats and Analytics
  async getStats(): Promise<{
    total_entries: number;
    completed_sessions: number;
    time_saved: number;
    learning_streak: number;
  }> {
    return this.request('/api/stats');
  }

  // Shortcuts Integration
  async createEntryViaShortcut(token: string, entry: CreateEntryRequest): Promise<Entry> {
    return this.request<Entry>('/api/shortcuts/webhook', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(entry),
    });
  }
}

export const apiService = new ApiService(); 