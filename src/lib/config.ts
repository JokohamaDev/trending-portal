// Application configuration constants
// Centralized configuration for easier maintenance and environment-specific overrides

export const config = {
  // Cache TTL settings
  cache: {
    // Default cache TTL for most categories (1 hour)
    defaultTtlHours: 1,
    defaultTtlMs: 1 * 60 * 60 * 1000,
    
    // News cache TTL (15 minutes - time-sensitive)
    newsCacheTtlMinutes: 15,
    newsCacheTtlMs: 15 * 60 * 1000,
    
    // Stale data threshold (7 days)
    staleThresholdDays: 7,
    staleThresholdMs: 7 * 24 * 60 * 60 * 1000,
    
    // Request deduplication TTL (30 seconds)
    requestDedupTtlSeconds: 30,
    requestDedupTtlMs: 30 * 1000,
  },
  
  // Item limits
  limits: {
    // Maximum items per category
    maxItemsPerCategory: 200,
    
    // Default items to fetch (top 10)
    defaultItemCount: 10,
    
    // Maximum string length for sanitization
    maxStringLength: 500,
  },
  
  // Rate limiting
  rateLimit: {
    // API rate limit (requests per minute)
    apiRequestsPerMinute: 100,
    apiWindowMs: 60 * 1000,
    
    // Strict rate limit for sensitive endpoints
    strictRequestsPerMinute: 20,
    strictWindowMs: 60 * 1000,
  },
  
  // Refresh cooldown
  refresh: {
    // Cooldown seconds between manual refreshes
    cooldownSeconds: 60,
  },
  
  // Data source health
  health: {
    // Maximum consecutive failures before marking source as unhealthy
    maxConsecutiveFailures: 3,
    
    // Health check interval (in minutes)
    checkIntervalMinutes: 5,
  },
  
  // API endpoints
  api: {
    // Spotify public charts
    spotifyChartsUrl: 'https://charts-spotify-com-service.spotify.com/public/v0/charts',
    
    // Kworb fallback
    kworbUrl: 'https://kworb.net/spotify/country/vn_daily.html',
    
    // Google Trends RSS
    googleTrendsRss: 'https://trends.google.com/trending/rss?geo=VN',
    
    // FlixPatrol Netflix
    flixpatrolUrl: 'https://flixpatrol.com/top10/netflix/vietnam/',
    
    // OMDB API
    omdbBaseUrl: 'https://www.omdbapi.com/',
  },
} as const;

// Type exports
export type Config = typeof config;
