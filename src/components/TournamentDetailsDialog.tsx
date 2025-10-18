import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTournamentDetails } from '@/hooks/useTournamentDetails';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Calendar, Plus, ArrowUpDown } from 'lucide-react';
import RecordTournamentMatchDialog from '@/components/RecordTournamentMatchDialog';

interface TournamentDetailsDialogProps {
  tournamentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export default function TournamentDetailsDialog({
  tournamentId,
  open,
  onOpenChange,
  userId,
}: TournamentDetailsDialogProps) {
  const { tournament, loading, refetch } = useTournamentDetails(tournamentId);
  const [recordMatchDialogOpen, setRecordMatchDialogOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Set initial active group when tournament loads
  useEffect(() => {
    if (tournament && tournament.groups.length > 0 && !activeGroupId) {
      setActiveGroupId(tournament.groups[0].id);
    }
  }, [tournament, activeGroupId]);

  if (!tournament) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getStatusBadge = (status: string) => {
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

  const renderStandings = (group: any) => {
    if (group.standings.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No participants yet
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-center w-16">Pts</TableHead>
              <TableHead className="text-center w-16">W</TableHead>
              <TableHead className="text-center w-16">L</TableHead>
              <TableHead className="text-center w-20">Sets</TableHead>
              <TableHead className="text-center w-20">Games</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.standings.map((standing: any, index: number) => (
              <TableRow key={standing.participantId}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[150px] sm:max-w-none">
                      {standing.playerName}
                    </span>
                    {standing.isGuest && (
                      <Badge variant="outline" className="text-xs">Guest</Badge>
                    )}
                    {standing.playerId === userId && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold">{standing.points}</TableCell>
                <TableCell className="text-center">{standing.wins}</TableCell>
                <TableCell className="text-center">{standing.losses}</TableCell>
                <TableCell className="text-center text-sm">
                  {standing.setsWon}-{standing.setsLost}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {standing.gamesWon}-{standing.gamesLost}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderMatches = (group: any) => {
    // Filter out invalid matches where participants don't exist
    const validMatches = group.matches.filter((match: any) => {
      const player1 = group.participants.find((p: any) => p.player_id === match.player1_id);
      const player2 = group.participants.find((p: any) => p.player_id === match.player2_id);
      return player1 && player2;
    });

    if (validMatches.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No matches recorded yet
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {validMatches.map((match: any) => {
          const player1 = group.participants.find((p: any) => p.player_id === match.player1_id);
          const player2 = group.participants.find((p: any) => p.player_id === match.player2_id);
          
          // Extra safety check
          if (!player1 || !player2) return null;

          const player1Name = player1?.is_guest
            ? (player1.guest_deleted_at ? 'Guest' : (player1.guest_name || 'Guest'))
            : (player1?.profiles ? `${player1.profiles.first_name} ${player1.profiles.last_name}` : 'Unknown');

          const player2Name = player2?.is_guest
            ? (player2.guest_deleted_at ? 'Guest' : (player2.guest_name || 'Guest'))
            : (player2?.profiles ? `${player2.profiles.first_name} ${player2.profiles.last_name}` : 'Unknown');

          const isCompleted = match.player1_score !== null && match.player2_score !== null;

          return (
            <Card key={match.id} className="overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{player1Name}</span>
                      {player1?.player_id === userId && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{player2Name}</span>
                      {player2?.player_id === userId && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                  </div>

                  {isCompleted ? (
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-lg">
                        {match.player1_score} - {match.player2_score}
                      </div>
                      <div className="text-xs text-muted-foreground">sets</div>
                    </div>
                  ) : (
                    <Badge variant="outline" className="flex-shrink-0">Pending</Badge>
                  )}
                </div>

                {isCompleted && match.created_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Recorded {format(new Date(match.created_at), 'MMM d, h:mm a')}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="pr-8">
              <DialogTitle className="text-xl sm:text-2xl mb-2">{tournament.name}</DialogTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}</span>
                </span>
                {getStatusBadge(tournament.status)}
                {tournament.winner_bonus_elo > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4" />
                    <span>+{tournament.winner_bonus_elo} ELO Bonus</span>
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground text-sm">Loading tournament details...</p>
            </div>
          ) : tournament.groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No groups configured yet</p>
            </div>
          ) : (
            <div className="mt-4">
              {tournament.groups.length > 1 && (
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full w-full overflow-x-auto">
                    {tournament.groups.map((group) => (
                      <Button
                        key={group.id}
                        variant={activeGroupId === group.id ? 'default' : 'ghost'}
                        className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all whitespace-nowrap ${
                          activeGroupId === group.id
                            ? 'shadow-sm'
                            : 'hover:bg-background/50'
                        }`}
                        onClick={() => setActiveGroupId(group.id)}
                      >
                        <span className="text-xs sm:text-sm">{group.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {tournament.groups
                .filter((group) => tournament.groups.length === 1 || activeGroupId === group.id)
                .map((group) => (
                  <div key={group.id} className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                              <ArrowUpDown className="h-4 w-4" />
                              Standings
                            </CardTitle>
                            {group.level && (
                              <CardDescription>
                                Level: {group.level}
                                {group.gender && ` • ${group.gender}`}
                                {group.match_type && ` • ${group.match_type}`}
                              </CardDescription>
                            )}
                          </div>
                          {tournament.status === 'active' && (
                            <Button
                              onClick={() => setRecordMatchDialogOpen(true)}
                              size="sm"
                              className="flex-shrink-0"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Record Match
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {renderStandings(group)}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base sm:text-lg">Match Results</CardTitle>
                      <CardDescription>
                        {group.matches.filter((m: any) => m.player1_score !== null && m.player2_score !== null).length} completed matches
                      </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderMatches(group)}
                      </CardContent>
                    </Card>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {tournament && (
        <RecordTournamentMatchDialog
          tournamentId={tournament.id}
          currentPlayerId={userId}
          open={recordMatchDialogOpen}
          onOpenChange={setRecordMatchDialogOpen}
          showTrigger={false}
          onMatchRecorded={() => {
            refetch();
            setRecordMatchDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
