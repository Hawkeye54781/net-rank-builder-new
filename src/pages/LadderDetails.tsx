import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Users, Calendar, UserCircle2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Ladder {
  id: string;
  name: string;
  type: string;
  club_id: string;
  is_active: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
}

interface LadderParticipant {
  id: string;
  ladder_id: string;
  player_id: string;
  joined_at: string;
  profiles: Profile;
}

interface Club {
  id: string;
  name: string;
  location: string;
}

export default function LadderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [participants, setParticipants] = useState<LadderParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchLadderDetails();
    fetchCurrentUser();
  }, [id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchLadderDetails = async () => {
    try {
      // Fetch ladder details
      const { data: ladderData, error: ladderError } = await supabase
        .from('ladders')
        .select('*')
        .eq('id', id)
        .single();

      if (ladderError) throw ladderError;
      setLadder(ladderData);

      // Fetch club details
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', ladderData.club_id)
        .single();

      if (clubError) throw clubError;
      setClub(clubData);

      // Fetch participants with their profiles
      const { data: participantsData, error: participantsError } = await supabase
        .from('ladder_participants')
        .select(`
          id,
          ladder_id,
          player_id,
          joined_at,
          profiles (
            id,
            first_name,
            last_name,
            elo_rating,
            matches_played,
            matches_won
          )
        `)
        .eq('ladder_id', id)
        .order('profiles(elo_rating)', { ascending: false });

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

    } catch (error) {
      console.error('Error fetching ladder details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatType = (type: string) => {
    switch (type) {
      case 'singles':
        return 'Singles';
      case 'doubles':
        return 'Doubles';
      case 'mixed':
        return 'Mixed Doubles';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ladder details...</p>
        </div>
      </div>
    );
  }

  if (!ladder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Ladder not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          {/* Top row: Navigation and actions */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-9 w-9 -ml-2"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/profile')}
                className="h-9 w-9"
                title="Profile"
              >
                <UserCircle2 className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
          
          {/* Ladder info */}
          <div className="space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary truncate">{ladder.name}</h1>
              {club && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{club.name}</p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatType(ladder.type)}
              </Badge>
              <Badge
                variant={ladder.is_active ? 'default' : 'secondary'}
                className={
                  `text-xs ${
                  ladder.is_active
                    ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800'
                    : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`
                }
              >
                {ladder.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {participants.length} {participants.length === 1 ? 'player' : 'players'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(ladder.created_at)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Participants Rankings */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">Rankings</CardTitle>
                <CardDescription className="mt-1">
                  {participants.length} {participants.length === 1 ? 'player' : 'players'} competing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {participants.length > 0 ? (
              <div className="space-y-3">
                {participants.map((participant, index) => {
                  const profile = participant.profiles;
                  const winRate = profile.matches_played > 0
                    ? ((profile.matches_won / profile.matches_played) * 100).toFixed(1)
                    : '0';

                  return (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-gradient-court flex items-center justify-center text-white font-bold text-base sm:text-lg">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-base sm:text-lg truncate">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {profile.matches_played} {profile.matches_played === 1 ? 'match' : 'matches'} played
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-lg sm:text-xl text-primary">
                          {profile.elo_rating}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                          {profile.matches_played > 0
                            ? `${winRate}% win`
                            : 'No matches'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No participants yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Be the first to join this ladder!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
