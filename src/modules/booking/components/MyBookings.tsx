import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface MyBookingsProps {
  profileId: string;
  refreshKey?: number;
}

type BookingRow = {
  id: string;
  start_time: string; // ISO
  end_time: string;   // ISO
  court_id: string;
  status: 'confirmed' | 'cancelled';
};

export function MyBookings({ profileId, refreshKey }: MyBookingsProps) {
  const [rows, setRows] = useState<BookingRow[]>([]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data } = await supabase
        .from('court_bookings')
        .select('id, start_time, end_time, court_id, status')
        .eq('booked_by_profile_id', profileId)
        .eq('status', 'confirmed')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      if (!ignore) setRows(data || []);
    };
    if (profileId) load();
    return () => { ignore = true; };
  }, [profileId, refreshKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Upcoming Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No upcoming bookings.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                <div>
                  <div>{new Date(r.start_time).toLocaleString()} – {new Date(r.end_time).toLocaleTimeString()}</div>
                  <div className="text-muted-foreground">Court: {r.court_id.slice(0, 8)}…</div>
                </div>
                <Button size="sm" variant="outline" disabled>
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
