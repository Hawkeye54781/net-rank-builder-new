// Edge function to cleanup guest players 7 days after tournament completion
// This should be triggered by a cron job (e.g., daily at midnight)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Calculate the cutoff date (7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find completed tournaments older than 7 days
    const { data: completedTournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id')
      .eq('status', 'completed')
      .lt('end_date', sevenDaysAgo.toISOString());

    if (tournamentsError) throw tournamentsError;

    if (!completedTournaments || completedTournaments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No tournaments ready for guest cleanup',
          deleted: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const tournamentIds = completedTournaments.map((t) => t.id);

    // Find guest participants in these tournaments that haven't been deleted yet
    const { data: guestParticipants, error: guestsError } = await supabase
      .from('tournament_participants')
      .select('id, player_id')
      .in('tournament_id', tournamentIds)
      .eq('is_guest', true)
      .is('guest_deleted_at', null);

    if (guestsError) throw guestsError;

    if (!guestParticipants || guestParticipants.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No guest participants to cleanup',
          deleted: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Mark guests as deleted by setting guest_deleted_at timestamp
    const participantIds = guestParticipants.map((p) => p.id);
    const { error: updateError } = await supabase
      .from('tournament_participants')
      .update({ guest_deleted_at: new Date().toISOString() })
      .in('id', participantIds);

    if (updateError) throw updateError;

    // Delete the actual guest profiles from the profiles table
    const guestPlayerIds = guestParticipants.map((p) => p.player_id);
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .in('id', guestPlayerIds);

    if (deleteError) {
      console.error('Error deleting guest profiles:', deleteError);
      // Don't throw - the guest_deleted_at flag is already set
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully marked ${guestParticipants.length} guest participants for cleanup`,
        deleted: guestParticipants.length,
        tournamentIds,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in cleanup-tournament-guests:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
