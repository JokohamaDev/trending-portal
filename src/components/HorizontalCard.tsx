'use client';

import Image from 'next/image';
import { TrendingItem } from '@/lib/schemas';

function getAspectRatioClass(source: string): string {
  switch (source) {
    case 'youtube': return 'aspect-video';     // 16:9
    case 'netflix': return 'aspect-[2/3]';     // Portrait poster
    case 'google': return 'aspect-[3/2]';      // 3:2 landscape
    case 'news': return 'aspect-[3/2]';        // 3:2 landscape
    case 'spotify': return 'aspect-square';    // 1:1
    default: return '';                        // Auto height (no aspect ratio)
  }
}

interface HorizontalCardProps {
  item: TrendingItem;
}

export function HorizontalCard({ item }: HorizontalCardProps) {
  return (
    <a
      href={item.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex-shrink-0 w-40 flex flex-col rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200"
    >
      {/* Rank Badge - Top Left */}
      <div className="absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold bg-zinc-200/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300">
        {item.rank}
      </div>

      {/* Image Area - Middle */}
      <div className={`w-full ${getAspectRatioClass(item.source)} bg-zinc-100 dark:bg-zinc-800 overflow-hidden`}>
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            width={176}
            height={176}
            unoptimized
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">
            Image
          </div>
        )}
      </div>

      {/* Content - Bottom */}
      <div className="p-3 flex flex-col gap-1">
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
