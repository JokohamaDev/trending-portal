// Skeleton loader for CategoryList
interface CategoryListSkeletonProps {
  title: string;
  icon?: React.ReactNode;
}

export function CategoryListSkeleton({ title, icon }: CategoryListSkeletonProps) {
  return (
    <section className="w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-zinc-300 dark:text-zinc-700">{icon}</span>}
          <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      {/* Items Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          >
            {/* Rank Badge Skeleton */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />

            {/* Thumbnail Skeleton */}
            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-zinc-200 dark:bg-zinc-800" />

            {/* Content Skeleton */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Source Skeleton */}
      <div className="mt-3 flex justify-end">
        <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </section>
  );
}
