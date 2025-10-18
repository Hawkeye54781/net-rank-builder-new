import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CourtPicker } from '@/modules/booking/components/CourtPicker';
import { DayDatePicker } from '@/modules/booking/components/DayDatePicker';
import { TimeslotList } from '@/modules/booking/components/TimeslotList';
import { BookingConfirmDialog } from '@/modules/booking/components/BookingConfirmDialog';

interface BookingDashboardProps {
  clubId: string;
  profileId: string;
  isAdmin: boolean;
}

type PendingBooking = {
  start: Date;
  minutes: 30 | 60 | 90;
};

export default function BookingDashboard({ clubId, profileId, isAdmin }: BookingDashboardProps) {
  const { toast } = useToast();
  const [courtId, setCourtId] = useState<string | null>(null);
  const [courtName, setCourtName] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);

  useEffect(() => {
    if (courtId) {
      loadCourtName();
    }
  }, [courtId]);

  const loadCourtName = async () => {
    if (!courtId) return;
    const { data } = await supabase
      .from('courts')
      .select('name')
      .eq('id', courtId)
      .single();
    if (data) setCourtName(data.name);
  };

  const handleRequestBook = (start: Date, minutes: 30 | 60 | 90) => {
    setPendingBooking({ start, minutes });
    setDialogOpen(true);
  };

  const handleConfirmBooking = async (playerIds: string[]) => {
    if (!pendingBooking) return;

    const end = new Date(pendingBooking.start.getTime() + pendingBooking.minutes * 60 * 1000);
    const { error } = await supabase.rpc('create_booking_if_available', {
      _club_id: clubId,
      _court_id: courtId,
      _booked_by_profile_id: profileId,
      _start: pendingBooking.start.toISOString(),
      _end: end.toISOString(),
      _allow_override: isAdmin ? false : false,
    });

    if (error) {
      toast({ title: 'Booking failed', description: error.message, variant: 'destructive' });
      throw error;
    } else {
      toast({ title: 'Booked!', description: 'Your court has been booked.' });
      setRefreshKey((k) => k + 1);
      setPendingBooking(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CourtPicker clubId={clubId} value={courtId} onChange={setCourtId} />
          <DayDatePicker maxAdvanceDays={7} value={date} onChange={setDate} />
        </div>

        <TimeslotList
          clubId={clubId}
          courtId={courtId}
          date={date}
          refreshKey={refreshKey}
          onRequestBook={handleRequestBook}
        />
      </div>

      {pendingBooking && (
        <BookingConfirmDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          courtName={courtName}
          date={pendingBooking.start}
          startTime={pendingBooking.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          duration={pendingBooking.minutes}
          clubId={clubId}
          currentProfileId={profileId}
          onConfirm={handleConfirmBooking}
        />
      )}
    </>
  );
}
