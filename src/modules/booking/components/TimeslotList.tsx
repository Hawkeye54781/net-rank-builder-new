import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TimeslotListProps {
  clubId: string;
  courtId: string | null;
  date: Date;
  refreshKey: number;
  onRequestBook: (start: Date, minutes: 30 | 60 | 90) => void;
}

type Booking = {
  start_time: string;
  end_time: string;
};

export function TimeslotList({ courtId, date, refreshKey, onRequestBook }: TimeslotListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const disabled = !courtId;
  const pretty = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const now = new Date();

  useEffect(() => {
    if (courtId && date) {
      loadBookings();
    }
  }, [courtId, date, refreshKey]);

  const loadBookings = async () => {
    if (!courtId) return;
    
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const { data } = await supabase
      .from('court_bookings')
      .select('start_time, end_time')
      .eq('court_id', courtId)
      .eq('status', 'confirmed')
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    setBookings(data || []);
  };

  const isSlotBooked = (slotStart: Date, durationMinutes: number) => {
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
    return bookings.some((booking) => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      // Check if slot overlaps with any booking
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Book a Time - {pretty}</CardTitle>
      </CardHeader>
      <CardContent>
        {!courtId ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Select a court above to see available times.</div>
        ) : (
          <div className="space-y-2">
            {[8,9,10,11,12,13,14,15,16,17,18,19,20,21].flatMap(h => [0,30].map(m => ({h,m}))).map(({h,m}) => {
              // Create date in user's local timezone, then convert to UTC when sending
              const localDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0);
              const isPast = localDateTime < now;
              const label = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
              
              const booked30 = isSlotBooked(localDateTime, 30);
              const booked60 = isSlotBooked(localDateTime, 60);
              const booked90 = isSlotBooked(localDateTime, 90);
              const allBooked = booked30 && booked60 && booked90;
              
              return (
                <div key={`${h}:${m}`} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg ${isPast || allBooked ? 'opacity-50 bg-muted' : 'hover:bg-accent/5'}`}>
                  <div className="font-medium text-base sm:text-lg">
                    {label}
                    {allBooked && <span className="text-xs text-muted-foreground ml-2">(Booked)</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="default" 
                      variant="outline" 
                      className="flex-1 sm:flex-none"
                      disabled={disabled || isPast || booked30} 
                      onClick={() => onRequestBook(localDateTime, 30)}
                    >
                      30 min
                    </Button>
                    <Button 
                      size="default" 
                      variant="outline" 
                      className="flex-1 sm:flex-none"
                      disabled={disabled || isPast || booked60} 
                      onClick={() => onRequestBook(localDateTime, 60)}
                    >
                      60 min
                    </Button>
                    <Button 
                      size="default" 
                      variant="outline" 
                      className="flex-1 sm:flex-none"
                      disabled={disabled || isPast || booked90} 
                      onClick={() => onRequestBook(localDateTime, 90)}
                    >
                      90 min
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
