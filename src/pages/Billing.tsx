import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Profile { id: string; club_id: string; }
interface Club {
  id: string;
  name: string;
  location: string;
  billing_status?: 'trialing' | 'active' | 'past_due' | 'canceled';
  trial_end_at?: string;
  user_seat_count?: number;
  plan_tier?: 'basic' | 'plus';
}

const Billing = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      const { data: p } = await supabase.from('profiles').select('id, club_id').eq('user_id', user.id).single();
      if (!p) { setLoading(false); return; }
      setProfile(p as Profile);
      const { data: c } = await supabase.from('clubs').select('*').eq('id', p.club_id).single();
      setClub(c as Club);
      setLoading(false);
    })();
  }, [navigate]);

  const priceText = club?.plan_tier === 'plus' ? '€45/month (>150 users)' : '€25/month (≤150 users)';

  const startSubscription = async () => {
    if (!club) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('stripe-checkout', { body: { clubId: club.id } });
    setCreating(false);
    if (error) return;
    if (data?.url) window.location.href = data.url as string;
  };

  const openPortal = async () => {
    if (!club) return;
    const { data, error } = await supabase.functions.invoke('stripe-portal', { body: { clubId: club.id } });
    if (error) return;
    if (data?.url) window.location.href = data.url as string;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-9 w-9 -ml-2" title="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold text-primary">Billing</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Subscription</CardTitle>
            <CardDescription>
              {club?.name} • {club?.location}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={club?.billing_status === 'active' ? 'default' : 'secondary'}>
                {club?.billing_status ?? 'unknown'}
              </Badge>
              {club?.trial_end_at && (
                <Badge variant="outline">Trial ends {new Date(club.trial_end_at).toLocaleDateString()}</Badge>
              )}
              {typeof club?.user_seat_count === 'number' && (
                <Badge variant="outline">{club.user_seat_count} users</Badge>
              )}
              {club?.plan_tier && (
                <Badge variant="outline">Plan: {club.plan_tier}</Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">{priceText}</div>

            <div className="flex gap-3">
              <Button onClick={startSubscription} disabled={creating} className="bg-gradient-court">
                {creating ? 'Redirecting…' : (club?.billing_status === 'active' ? 'Change plan' : 'Start subscription')}
              </Button>
              <Button variant="outline" onClick={openPortal}>Manage payment method</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Billing;
