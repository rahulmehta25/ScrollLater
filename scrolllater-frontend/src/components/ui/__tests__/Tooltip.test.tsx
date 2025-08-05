import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Tooltip, HelpText } from '../Tooltip'

describe('Tooltip', () => {
  it('renders children correctly', () => {
    render(
      <Tooltip content="Test tooltip">
        <button>Hover me</button>
      </Tooltip>
    )
    
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('shows tooltip on hover', async () => {
    render(
      <Tooltip content="Test tooltip content">
        <button>Hover me</button>
      </Tooltip>
    )
    
    const button = screen.getByText('Hover me')
    
    // Tooltip should not be visible initially
    expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument()
    
    // Hover over the button
    fireEvent.mouseEnter(button)
    
    // Tooltip should now be visible
    await waitFor(() => {
      expect(screen.getByText('Test tooltip content')).toBeInTheDocument()
    })
  })

  it('hides tooltip on mouse leave', async () => {
    render(
      <Tooltip content="Test tooltip content">
        <button>Hover me</button>
      </Tooltip>
    )
    
    const button = screen.getByText('Hover me')
    
    // Show tooltip
    fireEvent.mouseEnter(button)
    await waitFor(() => {
      expect(screen.getByText('Test tooltip content')).toBeInTheDocument()
    })
    
    // Hide tooltip
    fireEvent.mouseLeave(button)
    await waitFor(() => {
      expect(screen.queryByText('Test tooltip content')).not.toBeInTheDocument()
    })
  })

  it('renders with custom position', () => {
    render(
      <Tooltip content="Test tooltip" position="bottom">
        <button>Hover me</button>
      </Tooltip>
    )
    
    const button = screen.getByText('Hover me')
    fireEvent.mouseEnter(button)
    
    // The tooltip should exist (we're not testing exact positioning here)
    expect(screen.getByText('Test tooltip')).toBeInTheDocument()
  })

  it('shows icon when showIcon is true and no children', () => {
    render(<Tooltip content="Test tooltip" showIcon />)
    
    // Should render the question mark icon
    const icon = document.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })
})

describe('HelpText', () => {
  it('renders help text correctly', () => {
    render(<HelpText text="This is helpful information" />)
    
    expect(screen.getByText('This is helpful information')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<HelpText text="Help text" className="custom-class" />)
    
    const helpText = screen.getByText('Help text')
    expect(helpText).toHaveClass('custom-class')
    expect(helpText).toHaveClass('text-sm')
    expect(helpText).toHaveClass('text-gray-500')
  })
})