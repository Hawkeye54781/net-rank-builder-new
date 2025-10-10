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
import { Plus, Loader2 } from 'lucide-react';

const addLadderSchema = z.object({
  name: z
    .string()
    .min(1, 'Ladder name is required')
    .max(100, 'Ladder name must be less than 100 characters'),
  type: z.enum(['singles', 'doubles', 'mixed'], {
    required_error: 'Please select a ladder type',
  }),
});

type AddLadderFormData = z.infer<typeof addLadderSchema>;

interface AddLadderDialogProps {
  clubId: string;
  onLadderAdded: () => void;
}

export default function AddLadderDialog({ clubId, onLadderAdded }: AddLadderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddLadderFormData>({
    resolver: zodResolver(addLadderSchema),
    defaultValues: {
      name: '',
      type: undefined,
    },
  });

  const onSubmit = async (data: AddLadderFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('ladders').insert([
        {
          club_id: clubId,
          name: data.name,
          type: data.type,
          is_active: true,
        },
      ]);

      if (error) {
        throw error;
      }

      toast({
        title: 'Success!',
        description: `Ladder "${data.name}" has been created successfully.`,
      });

      form.reset();
      setOpen(false);
      onLadderAdded();
    } catch (error: any) {
      console.error('Error creating ladder:', error);
      
      let errorMessage = 'Failed to create ladder. Please try again.';
      
      if (error?.code === '23505' && error?.constraint?.includes('club_id_name')) {
        errorMessage = 'A ladder with this name already exists at your club.';
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-court hover:bg-primary-light flex-shrink-0 h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Add Ladder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Ladder</DialogTitle>
          <DialogDescription>
            Create a new ladder for your club members to compete in.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ladder Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Men's Singles, Women's Doubles"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a descriptive name for your ladder.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ladder Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ladder type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="singles">Singles</SelectItem>
                      <SelectItem value="doubles">Doubles</SelectItem>
                      <SelectItem value="mixed">Mixed Doubles</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The format of competition for this ladder.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Ladder
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
