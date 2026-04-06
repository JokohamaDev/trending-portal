'use client';

import { ItemCard } from './ItemCard';
import { CategoryData } from '@/lib/schemas';

interface CategoryListProps {
  title: string;
  category: CategoryData;
  icon?: React.ReactNode;
}

export function CategoryList({ title, category, icon }: CategoryListProps) {
  const isStale = !category.healthy;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-zinc-500">{icon}</span>}
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
        </div>
        {isStale && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-xs text-amber-700 dark:text-amber-300">
            Stale
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {category.items.map((item) => (
          <ItemCard key={`${item.rank}-${item.title}`} item={item} />
        ))}
      </div>

      {/* Source indicator */}
      <div className="mt-3 text-xs text-zinc-400 text-right">
        Source: {category.source}
      </div>
    </section>
  );
}
