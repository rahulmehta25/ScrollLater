import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '../EmptyState'
import { InboxIcon } from '@heroicons/react/24/outline'

describe('EmptyState', () => {
  it('renders with required props', () => {
    render(
      <EmptyState
        icon={InboxIcon}
        title="No items"
        description="Start by adding some items"
      />
    )
    
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Start by adding some items')).toBeInTheDocument()
    
    // Check for icon
    const icon = document.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const onAction = jest.fn()
    
    render(
      <EmptyState
        icon={InboxIcon}
        title="No items"
        description="Start by adding some items"
        actionLabel="Add Item"
        onAction={onAction}
      />
    )
    
    const button = screen.getByText('Add Item')
    expect(button).toBeInTheDocument()
    
    fireEvent.click(button)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('does not render action button without onAction', () => {
    render(
      <EmptyState
        icon={InboxIcon}
        title="No items"
        description="Start by adding some items"
        actionLabel="Add Item"
      />
    )
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('applies correct styling to elements', () => {
    render(
      <EmptyState
        icon={InboxIcon}
        title="No items"
        description="Start by adding some items"
      />
    )
    
    const container = screen.getByText('No items').closest('.text-center')
    expect(container).toHaveClass('py-12')
    
    const title = screen.getByText('No items')
    expect(title).toHaveClass('text-lg', 'font-medium', 'text-gray-900')
    
    const description = screen.getByText('Start by adding some items')
    expect(description).toHaveClass('text-gray-500')
  })

  it('renders different icons correctly', () => {
    const CustomIcon = () => <svg data-testid="custom-icon" />
    
    const { rerender } = render(
      <EmptyState
        icon={InboxIcon}
        title="Title"
        description="Description"
      />
    )
    
    // Initial icon
    expect(document.querySelector('svg')).toBeInTheDocument()
    
    // Change icon
    rerender(
      <EmptyState
        icon={CustomIcon}
        title="Title"
        description="Description"
      />
    )
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})