import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecordTournamentMatchParams {
  tournamentId: string;
  groupId: string;
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

interface TournamentParticipant {
  player_id: string;
  is_guest: boolean;
  guest_name: string | null;
}

/**
 * Custom hook for recording tournament matches with ELO rating calculation
 * Handles both registered members and guest players
 * ELO only changes when both players are registered members
 */
export function useRecordTournamentMatch() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  /**
   * Format date to YYYY-MM-DD in local timezone (avoids timezone shift issues)
   */
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Calculate ELO rating change based on match outcome
   * Uses the standard K-factor of 32 for tennis
   */
  const calculateEloChange = (
    playerRating: number,
    opponentRating: number,
    actualScore: number
  ): number => {
    const K_FACTOR = 32; // Standard K-factor for tennis (same as ladder matches)
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
   * Check if participants are in the tournament group and if they are guests
   */
  const fetchParticipantInfo = async (
    groupId: string,
    player1Id: string,
    player2Id: string
  ): Promise<{ player1: TournamentParticipant; player2: TournamentParticipant }> => {
    const { data, error } = await supabase
      .from('tournament_participants')
      .select('player_id, is_guest, guest_name')
      .eq('group_id', groupId)
      .in('player_id', [player1Id, player2Id]);

    if (error) throw error;

    if (!data || data.length !== 2) {
      throw new Error('Both players must be participants in this tournament group');
    }

    const player1 = data.find((p) => p.player_id === player1Id);
    const player2 = data.find((p) => p.player_id === player2Id);

    if (!player1 || !player2) {
      throw new Error('One or both players not found in tournament group');
    }

    return { player1, player2 };
  };

  /**
   * Verify tournament is in active status
   */
  const verifyTournamentActive = async (tournamentId: string): Promise<void> => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('status')
      .eq('id', tournamentId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Tournament not found');
    if (data.status !== 'active') {
      throw new Error('Tournament must be in active status to record matches');
    }
  };

  /**
   * Record a tournament match and update player statistics
   */
  const recordMatch = async (params: RecordTournamentMatchParams): Promise<void> => {
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

      // Verify tournament is active
      await verifyTournamentActive(params.tournamentId);

      // Fetch participant info to determine if guests are involved
      const { player1: p1Info, player2: p2Info } = await fetchParticipantInfo(
        params.groupId,
        params.player1Id,
        params.player2Id
      );

      // Determine if ELO should be affected (only if both are registered members)
      const affectsElo = !p1Info.is_guest && !p2Info.is_guest;

      // Format the match date
      const matchDateStr = formatDateLocal(params.matchDate);

      // Check for duplicate matches - in round robin, same players shouldn't play multiple times in same group
      const { data: existingMatches, error: duplicateError } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('group_id', params.groupId)
        .or(`and(player1_id.eq.${params.player1Id},player2_id.eq.${params.player2Id}),and(player1_id.eq.${params.player2Id},player2_id.eq.${params.player1Id})`);

      if (duplicateError) throw duplicateError;

      if (existingMatches && existingMatches.length > 0) {
        throw new Error('These players have already played each other in this group. Each pair should only play once in round robin.');
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

      let player1EloAfter = player1.elo_rating;
      let player2EloAfter = player2.elo_rating;

      // Calculate new ELO ratings only if match affects ELO
      if (affectsElo) {
        player1EloAfter = calculateEloChange(
          player1.elo_rating,
          player2.elo_rating,
          player1MatchScore
        );

        player2EloAfter = calculateEloChange(
          player2.elo_rating,
          player1.elo_rating,
          player2MatchScore
        );
      }

      // Insert tournament match record
      const { error: matchError } = await supabase.from('tournament_matches').insert([
        {
          tournament_id: params.tournamentId,
          group_id: params.groupId,
          player1_id: params.player1Id,
          player2_id: params.player2Id,
          player1_score: params.player1Score,
          player2_score: params.player2Score,
          winner_id: winnerId,
          affects_elo: affectsElo,
          player1_elo_before: player1.elo_rating,
          player2_elo_before: player2.elo_rating,
          player1_elo_after: player1EloAfter,
          player2_elo_after: player2EloAfter,
          match_date: matchDateStr,
        },
      ]);

      if (matchError) throw matchError;

      // Update player ELO ratings and statistics only if match affects ELO
      if (affectsElo) {
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
          description: 'Tournament match has been recorded and ELO ratings updated.',
        });
      } else {
        const guestName = p1Info.is_guest ? p1Info.guest_name : p2Info.guest_name;
        toast({
          title: 'Success!',
          description: `Tournament match has been recorded. ELO not affected because ${guestName || 'a guest'} participated.`,
        });
      }
    } catch (error: any) {
      console.error('Error recording tournament match:', error);
      
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
