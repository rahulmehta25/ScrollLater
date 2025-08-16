'use client'

import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from './Button'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light', label: 'Light', icon: SunIcon },
    { value: 'dark', label: 'Dark', icon: MoonIcon },
    { value: 'system', label: 'System', icon: ComputerDesktopIcon },
  ] as const

  const currentTheme = themes.find(t => t.value === theme) || themes[2]
  const CurrentIcon = currentTheme.icon

  return (
    <Menu as="div" className="relative">
      <Menu.Button asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <CurrentIcon className="h-5 w-5" />
        </Button>
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
        <Menu.Items className="absolute right-0 mt-2 w-36 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-secondary-800 dark:ring-secondary-700">
          <div className="py-1">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon
              return (
                <Menu.Item key={themeOption.value}>
                  {({ active }) => (
                    <button
                      onClick={() => setTheme(themeOption.value)}
                      className={`${
                        active ? 'bg-secondary-100 dark:bg-secondary-700' : ''
                      } ${
                        theme === themeOption.value ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-900 dark:text-secondary-100'
                      } group flex w-full items-center px-3 py-2 text-sm transition-colors`}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {themeOption.label}
                    </button>
                  )}
                </Menu.Item>
              )
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}