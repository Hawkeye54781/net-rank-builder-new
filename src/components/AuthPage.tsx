import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

interface Club {
  id: string;
  name: string;
  location: string;
}

interface AuthPageProps {
  onAuthSuccess: (user: User, session: Session) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [createNewClub, setCreateNewClub] = useState(false);
  const [clubName, setClubName] = useState('');
  const [clubLocation, setClubLocation] = useState('');
  const [billingAgreed, setBillingAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('name');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load clubs",
        variant: "destructive",
      });
    } else {
      setClubs(data || []);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (data.user && data.session) {
      onAuthSuccess(data.user, data.session);
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createNewClub && !selectedClub) {
      toast({
        title: "Club Required",
        description: "Please select your tennis club",
        variant: "destructive",
      });
      return;
    }

    if (createNewClub) {
      if (!clubName || !clubLocation) {
        toast({
          title: "Club Details Required",
          description: "Please enter a club name and location",
          variant: "destructive",
        });
        return;
      }
      if (!billingAgreed) {
        toast({
          title: "Billing Agreement Required",
          description: "You must agree to the 7-day trial and subscription terms to create a club",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    // Prepare user metadata
    const userMetadata: { first_name: string; last_name: string; phone: string; club_id?: string } = {
      first_name: firstName,
      last_name: lastName,
      phone: phone,
    };
    if (!createNewClub) {
      userMetadata.club_id = selectedClub;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userMetadata,
      }
    });

    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    if (!data.user) {
      toast({
        title: "Sign Up Failed",
        description: "Unable to create user account",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // If creating a new club and we have a session, call RPC to create the club and assign admin
    if (createNewClub && data.session) {
      const rpc = (supabase as unknown as {
        rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
      }).rpc;
      const { error: rpcError } = await rpc('create_club_and_assign_admin', {
        p_name: clubName,
        p_location: clubLocation,
        p_billing_agreed: true,
      });
      if (rpcError) {
        toast({
          title: "Club Creation Failed",
          description: rpcError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    if (data.session) {
      toast({
        title: "Sign Up Successful",
        description: createNewClub ? "Club created. Welcome to Tennis Ladder!" : "Welcome to Tennis Ladder!",
      });
      onAuthSuccess(data.user, data.session);
    } else {
      toast({
        title: "Sign Up Successful",
        description: createNewClub
          ? "Please verify your email. After verifying, sign in and your club will be created."
          : "Please check your email to confirm your account",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-court">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            🎾 Tennis Ladder
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Welcome back to the court!' : 'Join your tennis community'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* New club toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox id="createNewClub" checked={createNewClub} onCheckedChange={(v) => setCreateNewClub(Boolean(v))} />
                  <Label htmlFor="createNewClub" className="cursor-pointer">Create a new club</Label>
                </div>

                {!createNewClub ? (
                  <div className="space-y-2">
                    <Label htmlFor="club">Tennis Club</Label>
                    <Select value={selectedClub} onValueChange={setSelectedClub} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your tennis club" />
                      </SelectTrigger>
                      <SelectContent>
                        {clubs.map((club) => (
                          <SelectItem key={club.id} value={club.id}>
                            {club.name} - {club.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="clubName">Club Name</Label>
                      <Input
                        id="clubName"
                        type="text"
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clubLocation">Club Location</Label>
                      <Input
                        id="clubLocation"
                        type="text"
                        value={clubLocation}
                        onChange={(e) => setClubLocation(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox id="billingAgreed" checked={billingAgreed} onCheckedChange={(v) => setBillingAgreed(Boolean(v))} />
                      <Label htmlFor="billingAgreed" className="text-sm text-muted-foreground leading-5">
                        I agree to start a 7-day free trial and to be responsible for the club subscription: €25/month for up to 150 users, and €45/month for more than 150 users.
                      </Label>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-court hover:bg-primary-light" 
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <Separator className="my-4" />

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary-light"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}