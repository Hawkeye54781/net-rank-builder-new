import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Users, Activity, TrendingUp, Calendar, Award, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import MatchList from '@/components/MatchList';
import RecordMatchDialog from '@/components/RecordMatchDialog';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
  club_id: string;
  created_at: string;
}

interface Club {
  id: string;
  name: string;
  location: string;
}

interface LadderParticipant {
  ladder_id: string;
  joined_at: string;
  ladders: {
    id: string;
    name: string;
    type: string;
    is_active: boolean;
  };
}

interface UserProfileProps {
  user: User;
  onSignOut: () => void;
}

export default function UserProfile({ user, onSignOut }: UserProfileProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [clubRank, setClubRank] = useState<number>(0);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [participatingLadders, setParticipatingLadders] = useState<LadderParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchRefreshTrigger, setMatchRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch club data
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', profileData.club_id)
        .single();

      if (clubError) throw clubError;
      setClub(clubData);

      // Get club rankings to calculate user rank
      const { data: rankingsData, error: rankingsError } = await supabase
        .from('profiles')
        .select('id, elo_rating')
        .eq('club_id', profileData.club_id)
        .order('elo_rating', { ascending: false });

      if (rankingsError) throw rankingsError;
      
      const userRank = rankingsData.findIndex(p => p.id === profileData.id) + 1;
      setClubRank(userRank);
      setTotalPlayers(rankingsData.length);

      // Fetch ladders user is participating in
      const { data: participantsData, error: participantsError } = await supabase
        .from('ladder_participants')
        .select(`
          ladder_id,
          joined_at,
          ladders (
            id,
            name,
            type,
            is_active
          )
        `)
        .eq('player_id', profileData.id);

      if (participantsError) throw participantsError;
      setParticipatingLadders(participantsData as unknown as LadderParticipant[]);

    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const winRate = profile
    ? profile.matches_played > 0
      ? ((profile.matches_won / profile.matches_played) * 100).toFixed(1)
      : '0'
    : '0';

  const lossCount = profile ? profile.matches_played - profile.matches_won : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found</p>
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
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onSignOut} 
                className="h-9 w-9"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Profile Header */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-court flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0">
              {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-primary truncate">
                {profile.first_name} {profile.last_name}
              </h1>
              {club && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {club.name} • {club.location}
                </p>
              )}
            </div>
          </div>
          
          {/* Badges below on mobile */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              Rank #{clubRank} of {totalPlayers}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Since {formatDate(profile.created_at).split(',')[1]}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="shadow-card-tennis">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">ELO Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-primary">
                {profile.elo_rating}
              </div>
              <p className="text-xs text-muted-foreground">
                Rank #{clubRank}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card-tennis">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Matches</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {profile.matches_played}
              </div>
              <p className="text-xs text-muted-foreground">
                Total played
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card-tennis">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Win Rate</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {winRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {profile.matches_won}W - {lossCount}L
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card-tennis">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Ladders</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {participatingLadders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Participating
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="matches" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matches">Match History</TabsTrigger>
            <TabsTrigger value="ladders">My Ladders</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Recent Matches</CardTitle>
                    <CardDescription>
                      Your match history and results
                    </CardDescription>
                  </div>
                  <RecordMatchDialog
                    clubId={profile.club_id}
                    currentPlayerId={profile.id}
                    onMatchRecorded={() => {
                      fetchUserProfile();
                      setMatchRefreshTrigger(prev => prev + 1);
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <MatchList
                  clubId={profile.club_id}
                  currentPlayerId={profile.id}
                  refreshTrigger={matchRefreshTrigger}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ladders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Ladders</CardTitle>
                <CardDescription>
                  Ladders you're currently participating in
                </CardDescription>
              </CardHeader>
              <CardContent>
                {participatingLadders.length > 0 ? (
                  <div className="space-y-3">
                    {participatingLadders.map((participant) => (
                      <div
                        key={participant.ladder_id}
                        className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/ladder/${participant.ladder_id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm sm:text-base">
                              {participant.ladders.name}
                            </h3>
                            {participant.ladders.is_active ? (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground capitalize mt-1">
                            {participant.ladders.type} • Joined {formatDate(participant.joined_at)}
                          </p>
                        </div>
                        <Award className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">You haven't joined any ladders yet.</p>
                    <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                      Browse Ladders
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
