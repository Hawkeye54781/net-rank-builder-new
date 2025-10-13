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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Loader2 } from 'lucide-react';

const editLadderSchema = z.object({
  name: z.string().min(1, 'Ladder name is required').max(100, 'Name must be less than 100 characters'),
});

type EditLadderFormData = z.infer<typeof editLadderSchema>;

interface EditLadderDialogProps {
  ladderId: string;
  currentName: string;
  onLadderUpdated: () => void;
  children?: React.ReactNode;
}

/**
 * Dialog component for club admins to rename ladders
 * Mobile-first design with proper validation and loading states
 */
export default function EditLadderDialog({
  ladderId,
  currentName,
  onLadderUpdated,
  children,
}: EditLadderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditLadderFormData>({
    resolver: zodResolver(editLadderSchema),
    defaultValues: {
      name: currentName,
    },
  });

  const onSubmit = async (data: EditLadderFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('ladders')
        .update({ name: data.name })
        .eq('id', ladderId);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Ladder name has been updated.',
      });

      setOpen(false);
      onLadderUpdated();
    } catch (error: any) {
      console.error('Error updating ladder:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ladder name. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset({ name: currentName });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9"
            title="Edit ladder name"
          >
            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl">Edit Ladder</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Update the ladder name. This will be visible to all participants.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Ladder Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Men's Singles"
                      {...field}
                      className="text-sm sm:text-base"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
