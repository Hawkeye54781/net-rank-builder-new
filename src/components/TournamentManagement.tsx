import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Trophy, Calendar, Users, Play } from 'lucide-react';
import EditTournamentDialog from '@/components/EditTournamentDialog';
import { useCompleteTournament } from '@/hooks/useCompleteTournament';
import type { Database } from '@/integrations/supabase/types';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentStatus = Database['public']['Enums']['tournament_status'];

interface TournamentWithGroups extends Tournament {
  group_count?: number;
}

interface TournamentManagementProps {
  clubId: string;
  onTournamentUpdated: () => void;
}

export default function TournamentManagement({ clubId, onTournamentUpdated }: TournamentManagementProps) {
  const [tournaments, setTournaments] = useState<TournamentWithGroups[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentWithGroups | null>(null);
  const [activeTab, setActiveTab] = useState<TournamentStatus>('active');
  const { toast } = useToast();
  const { completeTournament } = useCompleteTournament();

  useEffect(() => {
    fetchTournaments();
  }, [clubId]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      // Fetch tournaments with group counts
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('club_id', clubId)
        .order('start_date', { ascending: false });

      if (tournamentsError) throw tournamentsError;

      // Fetch group counts for each tournament
      const tournamentsWithCounts = await Promise.all(
        (tournamentsData || []).map(async (tournament) => {
          const { count } = await supabase
            .from('tournament_groups')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);

          return {
            ...tournament,
            group_count: count || 0,
          };
        })
      );

      setTournaments(tournamentsWithCounts);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tournamentId: string, tournamentName: string) => {
    setDeletingId(tournamentId);

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Tournament "${tournamentName}" has been deleted.`,
      });

      fetchTournaments();
      onTournamentUpdated();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tournament. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleActivate = async (tournamentId: string, tournamentName: string) => {
    setActivatingId(tournamentId);

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'active' })
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Tournament "${tournamentName}" is now active. Players can start recording matches.`,
      });

      fetchTournaments();
      onTournamentUpdated();
    } catch (error) {
      console.error('Error activating tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate tournament. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActivatingId(null);
    }
  };

  const handleComplete = async (tournamentId: string, tournamentName: string) => {
    setCompletingId(tournamentId);

    try {
      const result = await completeTournament(tournamentId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete tournament');
      }

      toast({
        title: 'Success',
        description: `Tournament "${tournamentName}" has been completed. Winners have been calculated and bonus ELO awarded.`,
      });

      fetchTournaments();
      onTournamentUpdated();
    } catch (error) {
      console.error('Error completing tournament:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete tournament. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCompletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getStatusBadge = (status: TournamentStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filterTournamentsByStatus = (status: TournamentStatus) => {
    return tournaments.filter((t) => t.status === status);
  };

  const renderTournamentCard = (tournament: TournamentWithGroups) => (
    <Card key={tournament.id} className="hover:bg-accent/5 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base sm:text-lg truncate">{tournament.name}</CardTitle>
              {getStatusBadge(tournament.status)}
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                disabled={deletingId === tournament.id || completingId === tournament.id || activatingId === tournament.id}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {tournament.status !== 'completed' && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      setSelectedTournament(tournament);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Tournament
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {tournament.status === 'draft' && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => handleActivate(tournament.id, tournament.name)}
                    disabled={activatingId === tournament.id}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Activate Tournament
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {tournament.status === 'active' && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      setSelectedTournament(tournament);
                      setCompleteDialogOpen(true);
                    }}
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    Complete Tournament
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {tournament.status === 'draft' && (
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onSelect={() => {
                    setSelectedTournament(tournament);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Tournament
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{tournament.group_count} {tournament.group_count === 1 ? 'Group' : 'Groups'}</span>
          </div>
          {tournament.winner_bonus_elo > 0 && (
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>+{tournament.winner_bonus_elo} ELO Bonus</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="capitalize">{tournament.format.replace('_', ' ')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTournamentList = (status: TournamentStatus) => {
    const filtered = filterTournamentsByStatus(status);

    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading tournaments...</p>
        </div>
      );
    }

    if (filtered.length === 0) {
      const messages = {
        draft: 'No draft tournaments. Create one to get started!',
        active: 'No active tournaments. Activate a draft tournament to begin.',
        completed: 'No completed tournaments yet.',
      };

      return (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{messages[status]}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((tournament) => renderTournamentCard(tournament))}
      </div>
    );
  };

  return (
    <>
      {/* Edit Tournament Dialog */}
      {selectedTournament && (
        <EditTournamentDialog
          tournament={selectedTournament}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onTournamentUpdated={() => {
            fetchTournaments();
            onTournamentUpdated();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTournament?.name}"? This action cannot be
              undone and will remove all associated groups, matches, and participant records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTournament) {
                  handleDelete(selectedTournament.id, selectedTournament.name);
                  setDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deletingId === selectedTournament?.id}
            >
              {deletingId === selectedTournament?.id ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to complete "{selectedTournament?.name}"? This will calculate
              final standings, award bonus ELO points to winners, and mark the tournament as
              completed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTournament) {
                  handleComplete(selectedTournament.id, selectedTournament.name);
                  setCompleteDialogOpen(false);
                }
              }}
              disabled={completingId === selectedTournament?.id}
            >
              {completingId === selectedTournament?.id ? 'Completing...' : 'Complete Tournament'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tournaments List with Segmented Control */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full w-full sm:w-auto">
          <Button
            variant={activeTab === 'draft' ? 'default' : 'ghost'}
            className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all ${
              activeTab === 'draft' 
                ? 'shadow-sm' 
                : 'hover:bg-background/50'
            }`}
            onClick={() => setActiveTab('draft')}
          >
            <span className="text-xs sm:text-sm">Draft</span>
            {filterTournamentsByStatus('draft').length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] sm:text-xs px-1.5 py-0">
                {filterTournamentsByStatus('draft').length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'active' ? 'default' : 'ghost'}
            className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all ${
              activeTab === 'active' 
                ? 'shadow-sm' 
                : 'hover:bg-background/50'
            }`}
            onClick={() => setActiveTab('active')}
          >
            <span className="text-xs sm:text-sm">Active</span>
            {filterTournamentsByStatus('active').length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] sm:text-xs px-1.5 py-0">
                {filterTournamentsByStatus('active').length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all ${
              activeTab === 'completed' 
                ? 'shadow-sm' 
                : 'hover:bg-background/50'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            <span className="text-xs sm:text-sm">Completed</span>
            {filterTournamentsByStatus('completed').length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] sm:text-xs px-1.5 py-0">
                {filterTournamentsByStatus('completed').length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div>
        {activeTab === 'draft' && renderTournamentList('draft')}
        {activeTab === 'active' && renderTournamentList('active')}
        {activeTab === 'completed' && renderTournamentList('completed')}
      </div>
    </>
  );
}
