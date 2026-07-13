'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { CustomObjectType, handleCreateCustomObject } from '@/app/actions/customize';
import { toast } from 'sonner';

interface AddObjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'upload' | 'text';
  onSuccess: () => void;
}

export function AddObjectDialog({ isOpen, onOpenChange, mode, onSuccess }: AddObjectDialogProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    if (mode === 'upload' && file) {
      formData.append('file', file);
    }

    try {
      setIsPending(true);
      const result = await handleCreateCustomObject(formData);

      if (result.success) {
        toast.success(`Entry added successfully`);
        onOpenChange(false);
        onSuccess();
        setFile(null);
      } else {
        toast.error(result.error || 'Failed to add entry');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];
      const allowedExt = ['.pdf', '.docx', '.txt'];
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();

      if (allowedTypes.includes(selectedFile.type) || allowedExt.includes(`.${fileExt}`)) {
        setFile(selectedFile);
      } else {
        toast.error('Please upload a PDF, DOCX, or TXT file');
        e.target.value = '';
      }
    }
  };

  const title = mode === 'upload' ? 'Upload Content' : 'Add Text Content';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-background border shadow-2xl rounded-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === 'upload' 
              ? 'Upload a document to train the AI on your brand style.' 
              : 'Directly input text to provide context for your content.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sm font-semibold">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Summer Brand Voice"
              className="border-muted-foreground/20 focus:border-primary transition-colors"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="type" className="text-sm font-semibold">Type</Label>
            <Select name="type" defaultValue="brand guide" required>
              <SelectTrigger className="border-muted-foreground/20">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand guide">Brand Guide</SelectItem>
                <SelectItem value="social link">Social Link</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="text-sm font-semibold">
              {mode === 'upload' ? 'File Upload' : 'Content Text'}
            </Label>
            
            {mode === 'upload' ? (
              <div className="border-2 border-dashed border-muted rounded-xl p-6 flex flex-col items-center justify-center space-y-2 hover:border-primary/50 transition-all cursor-pointer relative bg-muted/5">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt"
                />
                {file ? (
                  <div className="flex items-center space-x-2 text-primary font-medium animate-in fade-in zoom-in duration-200">
                    <FileText className="w-8 h-8" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground/50 mb-1" />
                    <p className="text-sm font-medium">Click or drag to upload</p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, TXT</p>
                  </>
                )}
              </div>
            ) : (
              <Textarea
                name="content"
                placeholder="Paste or type your content here..."
                className="min-h-[180px] border-muted-foreground/20 focus:border-primary transition-all resize-none"
                required={mode === 'text'}
              />
            )}
          </div>

          <DialogFooter className="pt-4 border-t gap-2 flex-col sm:flex-row">
            <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="rounded-lg order-2 sm:order-1 sm:flex-1"
            >
              Cancel
            </Button>
            <Button 
                type="submit" 
                disabled={isPending || (mode === 'upload' && !file)}
                className="rounded-lg min-w-[120px] order-1 sm:order-2 sm:flex-1 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                'Create Entry'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
