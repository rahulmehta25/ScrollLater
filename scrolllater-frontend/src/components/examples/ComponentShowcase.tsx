'use client'

import React, { useState } from 'react'
import { 
  HeartIcon, 
  PlusIcon, 
  TrashIcon, 
  UserIcon,
  EnvelopeIcon,
  EyeIcon,
  CalendarIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal, ConfirmDialog, useConfirmDialog } from '@/components/ui/Modal'
import { ToastProvider, useToastHelpers } from '@/components/ui/Toast'
import { LoadingSkeleton, EntryCardSkeleton, StatsCardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

/**
 * Component Showcase - Demonstrates all enhanced UI components
 * This file serves as both documentation and testing ground for components
 */

export function ComponentShowcase() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="text-center">
            <h1 className="text-4xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">
              ScrollLater Component Library
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-400">
              A comprehensive collection of accessible, performant, and beautiful UI components
            </p>
          </header>

          <ButtonShowcase />
          <InputShowcase />
          <ModalShowcase />
          <ToastShowcase />
          <LoadingShowcase />
          <CardShowcase />
          <BadgeShowcase />
        </div>
      </div>
    </ToastProvider>
  )
}

function ShowcaseSection({ title, description, children }: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-8">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <p className="text-secondary-600 dark:text-secondary-400">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ButtonShowcase() {
  const [loading, setLoading] = useState(false)

  const handleLoadingDemo = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <ShowcaseSection
      title="Button Components"
      description="Enhanced buttons with micro-interactions, accessibility features, and multiple variants"
    >
      <div className="space-y-8">
        {/* Variants */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Variants</h3>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
          </div>
        </div>

        {/* Sizes */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Sizes</h3>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
            <Button size="icon">
              <PlusIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* States */}
        <div>
          <h3 className="text-lg font-semibold mb-4">States</h3>
          <div className="flex flex-wrap gap-4">
            <Button loading={loading} onClick={handleLoadingDemo}>
              {loading ? 'Loading...' : 'Click to Load'}
            </Button>
            <Button disabled>Disabled</Button>
            <Button loading loadingText="Saving...">Save</Button>
          </div>
        </div>

        {/* With Icons */}
        <div>
          <h3 className="text-lg font-semibold mb-4">With Icons</h3>
          <div className="flex flex-wrap gap-4">
            <Button icon={<HeartIcon />} iconPosition="left">
              Like
            </Button>
            <Button icon={<TrashIcon />} iconPosition="right" variant="destructive">
              Delete
            </Button>
            <Button icon={<PlusIcon />} size="sm">
              Add Item
            </Button>
          </div>
        </div>

        {/* Interactive Features */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Interactive Features</h3>
          <div className="flex flex-wrap gap-4">
            <Button ripple>Ripple Effect</Button>
            <Button animate={false}>No Animation</Button>
            <Button fullWidth>Full Width Button</Button>
          </div>
        </div>
      </div>
    </ShowcaseSection>
  )
}

function InputShowcase() {
  const [values, setValues] = useState({
    basic: '',
    email: '',
    password: '',
    error: '',
    success: 'Valid input',
    textarea: ''
  })

  return (
    <ShowcaseSection
      title="Input Components"
      description="Enhanced form inputs with validation states, icons, and improved UX"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Inputs */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Basic Inputs</h3>
          
          <Input
            label="Basic Input"
            placeholder="Enter text here"
            value={values.basic}
            onChange={(e) => setValues(prev => ({ ...prev, basic: e.target.value }))}
          />

          <Input
            label="Email"
            type="email"
            placeholder="user@example.com"
            icon={<EnvelopeIcon />}
            value={values.email}
            onChange={(e) => setValues(prev => ({ ...prev, email: e.target.value }))}
            helperText="We'll never share your email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter password"
            showPasswordToggle
            value={values.password}
            onChange={(e) => setValues(prev => ({ ...prev, password: e.target.value }))}
          />
        </div>

        {/* States and Variants */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">States & Variants</h3>
          
          <Input
            label="Error State"
            error="This field is required"
            value={values.error}
            onChange={(e) => setValues(prev => ({ ...prev, error: e.target.value }))}
          />

          <Input
            label="Success State"
            success
            value={values.success}
            onChange={(e) => setValues(prev => ({ ...prev, success: e.target.value }))}
          />

          <Input
            label="Loading State"
            loading
            placeholder="Processing..."
          />

          <Input
            label="Disabled State"
            disabled
            placeholder="Cannot edit"
          />
        </div>

        {/* Variants */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Variants</h3>
          
          <Input
            label="Default Variant"
            variant="default"
            placeholder="Default styling"
          />

          <Input
            label="Filled Variant"
            variant="filled"
            placeholder="Filled background"
          />

          <Input
            label="Borderless Variant"
            variant="borderless"
            placeholder="No border"
          />
        </div>

        {/* Textarea */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Textarea</h3>
          
          <Textarea
            label="Description"
            placeholder="Enter a detailed description..."
            rows={4}
            value={values.textarea}
            onChange={(e) => setValues(prev => ({ ...prev, textarea: e.target.value }))}
            helperText="Maximum 500 characters"
          />

          <Textarea
            label="Error Example"
            error="Description is too short"
            placeholder="Enter more details..."
            rows={3}
          />
        </div>
      </div>
    </ShowcaseSection>
  )
}

function ModalShowcase() {
  const [basicModal, setBasicModal] = useState(false)
  const [largeModal, setLargeModal] = useState(false)
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleConfirmDemo = async () => {
    const result = await confirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: () => {}
    })
    
    if (result) {
      alert('Item deleted!')
    }
  }

  return (
    <ShowcaseSection
      title="Modal Components"
      description="Accessible modals with focus management, keyboard navigation, and smooth animations"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => setBasicModal(true)}>
            Basic Modal
          </Button>
          <Button onClick={() => setLargeModal(true)} variant="outline">
            Large Modal
          </Button>
          <Button onClick={handleConfirmDemo} variant="destructive">
            Confirm Dialog
          </Button>
        </div>

        {/* Basic Modal */}
        <Modal
          isOpen={basicModal}
          onClose={() => setBasicModal(false)}
          title="Basic Modal"
          description="This is a simple modal example with proper focus management."
        >
          <div className="space-y-4">
            <p className="text-secondary-600 dark:text-secondary-400">
              This modal demonstrates the basic functionality including focus trapping,
              keyboard navigation, and smooth animations.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBasicModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setBasicModal(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>

        {/* Large Modal */}
        <Modal
          isOpen={largeModal}
          onClose={() => setLargeModal(false)}
          title="Large Modal Example"
          size="lg"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Modal Features</h3>
              <ul className="space-y-2 text-sm text-secondary-600 dark:text-secondary-400">
                <li>• Automatic focus management</li>
                <li>• Keyboard navigation (Tab, Escape)</li>
                <li>• Click outside to close</li>
                <li>• Smooth animations</li>
                <li>• Portal rendering</li>
                <li>• Screen reader support</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <Input label="Name" placeholder="Enter your name" />
              <Textarea label="Message" placeholder="Enter your message" rows={4} />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setLargeModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setLargeModal(false)}>
                Save
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog />
      </div>
    </ShowcaseSection>
  )
}

function ToastShowcase() {
  const { success, error, warning, info } = useToastHelpers()

  return (
    <ShowcaseSection
      title="Toast Notifications"
      description="Accessible toast notifications with ARIA announcements and smooth animations"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => success('Operation completed successfully!')}>
            Success Toast
          </Button>
          <Button 
            onClick={() => error('Something went wrong. Please try again.')}
            variant="destructive"
          >
            Error Toast
          </Button>
          <Button 
            onClick={() => warning('This action requires confirmation.')}
            variant="warning"
          >
            Warning Toast
          </Button>
          <Button 
            onClick={() => info('Here\'s some helpful information.')}
            variant="outline"
          >
            Info Toast
          </Button>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Toast Features</h4>
          <ul className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
            <li>• Auto-dismiss with customizable duration</li>
            <li>• Progress bar for timed toasts</li>
            <li>• ARIA live regions for screen readers</li>
            <li>• Action buttons support</li>
            <li>• Multiple positioning options</li>
            <li>• Stack management with max limits</li>
          </ul>
        </div>
      </div>
    </ShowcaseSection>
  )
}

function LoadingShowcase() {
  const [showSkeletons, setShowSkeletons] = useState(true)

  return (
    <ShowcaseSection
      title="Loading Components"
      description="Advanced loading skeletons with staggered animations and realistic layouts"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={() => setShowSkeletons(!showSkeletons)}>
            {showSkeletons ? 'Hide' : 'Show'} Skeletons
          </Button>
        </div>

        {showSkeletons && (
          <div className="space-y-8">
            {/* Basic Skeletons */}
            <div>
              <h4 className="font-semibold mb-4">Basic Skeletons</h4>
              <div className="space-y-3">
                <LoadingSkeleton height="h-4" width="w-3/4" />
                <LoadingSkeleton height="h-4" width="w-1/2" />
                <LoadingSkeleton height="h-8" width="w-32" variant="rounded" />
                <LoadingSkeleton height="h-12" width="w-12" variant="circle" />
              </div>
            </div>

            {/* Text Skeletons */}
            <div>
              <h4 className="font-semibold mb-4">Text Skeletons</h4>
              <LoadingSkeleton variant="text" lines={3} />
            </div>

            {/* Complex Layouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EntryCardSkeleton />
              <StatsCardSkeleton />
            </div>
          </div>
        )}
      </div>
    </ShowcaseSection>
  )
}

function CardShowcase() {
  return (
    <ShowcaseSection
      title="Card Components"
      description="Flexible card layouts with consistent styling and accessibility"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Card */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary-600 dark:text-secondary-400">
              This is a basic card with header and content sections.
            </p>
          </CardContent>
        </Card>

        {/* Card with Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Card with Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary-600 dark:text-secondary-400 mb-4">
              Cards can include interactive elements and actions.
            </p>
            <div className="flex gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="outline">Secondary</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StarIcon className="h-5 w-5 text-warning-500" />
              Stats Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
              1,234
            </div>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              Total entries saved
            </p>
          </CardContent>
        </Card>
      </div>
    </ShowcaseSection>
  )
}

function BadgeShowcase() {
  return (
    <ShowcaseSection
      title="Badge Components"
      description="Small status indicators and labels with multiple variants"
    >
      <div className="space-y-6">
        {/* Variants */}
        <div>
          <h4 className="font-semibold mb-4">Variants</h4>
          <div className="flex flex-wrap gap-3">
            <Badge variant="primary">Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>

        {/* With Icons */}
        <div>
          <h4 className="font-semibold mb-4">With Icons</h4>
          <div className="flex flex-wrap gap-3">
            <Badge variant="success" icon={<StarIcon className="h-3 w-3" />}>
              Favorite
            </Badge>
            <Badge variant="primary" icon={<UserIcon className="h-3 w-3" />}>
              Admin
            </Badge>
            <Badge variant="warning" icon={<CalendarIcon className="h-3 w-3" />}>
              Scheduled
            </Badge>
          </div>
        </div>

        {/* Sizes */}
        <div>
          <h4 className="font-semibold mb-4">Usage Examples</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Status:</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Priority:</span>
              <Badge variant="error">High</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Category:</span>
              <Badge variant="outline">Development</Badge>
            </div>
          </div>
        </div>
      </div>
    </ShowcaseSection>
  )
}