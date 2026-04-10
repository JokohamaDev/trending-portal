import { z } from 'zod';

// Query parameter validation schemas
export const TrendsQuerySchema = z.object({
  refresh: z.enum(['0', '1']).optional().default('0'),
});

export const CategoryQuerySchema = z.object({
  category: z.enum(['spotify', 'youtube', 'netflix', 'google', 'news', 'steam']).optional(),
});

// URL parameter validation
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    const result = schema.safeParse(params);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    return { 
      success: false, 
      error: result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ') 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid parameters' 
    };
  }
}

// Sanitize URL to prevent SSRF
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Block internal/private IPs
    const hostname = parsed.hostname;
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254', // AWS metadata
    ];
    
    if (blockedHosts.includes(hostname)) {
      return null;
    }
    
    // Block private IP ranges
    if (hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || 
        hostname.startsWith('172.16.')) {
      return null;
    }
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return url;
  } catch {
    return null;
  }
}

// Sanitize user input strings
export function sanitizeString(input: string, maxLength = 500): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}
