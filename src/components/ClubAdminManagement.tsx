import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ShieldCheck, ShieldOff, Crown } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  matches_played: number;
}

interface UserRole {
  id: string;
  user_id: string;
  club_id: string;
  role: 'club_admin' | 'user';
  created_at: string;
}

interface ClubAdminManagementProps {
  clubId: string;
  currentUserId: string;
}

export default function ClubAdminManagement({ clubId, currentUserId }: ClubAdminManagementProps) {
  const [members, setMembers] = useState<Profile[]>([]);
  const [adminRoles, setAdminRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClubMembers();
  }, [clubId]);

  const fetchClubMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch all club members
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('club_id', clubId)
        .order('first_name', { ascending: true });

      if (profilesError) throw profilesError;
      setMembers(profilesData || []);

      // Fetch all admin roles for this club
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('club_id', clubId)
        .eq('role', 'club_admin');

      if (rolesError) throw rolesError;
      setAdminRoles(rolesData || []);

    } catch (error) {
      console.error('Error fetching club members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load club members. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = (userId: string) => {
    return adminRoles.some(role => role.user_id === userId);
  };

  const handlePromoteToAdmin = async (member: Profile) => {
    setProcessingUserId(member.user_id);

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: member.user_id,
          club_id: clubId,
          role: 'club_admin',
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${member.first_name} ${member.last_name} has been promoted to club admin.`,
      });

      await fetchClubMembers();
    } catch (error: any) {
      console.error('Error promoting to admin:', error);
      
      // Check for unique constraint violation (user is already an admin)
      if (error.code === '23505') {
        toast({
          title: 'Info',
          description: `${member.first_name} ${member.last_name} is already a club admin.`,
        });
        await fetchClubMembers(); // Refresh to sync state
      } else {
        toast({
          title: 'Error',
          description: 'Failed to promote member to admin. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDemoteFromAdmin = async (member: Profile) => {
    setProcessingUserId(member.user_id);

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', member.user_id)
        .eq('club_id', clubId)
        .eq('role', 'club_admin');

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${member.first_name} ${member.last_name} has been removed from club admins.`,
      });

      await fetchClubMembers();
    } catch (error) {
      console.error('Error demoting from admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove admin privileges. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No members found in this club.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {members.map((member) => {
        const memberIsAdmin = isAdmin(member.user_id);
        const isCurrentUser = member.user_id === currentUserId;

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-card"
          >
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  {member.first_name} {member.last_name}
                  {isCurrentUser && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                  {memberIsAdmin && (
                    <Badge 
                      variant="default" 
                      className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-800"
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <span className="text-muted-foreground">•</span>
                  <p className="text-sm text-muted-foreground">
                    {member.matches_played} matches played
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!memberIsAdmin ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={processingUserId === member.user_id}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Make Admin
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Promote to Club Admin</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to make {member.first_name} {member.last_name} a club admin? 
                        They will be able to manage ladders, matches, and other club members' admin status.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handlePromoteToAdmin(member)}
                        disabled={processingUserId === member.user_id}
                      >
                        {processingUserId === member.user_id ? 'Promoting...' : 'Promote to Admin'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={processingUserId === member.user_id || isCurrentUser}
                    >
                      <ShieldOff className="mr-2 h-4 w-4" />
                      Remove Admin
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Club Admin</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove {member.first_name} {member.last_name}'s admin privileges? 
                        They will no longer be able to manage ladders, matches, or other admins.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDemoteFromAdmin(member)}
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={processingUserId === member.user_id}
                      >
                        {processingUserId === member.user_id ? 'Removing...' : 'Remove Admin'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
