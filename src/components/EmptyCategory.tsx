'use client';

import { useState } from 'react';

interface EmptyCategoryProps {
  title: string;
  icon?: React.ReactNode;
}

const humorQuotes = [
  "The algorithm is on a coffee break ☕",
  "Trends are hiding from us 🫥",
  "Data ghosts detected 👻",
  "These trends are shy today 🙈",
  "404: Trends not found 🕵️",
  "The charts went on vacation 🏖️",
  "Waiting for the internet to notice us 🌐",
  "Trends are loading... in another dimension 🌀",
];

export function EmptyCategory({ title, icon }: EmptyCategoryProps) {
  // Pick random quote once per session (on mount), stays stable across re-renders
  const [quote] = useState(() => 
    humorQuotes[Math.floor(Math.random() * humorQuotes.length)]
  );

  return (
    <section className="w-full opacity-60">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-zinc-500">{icon}</span>}
        <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
          {title}
        </h2>
      </div>

      {/* Empty State */}
      <div className="p-6 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center italic">
          {quote}
        </p>
      </div>
    </section>
  );
}
