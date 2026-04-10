import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Required API keys
  YOUTUBE_API_KEY: z.string().min(1, 'YOUTUBE_API_KEY is required'),
  
  // Optional API keys (with warnings)
  OMDB_API_KEY: z.string().optional(),
  
  // Feature flags
  NEXT_PUBLIC_USE_MOCK_DATA: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  
  // Vercel KV (will be validated at runtime)
  KV_URL: z.string().optional(),
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
});

// Validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    
    // Log warnings for optional but recommended keys
    if (!env.OMDB_API_KEY || env.OMDB_API_KEY === 'your-omdb-api-key') {
      console.warn('[Env] OMDB_API_KEY not set or using placeholder - Netflix thumbnails will be unavailable');
    }
    
    if (!env.KV_URL && !env.KV_REST_API_URL) {
      console.warn('[Env] No Vercel KV configuration found - falling back to file-based cache');
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e: z.ZodIssue) => e.path.join('.')).join(', ');
      console.error(`[Env] Missing or invalid environment variables: ${missingVars}`);
      console.error('[Env] Please set the required environment variables and restart the server');
      throw new Error(`Missing required environment variables: ${missingVars}`);
    }
    throw error;
  }
}

// Validate on import (runtime only - will fail fast if missing)
export const env = validateEnv();

// Type-safe access to environment variables
export type Env = z.infer<typeof envSchema>;
