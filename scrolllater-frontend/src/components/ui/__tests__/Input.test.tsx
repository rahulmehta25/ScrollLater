import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Input, Textarea } from '../Input'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    input: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <input ref={ref} {...props} />
    )),
    textarea: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <textarea ref={ref} {...props} />
    )),
    label: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <label ref={ref} {...props}>{children}</label>
    )),
    p: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <p ref={ref} {...props}>{children}</p>
    )),
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    ))
  },
  AnimatePresence: ({ children }: any) => children
}))

describe('Enhanced Input Component', () => {
  const user = userEvent.setup()

  describe('Basic Functionality', () => {
    it('renders input with default props', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('rounded-lg')
    })

    it('renders with label', () => {
      render(<Input label="Test Label" />)
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument()
    })

    it('handles value changes', async () => {
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'test value')
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('can be disabled', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      
      expect(input).toBeDisabled()
      expect(input).toHaveClass('cursor-not-allowed')
    })
  })

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Input variant="default" />)
      expect(screen.getByRole('textbox')).toHaveClass('border')
    })

    it('renders filled variant', () => {
      render(<Input variant="filled" />)
      expect(screen.getByRole('textbox')).toHaveClass('bg-secondary-100')
    })

    it('renders borderless variant', () => {
      render(<Input variant="borderless" />)
      expect(screen.getByRole('textbox')).toHaveClass('border-0')
    })
  })

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Input inputSize="sm" />)
      expect(screen.getByRole('textbox')).toHaveClass('px-3', 'py-2')
    })

    it('renders medium size', () => {
      render(<Input inputSize="md" />)
      expect(screen.getByRole('textbox')).toHaveClass('px-4', 'py-3')
    })

    it('renders large size', () => {
      render(<Input inputSize="lg" />)
      expect(screen.getByRole('textbox')).toHaveClass('px-4', 'py-4')
    })
  })

  describe('Error State', () => {
    it('shows error styling with boolean error', () => {
      render(<Input error />)
      const input = screen.getByRole('textbox')
      
      expect(input).toHaveClass('border-error-300')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('shows error message with string error', () => {
      render(<Input error="This field is required" />)
      
      expect(screen.getByText('This field is required')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('shows error icon', () => {
      render(<Input error />)
      const container = screen.getByRole('textbox').parentElement
      expect(container?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Success State', () => {
    it('shows success styling', () => {
      render(<Input success />)
      const input = screen.getByRole('textbox')
      
      expect(input).toHaveClass('border-success-300')
    })

    it('shows success icon', () => {
      render(<Input success />)
      const container = screen.getByRole('textbox').parentElement
      expect(container?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Helper Text', () => {
    it('shows helper text', () => {
      render(<Input helperText="This is helpful information" />)
      expect(screen.getByText('This is helpful information')).toBeInTheDocument()
    })

    it('associates helper text with input using aria-describedby', () => {
      render(<Input helperText="Helper text" id="test-input" />)
      const input = screen.getByRole('textbox')
      const helperText = screen.getByText('Helper text')
      
      expect(input).toHaveAttribute('aria-describedby', helperText.id)
    })
  })

  describe('Icons', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>

    it('renders left icon', () => {
      render(<Input icon={<TestIcon />} iconPosition="left" />)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('renders right icon', () => {
      render(<Input icon={<TestIcon />} iconPosition="right" />)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('adjusts padding for left icon', () => {
      render(<Input icon={<TestIcon />} iconPosition="left" />)
      expect(screen.getByRole('textbox')).toHaveClass('pl-10')
    })

    it('adjusts padding for right icon', () => {
      render(<Input icon={<TestIcon />} iconPosition="right" />)
      expect(screen.getByRole('textbox')).toHaveClass('pr-10')
    })
  })

  describe('Password Toggle', () => {
    it('renders password toggle for password input', () => {
      render(<Input type="password" showPasswordToggle />)
      
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      expect(toggleButton).toBeInTheDocument()
    })

    it('toggles password visibility', async () => {
      render(<Input type="password" showPasswordToggle />)
      
      const input = screen.getByLabelText(/password/i) || screen.getByDisplayValue('')
      const toggleButton = screen.getByRole('button', { name: /show password/i })
      
      expect(input).toHaveAttribute('type', 'password')
      
      await user.click(toggleButton)
      expect(input).toHaveAttribute('type', 'text')
      
      await user.click(toggleButton)
      expect(input).toHaveAttribute('type', 'password')
    })

    it('updates toggle button label', async () => {
      render(<Input type="password" showPasswordToggle />)
      
      const showButton = screen.getByRole('button', { name: /show password/i })
      await user.click(showButton)
      
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner', () => {
      render(<Input loading />)
      const input = screen.getByRole('textbox')
      
      expect(input).toBeDisabled()
      // Loading spinner should be in the container
      expect(input.parentElement?.querySelector('[style*="border-t-primary"]')).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('shows focus ring on focus', async () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      
      await user.click(input)
      // The focus ring is added via motion.div, but since we mocked it,
      // we can't test the actual animation. We can ensure focus works.
      expect(input).toHaveFocus()
    })
  })

  describe('Accessibility', () => {
    it('generates unique id when not provided', () => {
      render(<Input label="Test" />)
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Test')
      
      expect(input).toHaveAttribute('id')
      expect(label).toHaveAttribute('for', input.getAttribute('id'))
    })

    it('uses provided id', () => {
      render(<Input id="custom-id" label="Test" />)
      const input = screen.getByRole('textbox')
      const label = screen.getByText('Test')
      
      expect(input).toHaveAttribute('id', 'custom-id')
      expect(label).toHaveAttribute('for', 'custom-id')
    })

    it('sets aria-invalid for errors', () => {
      render(<Input error />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })
  })
})

describe('Enhanced Textarea Component', () => {
  const user = userEvent.setup()

  describe('Basic Functionality', () => {
    it('renders textarea with default props', () => {
      render(<Textarea />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('renders with label', () => {
      render(<Textarea label="Description" />)
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })

    it('handles value changes', async () => {
      const handleChange = jest.fn()
      render(<Textarea onChange={handleChange} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'test content')
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('sets rows attribute', () => {
      render(<Textarea rows={6} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6')
    })
  })

  describe('Resize Options', () => {
    it('renders with no resize', () => {
      render(<Textarea resize="none" />)
      expect(screen.getByRole('textbox')).toHaveClass('resize-none')
    })

    it('renders with vertical resize', () => {
      render(<Textarea resize="vertical" />)
      expect(screen.getByRole('textbox')).toHaveClass('resize-y')
    })

    it('renders with horizontal resize', () => {
      render(<Textarea resize="horizontal" />)
      expect(screen.getByRole('textbox')).toHaveClass('resize-x')
    })

    it('renders with both resize', () => {
      render(<Textarea resize="both" />)
      expect(screen.getByRole('textbox')).toHaveClass('resize')
    })
  })

  describe('Error State', () => {
    it('shows error styling', () => {
      render(<Textarea error />)
      const textarea = screen.getByRole('textbox')
      
      expect(textarea).toHaveClass('border-error-300')
      expect(textarea).toHaveAttribute('aria-invalid', 'true')
    })

    it('shows error message', () => {
      render(<Textarea error="Content is required" />)
      expect(screen.getByText('Content is required')).toBeInTheDocument()
    })

    it('shows error icon', () => {
      render(<Textarea error />)
      const container = screen.getByRole('textbox').parentElement
      expect(container?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Success State', () => {
    it('shows success styling', () => {
      render(<Textarea success />)
      expect(screen.getByRole('textbox')).toHaveClass('border-success-300')
    })

    it('shows success icon', () => {
      render(<Textarea success />)
      const container = screen.getByRole('textbox').parentElement
      expect(container?.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('generates unique id when not provided', () => {
      render(<Textarea label="Description" />)
      const textarea = screen.getByRole('textbox')
      const label = screen.getByText('Description')
      
      expect(textarea).toHaveAttribute('id')
      expect(label).toHaveAttribute('for', textarea.getAttribute('id'))
    })

    it('sets aria-invalid for errors', () => {
      render(<Textarea error />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTextAreaElement>()
      render(<Textarea ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
    })
  })
})