# Testing Documentation

## Overview
This project uses Vitest for unit testing React components.

## Setup
- **Test Framework**: Vitest
- **Component Testing**: React Testing Library
- **DOM Environment**: happy-dom
- **Additional Libraries**: 
  - `@testing-library/jest-dom` - Custom matchers
  - `@testing-library/user-event` - User interaction simulation

## Running Tests

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### Setup Files
- `src/test/setup.ts` - Global test configuration, mocks for Supabase and React Router
- `src/test/utils.tsx` - Custom render function with providers

### Test Files
- Component tests are colocated with their source files (e.g., `MyBookings.test.tsx` next to `MyBookings.tsx`)
- Use `.test.tsx` or `.test.ts` extension

## Mocks

### Supabase
The Supabase client is globally mocked in `setup.ts`. Individual tests can override specific behaviors.

### React Router
React Router hooks (`useNavigate`, `useParams`) are mocked while keeping `BrowserRouter` for test rendering.

## Current Test Coverage

### MyBookings Component
- ✅ Renders with title
- ✅ Shows empty state when no bookings
- ✅ Displays booking information
- ✅ Fetches bookings for correct profile
- ✅ Refetches on refreshKey change
- ✅ Filters confirmed and future bookings only
- ✅ Renders cancel buttons (disabled)

### UserProfile - Bookings Integration
- ✅ Renders bookings tab button
- ✅ Has CalendarCheck icon
- ✅ Switches to bookings view on click
- ✅ Passes correct profileId to MyBookings
- ✅ Shows matches view by default
- ✅ Switches between all views (matches, ladders, bookings)
- ✅ Applies correct styling to active tab

## Writing New Tests

### Basic Test Template
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Testing Async Behavior
Use `waitFor` for async operations:
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded Data')).toBeInTheDocument();
});
```

### Testing User Interactions
```typescript
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
const button = screen.getByRole('button');
await user.click(button);
```

## Best Practices
1. **Unit Tests Only**: Focus on component behavior, not API calls or full user flows
2. **Mock External Dependencies**: Supabase, navigation, etc.
3. **Test User Behavior**: Test what users see and do, not implementation details
4. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
5. **Clear Mocks**: Always clear mocks in `beforeEach` to avoid test pollution

## Notes
- Tests run in `happy-dom` environment (faster than jsdom)
- All imports use `@/` path alias
- Console warnings during tests are normal (React Router future flags, etc.)
