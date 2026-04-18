import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '@/components/dashboard/SearchBar'

describe('SearchBar', () => {
  it('renders with default placeholder', () => {
    render(<SearchBar value="" onChange={vi.fn()} />)

    const input = screen.getByPlaceholderText('Search...')
    expect(input).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        placeholder="Search entries..."
      />
    )

    const input = screen.getByPlaceholderText('Search entries...')
    expect(input).toBeInTheDocument()
  })

  it('displays the current value', () => {
    render(<SearchBar value="test query" onChange={vi.fn()} />)

    const input = screen.getByDisplayValue('test query')
    expect(input).toBeInTheDocument()
  })

  it('calls onChange when typing', async () => {
    const mockOnChange = vi.fn()
    const user = userEvent.setup()

    render(<SearchBar value="" onChange={mockOnChange} />)

    const input = screen.getByPlaceholderText('Search...')
    await user.type(input, 'hello')

    expect(mockOnChange).toHaveBeenCalledTimes(5) // Once per character
    expect(mockOnChange).toHaveBeenLastCalledWith('o') // Last character
  })

  it('calls onChange with correct value on input change', () => {
    const mockOnChange = vi.fn()

    render(<SearchBar value="" onChange={mockOnChange} />)

    const input = screen.getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'new search' } })

    expect(mockOnChange).toHaveBeenCalledWith('new search')
  })

  it('renders search icon', () => {
    render(<SearchBar value="" onChange={vi.fn()} />)

    // The search icon should be present (MagnifyingGlassIcon)
    const container = screen.getByPlaceholderText('Search...').parentElement
    expect(container).toBeInTheDocument()
    expect(container?.querySelector('svg')).toBeInTheDocument()
  })

  it('has proper styling classes', () => {
    render(<SearchBar value="" onChange={vi.fn()} />)

    const input = screen.getByPlaceholderText('Search...')
    expect(input).toHaveClass('border')
    expect(input).toHaveClass('rounded-md')
  })
})
