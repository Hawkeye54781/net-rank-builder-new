import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LadderParticipant {
  id: string;
  ladder_id: string;
  player_id: string;
  joined_at: string;
  is_active: boolean;
}

export interface LadderParticipationStatus {
  isParticipant: boolean;
  participantCount: number;
  isLoading: boolean;
}

/**
 * Custom hook for managing ladder participation
 * Provides functionality to join, leave, and check participation status
 */
export const useLadderParticipation = (ladderId: string, playerId: string | null) => {
  const [participationStatus, setParticipationStatus] = useState<LadderParticipationStatus>({
    isParticipant: false,
    participantCount: 0,
    isLoading: true,
  });
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { toast } = useToast();

  /**
   * Fetch the current participation status for the ladder
   */
  const fetchParticipationStatus = useCallback(async () => {
    if (!ladderId) return;

    try {
      setParticipationStatus(prev => ({ ...prev, isLoading: true }));

      // Get total participant count
      const { count: participantCount, error: countError } = await supabase
        .from('ladder_participants')
        .select('id', { count: 'exact' })
        .eq('ladder_id', ladderId)
        .eq('is_active', true);

      if (countError) throw countError;

      // Check if current player is participating
      let isParticipant = false;
      if (playerId) {
        const { data: participation, error: participationError } = await supabase
          .from('ladder_participants')
          .select('id')
          .eq('ladder_id', ladderId)
          .eq('player_id', playerId)
          .eq('is_active', true)
          .single();

        if (participationError && participationError.code !== 'PGRST116') {
          throw participationError;
        }

        isParticipant = !!participation;
      }

      setParticipationStatus({
        isParticipant,
        participantCount: participantCount || 0,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching participation status:', error);
      setParticipationStatus({
        isParticipant: false,
        participantCount: 0,
        isLoading: false,
      });
    }
  }, [ladderId, playerId]);

  /**
   * Join a ladder
   */
  const joinLadder = useCallback(async () => {
    if (!ladderId || !playerId || isJoining) return;

    setIsJoining(true);

    try {
      const { error } = await supabase.from('ladder_participants').insert([
        {
          ladder_id: ladderId,
          player_id: playerId,
          is_active: true,
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - user is already in the ladder
          toast({
            title: 'Already Joined',
            description: 'You are already participating in this ladder.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Success!',
          description: 'You have successfully joined the ladder.',
        });
        await fetchParticipationStatus(); // Refresh status
      }
    } catch (error: any) {
      console.error('Error joining ladder:', error);
      toast({
        title: 'Error',
        description: 'Failed to join ladder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  }, [ladderId, playerId, isJoining, fetchParticipationStatus, toast]);

  /**
   * Leave a ladder
   */
  const leaveLadder = useCallback(async () => {
    if (!ladderId || !playerId || isLeaving) return;

    setIsLeaving(true);

    try {
      const { error } = await supabase
        .from('ladder_participants')
        .delete()
        .eq('ladder_id', ladderId)
        .eq('player_id', playerId);

      if (error) throw error;

      toast({
        title: 'Left Ladder',
        description: 'You have successfully left the ladder.',
      });

      await fetchParticipationStatus(); // Refresh status
    } catch (error: any) {
      console.error('Error leaving ladder:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave ladder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(false);
    }
  }, [ladderId, playerId, isLeaving, fetchParticipationStatus, toast]);

  /**
   * Get participants list for a ladder (useful for admin views)
   */
  const getParticipants = useCallback(async (): Promise<LadderParticipant[]> => {
    if (!ladderId) return [];

    try {
      const { data, error } = await supabase
        .from('ladder_participants')
        .select('*')
        .eq('ladder_id', ladderId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  }, [ladderId]);

  // Fetch participation status on mount and when dependencies change
  useEffect(() => {
    fetchParticipationStatus();
  }, [fetchParticipationStatus]);

  return {
    ...participationStatus,
    joinLadder,
    leaveLadder,
    getParticipants,
    refreshStatus: fetchParticipationStatus,
    isJoining,
    isLeaving,
  };
};
