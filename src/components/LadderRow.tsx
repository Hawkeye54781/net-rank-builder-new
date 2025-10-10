import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLadderParticipation } from '@/hooks/useLadderParticipation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, UserPlus, UserMinus, Users, Loader2 } from 'lucide-react';

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
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const {
    isParticipant,
    participantCount,
    isLoading,
    joinLadder,
    leaveLadder,
    isJoining,
    isLeaving,
  } = useLadderParticipation(ladder.id, playerId);

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or dropdowns
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[role="dialog"]')
    ) {
      return;
    }
    navigate(`/ladder/${ladder.id}`);
  };

  const handleLeave = async () => {
    await leaveLadder();
    setIsAlertOpen(false);
  };

  return (
    <>
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

          {/* Join/Leave Actions */}
          {playerId && !isLoading && (
            <>
              {isParticipant ? (
                // Dropdown menu for participants
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 touch-manipulation"
                      disabled={isLeaving}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer touch-manipulation min-h-[44px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAlertOpen(true);
                      }}
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Leave Ladder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Join button for non-participants
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    joinLadder();
                  }}
                  disabled={isJoining}
                  className="hover:bg-primary hover:text-primary-foreground h-9 px-3 text-xs sm:text-sm touch-manipulation"
                >
                  {isJoining ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1 sm:mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">{isJoining ? 'Joining...' : 'Join'}</span>
                  <span className="sm:hidden">{isJoining ? '...' : 'Join'}</span>
                </Button>
              )}
            </>
          )}

          {isLoading && (
            <Button variant="ghost" size="sm" disabled className="h-9 w-9">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          )}
        </div>
      </div>

      {/* Leave confirmation dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Ladder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{ladder.name}"? You will lose your current
              ranking position and will need to rejoin if you want to participate again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={isLeaving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLeaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Leaving...
                </>
              ) : (
                'Leave Ladder'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
