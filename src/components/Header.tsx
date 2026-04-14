'use client';

import { LayoutAIcon, LayoutBIcon, SunIcon, MoonIcon } from './icons';
import { config } from '@/lib/config';

function AppLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V13H22V18C22 20.2091 20.2091 22 18 22H6L5.79395 21.9951C3.68056 21.8879 2 20.14 2 18V6C2 3.79086 3.79086 2 6 2H11V4ZM17 17H15V13L17 11V17ZM18 2C20.2091 2 22 3.79086 22 6V11H20V6C20 5.8211 19.9738 5.64841 19.9297 5.4834L8.70703 16.707C8.42103 16.993 7.99086 17.0786 7.61719 16.9238C7.24359 16.769 7 16.4044 7 16V7H9V13.5859L18.5156 4.06934C18.351 4.02547 18.1785 4 18 4H13V2H18Z" fill="currentColor"/>
    </svg>
  );
}

interface HeaderProps {
  isDarkMode: boolean;
  layoutStyle: 'A' | 'B';
  onDarkModeToggle: () => void;
  onLayoutToggle: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  cooldownSeconds: number;
  loading: boolean;
}

export function Header({
  isDarkMode,
  layoutStyle,
  onDarkModeToggle,
  onLayoutToggle,
  onRefresh,
  refreshing,
  cooldownSeconds,
  loading,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppLogo className="w-6 h-6 text-accent" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Vietnam Trending
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Layout Toggle */}
          <button
            onClick={onLayoutToggle}
            className="relative flex items-center w-12 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-colors"
            title={`Switch to layout ${layoutStyle === 'A' ? 'B' : 'A'}`}
          >
            <span className="sr-only">Toggle layout</span>
            <span
              className={`absolute left-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-zinc-800 shadow-sm transition-transform duration-200 ${
                layoutStyle === 'B' ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {layoutStyle === 'A' ? (
                <LayoutAIcon className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              ) : (
                <LayoutBIcon className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              )}
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onDarkModeToggle}
            className="relative w-12 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-colors"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="sr-only">Toggle dark mode</span>
            <span
              className={`absolute top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-zinc-800 shadow-sm transition-transform duration-200 ${
                isDarkMode ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            >
              {isDarkMode ? (
                <MoonIcon className="w-3.5 h-3.5 text-indigo-500" />
              ) : (
                <SunIcon className="w-3.5 h-3.5 text-amber-500" />
              )}
            </span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading || refreshing || cooldownSeconds > 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s to refresh again` : "Refresh data (bypass cache)"}
          >
            <svg 
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? '...' : cooldownSeconds > 0 ? `(${cooldownSeconds})` : ''}
          </button>
        </div>
      </div>
    </header>
  );
}
