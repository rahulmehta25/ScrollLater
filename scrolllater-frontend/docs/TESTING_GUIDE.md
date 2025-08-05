# ScrollLater Testing Guide

## Overview

This guide covers the testing setup and procedures for ScrollLater. We use Jest and React Testing Library for unit and integration tests.

## Test Setup

### Installation

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest node-mocks-http
```

### Configuration Files

- `jest.config.js`: Jest configuration
- `jest.setup.js`: Test environment setup and mocks

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test file
npm test src/components/ui/__tests__/Tooltip.test.tsx
```

## Test Structure

### Unit Tests

Located in `__tests__` folders next to the components they test.

#### Components Tested:
1. **Tooltip** (`src/components/ui/__tests__/Tooltip.test.tsx`)
   - Rendering with children
   - Show/hide on hover
   - Position variants
   - Icon display

2. **LoadingSkeleton** (`src/components/ui/__tests__/LoadingSkeleton.test.tsx`)
   - Default rendering
   - Custom props (className, width, height)
   - EntryCardSkeleton structure
   - ProfileSkeleton structure

3. **ErrorBoundary** (`src/components/ui/__tests__/ErrorBoundary.test.tsx`)
   - Error catching and display
   - Custom fallback UI
   - Error reset functionality
   - Development mode error details

4. **EmptyState** (`src/components/ui/__tests__/EmptyState.test.tsx`)
   - Required props rendering
   - Action button functionality
   - Icon rendering
   - Styling verification

5. **Validations** (`src/lib/__tests__/validations.test.ts`)
   - Schema validation for entries
   - Profile data validation
   - Tag validation rules
   - Form data validation helper

### Integration Tests

Located in `src/pages/api/__tests__/` for API route testing.

#### API Routes Tested:

1. **Authentication** (`auth.test.ts`)
   - OAuth callback handling
   - Google Calendar OAuth flow
   - Error handling
   - Request validation

2. **AI Services** (`ai.test.ts`)
   - Content analysis endpoint
   - Schedule suggestion generation
   - API key validation
   - Error responses

3. **Shortcuts** (`shortcuts.test.ts`)
   - Webhook entry creation
   - Token validation
   - Request validation
   - Database error handling

## Writing Tests

### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<MyComponent onClick={handleClick} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### API Test Example

```typescript
import { createMocks } from 'node-mocks-http'
import handler from '../api/my-endpoint'

describe('/api/my-endpoint', () => {
  it('handles successful request', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        data: 'test'
      }
    })

    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(200)
    const jsonData = JSON.parse(res._getData())
    expect(jsonData.success).toBe(true)
  })
})
```

## Mocking

### Supabase Mock

```typescript
jest.mock('@/lib/supabase', () => ({
  createSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    }))
  }))
}))
```

### Next.js Router Mock

```typescript
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how
2. **Use Descriptive Test Names**: Make it clear what scenario is being tested
3. **Keep Tests Isolated**: Each test should be independent
4. **Mock External Dependencies**: Don't make real API calls in tests
5. **Test Error States**: Include tests for error handling
6. **Use Data-TestId Sparingly**: Prefer accessible queries (role, text, label)

## Coverage Goals

Aim for:
- 80%+ coverage for critical business logic
- 70%+ coverage for UI components
- 90%+ coverage for utility functions

Current coverage can be viewed by running:
```bash
npm test:coverage
open coverage/lcov-report/index.html
```

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Commits to main branch
- Pre-deployment checks

## Troubleshooting

### Common Issues

**"Cannot find module" errors**
- Check import paths use `@/` alias correctly
- Ensure mocks are properly set up in jest.setup.js

**Async test failures**
- Use `await` with async operations
- Wrap state updates in `act()`
- Use `waitFor` for async assertions

**Component not rendering**
- Check if required props are provided
- Verify mocks return expected data
- Look for console errors

## Future Improvements

1. Add E2E tests using Cypress or Playwright
2. Implement visual regression testing
3. Add performance testing for critical paths
4. Increase test coverage for edge cases
5. Add mutation testing to verify test quality