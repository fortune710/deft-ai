'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Platform } from '@/types/content-analytics';

const PLATFORMS: { value: Platform | 'all'; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
];

interface FilterPlatformDrawerProps {
  selectedPlatform: Platform | 'all';
  onPlatformChange: (platform: Platform | 'all') => void;
  children: React.ReactNode;
}

export function FilterPlatformDrawer({
  selectedPlatform,
  onPlatformChange,
  children,
}: FilterPlatformDrawerProps) {
  const [tempPlatform, setTempPlatform] = useState<Platform | 'all'>(selectedPlatform);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Reset tempPlatform when drawer opens
      setTempPlatform(selectedPlatform);
    }
  };

  const handleSave = () => {
    onPlatformChange(tempPlatform);
  };

  const handleCancel = () => {
    setTempPlatform(selectedPlatform);
  };

  return (
    <Drawer onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter Platform</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform-select">Select Platform</Label>
            <Select
              value={tempPlatform}
              onValueChange={(value) => setTempPlatform(value as Platform | 'all')}
            >
              <SelectTrigger id="platform-select">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button onClick={handleSave}>Save</Button>
          </DrawerClose>
          <DrawerClose asChild>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
