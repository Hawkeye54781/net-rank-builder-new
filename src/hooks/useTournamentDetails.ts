import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentGroup = Database['public']['Tables']['tournament_groups']['Row'];
type TournamentMatch = Database['public']['Tables']['tournament_matches']['Row'];

interface ParticipantWithProfile {
  id: string;
  player_id: string;
  is_guest: boolean;
  guest_name: string | null;
  guest_deleted_at: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

interface GroupStandings {
  participantId: string;
  playerId: string;
  playerName: string;
  isGuest: boolean;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
}

interface GroupWithDetails extends TournamentGroup {
  participants: ParticipantWithProfile[];
  matches: TournamentMatch[];
  standings: GroupStandings[];
}

interface TournamentDetails extends Tournament {
  groups: GroupWithDetails[];
}

export const useTournamentDetails = (tournamentId: string | null) => {
  const [tournament, setTournament] = useState<TournamentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentDetails();
    }
  }, [tournamentId]);

  const calculateStandings = (participants: ParticipantWithProfile[], matches: TournamentMatch[]): GroupStandings[] => {
    const standingsMap = new Map<string, GroupStandings>();

    // Initialize standings for each participant
    participants.forEach(p => {
      const playerName = p.is_guest 
        ? (p.guest_deleted_at ? 'Guest' : (p.guest_name || 'Guest'))
        : (p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : 'Unknown');

      standingsMap.set(p.id, {
        participantId: p.id,
        playerId: p.player_id,
        playerName,
        isGuest: p.is_guest,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0,
      });
    });

    // Process completed matches (those with scores recorded)
    matches.filter(m => m.player1_score !== null && m.player2_score !== null).forEach(match => {
      // Find participants by player_id, not participant id
      const p1Participant = participants.find(p => p.player_id === match.player1_id);
      const p2Participant = participants.find(p => p.player_id === match.player2_id);
      
      if (!p1Participant || !p2Participant) return;
      
      const p1Standing = standingsMap.get(p1Participant.id);
      const p2Standing = standingsMap.get(p2Participant.id);

      if (!p1Standing || !p2Standing) return;

      // Get sets won from match scores
      const p1Sets = match.player1_score || 0;
      const p2Sets = match.player2_score || 0;

      p1Standing.setsWon += p1Sets;
      p1Standing.setsLost += p2Sets;
      // Games won/lost not tracked with this format

      p2Standing.setsWon += p2Sets;
      p2Standing.setsLost += p1Sets;

      // Determine winner
      if (p1Sets > p2Sets) {
        p1Standing.wins += 1;
        p1Standing.points += 2;
        p2Standing.losses += 1;
        p2Standing.points += 1;
      } else if (p2Sets > p1Sets) {
        p2Standing.wins += 1;
        p2Standing.points += 2;
        p1Standing.losses += 1;
        p1Standing.points += 1;
      } else {
        // Tie - both get 1 point
        p1Standing.points += 1;
        p2Standing.points += 1;
      }
    });

    // Sort by points, then sets difference, then games difference
    return Array.from(standingsMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      
      const aSetsDiff = a.setsWon - a.setsLost;
      const bSetsDiff = b.setsWon - b.setsLost;
      if (bSetsDiff !== aSetsDiff) return bSetsDiff - aSetsDiff;
      
      const aGamesDiff = a.gamesWon - a.gamesLost;
      const bGamesDiff = b.gamesWon - b.gamesLost;
      return bGamesDiff - aGamesDiff;
    });
  };

  const fetchTournamentDetails = async () => {
    if (!tournamentId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;

      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('tournament_groups')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('name');

      if (groupsError) throw groupsError;

      // For each group, fetch participants and matches
      const groupsWithDetails: GroupWithDetails[] = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Fetch participants
          const { data: participantsData, error: participantsError } = await supabase
            .from('tournament_participants')
            .select('id, player_id, is_guest, guest_name, guest_deleted_at, profiles(first_name, last_name)')
            .eq('group_id', group.id);

          if (participantsError) throw participantsError;

          // Fetch matches
          const { data: matchesData, error: matchesError } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false });

          if (matchesError) throw matchesError;

          const participants = participantsData || [];
          const matches = matchesData || [];
          const standings = calculateStandings(participants, matches);

          return {
            ...group,
            participants,
            matches,
            standings,
          };
        })
      );

      setTournament({
        ...tournamentData,
        groups: groupsWithDetails,
      });
    } catch (err) {
      console.error('Error fetching tournament details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  return {
    tournament,
    loading,
    error,
    refetch: fetchTournamentDetails,
  };
};
