# Development Roadmap: Vietnam Trending Media Dashboard

> **Agent Instructions**: Mark tasks as `[x]` when completed. Each phase builds on previous work. Complete all tasks in a phase before moving to the next.

---

## Phase 1: Project Setup & First Core Source (Spotify)

**Goal**: Initialize project and establish end-to-end data pipeline with one core source
**Time**: 1 Day

- [x] **1.1 Initialize Next.js Project & Deploy**
  - Create Next.js app with `create-next-app`
  - Push to GitHub, connect to Vercel
  - Verify auto-deployment on `main` branch pushes
  - **Acceptance**: Live Vercel URL exists - **https://trending-portal.vercel.app/**

- [x] **1.2 Create Spotify Fetcher**
  - Create `/api/fetchers/spotify` endpoint
  - **Dual source approach** (free): Spotify Public API → Kworb.net fallback
  - Implement error handling + 7-day stale cache fallback
  - Return: `{ rank, title, artist, thumbnailUrl, externalUrl, source, fetchedAt }`
  - **Acceptance**: Returns exactly 10 songs, handles failures gracefully ✅

- [x] **1.3 Setup Upstash Redis & Schema Validation**
  - Set up Upstash Redis via Vercel Marketplace, install `@vercel/kv`
  - Define Zod schema for standardized item structure (`src/lib/schemas.ts`)
  - Create `validateData()` utility with error logging (`src/lib/validation.ts`)
  - Create `/api/trends` to read from Redis with validation
  - **Acceptance**: Valid data stores in Redis, invalid data rejected with logs ✅

- [x] **1.4 Create Environment Documentation**
  - Create `.env.example` with `KV_URL`, `KV_REST_API_TOKEN`, `YOUTUBE_API_KEY`, etc.
  - Add README setup instructions
  - **Acceptance**: `.env.example` exists with all documented variables ✅

---

## Phase 2: Frontend Foundation

**Goal**: Build UI components and display Spotify data
**Time**: 1 Day

- [x] **2.1 Build Reusable UI Components**
  - Create `ItemCard` (rank, title, subtitle, thumbnailUrl)
  - Create `CategoryList` (title + grid of ItemCards)
  - Implement responsive layout (mobile + desktop)
  - **Acceptance**: Components render correctly with mock data ✅

- [x] **2.2 Develop Main Dashboard Page**
  - Fetch from `/api/trends` on page load
  - Implement loading state
  - Click on ItemCard opens `externalUrl` in new tab
  - **Acceptance**: Displays Spotify Top 10, interactive cards work ✅

- [x] **2.3 Create Mock Data & Dev Fallback**
  - Create `mockData.json` with sample data for all 9 categories
  - Add `USE_MOCK_DATA=true` env flag
  - Modify fetch to use mock when flag is set
  - **Acceptance**: Dashboard works without API keys in dev mode ✅

---

## Phase 3: Integrate Remaining Core Categories

**Goal**: Add YouTube, Netflix, Google (all core per PRD) with master aggregator
**Time**: 2 Days

- [x] **3.1 Integrate YouTube Trending API**
  - Create `/api/fetchers/youtube`
  - Call YouTube Data API v3 `videos().list` with `chart='mostPopular'`, `regionCode='VN'`
  - Store `YOUTUBE_API_KEY` in env vars
  - Implement quota management: track usage, return cached data when exceeded
  - **Acceptance**: Returns 10 videos, handles quota exceeded gracefully with `cached: true` flag ✅

- [x] **3.2 Integrate Netflix Top 10 (via FlixPatrol + OMDB)**
  - Create `/api/fetchers/netflix`
  - Scrape FlixPatrol for Netflix Vietnam Top 10 (Movies + TV Shows)
  - Fetch movie posters from OMDB API (free tier: 1,000/day)
  - Combine top 5 Movies + top 5 TV Shows into final top 10
  - Add `m.media-amazon.com` to `next.config.ts` remotePatterns for images
  - Store `OMDB_API_KEY` in env vars
  - Removed Apify dependency (saved rental costs)
  - **Acceptance**: Returns 10 items with thumbnails, artist field shows "Movie"/"TV Show" ✅

- [x] **3.3 Integrate Google Trends via google-trends-api [FREE]**
  - Create `/api/fetchers/google`
  - Use `google-trends-api` npm package (free, unofficial)
  - ~~SerpApi~~ replaced to save ~$50/month cost
  - **Acceptance**: Returns 10 search trends, handles API errors ✅

- [x] **3.4 Create Master Aggregator & Cron Job**
  - Create `/api/update-all` calling all fetchers with `Promise.allSettled()`
  - Each fetcher: try fresh → validate → fallback to cached → mark `fresh: false` if cached
  - Aggregate to single JSON with `lastUpdatedAt`, `sourceHealth` per category
  - Save to KV key `trending_all`
  - Configure `vercel.json` cron job (max 1 job on free tier)
  - **Acceptance**: Populates KV with all sources, failed sources retain yesterday's data ✅

- [x] **3.5 Update Frontend for All Core Categories**
  - Update `/api/trends` to read from `trending_all` key
  - Render 4 `CategoryList` components: Spotify, YouTube, Netflix, Google
  - **Acceptance**: Dashboard displays all 4 core categories ✅

---

## Phase 4: Launch Readiness

**Goal**: Polish UI, add analytics, testing, production deployment
**Time**: 1-2 Days

- [x] **4.1 UI/UX Polish**
  - Add header, footer
  - Display "Last Updated" timestamp from KV
  - Add error state UI for failed data loads
  - Add SEO tags (`<title>`, `<meta name="description">`)
  - **Acceptance**: Timestamp visible, error states handled, SEO set ✅

- [x] **4.2 Integrate Google Analytics 4**
  - Create GA4 property, get Measurement ID
  - Store `NEXT_PUBLIC_GA_ID` in Vercel env
  - Add GA script to layout using Next.js Script component
  - **Acceptance**: Page views sent to GA, real-time dashboard shows activity ✅

- [x] **4.3 Final Review & Production Deploy**
  - Review all env vars in production
  - Test full user flow on production URL
  - Verify cron job running in Vercel dashboard logs
  - **Acceptance**: Live on primary domain, cron job confirmed running ✅

- [x] **4.4 Add Unit & Integration Tests** (Adjusted for small scale)
  - Setup Vitest (faster than Jest, simpler config)
  - Write tests for data validation functions (`src/lib/validation.test.ts`)
  - Write integration tests for Spotify fetcher with mocked APIs (`src/app/api/fetchers/spotify/route.test.ts`)
  - Skip GitHub Actions for now (add when team grows)
  - **Acceptance**: `npm test` passes, tests run in ~2 seconds ✅

---

## Phase 5: Optional Expansion (Reliable APIs)

**Goal**: Add X (paid), News (RSS), Steam — only if budget/resources allow
**Time**: 2-3 Days
**Note**: These are **optional** per PRD. Skip if time/budget constrained.

- [ ] **5.1 Integrate X (Twitter) Trends API [PAID - $100/month]**
  - Create `/api/fetchers/x`
  - Requires X API Basic tier ($100/month) — free tier has no trends access
  - Store `X_API_BEARER_TOKEN`, add `ENABLE_X_API` feature flag
  - Skip gracefully when `ENABLE_X_API=false`
  - **Acceptance**: Returns trends when enabled, skips cleanly when disabled

- [ ] **5.2 Integrate News via RSS Feeds**
  - Create `/api/fetchers/news`
  - Use VNExpress or Tuổi Trẻ RSS feeds (free, no limits)
  - Parse XML to JSON, return top 10 articles
  - **Acceptance**: Returns 10 news articles with title, link, description

- [ ] **5.3 Integrate Steam Top Sellers**
  - Create `/api/fetchers/steam`
  - Use official Steam API (free, no strict limits)
  - Return top 10 selling games for Vietnam
  - **Acceptance**: Returns 10 games with title, thumbnail, link

- [ ] **5.4 Update Aggregator & Frontend for Phase 5**
  - Add X, News, Steam to `/api/update-all`
  - Update `trending_all` structure with new categories
  - Render 3 new `CategoryList` components
  - **Acceptance**: Dashboard shows up to 7 categories total

---

## Phase 6: Experimental Expansion (Scraping)

**Goal**: Add TikTok, Shopee via scraping — expect occasional failures
**Time**: 2-3 Days
**Note**: These are **experimental** per PRD. May violate ToS, handle gracefully.

- [ ] **6.1 Integrate TikTok Trends (via Apify)**
  - Create `/api/fetchers/tiktok`
  - Configure Apify TikTok scraper
  - Return top 10 trends/hashtags
  - **Acceptance**: Returns 10 TikTok trends, failures don't break aggregator

- [ ] **6.2 Integrate Shopee Products (via Apify)**
  - Create `/api/fetchers/shopee`
  - Configure Apify actor for shopee.vn trending products
  - Return top 10 products with name, image, price, link
  - **Acceptance**: Returns 10 products, robust error handling

- [ ] **6.3 Final Frontend Update for Experimental**
  - Add TikTok, Shopee to aggregator
  - Update dashboard to show up to 9 categories
  - Add "Trends unavailable today" message for empty states
  - **Acceptance**: 9 categories display, graceful handling of missing data

---

## Summary

| Phase | Categories | Key Deliverables |
|-------|-----------|------------------|
| 1 | Spotify | Project setup, KV storage, first fetcher |
| 2 | Spotify | UI components, dashboard, mock data |
| 3 | +YouTube, Netflix, Google | Master aggregator, cron job, 4 core categories |
| 4 | 4 core | Analytics, tests, production launch |
| 5 | +X, News, Steam (optional) | 7 categories (X requires $100/mo) |
| 6 | +TikTok, Shopee (experimental) | 9 total categories, scraping sources |

**Priority Order**: Complete Phases 1-4 for MVP. Phases 5-6 are optional enhancements.