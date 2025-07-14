'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient, type Database } from '@/lib/supabase'
import { EntryForm } from '../forms/EntryForm'
import { EntryCard } from './EntryCard'
import { SearchBar } from './SearchBar'
import { FilterTabs } from './FilterTabs'
import { StatsCards } from './StatsCards'

type Entry = Database['public']['Tables']['entries']['Row']

export function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('inbox')
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createSupabaseClient()

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      console.error('Error fetching entries:', error)
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchEntries()

    const channel = supabase
      .channel('entries-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries' },
        (payload) => {
          console.log('Change received!', payload)
          fetchEntries() // Refetch all entries on any change
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchEntries])

  useEffect(() => {
    let result = entries

    // Filter by status
    if (filter !== 'all') {
      result = result.filter(entry => entry.status === filter)
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(entry => 
        entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredEntries(result)
  }, [entries, filter, searchTerm])

  const handleUpdateEntry = async (itemId: string, updates: Partial<Entry>) => {
    const { error } = await supabase
      .from('entries')
      .update(updates)
      .eq('id', itemId)
    
    if (error) {
      console.error('Error updating entry:', error)
      setError(error.message)
    }
  }

  const handleDeleteEntry = async (itemId: string) => {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Error deleting entry:', error)
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {/* Stats */}
        <StatsCards entries={entries} />

        {/* Entry Form */}
        <div className="my-8">
          <EntryForm onSuccess={fetchEntries} />
        </div>

        {/* Filters and Search */}
        <div className="my-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3">
                    <SearchBar onSearch={setSearchTerm} />
                </div>
                <div className="w-full md:w-2/3">
                    <FilterTabs currentFilter={filter} onFilterChange={setFilter} entries={entries} />
                </div>
            </div>
        </div>

        {/* Entries Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="text-center text-gray-500">Loading entries...</div>
          ) : error ? (
            <div className="text-center text-red-500">Error: {error}</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEntries.map(item => (
                <EntryCard 
                  key={item.id} 
                  item={item} 
                  onUpdate={handleUpdateEntry}
                  onDelete={handleDeleteEntry}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 