import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecordMatchParams {
  ladderId: string;
  player1Id: string;
  player2Id: string;
  player1Score: number;
  player2Score: number;
  matchDate: Date;
}

interface Player {
  id: string;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
}

/**
 * Custom hook for recording tennis matches with ELO rating calculation
 * Follows clean code principles with single responsibility and proper error handling
 */
export function useRecordMatch() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  /**
   * Calculate ELO rating change based on match outcome
   * @param playerRating - Current ELO rating of the player
   * @param opponentRating - Current ELO rating of the opponent
   * @param actualScore - Match result: 1 for win, 0.5 for tie, 0 for loss
   * @returns New ELO rating for the player
   */
  const calculateEloChange = (
    playerRating: number,
    opponentRating: number,
    actualScore: number
  ): number => {
    const K_FACTOR = 32; // Standard K-factor for tennis
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const ratingChange = Math.round(K_FACTOR * (actualScore - expectedScore));
    
    return playerRating + ratingChange;
  };

  /**
   * Fetch current player data from the database
   */
  const fetchPlayerData = async (playerId: string): Promise<Player> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, elo_rating, matches_played, matches_won')
      .eq('id', playerId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Player not found');

    return data;
  };

  /**
   * Record a match and update player statistics
   */
  const recordMatch = async (params: RecordMatchParams): Promise<void> => {
    setIsSubmitting(true);

    try {
      // Validate that players are different
      if (params.player1Id === params.player2Id) {
        throw new Error('Cannot record a match between the same player');
      }

      // Validate scores
      if (params.player1Score < 0 || params.player2Score < 0) {
        throw new Error('Scores must be non-negative');
      }

      // Validate that both players are active participants in the ladder
      const { data: participants, error: participantsError } = await supabase
        .from('ladder_participants')
        .select('player_id')
        .eq('ladder_id', params.ladderId)
        .eq('is_active', true)
        .in('player_id', [params.player1Id, params.player2Id]);

      if (participantsError) throw participantsError;

      if (!participants || participants.length !== 2) {
        const missingPlayers = [];
        const participantIds = participants?.map(p => p.player_id) || [];
        if (!participantIds.includes(params.player1Id)) {
          missingPlayers.push('Player 1');
        }
        if (!participantIds.includes(params.player2Id)) {
          missingPlayers.push('Player 2');
        }
        throw new Error(`${missingPlayers.join(' and ')} must join this ladder before recording a match`);
      }

      // Fetch current player data
      const [player1, player2] = await Promise.all([
        fetchPlayerData(params.player1Id),
        fetchPlayerData(params.player2Id),
      ]);

      // Determine winner (or null if tie)
      const isTie = params.player1Score === params.player2Score;
      const winnerId = isTie 
        ? null 
        : (params.player1Score > params.player2Score ? params.player1Id : params.player2Id);

      // For ties, both players get 0.5 score; otherwise 1 for winner, 0 for loser
      const player1MatchScore = isTie ? 0.5 : (winnerId === params.player1Id ? 1 : 0);
      const player2MatchScore = isTie ? 0.5 : (winnerId === params.player2Id ? 1 : 0);

      // Calculate new ELO ratings
      const player1EloAfter = calculateEloChange(
        player1.elo_rating,
        player2.elo_rating,
        player1MatchScore
      );

      const player2EloAfter = calculateEloChange(
        player2.elo_rating,
        player1.elo_rating,
        player2MatchScore
      );

      // Start a transaction to ensure data consistency
      const { error: matchError } = await supabase.from('matches').insert([
        {
          ladder_id: params.ladderId,
          player1_id: params.player1Id,
          player2_id: params.player2Id,
          player1_score: params.player1Score,
          player2_score: params.player2Score,
          winner_id: winnerId,
          player1_elo_before: player1.elo_rating,
          player2_elo_before: player2.elo_rating,
          player1_elo_after: player1EloAfter,
          player2_elo_after: player2EloAfter,
          match_date: params.matchDate.toISOString().split('T')[0],
        },
      ]);

      if (matchError) throw matchError;

      // Update player 1 statistics
      const { error: player1Error } = await supabase
        .from('profiles')
        .update({
          elo_rating: player1EloAfter,
          matches_played: player1.matches_played + 1,
          matches_won: player1.matches_won + (player1MatchScore === 1 ? 1 : 0),
        })
        .eq('id', params.player1Id);

      if (player1Error) throw player1Error;

      // Update player 2 statistics
      const { error: player2Error } = await supabase
        .from('profiles')
        .update({
          elo_rating: player2EloAfter,
          matches_played: player2.matches_played + 1,
          matches_won: player2.matches_won + (player2MatchScore === 1 ? 1 : 0),
        })
        .eq('id', params.player2Id);

      if (player2Error) throw player2Error;

      toast({
        title: 'Success!',
        description: 'Match has been recorded successfully.',
      });
    } catch (error: any) {
      console.error('Error recording match:', error);
      
      const errorMessage = error.message || 'Failed to record match. Please try again.';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    recordMatch,
    isSubmitting,
  };
}
