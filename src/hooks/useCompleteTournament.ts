import { supabase } from '@/integrations/supabase/client';

interface MatchStats {
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}

interface GroupStandings {
  playerId: string;
  playerName: string;
  isGuest: boolean;
  stats: MatchStats;
  points: number; // 2 for win, 1 for loss
}

export const useCompleteTournament = () => {
  const completeTournament = async (tournamentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Fetch tournament details including bonus ELO
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*, tournament_groups(id, name)')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      if (!tournament) throw new Error('Tournament not found');

      const bonusElo = tournament.winner_bonus_elo || 0;

      // 2. For each group, calculate standings
      for (const group of tournament.tournament_groups) {
        // Fetch all participants in this group
        const { data: participants, error: participantsError } = await supabase
          .from('tournament_participants')
          .select('id, player_id, is_guest, guest_name, profiles(first_name, last_name)')
          .eq('group_id', group.id);

        if (participantsError) throw participantsError;
        if (!participants || participants.length === 0) continue;

        // Fetch all matches in this group (with scores recorded)
        const { data: matchesData, error: matchesError } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('group_id', group.id);

        if (matchesError) throw matchesError;
        
        // Filter to only completed matches (with scores)
        const matches = (matchesData || []).filter(m => m.player1_score !== null && m.player2_score !== null);

        if (matchesError) throw matchesError;
        if (!matches || matches.length === 0) continue;

        // Calculate standings for each participant
        const standings: Map<string, GroupStandings> = new Map();

        participants.forEach(participant => {
          const playerName = participant.is_guest 
            ? (participant.guest_name || 'Guest')
            : (participant.profiles ? `${participant.profiles.first_name} ${participant.profiles.last_name}` : 'Unknown');
          
          standings.set(participant.id, {
            playerId: participant.player_id,
            playerName,
            isGuest: participant.is_guest,
            stats: {
              wins: 0,
              losses: 0,
              setsWon: 0,
              setsLost: 0,
              gamesWon: 0,
              gamesLost: 0,
            },
            points: 0,
          });
        });

        // Process each match to update standings
        matches.forEach(match => {
          const player1Standing = standings.get(match.player1_id);
          const player2Standing = standings.get(match.player2_id);

          if (!player1Standing || !player2Standing) return;

          // Count sets and games
          const player1Sets = [match.player1_set1, match.player1_set2, match.player1_set3].filter(s => s !== null).length;
          const player2Sets = [match.player2_set1, match.player2_set2, match.player2_set3].filter(s => s !== null).length;

          const player1Games = (match.player1_set1 || 0) + (match.player1_set2 || 0) + (match.player1_set3 || 0);
          const player2Games = (match.player2_set1 || 0) + (match.player2_set2 || 0) + (match.player2_set3 || 0);

          player1Standing.stats.setsWon += player1Sets;
          player1Standing.stats.setsLost += player2Sets;
          player1Standing.stats.gamesWon += player1Games;
          player1Standing.stats.gamesLost += player2Games;

          player2Standing.stats.setsWon += player2Sets;
          player2Standing.stats.setsLost += player1Sets;
          player2Standing.stats.gamesWon += player2Games;
          player2Standing.stats.gamesLost += player1Games;

          // Determine winner (most sets won)
          if (player1Sets > player2Sets) {
            player1Standing.stats.wins += 1;
            player1Standing.points += 2;
            player2Standing.stats.losses += 1;
            player2Standing.points += 1;
          } else if (player2Sets > player1Sets) {
            player2Standing.stats.wins += 1;
            player2Standing.points += 2;
            player1Standing.stats.losses += 1;
            player1Standing.points += 1;
          }
        });

        // Sort standings: by points (desc), then by sets difference (desc), then by games difference (desc)
        const sortedStandings = Array.from(standings.values()).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          
          const aSetsDiff = a.stats.setsWon - a.stats.setsLost;
          const bSetsDiff = b.stats.setsWon - b.stats.setsLost;
          if (bSetsDiff !== aSetsDiff) return bSetsDiff - aSetsDiff;
          
          const aGamesDiff = a.stats.gamesWon - a.stats.gamesLost;
          const bGamesDiff = b.stats.gamesWon - b.stats.gamesLost;
          return bGamesDiff - aGamesDiff;
        });

        // Insert winners into tournament_winners table
        const winnersToInsert = sortedStandings.map((standing, index) => ({
          tournament_id: tournamentId,
          group_id: group.id,
          player_id: standing.playerId,
          final_standing: index + 1,
          wins: standing.stats.wins,
          losses: standing.stats.losses,
          sets_won: standing.stats.setsWon,
          sets_lost: standing.stats.setsLost,
          games_won: standing.stats.gamesWon,
          games_lost: standing.stats.gamesLost,
          bonus_elo_awarded: (index === 0 && !standing.isGuest) ? bonusElo : 0,
        }));

        const { error: winnersError } = await supabase
          .from('tournament_winners')
          .insert(winnersToInsert);

        if (winnersError) throw winnersError;

        // Award bonus ELO to winner if they're not a guest
        if (sortedStandings.length > 0 && !sortedStandings[0].isGuest && bonusElo > 0) {
          const winnerId = sortedStandings[0].playerId;
          
          // Fetch current ELO
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('elo_rating')
            .eq('id', winnerId)
            .single();

          if (profileError) throw profileError;

          // Update ELO
          const newElo = (profile.elo_rating || 1000) + bonusElo;
          const { error: updateEloError } = await supabase
            .from('profiles')
            .update({ elo_rating: newElo })
            .eq('id', winnerId);

          if (updateEloError) throw updateEloError;
        }
      }

      // 3. Update tournament status to completed
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error('Error completing tournament:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete tournament' 
      };
    }
  };

  return { completeTournament };
};
