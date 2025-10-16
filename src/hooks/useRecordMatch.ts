import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecordMatchParams {
  ladderId: string;
  player1Id: string;
  player2Id: string;
  player1PartnerId?: string;
  player2PartnerId?: string;
  player1Score: number;
  player2Score: number;
  matchDate: Date;
}

interface Player {
  id: string;
  singles_elo: number;
  doubles_elo: number;
  singles_matches_played: number;
  singles_matches_won: number;
  doubles_matches_played: number;
  doubles_matches_won: number;
}

interface Ladder {
  id: string;
  type: string; // 'singles', 'doubles', or 'mixed'
}

/**
 * Custom hook for recording tennis matches with ELO rating calculation
 * Follows clean code principles with single responsibility and proper error handling
 */
export function useRecordMatch() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  /**
   * Format date to YYYY-MM-DD in local timezone (avoids timezone shift issues)
   * @param date - Date object to format
   * @returns Date string in YYYY-MM-DD format
   */
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
      .select('id, singles_elo, doubles_elo, singles_matches_played, singles_matches_won, doubles_matches_played, doubles_matches_won')
      .eq('id', playerId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Player not found');

    return data;
  };

  /**
   * Fetch ladder type to determine which ELO to use
   */
  const fetchLadderType = async (ladderId: string): Promise<string> => {
    const { data, error } = await supabase
      .from('ladders')
      .select('type')
      .eq('id', ladderId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Ladder not found');

    return data.type;
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

      // Fetch ladder type to determine which ELO to use
      const ladderType = await fetchLadderType(params.ladderId);
      const isDoubles = ladderType === 'doubles' || ladderType === 'mixed';

      // Build list of all player IDs to validate
      const playerIds = [params.player1Id, params.player2Id];
      if (params.player1PartnerId) playerIds.push(params.player1PartnerId);
      if (params.player2PartnerId) playerIds.push(params.player2PartnerId);

      // Validate that all players are active participants in the ladder
      const { data: participants, error: participantsError } = await supabase
        .from('ladder_participants')
        .select('player_id')
        .eq('ladder_id', params.ladderId)
        .eq('is_active', true)
        .in('player_id', playerIds);

      if (participantsError) throw participantsError;

      const participantIds = participants?.map(p => p.player_id) || [];
      const missingPlayers: string[] = [];
      
      if (!participantIds.includes(params.player1Id)) missingPlayers.push('Player 1');
      if (!participantIds.includes(params.player2Id)) missingPlayers.push('Player 2');
      if (params.player1PartnerId && !participantIds.includes(params.player1PartnerId)) missingPlayers.push('Player 1 Partner');
      if (params.player2PartnerId && !participantIds.includes(params.player2PartnerId)) missingPlayers.push('Player 2 Partner');
      
      if (missingPlayers.length > 0) {
        throw new Error(`${missingPlayers.join(', ')} must join this ladder before recording a match`);
      }

      // Check for duplicate matches (same date, players, and scores)
      const matchDateStr = formatDateLocal(params.matchDate);
      const { data: existingMatches, error: duplicateError } = await supabase
        .from('matches')
        .select('id')
        .eq('ladder_id', params.ladderId)
        .eq('match_date', matchDateStr)
        .or(`and(player1_id.eq.${params.player1Id},player2_id.eq.${params.player2Id}),and(player1_id.eq.${params.player2Id},player2_id.eq.${params.player1Id})`)
        .eq('player1_score', params.player1Score)
        .eq('player2_score', params.player2Score);

      if (duplicateError) throw duplicateError;

      if (existingMatches && existingMatches.length > 0) {
        throw new Error('This match has already been recorded. Duplicate matches are not allowed.');
      }

      // Fetch current player data (including partners for doubles)
      const playerFetches = [
        fetchPlayerData(params.player1Id),
        fetchPlayerData(params.player2Id),
      ];
      if (params.player1PartnerId) playerFetches.push(fetchPlayerData(params.player1PartnerId));
      if (params.player2PartnerId) playerFetches.push(fetchPlayerData(params.player2PartnerId));
      
      const playerData = await Promise.all(playerFetches);
      const player1 = playerData[0];
      const player2 = playerData[1];
      const player1Partner = params.player1PartnerId ? playerData[2] : undefined;
      const player2Partner = params.player2PartnerId ? (params.player1PartnerId ? playerData[3] : playerData[2]) : undefined;

      // Determine winner (or null if tie)
      const isTie = params.player1Score === params.player2Score;
      const winnerId = isTie 
        ? null 
        : (params.player1Score > params.player2Score ? params.player1Id : params.player2Id);

      // For ties, both players get 0.5 score; otherwise 1 for winner, 0 for loser
      const player1MatchScore = isTie ? 0.5 : (winnerId === params.player1Id ? 1 : 0);
      const player2MatchScore = isTie ? 0.5 : (winnerId === params.player2Id ? 1 : 0);

      // Get current ELO ratings based on ladder type
      // For doubles, calculate team averages
      let team1AvgElo: number;
      let team2AvgElo: number;
      
      if (isDoubles && player1Partner && player2Partner) {
        // Doubles: average the partners' doubles ELOs
        team1AvgElo = (player1.doubles_elo + player1Partner.doubles_elo) / 2;
        team2AvgElo = (player2.doubles_elo + player2Partner.doubles_elo) / 2;
      } else {
        // Singles: use individual ELOs
        team1AvgElo = player1.singles_elo;
        team2AvgElo = player2.singles_elo;
      }

      // Calculate new ELO ratings for all players
      const player1EloAfter = calculateEloChange(
        isDoubles ? player1.doubles_elo : player1.singles_elo,
        team2AvgElo,
        player1MatchScore
      );

      const player2EloAfter = calculateEloChange(
        isDoubles ? player2.doubles_elo : player2.singles_elo,
        team1AvgElo,
        player2MatchScore
      );
      
      const player1PartnerEloAfter = player1Partner ? calculateEloChange(
        player1Partner.doubles_elo,
        team2AvgElo,
        player1MatchScore
      ) : undefined;
      
      const player2PartnerEloAfter = player2Partner ? calculateEloChange(
        player2Partner.doubles_elo,
        team1AvgElo,
        player2MatchScore
      ) : undefined;

      // Start a transaction to ensure data consistency
      const { error: matchError } = await supabase.from('matches').insert([
        {
          ladder_id: params.ladderId,
          player1_id: params.player1Id,
          player2_id: params.player2Id,
          player1_partner_id: params.player1PartnerId || null,
          player2_partner_id: params.player2PartnerId || null,
          player1_score: params.player1Score,
          player2_score: params.player2Score,
          winner_id: winnerId,
          player1_elo_before: isDoubles ? player1.doubles_elo : player1.singles_elo,
          player2_elo_before: isDoubles ? player2.doubles_elo : player2.singles_elo,
          player1_elo_after: player1EloAfter,
          player2_elo_after: player2EloAfter,
          player1_partner_elo_before: player1Partner?.doubles_elo || null,
          player2_partner_elo_before: player2Partner?.doubles_elo || null,
          player1_partner_elo_after: player1PartnerEloAfter || null,
          player2_partner_elo_after: player2PartnerEloAfter || null,
          match_date: formatDateLocal(params.matchDate),
        },
      ]);

      if (matchError) throw matchError;

      // Prepare updates based on match type
      const player1Updates = isDoubles ? {
        doubles_elo: player1EloAfter,
        doubles_matches_played: player1.doubles_matches_played + 1,
        doubles_matches_won: player1.doubles_matches_won + (player1MatchScore === 1 ? 1 : 0),
      } : {
        singles_elo: player1EloAfter,
        singles_matches_played: player1.singles_matches_played + 1,
        singles_matches_won: player1.singles_matches_won + (player1MatchScore === 1 ? 1 : 0),
      };

      const player2Updates = isDoubles ? {
        doubles_elo: player2EloAfter,
        doubles_matches_played: player2.doubles_matches_played + 1,
        doubles_matches_won: player2.doubles_matches_won + (player2MatchScore === 1 ? 1 : 0),
      } : {
        singles_elo: player2EloAfter,
        singles_matches_played: player2.singles_matches_played + 1,
        singles_matches_won: player2.singles_matches_won + (player2MatchScore === 1 ? 1 : 0),
      };

      // Update player 1 statistics
      const { error: player1Error } = await supabase
        .from('profiles')
        .update(player1Updates)
        .eq('id', params.player1Id);

      if (player1Error) throw player1Error;

      // Update player 2 statistics
      const { error: player2Error } = await supabase
        .from('profiles')
        .update(player2Updates)
        .eq('id', params.player2Id);

      if (player2Error) throw player2Error;

      // Update partner statistics for doubles matches
      if (player1Partner && player1PartnerEloAfter) {
        const { error: partner1Error } = await supabase
          .from('profiles')
          .update({
            doubles_elo: player1PartnerEloAfter,
            doubles_matches_played: player1Partner.doubles_matches_played + 1,
            doubles_matches_won: player1Partner.doubles_matches_won + (player1MatchScore === 1 ? 1 : 0),
          })
          .eq('id', params.player1PartnerId!);
        
        if (partner1Error) throw partner1Error;
      }

      if (player2Partner && player2PartnerEloAfter) {
        const { error: partner2Error } = await supabase
          .from('profiles')
          .update({
            doubles_elo: player2PartnerEloAfter,
            doubles_matches_played: player2Partner.doubles_matches_played + 1,
            doubles_matches_won: player2Partner.doubles_matches_won + (player2MatchScore === 1 ? 1 : 0),
          })
          .eq('id', params.player2PartnerId!);
        
        if (partner2Error) throw partner2Error;
      }

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
