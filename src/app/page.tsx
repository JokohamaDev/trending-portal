'use client';

import { useEffect, useState } from 'react';
import { CategoryList } from '@/components/CategoryList';
import { CategoryListSkeleton } from '@/components/CategoryListSkeleton';
import { CategoryRowSkeleton } from '@/components/CategoryRowSkeleton';
import { TrendsData } from '@/lib/schemas';
import { mockTrendsData } from '@/lib/mockData';
import { EmptyCategory } from '@/components/EmptyCategory';
import { CategoryRow } from '@/components/CategoryRow';
import { HorizontalCard } from '@/components/HorizontalCard';

// Sun icon for light mode
function SunIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" />
    </svg>
  );
}

// Moon icon for dark mode
function MoonIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Layout icons
function LayoutAIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function LayoutBIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="8" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="14" width="18" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Icons for categories
function SpotifyIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function NetflixIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <path d="M9 7h5"/>
      <path d="M9 11h5"/>
      <path d="M9 15h5"/>
    </svg>
  );
}

function SteamIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.265 2.265-2.265 1.249 0 2.265 1.013 2.265 2.265 0 1.251-1.016 2.265-2.265 2.265-1.252 0-2.265-1.014-2.265-2.265z"/>
    </svg>
  );
}

interface ApiResponse {
  success: boolean;
  data: TrendsData;
  sourceHealth: Record<string, { available: boolean; stale: boolean }>;
  meta: {
    totalCategories: number;
    healthyCategories: number;
    staleCategories: number;
    lastUpdated: string;
  };
  error?: string;
}

export default function Home() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  // Sync localStorage read for initial state (must match layout.tsx script)
  const getInitialDarkMode = () => {
    if (typeof window === 'undefined') return true; // Default for SSR
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return true; // Default to dark
  };

  const getInitialLayout = () => {
    if (typeof window === 'undefined') return 'A';
    const saved = localStorage.getItem('layoutStyle');
    return saved === 'A' || saved === 'B' ? saved : 'A';
  };

  const [isDarkMode, setIsDarkMode] = useState(getInitialDarkMode);
  const [layoutStyle, setLayoutStyle] = useState<'A' | 'B'>(getInitialLayout);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // Save layout preference
  useEffect(() => {
    localStorage.setItem('layoutStyle', layoutStyle);
  }, [layoutStyle]);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const fetchTrends = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if mock data should be used
      const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
      
      if (useMockData) {
        // Simulate network delay for mock data
        await new Promise(resolve => setTimeout(resolve, 500));
        setData(mockTrendsData);
        setLoading(false);
        return;
      }
      
      const url = forceRefresh ? '/api/trends?refresh=1' : '/api/trends';
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const result: ApiResponse = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch trends');
      }
      
      setData(result.data);
    } catch (err) {
      console.error('Failed to fetch trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const handleRefresh = () => {
    if (cooldownSeconds > 0) return;
    setRefreshing(true);
    setCooldownSeconds(60);
    fetchTrends(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Vietnam Trending
          </h1>
          <div className="flex items-center gap-3">
            {/* Layout Toggle */}
            <button
              onClick={() => setLayoutStyle(layoutStyle === 'A' ? 'B' : 'A')}
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
              onClick={() => setIsDarkMode(!isDarkMode)}
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
              onClick={handleRefresh}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          // Loading State - matches current layout
          layoutStyle === 'A' ? (
            // Type A: 3 column grid skeleton (2 rows for 6 categories)
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <CategoryListSkeleton title="Loading..." />
              <CategoryListSkeleton title="Loading..." />
              <CategoryListSkeleton title="Loading..." />
              <CategoryListSkeleton title="Loading..." />
              <CategoryListSkeleton title="Loading..." />
              <CategoryListSkeleton title="Loading..." />
            </div>
          ) : (
            // Type B: Horizontal row skeletons
            <div className="flex flex-col gap-8">
              <CategoryRowSkeleton />
              <CategoryRowSkeleton />
              <CategoryRowSkeleton />
              <CategoryRowSkeleton />
              <CategoryRowSkeleton />
              <CategoryRowSkeleton />
            </div>
          )
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Failed to load trending data
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          // Data Display - Layout A or B
          layoutStyle === 'A' ? (
            // Layout A: 3 columns grid
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Google Category */}
              {data?.google ? (
                <CategoryList
                  title="Google Search"
                  category={data.google}
                  icon={<GoogleIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Google Search" 
                  icon={<GoogleIcon />}
                />
              )}

              {/* YouTube Category */}
              {data?.youtube ? (
                <CategoryList
                  title="YouTube"
                  category={data.youtube}
                  icon={<YouTubeIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="YouTube" 
                  icon={<YouTubeIcon />}
                />
              )}

              {/* Spotify Category */}
              {data?.spotify ? (
                <CategoryList
                  title="Spotify"
                  category={data.spotify}
                  icon={<SpotifyIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Spotify" 
                  icon={<SpotifyIcon />}
                />
              )}

              {/* Netflix Category */}
              {data?.netflix ? (
                <CategoryList
                  title="Netflix"
                  category={data.netflix}
                  icon={<NetflixIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Netflix" 
                  icon={<NetflixIcon />}
                />
              )}

              {/* News Category */}
              {data?.news ? (
                <CategoryList
                  title="Tuổi Trẻ News"
                  category={data.news}
                  icon={<NewsIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Tuổi Trẻ News" 
                  icon={<NewsIcon />}
                />
              )}

              {/* Steam Category */}
              {data?.steam ? (
                <CategoryList
                  title="Steam"
                  category={data.steam}
                  icon={<SteamIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Steam" 
                  icon={<SteamIcon />}
                />
              )}
            </div>
          ) : (
            // Layout B: Full-width horizontal rows
            <div className="flex flex-col gap-8">
              {/* Google Category */}
              {data?.google ? (
                <CategoryRow
                  title="Google Search"
                  category={data.google}
                  icon={<GoogleIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Google Search" 
                  icon={<GoogleIcon />}
                />
              )}

              {/* YouTube Category */}
              {data?.youtube ? (
                <CategoryRow
                  title="YouTube"
                  category={data.youtube}
                  icon={<YouTubeIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="YouTube" 
                  icon={<YouTubeIcon />}
                />
              )}

              {/* Spotify Category */}
              {data?.spotify ? (
                <CategoryRow
                  title="Spotify"
                  category={data.spotify}
                  icon={<SpotifyIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Spotify" 
                  icon={<SpotifyIcon />}
                />
              )}

              {/* Netflix Category */}
              {data?.netflix ? (
                <CategoryRow
                  title="Netflix"
                  category={data.netflix}
                  icon={<NetflixIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Netflix" 
                  icon={<NetflixIcon />}
                />
              )}

              {/* News Category */}
              {data?.news ? (
                <CategoryRow
                  title="Tuổi Trẻ News"
                  category={data.news}
                  icon={<NewsIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Tuổi Trẻ News" 
                  icon={<NewsIcon />}
                />
              )}

              {/* Steam Category */}
              {data?.steam ? (
                <CategoryRow
                  title="Steam"
                  category={data.steam}
                  icon={<SteamIcon />}
                />
              ) : (
                <EmptyCategory 
                  title="Steam" 
                  icon={<SteamIcon />}
                />
              )}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            © 2026 Trending Portal
          </p>
          <p className="text-xs text-zinc-400">
            {!loading && !error && data?.lastUpdated
              ? `Updated ${new Date(data.lastUpdated).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Loading...'}
          </p>
        </div>
      </footer>
    </div>
  );
}
