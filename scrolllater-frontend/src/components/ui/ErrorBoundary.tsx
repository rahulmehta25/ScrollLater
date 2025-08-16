'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from './Button'
import { Card, CardContent, CardHeader, CardTitle } from './Card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4 sm:p-8">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-error-100 dark:bg-error-900 rounded-full flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-error-600 dark:text-error-400" />
              </div>
              <CardTitle className="text-error-900 dark:text-error-100">
                Something went wrong
              </CardTitle>
            </CardHeader>
            
            <CardContent className="text-center space-y-4">
              <p className="text-secondary-600 dark:text-secondary-400">
                We've encountered an unexpected error. Please try again or refresh the page.
              </p>
              
              {(this.props.showDetails || process.env.NODE_ENV === 'development') && this.state.error && (
                <details className="text-left bg-secondary-50 dark:bg-secondary-800 p-3 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Error Details
                  </summary>
                  <pre className="text-xs text-error-600 dark:text-error-400 break-all whitespace-pre-wrap">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\nStack trace:\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  onClick={this.handleReset}
                  variant="primary"
                  className="flex-1"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="flex-1"
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)
  
  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])
  
  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])
  
  return captureError
}