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
      className="group flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all duration-200"
    >
      {/* Thumbnail with Rank Badge */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {/* Rank Badge - Top Left */}
        <div className="absolute top-1 left-1 z-10 w-5 h-5 flex items-center justify-center rounded-full text-xs font-semibold bg-zinc-200/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300">
          {item.rank}
        </div>
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            width={64}
            height={64}
            unoptimized
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
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 h-10 leading-5 overflow-hidden line-clamp-2 group-hover:text-accent dark:group-hover:text-accent transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {item.artist}
        </p>
      </div>

    </a>
  );
}
