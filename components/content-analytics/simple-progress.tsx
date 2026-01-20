import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

interface SimpleProgressProps {
  value: number;
  className?: string;
  color?: string;
}

export function SimpleProgress({ value, className, color }: SimpleProgressProps) {
  return (
    <Progress 
      value={value} 
      className={cn('h-full w-full', className)}
      color={color}
    />
  );
}
