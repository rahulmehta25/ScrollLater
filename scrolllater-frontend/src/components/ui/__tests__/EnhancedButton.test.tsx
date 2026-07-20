import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Button } from '../Button'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    ))
  }
}))

describe('Enhanced Button Component', () => {
  const user = userEvent.setup()

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary-600')
    })

    it('handles click events', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('can be disabled', () => {
      const handleClick = jest.fn()
      render(<Button disabled onClick={handleClick}>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('opacity-50')
    })
  })

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-primary-600')
    })

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-secondary-100')
    })

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole('button')).toHaveClass('border-secondary-300')
    })

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole('button')).toHaveClass('text-secondary-700')
    })

    it('renders destructive variant correctly', () => {
      render(<Button variant="destructive">Delete</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-error-600')
    })

    it('renders success variant correctly', () => {
      render(<Button variant="success">Success</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-success-600')
    })

    it('renders warning variant correctly', () => {
      render(<Button variant="warning">Warning</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-warning-600')
    })
  })

  describe('Sizes', () => {
    it('renders xs size correctly', () => {
      render(<Button size="xs">Extra Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-7')
    })

    it('renders sm size correctly', () => {
      render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-8')
    })

    it('renders md size correctly', () => {
      render(<Button size="md">Medium</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-10')
    })

    it('renders lg size correctly', () => {
      render(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-12')
    })

    it('renders xl size correctly', () => {
      render(<Button size="xl">Extra Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-14')
    })

    it('renders icon size correctly', () => {
      render(<Button size="icon">Icon</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10')
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button.querySelector('svg')).toBeInTheDocument()
    })

    it('shows custom loading text', () => {
      render(<Button loading loadingText="Saving...">Save</Button>)
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('prevents clicks when loading', async () => {
      const handleClick = jest.fn()
      render(<Button loading onClick={handleClick}>Loading</Button>)
      
      await user.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Icons', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>

    it('renders left icon correctly', () => {
      render(<Button icon={<TestIcon />} iconPosition="left">With Icon</Button>)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('renders right icon correctly', () => {
      render(<Button icon={<TestIcon />} iconPosition="right">With Icon</Button>)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })
  })

  describe('Full Width', () => {
    it('renders full width correctly', () => {
      render(<Button fullWidth>Full Width</Button>)
      expect(screen.getByRole('button')).toHaveClass('w-full')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes when pressed', () => {
      render(<Button>Pressable</Button>)
      const button = screen.getByRole('button')
      
      fireEvent.mouseDown(button)
      expect(button).toHaveAttribute('aria-pressed')
    })

    it('has proper ARIA disabled state', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).toBeDisabled()
    })

    it('maintains focus ring classes', () => {
      render(<Button>Focusable</Button>)
      const button = screen.getByRole('button')
      
      expect(button).toHaveClass('focus:ring-2')
    })
  })

  describe('Ripple Effect', () => {
    it('creates ripple effect on click', async () => {
      render(<Button ripple>Ripple</Button>)
      const button = screen.getByRole('button')
      
      fireEvent.click(button, { clientX: 50, clientY: 50 })
      
      // Check if ripple element is created
      await waitFor(() => {
        expect(button.querySelector('.absolute.bg-white')).toBeInTheDocument()
      })
    })

    it('can disable ripple effect', () => {
      render(<Button ripple={false}>No Ripple</Button>)
      const button = screen.getByRole('button')
      
      fireEvent.click(button)
      expect(button.querySelector('.absolute.bg-white')).not.toBeInTheDocument()
    })
  })

  describe('Custom Class Names', () => {
    it('accepts custom className', () => {
      render(<Button className="custom-class">Custom</Button>)
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })

    it('merges custom className with default classes', () => {
      render(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole('button')
      
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveClass('inline-flex')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>With Ref</Button>)
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current?.textContent).toBe('With Ref')
    })
  })

  describe('AsChild Prop', () => {
    it('renders as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveClass('bg-primary-600') // Should inherit button styles
    })
  })

  describe('Keyboard Navigation', () => {
    it('responds to Enter key', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Keyboard</Button>)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('responds to Space key', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Keyboard</Button>)
      
      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: ' ' })
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Animation Props', () => {
    it('can disable animations', () => {
      render(<Button animate={false}>No Animation</Button>)
      // Since we mocked framer-motion, we can't test the actual animation
      // but we can ensure the prop is accepted without errors
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})