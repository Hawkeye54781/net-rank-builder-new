import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Session } from '@supabase/supabase-js';
import { Trophy, Users, Settings, Shield, UserCircle2, LogOut } from 'lucide-react';
import { useClubAdmin } from '@/hooks/useClubAdmin';
import AddLadderDialog from '@/components/AddLadderDialog';
import LadderManagement from '@/components/LadderManagement';
import ClubAdminManagement from '@/components/ClubAdminManagement';
import LadderRow from '@/components/LadderRow';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';

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
  is_active: boolean;
  created_at: string;
}

interface DashboardProps {
  user: User;
  session: Session;
  onSignOut: () => void;
}

type ViewType = 'ladders' | 'rankings' | 'admin';

export default function Dashboard({ user, session, onSignOut }: DashboardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [ladders, setLadders] = useState<Ladder[]>([]);
  const [allLadders, setAllLadders] = useState<Ladder[]>([]); // For admin view (includes inactive)
  const [rankings, setRankings] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('ladders');
  const { isAdmin, loading: adminLoading } = useClubAdmin(user, profile?.club_id || null);

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

      if (profileError) {
        // If profile doesn't exist, check if we can create one
        if (profileError.code === 'PGRST116') {
          console.error('Profile not found for user:', user.id);
          toast({
            title: "Profile Not Found",
            description: "Your profile is missing. Please contact support or try signing up again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        throw profileError;
      }
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

      // Fetch all ladders for admin view (including inactive ones)
      const { data: allLaddersData, error: allLaddersError } = await supabase
        .from('ladders')
        .select('*')
        .eq('club_id', profileData.club_id)
        .order('created_at', { ascending: false });

      if (allLaddersError) throw allLaddersError;
      setAllLadders(allLaddersData || []);

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
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title and Club */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-primary truncate">🎾 Tennis Ladder</h1>
              {club && (
                <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                  {club.name}
                </Badge>
              )}
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
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
          
          {/* Mobile: Club badge on second line */}
          {club && (
            <div className="mt-2 sm:hidden">
              <Badge variant="secondary" className="text-xs">
                {club.name}
              </Badge>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Segmented Control Navigation */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full w-full sm:w-auto">
            <Button
              variant={activeView === 'ladders' ? 'default' : 'ghost'}
              className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all ${
                activeView === 'ladders' 
                  ? 'shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
              onClick={() => setActiveView('ladders')}
            >
              <Trophy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline ml-2">Ladders</span>
            </Button>
            <Button
              variant={activeView === 'rankings' ? 'default' : 'ghost'}
              className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all ${
                activeView === 'rankings' 
                  ? 'shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
              onClick={() => setActiveView('rankings')}
            >
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline ml-2">Rankings</span>
            </Button>
            {isAdmin && (
              <Button
                variant={activeView === 'admin' ? 'default' : 'ghost'}
                className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all ${
                  activeView === 'admin' 
                    ? 'shadow-sm' 
                    : 'hover:bg-background/50'
                }`}
                onClick={() => setActiveView('admin')}
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">Admin</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Views */}
        <div className="space-y-6">
          {activeView === 'ladders' && (
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
                      <LadderRow
                        key={ladder.id}
                        ladder={ladder}
                        playerId={profile?.id || null}
                      />
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
          )}

          {activeView === 'rankings' && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Club Rankings</CardTitle>
                <CardDescription className="mt-1">
                  Top 10 players at {club?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rankings.map((player, index) => {
                    const winRate = player.matches_played > 0
                      ? ((player.matches_won / player.matches_played) * 100).toFixed(1)
                      : '0';
                    
                    return (
                      <div 
                        key={player.id} 
                        className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-gradient-court flex items-center justify-center text-white font-bold text-base sm:text-lg">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-base sm:text-lg truncate">
                                {player.first_name} {player.last_name}
                              </h3>
                              {player.id === profile?.id && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {player.matches_played} {player.matches_played === 1 ? 'match' : 'matches'} played
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-lg sm:text-xl text-primary">
                            {player.elo_rating}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                            {player.matches_played > 0 ? `${winRate}% win` : 'No matches'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin && activeView === 'admin' && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        <Settings className="h-5 w-5" />
                        Ladder Management
                      </CardTitle>
                      <CardDescription>
                        Create and manage ladders for your club
                      </CardDescription>
                    </div>
                    <AddLadderDialog
                      clubId={profile?.club_id || ''}
                      onLadderAdded={fetchUserData}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <LadderManagement
                    ladders={allLadders}
                    onLadderUpdated={fetchUserData}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5" />
                    Club Admin Management
                  </CardTitle>
                  <CardDescription>
                    Manage club administrators and their permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ClubAdminManagement
                    clubId={profile?.club_id || ''}
                    currentUserId={user.id}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}