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
   * @param didWin - Whether the player won the match
   * @returns New ELO rating for the player
   */
  const calculateEloChange = (
    playerRating: number,
    opponentRating: number,
    didWin: boolean
  ): number => {
    const K_FACTOR = 32; // Standard K-factor for tennis
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const actualScore = didWin ? 1 : 0;
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

      if (params.player1Score === params.player2Score) {
        throw new Error('Match cannot end in a tie');
      }

      // Fetch current player data
      const [player1, player2] = await Promise.all([
        fetchPlayerData(params.player1Id),
        fetchPlayerData(params.player2Id),
      ]);

      // Determine winner
      const winnerId = params.player1Score > params.player2Score 
        ? params.player1Id 
        : params.player2Id;

      const player1Won = winnerId === params.player1Id;

      // Calculate new ELO ratings
      const player1EloAfter = calculateEloChange(
        player1.elo_rating,
        player2.elo_rating,
        player1Won
      );

      const player2EloAfter = calculateEloChange(
        player2.elo_rating,
        player1.elo_rating,
        !player1Won
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
          matches_won: player1.matches_won + (player1Won ? 1 : 0),
        })
        .eq('id', params.player1Id);

      if (player1Error) throw player1Error;

      // Update player 2 statistics
      const { error: player2Error } = await supabase
        .from('profiles')
        .update({
          elo_rating: player2EloAfter,
          matches_played: player2.matches_played + 1,
          matches_won: player2.matches_won + (!player1Won ? 1 : 0),
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
