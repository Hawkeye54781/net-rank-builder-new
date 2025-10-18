import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useRecordTournamentMatch } from '@/hooks/useRecordTournamentMatch';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Loader2, CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TournamentGroup {
  id: string;
  name: string;
  tournament_id: string;
}

interface Participant {
  id: string;
  player_id: string;
  is_guest: boolean;
  guest_name: string | null;
  first_name?: string;
  last_name?: string;
  elo_rating?: number;
}

const recordTournamentMatchSchema = z.object({
  groupId: z.string().min(1, 'Please select a group'),
  player1Id: z.string().min(1, 'Please select Player 1'),
  player2Id: z.string().min(1, 'Please select Player 2'),
  player1Score: z.string().min(1, 'Please select Player 1 sets won'),
  player2Score: z.string().min(1, 'Please select Player 2 sets won'),
  matchDate: z.date({
    required_error: 'Please select a match date',
  }),
}).refine(
  (data) => data.player1Id !== data.player2Id,
  {
    message: 'Players must be different',
    path: ['player2Id'],
  }
);

type RecordTournamentMatchFormData = z.infer<typeof recordTournamentMatchSchema>;

interface RecordTournamentMatchDialogProps {
  tournamentId: string;
  currentPlayerId: string;
  onMatchRecorded: () => void;
  isAdmin?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export default function RecordTournamentMatchDialog({
  tournamentId,
  currentPlayerId,
  onMatchRecorded,
  isAdmin = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
}: RecordTournamentMatchDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groupParticipants, setGroupParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const { recordMatch, isSubmitting } = useRecordTournamentMatch();

  const form = useForm<RecordTournamentMatchFormData>({
    resolver: zodResolver(recordTournamentMatchSchema),
    defaultValues: {
      groupId: '',
      player1Id: '',
      player2Id: '',
      player1Score: '',
      player2Score: '',
      matchDate: new Date(),
    },
  });

  const selectedGroupId = form.watch('groupId');
  const selectedPlayer1Id = form.watch('player1Id');
  const selectedPlayer2Id = form.watch('player2Id');

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, tournamentId]);

  useEffect(() => {
    if (selectedGroupId && participants.length > 0) {
      const filtered = participants.filter((p) => p.id === selectedGroupId);
      setGroupParticipants(filtered);
    } else {
      setGroupParticipants([]);
    }
  }, [selectedGroupId, participants]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch tournament groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('tournament_groups')
        .select('id, name, tournament_id')
        .eq('tournament_id', tournamentId)
        .order('name');

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Fetch all participants with their profiles
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          id,
          player_id,
          group_id,
          is_guest,
          guest_name,
          profiles:player_id(first_name, last_name, elo_rating)
        `)
        .eq('tournament_id', tournamentId);

      if (participantsError) throw participantsError;

      // Transform participants data
      const transformedParticipants = participantsData?.map((p: any) => ({
        id: p.group_id,
        player_id: p.player_id,
        is_guest: p.is_guest,
        guest_name: p.guest_name,
        first_name: p.profiles?.first_name,
        last_name: p.profiles?.last_name,
        elo_rating: p.profiles?.elo_rating,
      })) || [];

      setParticipants(transformedParticipants);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getParticipantDisplayName = (participant: Participant): string => {
    if (participant.is_guest) {
      return `${participant.guest_name} (Guest)`;
    }
    return `${participant.first_name} ${participant.last_name} (${participant.elo_rating})`;
  };

  const hasGuestPlayer = () => {
    const p1 = groupParticipants.find((p) => p.player_id === selectedPlayer1Id);
    const p2 = groupParticipants.find((p) => p.player_id === selectedPlayer2Id);
    return p1?.is_guest || p2?.is_guest;
  };

  const onSubmit = async (data: RecordTournamentMatchFormData) => {
    try {
      await recordMatch({
        tournamentId,
        groupId: data.groupId,
        player1Id: data.player1Id,
        player2Id: data.player2Id,
        player1Score: parseInt(data.player1Score),
        player2Score: parseInt(data.player2Score),
        matchDate: data.matchDate,
      });

      form.reset({
        groupId: data.groupId,
        player1Id: '',
        player2Id: '',
        player1Score: '',
        player2Score: '',
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" className="bg-gradient-court hover:bg-primary-light h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Record Match
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl">Record Tournament Match</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Enter match details for this tournament group.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-4">
              {/* Group Selection */}
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Players */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="player1Id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player 1</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedGroupId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groupParticipants.map((participant) => (
                            <SelectItem key={participant.player_id} value={participant.player_id}>
                              {getParticipantDisplayName(participant)}
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
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedGroupId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groupParticipants.map((participant) => (
                            <SelectItem key={participant.player_id} value={participant.player_id}>
                              {getParticipantDisplayName(participant)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Guest Warning */}
              {selectedPlayer1Id && selectedPlayer2Id && hasGuestPlayer() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    This match involves a guest player. ELO ratings will not be affected for either player.
                  </AlertDescription>
                </Alert>
              )}

              {/* Scores */}
              <div>
                <FormLabel className="mb-3 block text-sm">Match Score (Sets Won)</FormLabel>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="player1Score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm text-muted-foreground">Player 1 Sets</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sets" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="player2Score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm text-muted-foreground">Player 2 Sets</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sets" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-3">
                  Select the number of sets won by each player (0-2). Ties are allowed for time-limited matches.
                </p>
              </div>

              {/* Match Date */}
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
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-xs">
                      When was this match played?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
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
