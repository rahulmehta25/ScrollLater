import { render } from '@testing-library/react'
import { LoadingSkeleton, EntryCardSkeleton, ProfileSkeleton } from '../LoadingSkeleton'

describe('LoadingSkeleton', () => {
  it('renders with default props', () => {
    const { container } = render(<LoadingSkeleton />)
    const skeleton = container.querySelector('.animate-pulse')
    
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('bg-gray-200')
    expect(skeleton).toHaveClass('rounded')
    expect(skeleton).toHaveClass('h-4')
    expect(skeleton).toHaveClass('w-full')
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingSkeleton className="custom-class" />)
    const skeleton = container.querySelector('.animate-pulse')
    
    expect(skeleton).toHaveClass('custom-class')
  })

  it('applies custom width', () => {
    const { container } = render(<LoadingSkeleton width="w-1/2" />)
    const skeleton = container.querySelector('.animate-pulse')
    
    expect(skeleton).toHaveClass('w-1/2')
    expect(skeleton).not.toHaveClass('w-full')
  })

  it('applies custom height', () => {
    const { container } = render(<LoadingSkeleton height="h-8" />)
    const skeleton = container.querySelector('.animate-pulse')
    
    expect(skeleton).toHaveClass('h-8')
    expect(skeleton).not.toHaveClass('h-4')
  })
})

describe('EntryCardSkeleton', () => {
  it('renders entry card skeleton structure', () => {
    const { container } = render(<EntryCardSkeleton />)
    
    // Check for main container
    const card = container.querySelector('.bg-white.rounded-lg.shadow-sm')
    expect(card).toBeInTheDocument()
    
    // Check that the card has animation
    expect(card).toHaveClass('animate-pulse')
    
    // Check for skeleton elements inside
    const grayElements = container.querySelectorAll('.bg-gray-200, .bg-gray-300')
    expect(grayElements.length).toBeGreaterThan(3) // Should have multiple skeleton elements
  })
})

describe('ProfileSkeleton', () => {
  it('renders profile skeleton structure', () => {
    const { container } = render(<ProfileSkeleton />)
    
    // Check for main container
    const profile = container.querySelector('.bg-white.rounded-lg.shadow-sm')
    expect(profile).toBeInTheDocument()
    
    // Check for avatar skeleton (circular)
    const avatar = container.querySelector('.rounded-full')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveClass('h-20')
    expect(avatar).toHaveClass('w-20')
    
    // Check that the profile has animation
    expect(profile).toHaveClass('animate-pulse')
    
    // Check for skeleton elements inside
    const grayElements = container.querySelectorAll('.bg-gray-200, .bg-gray-300')
    expect(grayElements.length).toBeGreaterThan(4) // Should have multiple skeleton elements
  })
})