'use client';

import { useEffect, useState } from 'react';
import { CategoryList } from '@/components/CategoryList';
import { CategoryListSkeleton } from '@/components/CategoryListSkeleton';
import { CategoryRowSkeleton } from '@/components/CategoryRowSkeleton';
import { TrendsData } from '@/lib/schemas';
import { mockTrendsData } from '@/lib/mockData';
import { EmptyCategory } from '@/components/EmptyCategory';
import { CategoryRow } from '@/components/CategoryRow';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { config } from '@/lib/config';
import { 
  SpotifyIcon, 
  YouTubeIcon, 
  NetflixIcon, 
  GoogleIcon, 
  NewsIcon, 
  SteamIcon 
} from '@/components/icons';

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
    setCooldownSeconds(config.refresh.cooldownSeconds);
    fetchTrends(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header
        isDarkMode={isDarkMode}
        layoutStyle={layoutStyle}
        onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
        onLayoutToggle={() => setLayoutStyle(layoutStyle === 'A' ? 'B' : 'A')}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        cooldownSeconds={cooldownSeconds}
        loading={loading}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          // Loading State - matches current layout
          layoutStyle === 'A' ? (
            // Type A: 3 column grid skeleton (only show example 3 categories)
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

      <Footer lastUpdated={data?.lastUpdated || null} loading={loading} error={error} />
    </div>
  );
}
