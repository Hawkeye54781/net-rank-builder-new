import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Loader2, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type TournamentGender = Database['public']['Enums']['tournament_gender'];
type TournamentMatchType = Database['public']['Enums']['tournament_match_type'];

// Schema for tournament groups
const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  level: z.string().optional(),
  gender: z.enum(['mens', 'womens', 'mixed'] as const),
  match_type: z.enum(['singles', 'doubles'] as const),
});

// Main tournament schema
const addTournamentSchema = z.object({
  name: z
    .string()
    .min(1, 'Tournament name is required')
    .max(100, 'Tournament name must be less than 100 characters'),
  start_date: z.date({
    required_error: 'Please select a start date',
  }),
  end_date: z.date({
    required_error: 'Please select an end date',
  }),
  winner_bonus_elo: z
    .number()
    .int()
    .min(0, 'Bonus ELO must be 0 or greater')
    .max(500, 'Bonus ELO must be 500 or less'),
  format: z.enum(['round_robin'] as const),
}).refine(
  (data) => data.end_date >= data.start_date,
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  }
);

type AddTournamentFormData = z.infer<typeof addTournamentSchema>;
type GroupData = z.infer<typeof groupSchema>;

interface AddTournamentDialogProps {
  clubId: string;
  onTournamentAdded: () => void;
}

export default function AddTournamentDialog({ clubId, onTournamentAdded }: AddTournamentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddTournamentFormData>({
    resolver: zodResolver(addTournamentSchema),
    defaultValues: {
      name: '',
      start_date: undefined,
      end_date: undefined,
      winner_bonus_elo: 50,
      format: 'round_robin',
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

  const addGroup = (data: GroupData) => {
    setGroups([...groups, data]);
    groupForm.reset();
    setShowGroupForm(false);
  };

  const removeGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: AddTournamentFormData) => {
    if (groups.length === 0) {
      toast({
        title: 'Groups Required',
        description: 'Please add at least one group to the tournament.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert([
          {
            club_id: clubId,
            name: data.name,
            start_date: format(data.start_date, 'yyyy-MM-dd'),
            end_date: format(data.end_date, 'yyyy-MM-dd'),
            winner_bonus_elo: data.winner_bonus_elo,
            format: data.format,
            status: 'draft',
          },
        ])
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Create groups
      const groupInserts = groups.map((group) => ({
        tournament_id: tournament.id,
        name: group.name,
        level: group.level || null,
        gender: group.gender,
        match_type: group.match_type,
      }));

      const { error: groupsError } = await supabase
        .from('tournament_groups')
        .insert(groupInserts);

      if (groupsError) throw groupsError;

      toast({
        title: 'Success!',
        description: `Tournament "${data.name}" has been created with ${groups.length} group(s).`,
      });

      form.reset();
      setGroups([]);
      setOpen(false);
      onTournamentAdded();
    } catch (error: any) {
      console.error('Error creating tournament:', error);

      let errorMessage = 'Failed to create tournament. Please try again.';

      if (error?.code === '23505') {
        errorMessage = 'A tournament with this name already exists at your club.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
      setGroups([]);
      setShowGroupForm(false);
      groupForm.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-court hover:bg-primary-light flex-shrink-0 h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Add Tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Tournament</DialogTitle>
          <DialogDescription>
            Create a new round-robin tournament for your club members.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tournament Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Spring Championship 2025"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a descriptive name for your tournament.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
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
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bonus ELO */}
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
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Bonus ELO points awarded to group winners (0-500).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Format (Read-only for now) */}
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament Format</FormLabel>
                  <Select value={field.value} disabled>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    More formats coming soon!
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Groups Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Tournament Groups</FormLabel>
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

              {/* Existing Groups */}
              {groups.length > 0 && (
                <div className="space-y-2">
                  {groups.map((group, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.level && `${group.level} • `}
                          {group.gender.charAt(0).toUpperCase() + group.gender.slice(1)} •{' '}
                          {group.match_type.charAt(0).toUpperCase() + group.match_type.slice(1)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeGroup(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Group Form */}
              {showGroupForm && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/10">
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

              {groups.length === 0 && !showGroupForm && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No groups added yet. Click "Add Group" to create tournament groups.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || groups.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Tournament
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
