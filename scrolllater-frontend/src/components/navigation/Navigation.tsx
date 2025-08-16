'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  Cog6ToothIcon, 
  Bars3Icon, 
  XMarkIcon,
  UserCircleIcon,
  PlusIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeIconSolid, 
  Cog6ToothIcon as Cog6ToothIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  BookmarkIcon as BookmarkIconSolid
} from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { clsx } from 'clsx'

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: HomeIcon, 
    iconSolid: HomeIconSolid,
    description: 'View your saved entries'
  },
  { 
    name: 'Entries', 
    href: '/entries', 
    icon: BookmarkIcon, 
    iconSolid: BookmarkIconSolid,
    description: 'Browse all entries'
  },
  { 
    name: 'Profile', 
    href: '/profile', 
    icon: UserCircleIcon, 
    iconSolid: UserCircleIconSolid,
    description: 'Manage your profile'
  },
  { 
    name: 'Settings', 
    href: '/dashboard/settings', 
    icon: Cog6ToothIcon, 
    iconSolid: Cog6ToothIconSolid,
    description: 'Configure your preferences'
  },
]

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  if (!user) return null

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={clsx('hidden lg:block', className)} aria-label="Main navigation">
        <div className="flex flex-col space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = isActive ? item.iconSolid : item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  isActive
                    ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                    : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800'
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.description}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}
          
          <div className="pt-4 mt-4 border-t border-secondary-200 dark:border-secondary-700">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </Button>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
          >
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            
            {/* Menu panel */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-secondary-900 shadow-xl">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
                  <h2 id="mobile-menu-title" className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                    Menu
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </Button>
                </div>
                
                {/* Navigation */}
                <nav className="flex-1 p-4" aria-label="Mobile navigation">
                  <div className="space-y-2">
                    {navigation.map((item) => {
                      const isActive = pathname === item.href
                      const Icon = isActive ? item.iconSolid : item.icon
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={clsx(
                            'flex items-center px-3 py-3 rounded-lg text-base font-medium transition-colors',
                            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                            isActive
                              ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                              : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800'
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className="mr-4 h-6 w-6 flex-shrink-0" aria-hidden="true" />
                          <div>
                            <div>{item.name}</div>
                            <div className="text-xs text-secondary-500 dark:text-secondary-400">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </nav>
                
                {/* Footer */}
                <div className="p-4 border-t border-secondary-200 dark:border-secondary-700">
                  <div className="flex items-center justify-between">
                    <ThemeToggle />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        // Focus on the content input
                        setTimeout(() => {
                          document.getElementById('content')?.focus()
                        }, 100)
                      }}
                      className="ml-4"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Quick Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Skip navigation link for accessibility
export function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-lg z-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  )
}