import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(<Card data-testid="card">Card content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('rounded-xl', 'bg-white', 'p-6')
    })

    it('applies variant classes correctly', () => {
      render(<Card variant="elevated" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('shadow-large', 'border-0')
    })

    it('applies padding classes correctly', () => {
      render(<Card padding="lg" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-8')
    })

    it('applies interactive styles when interactive is true', () => {
      render(<Card interactive data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('hover:shadow-medium', 'hover:-translate-y-0.5', 'cursor-pointer')
    })
  })

  describe('CardHeader', () => {
    it('renders correctly', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'pb-6')
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 element', () => {
      render(<CardTitle>Test Title</CardTitle>)
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Test Title')
      expect(title).toHaveClass('text-xl', 'font-semibold')
    })
  })

  describe('CardDescription', () => {
    it('renders correctly', () => {
      render(<CardDescription>Test description</CardDescription>)
      const description = screen.getByText('Test description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-sm', 'text-secondary-600')
    })
  })

  describe('CardContent', () => {
    it('renders correctly', () => {
      render(<CardContent data-testid="content">Content here</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('pb-6')
    })
  })

  describe('CardFooter', () => {
    it('renders correctly', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('flex', 'items-center', 'pt-6')
    })
  })

  describe('Complete Card', () => {
    it('renders all components together', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Card Title')
      expect(screen.getByText('Card description')).toBeInTheDocument()
      expect(screen.getByText('Card content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })
  })
})