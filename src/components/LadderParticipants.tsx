import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, UserMinus, Calendar, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
}

interface ParticipantWithProfile {
  id: string;
  ladder_id: string;
  player_id: string;
  joined_at: string;
  is_active: boolean;
  profile: Profile;
}

interface LadderParticipantsProps {
  ladderId: string;
  ladderName: string;
  isClubAdmin: boolean;
}

/**
 * Component for viewing and managing ladder participants
 * Provides admin functionality to view participant list and remove participants
 */
export default function LadderParticipants({
  ladderId,
  ladderName,
  isClubAdmin,
}: LadderParticipantsProps) {
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const fetchParticipantCount = async () => {
    try {
      const { count, error } = await supabase
        .from('ladder_participants')
        .select('*', { count: 'exact', head: true })
        .eq('ladder_id', ladderId)
        .eq('is_active', true);

      if (error) throw error;
      setParticipantCount(count || 0);
    } catch (error) {
      console.error('Error fetching participant count:', error);
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ladder_participants')
        .select(`
          id,
          ladder_id,
          player_id,
          joined_at,
          is_active,
          profiles:player_id (
            id,
            first_name,
            last_name,
            elo_rating,
            matches_played,
            matches_won
          )
        `)
        .eq('ladder_id', ladderId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      const participantsWithProfiles = (data || []).map(item => ({
        ...item,
        profile: item.profiles as Profile,
      }));

      setParticipants(participantsWithProfiles);
      setParticipantCount(participantsWithProfiles.length);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load participants. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeParticipant = async (participantId: string, playerName: string) => {
    setRemovingParticipantId(participantId);

    try {
      const { error } = await supabase
        .from('ladder_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: 'Participant Removed',
        description: `${playerName} has been removed from the ladder.`,
      });

      // Refresh the participants list
      await fetchParticipants();
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove participant. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRemovingParticipantId(null);
    }
  };

  useEffect(() => {
    fetchParticipantCount();
  }, [ladderId]);

  useEffect(() => {
    if (open) {
      fetchParticipants();
    }
  }, [open, ladderId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
          <Users className="h-3 w-3 mr-1" />
          {participantCount}
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[600px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Ladder Participants</DialogTitle>
          <DialogDescription>
            Participants in "{ladderName}" ladder
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading participants...</span>
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No participants in this ladder yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {participant.profile.first_name} {participant.profile.last_name}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>ELO: {participant.profile.elo_rating}</span>
                        <span>•</span>
                        <span>{participant.profile.matches_played} matches</span>
                        <span>•</span>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Joined {formatDistanceToNow(new Date(participant.joined_at))} ago
                        </div>
                      </div>
                    </div>
                  </div>

                  {isClubAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={removingParticipantId === participant.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {removingParticipantId === participant.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Participant</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{participant.profile.first_name} {participant.profile.last_name}" 
                            from this ladder? They will lose their current ranking position.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={removingParticipantId === participant.id}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeParticipant(
                              participant.id,
                              `${participant.profile.first_name} ${participant.profile.last_name}`
                            )}
                            disabled={removingParticipantId === participant.id}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {removingParticipantId === participant.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Removing...
                              </>
                            ) : (
                              'Remove Participant'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && participants.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total participants: {participants.length}</span>
              <Badge variant="outline">
                Updated {new Date().toLocaleTimeString()}
              </Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
