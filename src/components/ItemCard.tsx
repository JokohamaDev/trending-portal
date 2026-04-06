'use client';

import Image from 'next/image';
import { TrendingItem } from '@/lib/schemas';

interface ItemCardProps {
  item: TrendingItem;
}

export function ItemCard({ item }: ItemCardProps) {
  return (
    <a
      href={item.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all duration-200"
    >
      {/* Rank Badge */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        {item.rank}
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            width={48}
            height={48}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
            No img
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {item.artist}
        </p>
      </div>

      {/* External Link Icon */}
      <svg
        className="flex-shrink-0 w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
