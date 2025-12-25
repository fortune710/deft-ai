import { Skeleton } from '@/components/ui/skeleton';

export function BoardViewSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 h-full">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
            <div className="flex-1 space-y-3 p-3 rounded-lg border-2 border-dashed min-h-[200px]">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

