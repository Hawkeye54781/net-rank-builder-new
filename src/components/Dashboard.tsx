import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Session } from '@supabase/supabase-js';
import { Trophy, Users, Activity, TrendingUp } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
  club_id: string;
}

interface Club {
  id: string;
  name: string;
  location: string;
}

interface Ladder {
  id: string;
  name: string;
  type: string;
  club_id: string;
}

interface DashboardProps {
  user: User;
  session: Session;
  onSignOut: () => void;
}

export default function Dashboard({ user, session, onSignOut }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [rankings, setRankings] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
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

      // Fetch ladders for this club
      const { data: laddersData, error: laddersError } = await supabase
        .from('ladders')
        .select('*')
        .eq('club_id', profileData.club_id)
        .eq('is_active', true);

      if (laddersError) throw laddersError;
      setLadders(laddersData || []);

      // Fetch club rankings
      const { data: rankingsData, error: rankingsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('club_id', profileData.club_id)
        .order('elo_rating', { ascending: false })
        .limit(10);

      if (rankingsError) throw rankingsError;
      setRankings(rankingsData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const winRate = profile ? 
    (profile.matches_played > 0 ? (profile.matches_won / profile.matches_played * 100).toFixed(1) : '0') 
    : '0';

  const userRank = rankings.findIndex(p => p.id === profile?.id) + 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your tennis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary">🎾 Tennis Ladder</h1>
            {club && (
              <Badge variant="secondary" className="text-sm">
                {club.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.first_name}!
            </span>
            <Button variant="outline" onClick={onSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Player Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-card-tennis">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ELO Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {profile?.elo_rating || 1200}
              </div>
              <p className="text-xs text-muted-foreground">
                Club Rank: #{userRank || 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card-tennis">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Matches Played</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profile?.matches_played || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total matches
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card-tennis">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {winRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {profile?.matches_won || 0} wins
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card-tennis">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Ladders</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ladders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Available to join
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="ladders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ladders">Ladders</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
            <TabsTrigger value="matches">Recent Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="ladders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Ladders</CardTitle>
                <CardDescription>
                  Join a ladder to start competing and improving your ranking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ladders.length > 0 ? (
                  <div className="grid gap-4">
                    {ladders.map((ladder) => (
                      <div key={ladder.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{ladder.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {ladder.type} competition
                          </p>
                        </div>
                        <Button variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                          View Ladder
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No active ladders at your club yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rankings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Club Rankings</CardTitle>
                <CardDescription>
                  Top players at {club?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rankings.map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-court flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {player.first_name} {player.last_name}
                            {player.id === profile?.id && (
                              <Badge variant="secondary" className="ml-2">You</Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {player.matches_played} matches played
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-primary">{player.elo_rating}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.matches_played > 0 ? 
                            `${((player.matches_won / player.matches_played) * 100).toFixed(1)}% win rate` : 
                            'No matches'
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Matches</CardTitle>
                <CardDescription>
                  Your match history and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No matches recorded yet.</p>
                  <Button className="mt-4 bg-gradient-court hover:bg-primary-light">
                    Record a Match
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}