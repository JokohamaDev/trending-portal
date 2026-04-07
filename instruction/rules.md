# Coding Rules & Guidelines

## Architecture
- **Framework**: Next.js 14+ with App Router
- **API Routes**: Serverless functions for data fetching
- **Storage**: Vercel KV for cached trending data
- **Automation**: Vercel Cron Jobs for daily updates

## Code Style
- TypeScript for all new code
- Use `async/await` for async operations
- Prefer early returns over nested conditionals
- Keep functions under 50 lines when possible

## API Fetcher Pattern
```typescript
// Standard fetcher structure
interface FetcherResult<T> {
  data: T[] | null;
  error: string | null;
  cached: boolean;
  fresh: boolean;
  fetchedAt: string;
}

// Each fetcher must:
// 1. Try fresh data first
// 2. Validate response with Zod schema
// 3. Fall back to cached data on failure
// 4. Return standardized error messages
```

## Data Validation
- Use **Zod** for all API response schemas
- Validate before storing to KV
- Invalid data = rejected with logged error
- Never store malformed data

## Error Handling
- Use `try/catch` in every fetcher
- Log errors with context (source, timestamp)
- Never let one failed source crash the aggregator
- Return stale data (up to 7 days) as fallback

## Environment Variables
- All API keys in `.env.local` (never committed)
- Document every var in `.env.example`
- Use `process.env.VAR_NAME` with fallback warnings
- Prefix public vars with `NEXT_PUBLIC_`

## File Organization
```
app/
├── api/
│   ├── fetchers/           # Individual data sources
│   │   ├── spotify/
│   │   │   ├── route.ts    # Fetcher implementation
│   │   │   └── route.test.ts # Unit tests
│   │   ├── youtube/
│   │   └── ...
│   ├── update-all/route.ts # Master aggregator
│   └── trends/route.ts     # Frontend data endpoint
├── components/
│   ├── ItemCard.tsx
│   └── CategoryList.tsx
├── lib/
│   ├── kv.ts               # Vercel KV utilities
│   ├── validation.ts       # Zod schemas
│   ├── schemas.ts          # Shared interfaces
│   └── mockData.ts         # Development mock data
└── page.tsx                # Dashboard
```

---

## Adding a New Trend Source: Complete Checklist

### Phase 1: Pre-Implementation

Before writing any code, verify and document:

- [ ] **API/Source Research**
  - Identify the data source API endpoint or scraping method
  - Check rate limits, quotas, and authentication requirements
  - Verify Vietnam region support (or global fallback)
  - Document expected response structure

- [ ] **Environment Variables**
  - Add API key/env var to `.env.example` with description
  - Note if the source is **FREE**, **PAID**, or **EXPERIMENTAL** (scraping)
  - Add feature flag if needed (e.g., `ENABLE_X_API` for paid sources)

- [ ] **Schema Design**
  - Define Zod schema extending `TrendingItemSchema` in `src/lib/schemas.ts`
  - Add category to `TrendsDataSchema`
  - Export type for TypeScript usage

- [ ] **Image Domain Configuration**
  - Identify thumbnail image hostnames from the new source
  - Add hostname to `next.config.ts` images.remotePatterns
  - Example: `{ protocol: 'https', hostname: 'i.ytimg.com' }`

- [ ] **KV Key Registration**
  - Add KV key constant to `src/lib/kv.ts` in `KV_KEYS` object
  - Example: `NEW_SOURCE: 'trending_newsource'`

### Phase 2: Implementation

Create the fetcher following this pattern:

- [ ] **Create Fetcher Directory**
  ```bash
  mkdir -p src/app/api/fetchers/[source-name]
  touch src/app/api/fetchers/[source-name]/route.ts
  touch src/app/api/fetchers/[source-name]/route.test.ts
  ```

- [ ] **Implement Fetcher (`route.ts`)**
  Required structure:
  ```typescript
  export async function GET() {
    try {
      // 1. Try primary source
      // 2. Validate with Zod schema
      // 3. Store to KV via storeCategoryDataSmart()
      // 4. Return success response with metadata
    } catch (error) {
      // 5. Try cached fallback via getCategoryDataSmart()
      // 6. Return cached data with stale flag if available
      // 7. Return 500 if no cache available
    }
  }
  ```

- [ ] **Implement Caching Strategy**
  - Use `next: { revalidate: 3600 }` for fetch cache (1 hour)
  - Implement 7-day stale cache fallback from KV
  - Check cache age: `cacheAge > 7 * 24 * 60 * 60 * 1000`
  - Return `stale: true` flag when using old cache

- [ ] **Add Data Transformation**
  - Map API response to `TrendingItem` structure
  - Ensure all required fields: rank, title, artist, thumbnailUrl, externalUrl, source, fetchedAt
  - Handle missing/null thumbnails gracefully

- [ ] **Update Aggregator**
  - Add fetcher call to `src/app/api/update-all/route.ts`
  - Include in `Promise.allSettled()` array
  - Add to source health tracking

- [ ] **Add Mock Data**
  - Add sample data to `src/lib/mockData.ts` for the new category
  - Include at least 2-3 sample items for frontend development

### Phase 3: Testing

- [ ] **Unit Tests (`route.test.ts`)**
  Required test cases:
  ```typescript
  describe('[Source] Fetcher', () => {
    it('should fetch and transform API data');
    it('should handle API errors gracefully');
    it('should use cached data when API fails');
    it('should return 500 when everything fails');
    it('should mark cache as stale when older than 7 days');
    it('should validate data before storing');
  });
  ```

- [ ] **Local Testing**
  ```bash
  # 1. Test fetcher endpoint
  npm run dev
  curl http://localhost:3000/api/fetchers/[source]

  # 2. Test update-all aggregator
  curl http://localhost:3000/api/update-all

  # 3. Test trends endpoint
  curl http://localhost:3000/api/trends

  # 4. Run unit tests
  npm test src/app/api/fetchers/[source]/route.test.ts

  # 5. Run all tests
  npm test
  ```

- [ ] **Mock Mode Testing**
  - Set `USE_MOCK_DATA=true` in `.env.local`
  - Verify dashboard displays new category with mock data
  - Ensure no API calls are made in mock mode

### Phase 4: Frontend Integration

- [ ] **Update Trends Endpoint**
  - Modify `src/app/api/trends/route.ts` to include new category in response
  - Handle missing/optional category data gracefully

- [ ] **Update Dashboard Page**
  - Add new `CategoryList` component for the new source
  - Pass appropriate data slice from trends response
  - Handle loading and error states

- [ ] **Update Types**
  - Ensure all TypeScript types are properly exported
  - Check for type errors: `npm run type-check`

### Phase 5: Pre-Deployment Verification

- [ ] **Image Domain Check**
  ```bash
  # Verify images load correctly in development
  # Check browser console for 403/404 image errors
  # Ensure all thumbnail domains are in next.config.ts
   ```

- [ ] **Environment Variables**
  - Add production API keys to Vercel dashboard
  - Verify all env vars are set before deploying
  - Test with `vercel env pull` then `npm run build`

- [ ] **Build Verification**
  ```bash
  npm run build
  # Fix any TypeScript or lint errors
  # Ensure no missing dependencies
  ```

- [ ] **Integration Testing**
  - Deploy to preview branch
  - Test the new fetcher endpoint directly
  - Verify `/api/update-all` runs without errors
  - Confirm dashboard displays new category

### Phase 6: Post-Deployment

- [ ] **Monitor Logs**
  - Check Vercel function logs for errors
  - Verify cron job execution in Vercel dashboard
  - Set up alerts for fetcher failures (optional)

- [ ] **Verify Cache Behavior**
  - Confirm KV storage is working (check Vercel KV dashboard)
  - Test fallback to cached data (temporarily break API key)

---

## Common Implementation Patterns

### Thumbnail URL Handling
```typescript
// Always provide fallback for missing thumbnails
thumbnailUrl: item.thumbnail || item.imageUrl || item.poster || null,

// In next.config.ts, add all possible image domains
images: {
  remotePatterns: [
    { hostname: 'i.scdn.co' },      // Spotify
    { hostname: 'i.ytimg.com' },    // YouTube
    { hostname: 'image.tmdb.org' }, // TMDB/Netflix
    // Add new source domain here
  ],
}
```

### API Error Handling
```typescript
try {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${process.env.API_KEY}` },
    next: { revalidate: 3600 },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return transformData(data);
} catch (error) {
  console.error(`[${sourceName}] Fetch failed:`, error);
  // Fall through to cache retrieval
}
```

### Cache Fallback Pattern
```typescript
// Try to return cached data when fresh fetch fails
const cachedData = await getCategoryDataSmart(KV_KEYS.SOURCE_NAME);

if (cachedData && cachedData.items.length > 0) {
  const cacheAge = Date.now() - new Date(cachedData.lastUpdated).getTime();
  const isStale = cacheAge > 7 * 24 * 60 * 60 * 1000; // 7 days
  
  return NextResponse.json({
    success: true,
    data: cachedData.items,
    cached: true,
    stale: isStale,
    cachedAt: cachedData.lastUpdated,
    error: error instanceof Error ? error.message : 'Fetch failed',
  });
}
```

### Schema Extension
```typescript
// In src/lib/schemas.ts
export const NewSourceItemSchema = TrendingItemSchema.extend({
  source: z.literal('newsource'),
  // Add source-specific optional fields
  extraField: z.string().optional(),
});

// Add to union
export const TrendingItemUnionSchema = z.union([
  // ... existing schemas
  NewSourceItemSchema,
]);
```

---

## Key Principles
1. **Fail gracefully** - One broken source ≠ broken dashboard
2. **Validate everything** - Data integrity over speed
3. **Cache aggressively** - Minimize API calls, respect quotas
4. **Log failures** - Silent failures are unacceptable
5. **Mock for dev** - `USE_MOCK_DATA=true` for frontend work
6. **Test before merge** - Integration tests for all fetchers
7. **Image domains first** - Configure next.config.ts before implementing
8. **Local testing mandatory** - Never deploy untested fetchers
9. **7-day cache limit** - Stale data older than 7 days is not acceptable
