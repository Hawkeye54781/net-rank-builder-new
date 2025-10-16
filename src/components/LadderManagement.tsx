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
import EditLadderDialog from '@/components/EditLadderDialog';

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLadder, setSelectedLadder] = useState<Ladder | null>(null);
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
    <>
      <EditLadderDialog
        ladderId={selectedLadder?.id || ''}
        currentName={selectedLadder?.name || ''}
        onLadderUpdated={onLadderUpdated}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ladder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedLadder?.name}"? This action cannot be
              undone and will remove all associated matches and rankings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedLadder) {
                  handleDeleteLadder(selectedLadder.id, selectedLadder.name);
                  setDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deletingLadderId === selectedLadder?.id}
            >
              {deletingLadderId === selectedLadder?.id ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    <div className="space-y-3">
      {ladders.map((ladder) => (
        <div
          key={ladder.id}
          className="p-3 sm:p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
        >
          {/* Title row with menu */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-medium text-sm sm:text-base truncate">{ladder.name}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  disabled={deletingLadderId === ladder.id || togglingLadderId === ladder.id}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => {
                    setSelectedLadder(ladder);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename Ladder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleToggleActive(ladder)}
                  disabled={togglingLadderId === ladder.id}
                  className="cursor-pointer"
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
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onSelect={() => {
                    setSelectedLadder(ladder);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Ladder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">{formatType(ladder.type)}</Badge>
            <Badge
              variant={ladder.is_active ? 'default' : 'secondary'}
              className={
                `text-xs ${
                ladder.is_active
                  ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800'
                  : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                }`
              }
            >
              {ladder.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {ladder.is_active && (
              <LadderParticipants
                ladderId={ladder.id}
                ladderName={ladder.name}
                ladderType={ladder.type}
                isClubAdmin={true}
              />
            )}
          </div>
        </div>
      ))}
    </div>
    </>
  );
}
