import { useState } from 'react';
import { format } from 'date-fns';
import { useUserTournaments } from '@/hooks/useUserTournaments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Users } from 'lucide-react';
import TournamentDetailsDialog from '@/components/TournamentDetailsDialog';
import type { Database } from '@/integrations/supabase/types';

type TournamentStatus = Database['public']['Enums']['tournament_status'];

interface UserTournamentsListProps {
  userId: string;
  clubId: string;
}

export default function UserTournamentsList({ userId, clubId }: UserTournamentsListProps) {
  const { tournaments, loading, filterByStatus } = useUserTournaments(userId, clubId);
  const [activeTab, setActiveTab] = useState<TournamentStatus>('active');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

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

  const renderTournamentCard = (tournament: any) => (
    <Card 
      key={tournament.id} 
      className="hover:bg-accent/5 transition-colors cursor-pointer"
      onClick={() => {
        setSelectedTournamentId(tournament.id);
        setDetailsDialogOpen(true);
      }}
    >
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
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>
              {tournament.groups.length} {tournament.groups.length === 1 ? 'Group' : 'Groups'}
            </span>
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

        {/* Display user's groups */}
        {tournament.groups.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Your Groups:</p>
            <div className="flex flex-wrap gap-1.5">
              {tournament.groups.map((group: any) => (
                <Badge key={group.id} variant="outline" className="text-xs">
                  {group.name}
                  {group.level && ` • ${group.level}`}
                  {group.match_type && ` • ${group.match_type}`}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTournamentList = (status: TournamentStatus) => {
    const filtered = filterByStatus(status);

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
        active: "You're not in any active tournaments. Check back soon!",
        completed: "You haven't completed any tournaments yet.",
      };

      return (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{messages[status as 'active' | 'completed']}</p>
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
      <div className="mb-6">
        <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full w-full sm:w-auto">
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
            {filterByStatus('active').length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] sm:text-xs px-1.5 py-0">
                {filterByStatus('active').length}
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
            {filterByStatus('completed').length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px] sm:text-xs px-1.5 py-0">
                {filterByStatus('completed').length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div>
        {activeTab === 'active' && renderTournamentList('active')}
        {activeTab === 'completed' && renderTournamentList('completed')}
      </div>

    <TournamentDetailsDialog
      tournamentId={selectedTournamentId}
      open={detailsDialogOpen}
      onOpenChange={setDetailsDialogOpen}
      userId={userId}
    />
    </>
  );
}
