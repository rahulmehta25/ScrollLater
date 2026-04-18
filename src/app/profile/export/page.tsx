'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { exportEntries, type ExportFormat } from '@/services/api'
import { ArrowLeft, Download, FileJson, FileText, Loader2, Check } from 'lucide-react'

export default function ExportPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [format, setFormat] = useState<ExportFormat>('json')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleExport = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setError(null)
    setExporting(true)

    const result = await exportEntries(user.id, format)
    setExporting(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    // Create and download file
    const blob = new Blob([result.data], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scrolllater-export-${new Date().toISOString().split('T')[0]}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to profile
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Export Your Data</h1>
            <p className="text-gray-600 mt-1">
              Download all your saved content and entries
            </p>
          </div>

          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-sm text-green-600">Export downloaded successfully!</p>
            </div>
          )}

          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Format</h2>

              <div className="space-y-3">
                <label
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    format === 'json'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={format === 'json'}
                    onChange={() => setFormat('json')}
                    className="sr-only"
                  />
                  <div className="flex items-center flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      format === 'json' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FileJson className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900">JSON</h3>
                      <p className="text-sm text-gray-500">
                        Machine-readable format, great for backups and importing
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    format === 'json' ? 'border-orange-500' : 'border-gray-300'
                  }`}>
                    {format === 'json' && (
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                    )}
                  </div>
                </label>

                <label
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    format === 'csv'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={() => setFormat('csv')}
                    className="sr-only"
                  />
                  <div className="flex items-center flex-1">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      format === 'csv' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900">CSV</h3>
                      <p className="text-sm text-gray-500">
                        Spreadsheet format, opens in Excel, Google Sheets
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    format === 'csv' ? 'border-orange-500' : 'border-gray-300'
                  }`}>
                    {format === 'csv' && (
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-2">What&apos;s included:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All your saved entries with titles and URLs</li>
                <li>• Content and notes</li>
                <li>• Categories and tags</li>
                <li>• AI summaries and suggestions</li>
                <li>• Scheduled dates and status</li>
                <li>• Metadata and timestamps</li>
              </ul>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
