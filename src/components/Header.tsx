'use client';

import { LayoutAIcon, LayoutBIcon, SunIcon, MoonIcon } from './icons';
import { config } from '@/lib/config';

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
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Vietnam Trending
        </h1>
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
