'use client';

import { HorizontalCard } from './HorizontalCard';
import { CategoryData } from '@/lib/schemas';

interface CategoryRowProps {
  title: string;
  category: CategoryData;
  icon?: React.ReactNode;
}

export function CategoryRow({ title, category, icon }: CategoryRowProps) {
  const isStale = !category.healthy;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-zinc-500">{icon}</span>}
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {isStale && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-xs text-amber-700 dark:text-amber-300">
              Stale
            </span>
          )}
          <span className="text-xs text-zinc-400">
            Source: {category.source}
          </span>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {category.items.map((item) => (
            <HorizontalCard key={`${item.rank}-${item.title}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
