'use client'

import { useState, ReactNode } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

interface TooltipProps {
  content: string
  children?: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  showIcon?: boolean
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top',
  showIcon = false 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900',
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {showIcon && !children ? (
          <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400" />
        ) : (
          children
        )}
      </div>
      
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 max-w-xs whitespace-normal">
            {content}
            <div
              className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
              style={{
                borderTopWidth: position === 'bottom' ? 0 : 4,
                borderBottomWidth: position === 'top' ? 0 : 4,
                borderLeftWidth: position === 'right' ? 0 : 4,
                borderRightWidth: position === 'left' ? 0 : 4,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface HelpTextProps {
  text: string
  className?: string
}

export function HelpText({ text, className = '' }: HelpTextProps) {
  return (
    <p className={`text-sm text-gray-500 mt-1 ${className}`}>
      {text}
    </p>
  )
}