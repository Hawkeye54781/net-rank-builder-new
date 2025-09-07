import { useLadderParticipation } from '@/hooks/useLadderParticipation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { UserPlus, UserMinus, Loader2, Users } from 'lucide-react';

interface LadderParticipationButtonProps {
  ladderId: string;
  ladderName: string;
  playerId: string | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showParticipantCount?: boolean;
  className?: string;
}

/**
 * Clean, reusable component for ladder participation management
 * Handles join/leave functionality with proper loading states and confirmations
 */
export default function LadderParticipationButton({
  ladderId,
  ladderName,
  playerId,
  variant = 'outline',
  size = 'default',
  showParticipantCount = true,
  className = '',
}: LadderParticipationButtonProps) {
  const {
    isParticipant,
    participantCount,
    isLoading,
    joinLadder,
    leaveLadder,
    isJoining,
    isLeaving,
  } = useLadderParticipation(ladderId, playerId);

  // Don't render if player ID is not available
  if (!playerId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  // If user is already a participant, show leave button
  if (isParticipant) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size={size}
            disabled={isLeaving}
            className={className}
          >
            {isLeaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserMinus className="h-4 w-4 mr-2" />
            )}
            {isLeaving ? 'Leaving...' : 'Leave Ladder'}
            {showParticipantCount && (
              <span className="ml-2 flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {participantCount}
              </span>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Ladder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{ladderName}"? You will lose your current
              ranking position and will need to rejoin if you want to participate again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={leaveLadder}
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
    );
  }

  // If user is not a participant, show join button
  return (
    <Button
      variant={variant}
      size={size}
      onClick={joinLadder}
      disabled={isJoining}
      className={`${className} hover:bg-primary hover:text-primary-foreground`}
    >
      {isJoining ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      {isJoining ? 'Joining...' : 'Join Ladder'}
      {showParticipantCount && (
        <span className="ml-2 flex items-center">
          <Users className="h-3 w-3 mr-1" />
          {participantCount}
        </span>
      )}
    </Button>
  );
}
