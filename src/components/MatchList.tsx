import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface Match {
  id: string;
  match_date: string;
  player1_score: number;
  player2_score: number;
  winner_id: string;
  player1_elo_before: number;
  player2_elo_before: number;
  player1_elo_after: number;
  player2_elo_after: number;
  player1: {
    id: string;
    first_name: string;
    last_name: string;
  };
  player2: {
    id: string;
    first_name: string;
    last_name: string;
  };
  ladder: {
    name: string;
  };
}

interface MatchListProps {
  clubId: string;
  currentPlayerId: string;
  refreshTrigger?: number;
}

/**
 * Component to display recent matches with clean formatting
 * Implements separation of concerns with dedicated formatting functions
 */
export default function MatchList({ clubId, currentPlayerId, refreshTrigger }: MatchListProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [clubId, refreshTrigger]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          match_date,
          player1_score,
          player2_score,
          winner_id,
          player1_elo_before,
          player2_elo_before,
          player1_elo_after,
          player2_elo_after,
          player1:player1_id (
            id,
            first_name,
            last_name
          ),
          player2:player2_id (
            id,
            first_name,
            last_name
          ),
          ladder:ladder_id (
            name
          )
        `)
        .order('match_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setMatches(data as unknown as Match[]);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerName = (player: { first_name: string; last_name: string }): string => {
    return `${player.first_name} ${player.last_name}`;
  };

  const getEloChange = (before: number, after: number): number => {
    return after - before;
  };

  const renderEloChange = (change: number): JSX.Element => {
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs font-medium">
          {isPositive ? '+' : ''}{change}
        </span>
      </div>
    );
  };

  const isCurrentPlayer = (playerId: string): boolean => {
    return playerId === currentPlayerId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No matches recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const player1Won = match.winner_id === match.player1.id;
        const player1Change = getEloChange(match.player1_elo_before, match.player1_elo_after);
        const player2Change = getEloChange(match.player2_elo_before, match.player2_elo_after);

        return (
          <div
            key={match.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {match.ladder.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(match.match_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Player 1 */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <h3 className="font-medium">
                    {getPlayerName(match.player1)}
                  </h3>
                  {isCurrentPlayer(match.player1.id) && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                  {player1Won && (
                    <Badge className="text-xs bg-gradient-court">
                      Winner
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs text-muted-foreground">
                    {match.player1_elo_before} → {match.player1_elo_after}
                  </span>
                  {renderEloChange(player1Change)}
                </div>
              </div>

              {/* Score */}
              <div className="text-center px-4">
                <div className="text-2xl font-bold">
                  {match.player1_score} - {match.player2_score}
                </div>
              </div>

              {/* Player 2 */}
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  {!player1Won && (
                    <Badge className="text-xs bg-gradient-court">
                      Winner
                    </Badge>
                  )}
                  {isCurrentPlayer(match.player2.id) && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                  <h3 className="font-medium">
                    {getPlayerName(match.player2)}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {renderEloChange(player2Change)}
                  <span className="text-xs text-muted-foreground">
                    {match.player2_elo_before} → {match.player2_elo_after}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
