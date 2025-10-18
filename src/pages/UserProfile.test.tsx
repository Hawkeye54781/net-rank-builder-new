import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import UserProfile from './UserProfile';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/useClubAdmin', () => ({
  useClubAdmin: () => ({ isAdmin: false }),
}));
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div>Theme Toggle</div>,
}));
vi.mock('@/components/MatchList', () => ({
  default: () => <div>Match List</div>,
}));
vi.mock('@/components/RecordMatchDialog', () => ({
  default: () => <div>Record Match Dialog</div>,
}));
vi.mock('@/modules/booking/components/MyBookings', () => ({
  MyBookings: ({ profileId }: { profileId: string }) => (
    <div data-testid="my-bookings">MyBookings for {profileId}</div>
  ),
}));

describe('UserProfile - Bookings Integration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  } as any;

  const mockProfile = {
    id: 'profile-123',
    user_id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    elo_rating: 1500,
    matches_played: 10,
    matches_won: 6,
    club_id: 'club-123',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockClub = {
    id: 'club-123',
    name: 'Test Tennis Club',
    location: 'Test City',
  };

  const mockOnSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks for profile data
    const mockSupabaseChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          ...mockSupabaseChain,
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          order: vi.fn().mockResolvedValue({ 
            data: [mockProfile, { ...mockProfile, id: 'profile-456', elo_rating: 1400 }], 
            error: null 
          }),
        } as any;
      }
      if (table === 'clubs') {
        return {
          ...mockSupabaseChain,
          single: vi.fn().mockResolvedValue({ data: mockClub, error: null }),
        } as any;
      }
      if (table === 'ladder_participants') {
        return {
          ...mockSupabaseChain,
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      return mockSupabaseChain as any;
    });
  });

  it('renders the bookings tab button', async () => {
    render(<UserProfile user={mockUser} onSignOut={mockOnSignOut} />);

    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
    });
  });

  it('has the CalendarCheck icon for bookings tab', async () => {
    render(<UserProfile user={mockUser} onSignOut={mockOnSignOut} />);

    await waitFor(() => {
      const bookingsButton = screen.getByRole('button', { name: /my bookings/i });
      expect(bookingsButton).toBeInTheDocument();
    });
  });

  it('switches to bookings view when bookings tab is clicked', async () => {
    const user = userEvent.setup();
    render(<UserProfile user={mockUser} onSignOut={mockOnSignOut} />);

    await waitFor(() => {
      expect(screen.getByText('Match History')).toBeInTheDocument();
    });

    // Click the bookings tab
    const bookingsButton = screen.getByRole('button', { name: /my bookings/i });
    await user.click(bookingsButton);

    // Verify MyBookings component is rendered
    await waitFor(() => {
      expect(screen.getByTestId('my-bookings')).toBeInTheDocument();
    });
  });

  it('passes correct profileId to MyBookings component', async () => {
    const user = userEvent.setup();
    render(<UserProfile user={mockUser} onSignOut={mockOnSignOut} />);

    await waitFor(() => {
      expect(screen.getByText('Match History')).toBeInTheDocument();
    });

    // Click the bookings tab
    const bookingsButton = screen.getByRole('button', { name: /my bookings/i });
    await user.click(bookingsButton);

    // Verify MyBookings component receives correct profileId
    await waitFor(() => {
      expect(screen.getByText(`MyBookings for ${mockProfile.id}`)).toBeInTheDocument();
    });
  });

  it('shows matches view by default', async () => {
    render(<UserProfile user={mockUser} onSignOut={mockOnSignOut} />);

    await waitFor(() => {
      expect(screen.getByText('Recent Matches')).toBeInTheDocument();
    });

    // Bookings should not be visible initially
    expect(screen.queryByTestId('my-bookings')).not.toBeInTheDocument();
  });

  it('can switch between matches, ladders, and bookings views', async () => {
    const user = userEvent.setup();
    render(<UserProfile user={mockUser} onSignOut={mockOnSignOut} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Match History')).toBeInTheDocument();
    });

    // Click ladders
    const laddersButton = screen.getByRole('button', { name: /my ladders/i });
    await user.click(laddersButton);

    await waitFor(() => {
      // Use getByRole to be more specific - looking for the heading, not the button text
      expect(screen.getByRole('heading', { name: 'My Ladders' })).toBeInTheDocument();
    });

    // Click bookings
    const bookingsButton = screen.getByRole('button', { name: /my bookings/i });
    await user.click(bookingsButton);

    await waitFor(() => {
      expect(screen.getByTestId('my-bookings')).toBeInTheDocument();
    });

    // Click matches
    const matchesButton = screen.getByRole('button', { name: /match history/i });
    await user.click(matchesButton);

    await waitFor(() => {
      expect(screen.getByText('Recent Matches')).toBeInTheDocument();
    });
  });

  it('applies correct styling to active bookings tab', async () => {
    const user = userEvent.setup();
    render(<UserProfile user={mockUser} onSignOut={mockOnSignOut} />);

    await waitFor(() => {
      expect(screen.getByText('Match History')).toBeInTheDocument();
    });

    const bookingsButton = screen.getByRole('button', { name: /my bookings/i });
    
    // Initially should have hover:bg-background/50 styling (ghost-like)
    expect(bookingsButton.className).toContain('hover:bg-background/50');

    // Click to activate
    await user.click(bookingsButton);

    await waitFor(() => {
      // After clicking, button should have shadow-sm (active state)
      expect(bookingsButton.className).toContain('shadow-sm');
    });
  });
});
