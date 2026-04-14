'use client';

import React from 'react';
import { CustomObject, deleteCustomObject } from '@/app/actions/customize';
import { ObjectCard } from './object-card';
import { AddObjectDialog } from './add-object-dialog';
import { Search, SlidersHorizontal, Plus, Upload, Type } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CustomizeClientProps {
  initialObjects: CustomObject[];
}

export function CustomizeClient({ initialObjects }: CustomizeClientProps) {
  const [objects, setObjects] = React.useState(initialObjects);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'upload' | 'text'>('upload');
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const filteredObjects = objects.filter((obj) =>
    obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    obj.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    const result = await deleteCustomObject(id);
    if (result.success) {
      setObjects((prev) => prev.filter((obj) => obj.id !== id));
    }
  };

  const handleCreated = () => {
    window.location.reload();
  };

  const openDialog = (mode: 'upload' | 'text') => {
    setDialogMode(mode);
    setIsDialogOpen(true);
    setIsPopoverOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customize</h1>
          <p className="text-muted-foreground">
            Manage your brand guides, social links, and custom reference materials.
          </p>
        </div>
        
        {/* Add New Entry Button with Popover UI */}
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button size="lg" className="rounded-lg font-semibold shadow-md hover:shadow-lg transition-all">
              <Plus className="w-5 h-5 mr-2" />
              Add New Entry
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2 rounded-xl shadow-xl overflow-hidden border">
            <div className="flex flex-col gap-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm font-medium h-10 px-3 hover:bg-primary/5 hover:text-primary transition-colors"
                onClick={() => openDialog('upload')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload From Device
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sm font-medium h-10 px-3 hover:bg-primary/5 hover:text-primary transition-colors"
                onClick={() => openDialog('text')}
              >
                <Type className="w-4 h-4 mr-2" />
                Add Text Content
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-center pt-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search for your context" 
            className="pl-10 h-11 bg-card/50 border-muted-foreground/20 rounded-lg focus:ring-1 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {filteredObjects.length} {filteredObjects.length === 1 ? 'Entry' : 'Entries'}
          </span>
        </div>
      </div>

      {/* Grid Section */}
      {filteredObjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-2">
          {filteredObjects.map((obj) => (
            <ObjectCard 
                key={obj.id} 
                object={obj} 
                onDelete={handleDelete} 
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20 animate-in fade-in duration-500">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <SlidersHorizontal className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">No custom entries found</h3>
          <p className="text-muted-foreground mt-2 max-w-md text-center">
            Upload brand guides or add social links to help the AI understand your style better.
          </p>
        </div>
      )}

      {/* Controlled Dialog */}
      <AddObjectDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        mode={dialogMode}
        onSuccess={handleCreated}
      />
    </div>
  );
}
