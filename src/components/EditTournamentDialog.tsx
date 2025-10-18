import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, CalendarIcon, X, Plus, UserPlus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type TournamentGroup = Database['public']['Tables']['tournament_groups']['Row'];
type TournamentParticipant = Database['public']['Tables']['tournament_participants']['Row'];
type TournamentGender = Database['public']['Enums']['tournament_gender'];
type TournamentMatchType = Database['public']['Enums']['tournament_match_type'];

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  elo_rating: number;
}

interface ParticipantWithProfile extends TournamentParticipant {
  profile?: Profile;
}

const editTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required'),
  start_date: z.date(),
  end_date: z.date(),
  winner_bonus_elo: z.number().int().min(0).max(500),
}).refine(
  (data) => data.end_date >= data.start_date,
  { message: 'End date must be after start date', path: ['end_date'] }
);

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  level: z.string().optional(),
  gender: z.enum(['mens', 'womens', 'mixed'] as const),
  match_type: z.enum(['singles', 'doubles'] as const),
});

type EditTournamentFormData = z.infer<typeof editTournamentSchema>;
type GroupData = z.infer<typeof groupSchema>;

interface EditTournamentDialogProps {
  tournament: Tournament;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTournamentUpdated: () => void;
}

export default function EditTournamentDialog({
  tournament,
  open,
  onOpenChange,
  onTournamentUpdated,
}: EditTournamentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<TournamentGroup[]>([]);
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [clubMembers, setClubMembers] = useState<Profile[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'participants'>('details');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditTournamentFormData>({
    resolver: zodResolver(editTournamentSchema),
    defaultValues: {
      name: tournament.name,
      start_date: parseISO(tournament.start_date),
      end_date: parseISO(tournament.end_date),
      winner_bonus_elo: tournament.winner_bonus_elo,
    },
  });

  const groupForm = useForm<GroupData>({
    defaultValues: {
      name: '',
      level: '',
      gender: 'mixed',
      match_type: 'singles',
    },
  });

  useEffect(() => {
    if (open) {
      fetchTournamentData();
    }
  }, [open, tournament.id]);

  const fetchTournamentData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('tournament_groups')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('name');

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Fetch participants with profiles
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select('*, profiles:player_id(id, first_name, last_name, elo_rating)')
        .eq('tournament_id', tournament.id);

      if (participantsError) throw participantsError;
      
      const participantsWithProfiles = participantsData?.map((p) => ({
        ...p,
        profile: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
      })) || [];
      
      setParticipants(participantsWithProfiles);

      // Fetch club members
      const { data: clubData } = await supabase
        .from('tournaments')
        .select('club_id')
        .eq('id', tournament.id)
        .single();

      if (clubData) {
        const { data: membersData, error: membersError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, elo_rating')
          .eq('club_id', clubData.club_id)
          .order('first_name');

        if (membersError) throw membersError;
        setClubMembers(membersData || []);
      }
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournament data',
        variant: 'destructive',
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const onSubmit = async (data: EditTournamentFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: data.name,
          start_date: format(data.start_date, 'yyyy-MM-dd'),
          end_date: format(data.end_date, 'yyyy-MM-dd'),
          winner_bonus_elo: data.winner_bonus_elo,
        })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tournament updated successfully',
      });

      onTournamentUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tournament',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMemberToGroup = async () => {
    if (!selectedGroup || !selectedMember) {
      toast({
        title: 'Selection Required',
        description: 'Please select both a group and a member',
        variant: 'destructive',
      });
      return;
    }

    // Check if already added
    const alreadyAdded = participants.some(
      (p) => p.group_id === selectedGroup && p.player_id === selectedMember
    );

    if (alreadyAdded) {
      toast({
        title: 'Already Added',
        description: 'This player is already in this group',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('tournament_participants').insert({
        tournament_id: tournament.id,
        group_id: selectedGroup,
        player_id: selectedMember,
        is_guest: false,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Participant added to group',
      });

      setSelectedMember('');
      fetchTournamentData(false);
    } catch (error) {
      console.error('Error adding participant:', error);
      toast({
        title: 'Error',
        description: 'Failed to add participant',
        variant: 'destructive',
      });
    }
  };

  const addGuestToGroup = async () => {
    if (!selectedGroup || !guestName.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please select a group and enter guest name',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create a dummy profile for the guest (we'll handle this differently)
      // For now, we need to create a profile entry or modify the schema
      // Let's create a lightweight profile with a special flag
      
      // Note: This requires the guest profile to reference an existing user_id
      // We'll need to adjust the schema to make player_id nullable for guests
      // For now, let's show an error
      
      toast({
        title: 'Coming Soon',
        description: 'Guest player functionality will be added in the next update',
        variant: 'default',
      });

      setGuestName('');
    } catch (error) {
      console.error('Error adding guest:', error);
      toast({
        title: 'Error',
        description: 'Failed to add guest',
        variant: 'destructive',
      });
    }
  };

  const removeParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Participant removed',
      });

      fetchTournamentData(false);
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove participant',
        variant: 'destructive',
      });
    }
  };

  const getGroupName = (groupId: string) => {
    return groups.find((g) => g.id === groupId)?.name || 'Unknown Group';
  };

  const getParticipantsForGroup = (groupId: string) => {
    return participants.filter((p) => p.group_id === groupId);
  };

  const addGroup = async (data: GroupData) => {
    if (!canEdit) return;

    try {
      const { error } = await supabase.from('tournament_groups').insert({
        tournament_id: tournament.id,
        name: data.name,
        level: data.level || null,
        gender: data.gender,
        match_type: data.match_type,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group added to tournament',
      });

      groupForm.reset();
      setShowGroupForm(false);
      fetchTournamentData(false);
    } catch (error) {
      console.error('Error adding group:', error);
      toast({
        title: 'Error',
        description: 'Failed to add group',
        variant: 'destructive',
      });
    }
  };

  const removeGroup = async (groupId: string, groupName: string) => {
    if (!canEdit) return;

    // Check if group has participants
    const groupParticipants = getParticipantsForGroup(groupId);
    if (groupParticipants.length > 0) {
      toast({
        title: 'Cannot Delete Group',
        description: `Group "${groupName}" has ${groupParticipants.length} participant(s). Remove all participants first.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group removed from tournament',
      });

      fetchTournamentData(false);
    } catch (error) {
      console.error('Error removing group:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove group',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading tournament data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canEdit = tournament.status !== 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tournament: {tournament.name}</DialogTitle>
          <DialogDescription>
            {canEdit ? 'Manage tournament details and participants' : 'View tournament details (completed tournaments cannot be edited)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full w-full sm:w-auto">
            <Button
              type="button"
              variant={activeTab === 'details' ? 'default' : 'ghost'}
              className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all ${
                activeTab === 'details' 
                  ? 'shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
              onClick={() => setActiveTab('details')}
            >
              <span className="text-xs sm:text-sm">Details</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === 'participants' ? 'default' : 'ghost'}
              className={`rounded-full flex-1 sm:flex-none px-3 sm:px-6 py-2 transition-all ${
                activeTab === 'participants' 
                  ? 'shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
              onClick={() => setActiveTab('participants')}
            >
              <span className="text-xs sm:text-sm">Participants</span>
            </Button>
          </div>

          {activeTab === 'details' && (
            <div className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                disabled={!canEdit}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={!canEdit}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                disabled={!canEdit}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={!canEdit}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="winner_bonus_elo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Winner Bonus ELO</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          disabled={!canEdit}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Bonus ELO points for group winners (0-500)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canEdit && (
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                )}
              </form>
            </Form>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="space-y-4 mt-4">
            {/* Manage Groups Section */}
            {canEdit && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Tournament Groups</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGroupForm(!showGroupForm)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Group
                  </Button>
                </div>

                {/* Add Group Form */}
                {showGroupForm && (
                  <div className="p-4 border rounded-lg space-y-4 bg-background">
                    <Input
                      placeholder="Group name (e.g., Men's A, Women's Advanced)"
                      {...groupForm.register('name')}
                    />
                    <Input
                      placeholder="Level (optional, e.g., Beginner, Intermediate)"
                      {...groupForm.register('level')}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={groupForm.watch('gender')}
                        onValueChange={(value) => groupForm.setValue('gender', value as TournamentGender)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mens">Men's</SelectItem>
                          <SelectItem value="womens">Women's</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={groupForm.watch('match_type')}
                        onValueChange={(value) => groupForm.setValue('match_type', value as TournamentMatchType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="singles">Singles</SelectItem>
                          <SelectItem value="doubles">Doubles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowGroupForm(false);
                          groupForm.reset();
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={groupForm.handleSubmit(addGroup)}
                        className="flex-1"
                      >
                        Add Group
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add Participants Section */}
            {canEdit && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium">Add Participants</h3>
                
                <div className="space-y-3">
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex gap-2">
                      <Select value={selectedMember} onValueChange={setSelectedMember}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select club member" />
                        </SelectTrigger>
                        <SelectContent>
                          {clubMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.first_name} {member.last_name} ({member.elo_rating})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={addMemberToGroup} size="icon">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Guest player name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                      <Button type="button" onClick={addGuestToGroup} size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {groups.map((group) => {
                const groupParticipants = getParticipantsForGroup(group.id);
                return (
                  <div key={group.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {group.level && `${group.level} • `}
                          {group.gender.charAt(0).toUpperCase() + group.gender.slice(1)} •{' '}
                          {group.match_type.charAt(0).toUpperCase() + group.match_type.slice(1)}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeGroup(group.id, group.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {groupParticipants.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No participants yet</p>
                    ) : (
                      <div className="space-y-2">
                        {groupParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 bg-muted/30 rounded"
                          >
                            <div>
                              {participant.is_guest ? (
                                <span className="text-sm">
                                  {participant.guest_name} <span className="text-muted-foreground">(Guest)</span>
                                </span>
                              ) : (
                                <span className="text-sm">
                                  {participant.profile?.first_name} {participant.profile?.last_name}
                                  <span className="text-muted-foreground ml-2">
                                    ({participant.profile?.elo_rating})
                                  </span>
                                </span>
                              )}
                            </div>
                            {canEdit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeParticipant(participant.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
