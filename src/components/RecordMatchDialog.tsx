import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useRecordMatch } from '@/hooks/useRecordMatch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Ladder {
  id: string;
  name: string;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  elo_rating: number;
}

/**
 * Parse tennis score string (e.g., "6-4 6-3" or "7-6 3-6 6-4")
 * Returns the number of sets won by each player
 */
export const parseTennisScore = (scoreString: string): { player1Sets: number; player2Sets: number } | null => {
  const sets = scoreString.trim().split(/\s+/);
  
  if (sets.length === 0 || sets.length > 3) {
    return null; // Invalid: must have 1-3 sets (best of 3)
  }
  
  let player1Sets = 0;
  let player2Sets = 0;
  
  for (const set of sets) {
    const match = set.match(/^(\d+)-(\d+)$/);
    if (!match) {
      return null; // Invalid format
    }
    
    const score1 = parseInt(match[1]);
    const score2 = parseInt(match[2]);
    
    // Basic tennis set validation
    if (score1 < 0 || score2 < 0 || score1 > 7 || score2 > 7) {
      return null;
    }
    
    // Determine set winner
    if (score1 > score2) {
      player1Sets++;
    } else if (score2 > score1) {
      player2Sets++;
    } else {
      return null; // Can't have tied set
    }
  }
  
  return { player1Sets, player2Sets };
};

const recordMatchSchema = z.object({
  ladderId: z.string().min(1, 'Please select a ladder'),
  player1Id: z.string().min(1, 'Please select Player 1'),
  player2Id: z.string().min(1, 'Please select Player 2'),
  scoreString: z
    .string()
    .min(1, 'Please enter match score')
    .refine(
      (val) => parseTennisScore(val) !== null,
      {
        message: 'Invalid tennis score. Enter 1-3 sets (e.g., "6-4 6-3" or "6-4 3-6 6-2")',
      }
    ),
  matchDate: z.date({
    required_error: 'Please select a match date',
  }),
}).refine(
  (data) => data.player1Id !== data.player2Id,
  {
    message: 'Players must be different',
    path: ['player2Id'],
  }
).refine(
  (data) => {
    const parsed = parseTennisScore(data.scoreString);
    return parsed && parsed.player1Sets !== parsed.player2Sets;
  },
  {
    message: 'Match cannot end in a tie',
    path: ['scoreString'],
  }
);

type RecordMatchFormData = z.infer<typeof recordMatchSchema>;

interface RecordMatchDialogProps {
  clubId: string;
  currentPlayerId: string;
  onMatchRecorded: () => void;
}

/**
 * Dialog component for recording tennis matches
 * Implements clean separation of concerns with form validation and business logic
 */
export default function RecordMatchDialog({
  clubId,
  currentPlayerId,
  onMatchRecorded,
}: RecordMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const { recordMatch, isSubmitting } = useRecordMatch();

  const form = useForm<RecordMatchFormData>({
    resolver: zodResolver(recordMatchSchema),
    defaultValues: {
      ladderId: '',
      player1Id: currentPlayerId,
      player2Id: '',
      scoreString: '',
      matchDate: new Date(),
    },
  });

  // Fetch ladders and players when dialog opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, clubId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active ladders
      const { data: laddersData, error: laddersError } = await supabase
        .from('ladders')
        .select('id, name')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('name');

      if (laddersError) throw laddersError;
      setLadders(laddersData || []);

      // Fetch all players in the club
      const { data: playersData, error: playersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, elo_rating')
        .eq('club_id', clubId)
        .order('first_name');

      if (playersError) throw playersError;
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RecordMatchFormData) => {
    try {
      const parsed = parseTennisScore(data.scoreString);
      if (!parsed) {
        return; // Should not happen due to validation
      }

      await recordMatch({
        ladderId: data.ladderId,
        player1Id: data.player1Id,
        player2Id: data.player2Id,
        player1Score: parsed.player1Sets,
        player2Score: parsed.player2Sets,
        matchDate: data.matchDate,
      });

      form.reset({
        ladderId: '',
        player1Id: currentPlayerId,
        player2Id: '',
        scoreString: '',
        matchDate: new Date(),
      });
      
      setOpen(false);
      onMatchRecorded();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  const getPlayerDisplayName = (player: Player): string => {
    return `${player.first_name} ${player.last_name} (${player.elo_rating})`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-court hover:bg-primary-light">
          <Plus className="h-4 w-4 mr-2" />
          Record a Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Match</DialogTitle>
          <DialogDescription>
            Enter match details to update player rankings and statistics.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="ladderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ladder</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a ladder" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ladders.map((ladder) => (
                          <SelectItem key={ladder.id} value={ladder.id}>
                            {ladder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="player1Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player 1</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {getPlayerDisplayName(player)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="player2Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player 2</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {getPlayerDisplayName(player)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="scoreString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Score</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 6-4 6-3 or 6-4 3-6 6-2"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter 1-3 sets separated by spaces (e.g., "6-4 6-3").
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="matchDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Match Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The date when this match was played.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Match
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
