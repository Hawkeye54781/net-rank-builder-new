import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentStatus = Database['public']['Enums']['tournament_status'];

interface TournamentGroup {
  id: string;
  name: string;
  level: string | null;
  gender: string | null;
  match_type: string | null;
}

interface UserTournament extends Tournament {
  groups: TournamentGroup[];
}

export const useUserTournaments = (userId: string, clubId: string) => {
  const [tournaments, setTournaments] = useState<UserTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserTournaments();
  }, [userId, clubId]);

  const fetchUserTournaments = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all tournament_participant records for this user
      const { data: participantData, error: participantError } = await supabase
        .from('tournament_participants')
        .select('tournament_id, group_id, tournament_groups(id, name, level, gender, match_type)')
        .eq('player_id', userId);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      // Get unique tournament IDs
      const tournamentIds = [...new Set(participantData.map(p => p.tournament_id))];

      // Fetch tournament details
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .in('id', tournamentIds)
        .eq('club_id', clubId)
        .order('start_date', { ascending: false });

      if (tournamentsError) throw tournamentsError;

      // Group participant data by tournament
      const tournamentGroupsMap = new Map<string, TournamentGroup[]>();
      participantData.forEach(p => {
        if (!tournamentGroupsMap.has(p.tournament_id)) {
          tournamentGroupsMap.set(p.tournament_id, []);
        }
        if (p.tournament_groups) {
          tournamentGroupsMap.get(p.tournament_id)!.push({
            id: p.tournament_groups.id,
            name: p.tournament_groups.name,
            level: p.tournament_groups.level,
            gender: p.tournament_groups.gender,
            match_type: p.tournament_groups.match_type,
          });
        }
      });

      // Combine tournaments with their groups
      const tournamentsWithGroups: UserTournament[] = (tournamentsData || []).map(tournament => ({
        ...tournament,
        groups: tournamentGroupsMap.get(tournament.id) || [],
      }));

      setTournaments(tournamentsWithGroups);
    } catch (err) {
      console.error('Error fetching user tournaments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const filterByStatus = (status: TournamentStatus) => {
    return tournaments.filter(t => t.status === status);
  };

  return {
    tournaments,
    loading,
    error,
    refetch: fetchUserTournaments,
    filterByStatus,
  };
};
