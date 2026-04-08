// Skeleton loader for CategoryRow (Layout B - horizontal scroll)
interface CategoryRowSkeletonProps {
  title?: string;
}

export function CategoryRowSkeleton({ title = 'Loading...' }: CategoryRowSkeletonProps) {
  return (
    <section className="w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      {/* Horizontal Scroll Skeleton */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-44 flex flex-col rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              {/* Thumbnail Skeleton */}
              <div className="w-full aspect-square bg-zinc-200 dark:bg-zinc-800" />

              {/* Content Skeleton */}
              <div className="p-3 flex flex-col gap-2">
                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
