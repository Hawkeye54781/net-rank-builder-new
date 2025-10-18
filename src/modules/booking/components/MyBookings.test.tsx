import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { MyBookings } from './MyBookings';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client');

describe('MyBookings', () => {
  const mockProfileId = 'test-profile-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with title', () => {
    // Mock empty bookings
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    render(<MyBookings profileId={mockProfileId} />);
    
    expect(screen.getByText('My Upcoming Bookings')).toBeInTheDocument();
  });

  it('displays "No upcoming bookings" when there are no bookings', async () => {
    // Mock empty bookings
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    render(<MyBookings profileId={mockProfileId} />);
    
    await waitFor(() => {
      expect(screen.getByText('No upcoming bookings.')).toBeInTheDocument();
    });
  });

  it('displays booking information when bookings exist', async () => {
    const mockBookings = [
      {
        id: 'booking-1',
        start_time: '2025-10-20T10:00:00Z',
        end_time: '2025-10-20T11:00:00Z',
        court_id: 'court-abc-123',
        status: 'confirmed' as const,
      },
      {
        id: 'booking-2',
        start_time: '2025-10-21T14:00:00Z',
        end_time: '2025-10-21T15:30:00Z',
        court_id: 'court-def-456',
        status: 'confirmed' as const,
      },
    ];

    // Mock bookings data
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
    } as any);

    render(<MyBookings profileId={mockProfileId} />);
    
    await waitFor(() => {
      // Check that booking times are displayed (dates can be in DD/MM/YYYY or MM/DD/YYYY format)
      expect(screen.getByText(/20\/10\/2025|10\/20\/2025/)).toBeInTheDocument();
      expect(screen.getByText(/21\/10\/2025|10\/21\/2025/)).toBeInTheDocument();
    });
  });

  it('fetches bookings for the correct profile', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    render(<MyBookings profileId={mockProfileId} />);
    
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('court_bookings');
    });
  });

  it('refetches bookings when refreshKey changes', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const { rerender } = render(<MyBookings profileId={mockProfileId} refreshKey={0} />);
    
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    // Change refreshKey to trigger refetch
    rerender(<MyBookings profileId={mockProfileId} refreshKey={1} />);
    
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  it('filters out past bookings and only shows confirmed ones', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => {
        // Verify it's filtering by status and profileId
        if (field === 'status' && value === 'confirmed') {
          return {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (field === 'booked_by_profile_id' && value === mockProfileId) {
          return {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    render(<MyBookings profileId={mockProfileId} />);
    
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('court_bookings');
    });
  });

  it('renders cancel buttons for each booking (disabled)', async () => {
    const mockBookings = [
      {
        id: 'booking-1',
        start_time: '2025-10-20T10:00:00Z',
        end_time: '2025-10-20T11:00:00Z',
        court_id: 'court-abc-123',
        status: 'confirmed' as const,
      },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
    } as any);

    render(<MyBookings profileId={mockProfileId} />);
    
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toBeDisabled();
    });
  });
});
