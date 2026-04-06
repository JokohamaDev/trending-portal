import { kv } from '@vercel/kv';
import type { CategoryData, TrendsData } from './schemas';

const KV_KEYS = {
  SPOTIFY: 'trending_spotify',
  YOUTUBE: 'trending_youtube',
  NETFLIX: 'trending_netflix',
  GOOGLE: 'trending_google',
  ALL: 'trending_all',
} as const;

// Store category data in KV
export async function storeCategoryData(
  key: string,
  data: CategoryData
): Promise<void> {
  try {
    await kv.set(key, JSON.stringify(data));
    console.log(`[KV] Stored data for key: ${key}`);
  } catch (error) {
    console.error(`[KV] Failed to store data for key ${key}:`, error);
    throw error;
  }
}

// Get category data from KV
export async function getCategoryData(key: string): Promise<CategoryData | null> {
  try {
    const data = await kv.get<string>(key);
    if (!data) return null;
    
    // If stored as string, parse it
    if (typeof data === 'string') {
      return JSON.parse(data) as CategoryData;
    }
    
    // If stored as object directly
    return data as unknown as CategoryData;
  } catch (error) {
    console.error(`[KV] Failed to get data for key ${key}:`, error);
    return null;
  }
}

// Store all trends data
export async function storeTrendsData(data: TrendsData): Promise<void> {
  try {
    await kv.set(KV_KEYS.ALL, JSON.stringify(data));
    console.log('[KV] Stored all trends data');
  } catch (error) {
    console.error('[KV] Failed to store trends data:', error);
    throw error;
  }
}

// Get all trends data
export async function getTrendsData(): Promise<TrendsData | null> {
  try {
    const data = await kv.get<string>(KV_KEYS.ALL);
    if (!data) return null;
    
    if (typeof data === 'string') {
      return JSON.parse(data) as TrendsData;
    }
    
    return data as unknown as TrendsData;
  } catch (error) {
    console.error('[KV] Failed to get trends data:', error);
    return null;
  }
}

// Get specific category from all data
export async function getCategoryFromTrends(
  category: 'spotify' | 'youtube' | 'netflix' | 'google'
): Promise<CategoryData | null> {
  const allData = await getTrendsData();
  if (!allData) return null;
  
  return allData[category] || null;
}

// Fallback: If KV is not configured, use file-based cache
// This is useful for local development
import { writeFile, readFile, access, mkdir } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');

export async function storeCategoryDataFile(
  key: string,
  data: CategoryData
): Promise<void> {
  try {
    await access(CACHE_DIR, constants.F_OK).catch(async () => {
      await mkdir(CACHE_DIR, { recursive: true });
    });
    
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[FileCache] Stored data for key: ${key}`);
  } catch (error) {
    console.error(`[FileCache] Failed to store data for key ${key}:`, error);
    throw error;
  }
}

export async function getCategoryDataFile(key: string): Promise<CategoryData | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    await access(filePath, constants.F_OK);
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as CategoryData;
  } catch {
    return null;
  }
}

// Smart storage that tries KV first, falls back to file
export async function storeCategoryDataSmart(
  key: string,
  data: CategoryData
): Promise<void> {
  try {
    // Try KV first
    await storeCategoryData(key, data);
  } catch {
    // Fall back to file cache
    await storeCategoryDataFile(key, data);
  }
}

// Smart retrieval that tries KV first, falls back to file
export async function getCategoryDataSmart(key: string): Promise<CategoryData | null> {
  try {
    // Try KV first
    const kvData = await getCategoryData(key);
    if (kvData) return kvData;
  } catch {
    // KV failed, continue to file fallback
  }
  
  // Fall back to file cache
  return getCategoryDataFile(key);
}

export { KV_KEYS };
