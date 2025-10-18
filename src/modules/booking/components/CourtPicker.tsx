import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Court {
  id: string;
  name: string;
}

interface CourtPickerProps {
  clubId: string;
  value: string | null;
  onChange: (courtId: string) => void;
}

export function CourtPicker({ clubId, value, onChange }: CourtPickerProps) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('courts')
        .select('id,name')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      if (!ignore) setCourts(data || []);
      setLoading(false);
    };
    if (clubId) load();
    return () => { ignore = true; };
  }, [clubId]);

  if (!clubId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Select Court</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Loading courts…</div>
        ) : courts.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No courts available. Contact admin to add courts.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {courts.map((c) => (
              <Button
                key={c.id}
                variant={value === c.id ? 'default' : 'outline'}
                size="lg"
                className="h-14 text-base"
                onClick={() => onChange(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
