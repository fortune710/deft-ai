'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Link, Package, Calendar } from 'lucide-react';
import { CustomObject } from '@/app/actions/customize';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ObjectCardProps {
  object: CustomObject;
  onDelete: (id: string) => Promise<void>;
}

export function ObjectCard({ object, onDelete }: ObjectCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(object.id);
      toast.success('Object deleted successfully');
    } catch (error) {
      toast.error('Failed to delete object');
    } finally {
      setIsDeleting(false);
    }
  };

  const getIcon = () => {
    switch (object.type) {
      case 'brand guide':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'social link':
        return <Link className="w-5 h-5 text-green-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <Card className="flex flex-col h-full border hover:border-primary/50 transition-all duration-200 group bg-card shadow-sm hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
            {getIcon()}
          </div>
          <CardTitle className="text-lg font-bold truncate max-w-[200px]">
            {object.name}
          </CardTitle>
        </div>
        <Badge variant="secondary" className="capitalize text-[10px] font-semibold tracking-wider">
          {object.type}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        {object.content ? (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {object.content}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/60">No content available</p>
        )}
      </CardContent>
      <CardFooter className="pt-4 border-t border-muted/50 flex items-center justify-between bg-muted/20">
        <div className="flex items-center text-[10px] text-muted-foreground">
          <Calendar className="w-3 h-3 mr-1" />
          {format(new Date(object.created_at), 'MMM d, yyyy')}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-8 w-8"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
