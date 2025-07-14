'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

export function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const testConnection = async () => {
      try {
        const supabase = createSupabaseClient()
        
        // Test basic connection by getting auth session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setConnectionStatus('error')
          setErrorMessage(`Connection failed: ${error.message}`)
        } else {
          setConnectionStatus('connected')
        }
      } catch (error) {
        setConnectionStatus('error')
        setErrorMessage(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'testing' ? 'bg-yellow-400 animate-pulse' :
          connectionStatus === 'connected' ? 'bg-green-400' :
          'bg-red-400'
        }`}></div>
        <span className="text-sm font-medium">
          {connectionStatus === 'testing' && 'Testing Supabase...'}
          {connectionStatus === 'connected' && 'Supabase Connected ✅'}
          {connectionStatus === 'error' && 'Supabase Error ❌'}
        </span>
      </div>
      {connectionStatus === 'error' && (
        <p className="text-xs text-red-600 mt-1 max-w-xs">{errorMessage}</p>
      )}
    </div>
  )
} 