import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Check } from 'lucide-react';

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courtName: string;
  date: Date;
  startTime: string;
  duration: 30 | 60 | 90;
  clubId: string;
  currentProfileId: string;
  onConfirm: (playerIds: string[]) => Promise<void>;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
}

export function BookingConfirmDialog({
  open,
  onOpenChange,
  courtName,
  date,
  startTime,
  duration,
  clubId,
  currentProfileId,
  onConfirm,
}: BookingConfirmDialogProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([currentProfileId]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && clubId) {
      loadPlayers();
    }
  }, [open, clubId]);

  const loadPlayers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('club_id', clubId)
      .order('first_name', { ascending: true });
    setPlayers(data || []);
    setLoading(false);
  };

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(selectedPlayers);
      onOpenChange(false);
      setSelectedPlayers([currentProfileId]);
    } finally {
      setSubmitting(false);
    }
  };

  const endTime = new Date(date.getTime() + duration * 60 * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Confirm Booking</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Review your booking details and select who will be playing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Court:</span>
              <span className="font-medium">{courtName}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">
                {startTime} - {endTime}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{duration} minutes</span>
            </div>
          </div>

          <div className="border-t pt-3">
            <Label className="text-sm sm:text-base mb-2 block">Who's playing?</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading players...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players.map((player) => {
                  const isSelected = selectedPlayers.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handleTogglePlayer(player.id)}
                      className={`relative px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {player.first_name} {player.last_name}
                          {player.id === currentProfileId && (
                            <span className="text-muted-foreground ml-1.5 text-xs">(You)</span>
                          )}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 flex-shrink-0 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || selectedPlayers.length === 0}
            className="w-full sm:w-auto"
          >
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
