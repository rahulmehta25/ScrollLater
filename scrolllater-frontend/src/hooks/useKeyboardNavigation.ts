'use client'

import { useEffect, useCallback, useRef, useState } from 'react'

export interface KeyboardNavigationOptions {
  // Navigation options
  gridNavigation?: boolean
  virtualNavigation?: boolean
  wrapAround?: boolean
  initialIndex?: number
  
  // Event handlers
  onSelect?: (index: number, element: HTMLElement) => void
  onEscape?: () => void
  onEnter?: (index: number, element: HTMLElement) => void
  onSpace?: (index: number, element: HTMLElement) => void
  
  // Custom key handlers
  customKeys?: {
    [key: string]: (index: number, element: HTMLElement) => void | boolean
  }
  
  // Filtering
  selector?: string
  excludeSelector?: string
  
  // Accessibility
  announceChanges?: boolean
  ariaLabel?: string
}

export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
) {
  const {
    gridNavigation = false,
    virtualNavigation = false,
    wrapAround = true,
    initialIndex = 0,
    onSelect,
    onEscape,
    onEnter,
    onSpace,
    customKeys = {},
    selector = '[tabindex="0"], button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="option"]',
    excludeSelector = '[disabled], [aria-disabled="true"], [tabindex="-1"]',
    announceChanges = true,
    ariaLabel = 'Navigate with arrow keys'
  } = options

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isActive, setIsActive] = useState(false)
  const gridSizeRef = useRef({ rows: 0, cols: 0 })
  const announcementRef = useRef<HTMLDivElement | null>(null)

  // Get navigable elements
  const getNavigableElements = useCallback(() => {
    if (!containerRef.current) return []
    
    const elements = Array.from(
      containerRef.current.querySelectorAll(selector)
    ) as HTMLElement[]
    
    return elements.filter(element => {
      // Check if element is visible and not excluded
      const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0
      const isExcluded = excludeSelector ? element.matches(excludeSelector) : false
      return isVisible && !isExcluded
    })
  }, [containerRef, selector, excludeSelector])

  // Calculate grid dimensions for grid navigation
  const calculateGridSize = useCallback(() => {
    const elements = getNavigableElements()
    if (!elements.length || !gridNavigation) return { rows: 0, cols: 0 }

    // Calculate based on element positions
    const positions = elements.map(el => {
      const rect = el.getBoundingClientRect()
      return { x: rect.left, y: rect.top, element: el }
    })

    // Group by Y position to find rows
    const yPositions = [...new Set(positions.map(p => Math.round(p.y)))].sort((a, b) => a - b)
    const rows = yPositions.length

    // Find the most common row length
    const rowLengths = yPositions.map(y => 
      positions.filter(p => Math.abs(p.y - y) < 5).length
    )
    const cols = Math.max(...rowLengths)

    return { rows, cols }
  }, [getNavigableElements, gridNavigation])

  // Update current element focus and styling
  const updateFocus = useCallback((index: number, announce = true) => {
    const elements = getNavigableElements()
    if (!elements.length) return

    // Remove previous focus styling
    elements.forEach(el => {
      el.classList.remove('keyboard-focused')
      if (el.hasAttribute('data-keyboard-focused')) {
        el.removeAttribute('data-keyboard-focused')
      }
    })

    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(index, elements.length - 1))
    const currentElement = elements[clampedIndex]

    if (currentElement) {
      // Add focus styling
      currentElement.classList.add('keyboard-focused')
      currentElement.setAttribute('data-keyboard-focused', 'true')
      
      // Scroll into view if needed
      currentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })

      // Announce change to screen readers
      if (announce && announceChanges && announcementRef.current) {
        const label = currentElement.getAttribute('aria-label') || 
                     currentElement.textContent?.trim() || 
                     'Item'
        announcementRef.current.textContent = `${label}, ${clampedIndex + 1} of ${elements.length}`
      }

      setCurrentIndex(clampedIndex)
      onSelect?.(clampedIndex, currentElement)
    }
  }, [getNavigableElements, onSelect, announceChanges])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive) return

    const elements = getNavigableElements()
    if (!elements.length) return

    const { rows, cols } = gridSizeRef.current
    let newIndex = currentIndex
    let handled = false

    switch (event.key) {
      case 'ArrowDown':
        if (gridNavigation && rows > 1) {
          newIndex = currentIndex + cols
          if (newIndex >= elements.length) {
            newIndex = wrapAround ? currentIndex % cols : currentIndex
          }
        } else {
          newIndex = currentIndex + 1
          if (newIndex >= elements.length) {
            newIndex = wrapAround ? 0 : elements.length - 1
          }
        }
        handled = true
        break

      case 'ArrowUp':
        if (gridNavigation && rows > 1) {
          newIndex = currentIndex - cols
          if (newIndex < 0) {
            newIndex = wrapAround 
              ? elements.length - cols + (currentIndex % cols)
              : currentIndex
          }
        } else {
          newIndex = currentIndex - 1
          if (newIndex < 0) {
            newIndex = wrapAround ? elements.length - 1 : 0
          }
        }
        handled = true
        break

      case 'ArrowRight':
        if (gridNavigation) {
          newIndex = currentIndex + 1
          if (Math.floor(newIndex / cols) !== Math.floor(currentIndex / cols)) {
            newIndex = wrapAround ? Math.floor(currentIndex / cols) * cols : currentIndex
          }
        } else {
          newIndex = currentIndex + 1
          if (newIndex >= elements.length) {
            newIndex = wrapAround ? 0 : elements.length - 1
          }
        }
        handled = true
        break

      case 'ArrowLeft':
        if (gridNavigation) {
          newIndex = currentIndex - 1
          if (Math.floor(newIndex / cols) !== Math.floor(currentIndex / cols)) {
            newIndex = wrapAround 
              ? Math.floor(currentIndex / cols) * cols + (cols - 1)
              : currentIndex
          }
        } else {
          newIndex = currentIndex - 1
          if (newIndex < 0) {
            newIndex = wrapAround ? elements.length - 1 : 0
          }
        }
        handled = true
        break

      case 'Home':
        newIndex = 0
        handled = true
        break

      case 'End':
        newIndex = elements.length - 1
        handled = true
        break

      case 'PageDown':
        newIndex = Math.min(currentIndex + 10, elements.length - 1)
        handled = true
        break

      case 'PageUp':
        newIndex = Math.max(currentIndex - 10, 0)
        handled = true
        break

      case 'Enter':
        onEnter?.(currentIndex, elements[currentIndex])
        handled = true
        break

      case ' ':
        onSpace?.(currentIndex, elements[currentIndex])
        handled = true
        break

      case 'Escape':
        onEscape?.()
        setIsActive(false)
        handled = true
        break

      default:
        // Check custom key handlers
        const customHandler = customKeys[event.key]
        if (customHandler) {
          const result = customHandler(currentIndex, elements[currentIndex])
          handled = result !== false
        }
        break
    }

    if (handled) {
      event.preventDefault()
      event.stopPropagation()
      updateFocus(newIndex)
    }
  }, [
    isActive,
    currentIndex,
    gridNavigation,
    wrapAround,
    getNavigableElements,
    onEnter,
    onSpace,
    onEscape,
    customKeys,
    updateFocus
  ])

  // Activate keyboard navigation
  const activate = useCallback((startIndex = initialIndex) => {
    setIsActive(true)
    gridSizeRef.current = calculateGridSize()
    updateFocus(startIndex, false)
  }, [initialIndex, calculateGridSize, updateFocus])

  // Deactivate keyboard navigation
  const deactivate = useCallback(() => {
    setIsActive(false)
    
    // Remove focus styling from all elements
    const elements = getNavigableElements()
    elements.forEach(el => {
      el.classList.remove('keyboard-focused')
      if (el.hasAttribute('data-keyboard-focused')) {
        el.removeAttribute('data-keyboard-focused')
      }
    })
  }, [getNavigableElements])

  // Navigate to specific index
  const navigateTo = useCallback((index: number) => {
    updateFocus(index)
  }, [updateFocus])

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Create announcement element for screen readers
  useEffect(() => {
    if (announceChanges && !announcementRef.current) {
      const announcement = document.createElement('div')
      announcement.setAttribute('aria-live', 'polite')
      announcement.setAttribute('aria-atomic', 'true')
      announcement.className = 'sr-only'
      announcement.style.position = 'absolute'
      announcement.style.left = '-10000px'
      announcement.style.width = '1px'
      announcement.style.height = '1px'
      announcement.style.overflow = 'hidden'
      document.body.appendChild(announcement)
      announcementRef.current = announcement
    }

    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current)
        announcementRef.current = null
      }
    }
  }, [announceChanges])

  // Update grid size when elements change
  useEffect(() => {
    if (isActive) {
      gridSizeRef.current = calculateGridSize()
    }
  }, [isActive, calculateGridSize])

  return {
    isActive,
    currentIndex,
    activate,
    deactivate,
    navigateTo,
    getNavigableElements
  }
}

// Hook for keyboard shortcuts
export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  handler: (event: KeyboardEvent) => void
  description?: string
  preventDefault?: boolean
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatches = !!shortcut.ctrl === event.ctrlKey
      const shiftMatches = !!shortcut.shift === event.shiftKey
      const altMatches = !!shortcut.alt === event.altKey
      const metaMatches = !!shortcut.meta === event.metaKey

      if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
          event.stopPropagation()
        }
        shortcut.handler(event)
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Hook for focus trap
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    
    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'summary'
    ].join(', ')

    return Array.from(
      containerRef.current.querySelectorAll(focusableSelector)
    ) as HTMLElement[]
  }, [containerRef])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || event.key !== 'Tab') return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }, [isActive, getFocusableElements])

  useEffect(() => {
    if (isActive) {
      previousActiveElement.current = document.activeElement as HTMLElement
      const focusableElements = getFocusableElements()
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    } else {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
        previousActiveElement.current = null
      }
    }
  }, [isActive, getFocusableElements])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}