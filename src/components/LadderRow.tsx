import { useNavigate } from 'react-router-dom';
import { useLadderParticipation } from '@/hooks/useLadderParticipation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';

interface LadderRowProps {
  ladder: {
    id: string;
    name: string;
    type: string;
  };
  playerId: string | null;
}

export default function LadderRow({ ladder, playerId }: LadderRowProps) {
  const navigate = useNavigate();
  const {
    participantCount,
    isLoading,
  } = useLadderParticipation(ladder.id, playerId);

  const handleRowClick = () => {
    navigate(`/ladder/${ladder.id}`);
  };

  return (
    <div
      className="flex items-center justify-between p-3 sm:p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors min-h-[72px]"
      onClick={handleRowClick}
    >
      <div className="flex-1 min-w-0 mr-3">
        <h3 className="font-medium text-sm sm:text-base truncate">{ladder.name}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground capitalize">
          {ladder.type} competition
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Participant count badge */}
        {!isLoading && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Users className="h-3 w-3" />
            <span className="hidden xs:inline">{participantCount}</span>
            <span className="xs:hidden">{participantCount}</span>
          </Badge>
        )}

        {isLoading && (
          <Button variant="ghost" size="sm" disabled className="h-9 w-9">
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        )}
      </div>
    </div>
  );
}
