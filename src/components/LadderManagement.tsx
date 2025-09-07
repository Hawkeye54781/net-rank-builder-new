import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import LadderParticipants from '@/components/LadderParticipants';

interface Ladder {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  club_id: string;
  created_at: string;
}

interface LadderManagementProps {
  ladders: Ladder[];
  onLadderUpdated: () => void;
}

export default function LadderManagement({ ladders, onLadderUpdated }: LadderManagementProps) {
  const [deletingLadderId, setDeletingLadderId] = useState<string | null>(null);
  const [togglingLadderId, setTogglingLadderId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleToggleActive = async (ladder: Ladder) => {
    setTogglingLadderId(ladder.id);
    
    try {
      const { error } = await supabase
        .from('ladders')
        .update({ is_active: !ladder.is_active })
        .eq('id', ladder.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Ladder "${ladder.name}" has been ${ladder.is_active ? 'deactivated' : 'activated'}.`,
      });

      onLadderUpdated();
    } catch (error) {
      console.error('Error toggling ladder status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ladder status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTogglingLadderId(null);
    }
  };

  const handleDeleteLadder = async (ladderId: string, ladderName: string) => {
    setDeletingLadderId(ladderId);

    try {
      const { error } = await supabase
        .from('ladders')
        .delete()
        .eq('id', ladderId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Ladder "${ladderName}" has been deleted.`,
      });

      onLadderUpdated();
    } catch (error) {
      console.error('Error deleting ladder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ladder. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingLadderId(null);
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

  if (ladders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No ladders created yet. Add your first ladder to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ladders.map((ladder) => (
        <div
          key={ladder.id}
          className="flex items-center justify-between p-4 border rounded-lg bg-card"
        >
          <div className="flex items-center space-x-4">
            <div>
              <h3 className="font-medium">{ladder.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">{formatType(ladder.type)}</Badge>
                  <Badge
                    variant={ladder.is_active ? 'default' : 'secondary'}
                    className={
                      ladder.is_active
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }
                  >
                    {ladder.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {ladder.is_active && (
                    <LadderParticipants
                      ladderId={ladder.id}
                      ladderName={ladder.name}
                      isClubAdmin={true}
                    />
                  )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={deletingLadderId === ladder.id || togglingLadderId === ladder.id}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleToggleActive(ladder)}
                disabled={togglingLadderId === ladder.id}
              >
                {ladder.is_active ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Ladder</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{ladder.name}"? This action cannot be
                      undone and will remove all associated matches and rankings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteLadder(ladder.id, ladder.name)}
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={deletingLadderId === ladder.id}
                    >
                      {deletingLadderId === ladder.id ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
