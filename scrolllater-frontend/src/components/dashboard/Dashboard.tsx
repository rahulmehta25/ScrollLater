'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient, type Database } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { EntryForm } from '../forms/EntryForm'
import { EntryCard } from './EntryCard'
import { SearchBar } from './SearchBar'
import { FilterTabs } from './FilterTabs'
import { StatsCards } from './StatsCards'

type Entry = Database['public']['Tables']['entries']['Row']

export function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<Entry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('inbox')
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createSupabaseClient()

  const fetchEntries = useCallback(async () => {
    if (!user) {
      console.log('Dashboard: No user, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('Dashboard: Fetching entries for user:', user.email);
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Dashboard: Fetch result - data:', data?.length, 'error:', error);

      if (error) {
        setError(error.message);
        console.error('Error fetching entries:', error);
      } else {
        setEntries(data || []);
      }
    } catch (err) {
      console.error('Dashboard: Unexpected error fetching entries:', err);
      setError('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (authLoading) {
      console.log('Dashboard: Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('Dashboard: No user authenticated');
      setLoading(false);
      setEntries([]);
      return;
    }

    console.log('Dashboard: User authenticated, fetching entries...');
    fetchEntries();

    const channel = supabase
      .channel('entries-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'entries',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchEntries(); // Refetch all entries on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchEntries, user, authLoading]);

  useEffect(() => {
    let result = entries;

    // Filter by status
    if (filter !== 'all') {
      result = result.filter(entry => entry.status === filter);
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(entry => 
        entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEntries(result);
  }, [entries, filter, searchTerm]);

  const handleUpdateEntry = async (itemId: string, updates: Partial<Entry>) => {
    const { error } = await supabase
      .from('entries')
      .update(updates)
      .eq('id', itemId)
      .eq('user_id', user?.id);
    
    if (error) {
      console.error('Error updating entry:', error);
      setError(error.message);
    }
  };

  const handleDeleteEntry = async (itemId: string) => {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error deleting entry:', error);
      setError(error.message);
    }
  };

  console.log('Dashboard: Rendering - authLoading:', authLoading, 'loading:', loading, 'user:', user?.email, 'entries:', entries.length, 'error:', error);

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show message if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h2>
          <p className="text-gray-600">Please sign in to access your dashboard.</p>
        </div>
      </div>
    );
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
                    <SearchBar value={searchTerm} onChange={setSearchTerm} />
                </div>
                <div className="w-full md:w-2/3">
                    <FilterTabs activeFilter={filter} onFilterChange={setFilter} entries={entries} />
                </div>
            </div>
        </div>

        {/* Entries Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="text-center text-gray-500">Loading entries...</div>
          ) : error ? (
            <div className="text-center text-red-500">Error: {error}</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-500">
              <p className="mb-4">No entries yet. Create your first entry above!</p>
            </div>
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
  );
} 