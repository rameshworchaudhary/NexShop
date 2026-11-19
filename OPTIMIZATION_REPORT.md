# MeroPasal Hobby Courtesy-Period Audit (30-Day Priority)

**Audit date:** November 19, 2026
**Target:** Keep normal Hobby usage below 10 GB Fast Origin Transfer after the 30-day courtesy allowance.
**Project/scope:** `mero-pasal` / `rameshwor-chaudhary-s-projects`

## Verified banner migration preparation (November 19, 2026)

- A targeted production homepage response confirmed all four data URI records and their exact image payloads. Full record IDs, titles, positions, dimensions, byte lengths, and SHA-256 hashes are in [BANNER_IMAGE_MIGRATION.md](./BANNER_IMAGE_MIGRATION.md).
- The fourth banner is `Eczemar`, Firestore document `f2ywXjqdcB6BtI97yAAT`. The other records are Adivasi (`3e3QUNpjyd5NdfratycI`), Paras (`5k33LH23jkCciRwI0Pbe`), and Japanese (`IrpVLFq0MGpSLWjon2yn`). All are `hero` records and 1200×670 JPEGs.
- Added `scripts/migrate-banner-data-uris.mjs`. It defaults to read-only verification. With `--apply`, it validates the exact source bytes against the live documents, uploads to unique Storage paths, fetches and hashes all four URLs, then requires a confirmation phrase and updates only the four `image` fields in a single Firestore transaction. It does not delete old data, alter other fields, or change schema/rules.
- No Storage upload or Firestore update was performed. Firebase CLI can list the MeroPasal Firebase project, but Google Application Default Credentials are unavailable in this workspace; the browser automation could not open Chrome for the authenticated admin editor. The script is prepared for a credentialed run.
- Before HTML sample remains **1,924,731 bytes**. The eight data URI occurrences total **1,335,324 bytes**. No post-migration HTML sample or Fast Origin Transfer measurement exists, so no savings are claimed.
- A Firestore data update can only affect prerendered homepage HTML after its normal revalidation; this report does not change revalidation settings or deploy code.
- Verification: `firebase projects:list --json` lists `meropasal-ce87a` as `ACTIVE`; `node --check scripts/migrate-banner-data-uris.mjs` passes. Running the script's read-only default stops with “Could not load the default credentials” before reading Firestore. No browser, image URL, or post-migration HTML test was possible.
- Current source checks: `npx tsc --noEmit` passed; `npm run lint` passed with 0 errors and 25 existing warnings; `npm run build` passed with all 35 static pages generated; `git diff --check` passed with line-ending notices only. End-to-end customer/admin flows were not run, and no deployment was made.
- GitHub sync: verified source changes, this report, the exact mapping report, and guarded migration script were pushed to `origin/fix-isr-manual` in commit `b83f7c2` without force. This did not deploy production.

## Homepage payload investigation and safe follow-up (November 19, 2026)

### Current Git state and source change

- The seven existing Phase 2 changes remain in the working tree and undeployed: `src/app/api/products/route.ts`, `src/components/home/FlashSaleSection.tsx`, `src/components/home/HeroBanner.tsx`, `src/components/home/ProductSection.tsx`, `src/components/product/ProductCard.tsx`, `src/components/product/ProductGridInfinite.tsx`, and `src/lib/firebase/users.ts`.
- This follow-up changed only `src/app/(shop)/page.tsx` and `src/components/home/CategoryBar.tsx`. `CategoryBar` accepted but never read a `categories` prop; it renders fixed `CATEGORY_ITEMS`. The homepage no longer fetches/passes categories for that unused prop. The shared shop layout still fetches categories for the `Navbar`; no visible UI or category navigation was removed.
- The sampled Flight payload represented the unused prop as a 51-byte reference. Estimated HTML reduction is about 51 bytes, not a material bandwidth optimization. The category function is wrapped in React `cache` and the layout still calls it, so no Firestore read reduction is claimed.

### Measured homepage HTML composition

- A production homepage `GET` measured **1,924,731 UTF-8 bytes**. Across the response there were 107 script tags; inline Flight script bodies accounted for 866,165 bytes, and 85 decoded Flight messages accounted for 850,822 bytes.
- Four Flight messages were JPEG data URIs, with message sizes **167,271**, **149,671**, **178,015**, and **178,139 bytes**. They contain four distinct images of **112,234–133,587 decoded bytes each** (504,750 bytes total before base64 encoding).
- The complete HTML contained eight occurrences of those four data URIs: four in Flight/hydration data and four in image or preload markup. The URI text totals **1,335,324 bytes** including prefixes, or **69.4%** of this sample. Three rendered image alt texts were `Adivasi`, `Paras`, and `Japanese`; the fourth image was present in Flight/preload output but could not be mapped confidently to a visible title. The page Flight data identifies hero banner records for the three named titles.
- The product section passed 12 product records in a 26,537-byte Flight row. Product image values in that row were Firebase Storage URLs. This is not the source of the four large data-URI rows.
- `src/lib/firebase/storage.ts` documents the fallback `compressAndConvertToDataUrl()` path (maximum 1200px, JPEG quality 0.85) used when Firebase Storage upload cannot be used. `src/components/home/HeroBanner.tsx` and `src/components/home/PromoSection.tsx` consume banner image strings. Data URLs bypass Next's image optimizer, so these banner images are embedded in the HTML instead of being optimized/cached as image responses.
- **Potential byte reduction (estimate, not production savings):** replacing all eight data-URI occurrences with short image URLs would remove at most 1,335,324 bytes minus the replacement URL text from this HTML sample. This is an HTML-only bound; the same image data would then be transferred through separate requests. Four existing Firestore banner image values must be confirmed and updated to Storage download URLs to realize it. That is a production data change and was not performed. Preserve exact source JPEG bytes to avoid quality change; confirm the fourth record first.

### Vercel and Cloudflare cache evidence

- The homepage was prerendered (`x-nextjs-prerender: 1`) and Vercel returned `x-vercel-cache: HIT`, so this request was served from Vercel's cache without a function render. The response also had `Server: cloudflare`, `cf-cache-status: DYNAMIC`, `Cache-Control: public, must-revalidate, max-age=0`, and Next.js RSC `Vary` headers.
- These headers show separate cache layers: Vercel had a hit, while Cloudflare did not serve the response from its cache. `max-age=0` and the RSC `Vary` values are consistent with Cloudflare treating the HTML as uncacheable, but the exact Cloudflare cache rule/cause cannot be determined without its zone configuration/logs. No cache headers, DNS, Cloudflare, or Vercel settings were changed. Publicly caching the HTML without careful variant and freshness handling could serve stale product price/stock data; no such policy is recommended here.
- Since Cloudflare reported `DYNAMIC`, repeated requests may fetch the full 1.92MB response from Vercel even when Vercel serves a cached prerender. This is a plausible Fast Origin Transfer contributor, not measured route-level attribution.
- The connected Vercel tool returned 404 for exact project `mero-pasal` under `rameshwor-chaudhary-s-projects`. Project request/usage metrics, runtime logs, deploy state, and preview permission remain unavailable. Cloudflare zone settings are also not in the repository and no connected Cloudflare tool is available.
- The previously recorded aggregate usage remains the only usage baseline: Fast Origin Transfer 10.14 GB / 10 GB, ISR Writes 301K, ISR Reads 857K, Fast Data Transfer 8.94 GB / 100 GB, CDN Requests 45K, Function Invocations 31K. No production before/after measurements exist.

### Audit-generated traffic disclosure

- The earlier audit issued eight `HEAD` requests for image optimizer widths 256–1,920; responses were HTTP 200 with one-day cache control and `x-vercel-cache: MISS`. These were audit probes and may have caused image cache fills/origin work.
- This follow-up made approximately 17 full homepage `GET` requests while iteratively parsing the response. At the sampled body size, that is approximately **32.7 MB of response payload** if all returned the same body. Cloudflare reported `DYNAMIC` for the sampled route, so these audit requests may have contributed Vercel transfer. This is audit-generated traffic, not visitor usage or a baseline, and it is excluded from savings claims.

### Prioritized recommendations

1. **High impact, data update required:** after approval, re-upload the exact four existing JPEG data-URI images to Firebase Storage and update only their existing banner `image` fields. No schema change is needed. The source bytes can remain unchanged. Expected HTML shrink has an upper bound of 1,335,324 bytes minus URL text per sampled response; net Fast Origin Transfer impact is unknown until separately measured because image bytes move to image requests.
2. **High priority, configuration evidence required:** obtain Cloudflare cache-rule/status detail and Vercel route-level usage for `/`, `/_next/image`, product/category routes, and `/api/products`, including bytes and cache result. Do not enable public HTML caching based on one sample; preserve current price/stock freshness and RSC variant behavior.
3. **Low impact, implemented:** drop the unused homepage category prop/fetch. Expected response reduction is about 51 bytes from the observed reference; no usage savings measurement is available.
4. Keep image optimizer TTL, ISR intervals, API caching, pagination, product data, and uploads unchanged until attribution or a reviewed data-update plan is available.

### Validation and deployment

- `npx tsc --noEmit` — passed.
- `npm run lint` — passed with 0 errors and 25 existing warnings.
- `npm run build` — passed with Next.js 16.2.12; all 35 static-generation steps completed. `/` and `/categories` remain one-hour revalidated static routes.
- `git diff --check` — passed; Git printed line-ending conversion notices only.
- No authentication, cart/wishlist, checkout/payment, order, inventory, coupon, admin, SEO, Firebase rules, or sensitive response behavior was changed.
- No end-to-end storefront or e-commerce regression flows were run in this local source-only check; no deployment/preview was available to test. The only new rendering change removes a prop that `CategoryBar` did not use.
- No preview or production deployment was attempted. Exact project lookup returned 404, so Vercel deployment eligibility could not be confirmed.

## Prioritized findings (before further code changes)

### P0 — Confirm production attribution and deploy access

- **Evidence:** The public homepage is currently rendering in the signed-in Chrome session. The previous project dashboard review recorded Fast Origin Transfer at 10.14 GB / 10 GB and a pause. The user now reports a Vercel one-time courtesy unblock with a 3x usage allowance for 30 days; neither the allowance nor current team status was independently visible in the Vercel connector.
- **Connector result:** The connected Vercel account resolves the expected team but returns no `mero-pasal` project by project search or repository URL, a 404 for direct lookup, and no `mero-pasal` deployments. Listing that team returns only `campus-connect`.
- **Impact:** Without `mero-pasal` runtime/usage breakdown and current project status, this audit cannot prove which route or asset is driving Fast Origin Transfer, or whether Vercel will permit a preview deployment.
- **Risk/action:** Do not deploy until the project appears in Vercel under the requested team and the deployment is confirmed allowed. User reports no plan upgrade/purchase is permitted.

### P1 — Match homepage image variants to the actual grid width

- **Evidence:** Product grids render five columns on wide home layouts; the shared card had declared `25vw` desktop images. The existing code change supplies `20vw` at the five-column breakpoint while keeping the prior default for other cards. More critically, the local Next Image optimizer rejected `quality=85` as unsupported while `quality=75` succeeded; HeroBanner was the only caller specifying 85. Next Image is enabled with AVIF/WebP and a 24-hour minimum optimizer cache TTL.
- **Impact:** The browser can select smaller optimized image widths and use fewer oversized variants on the homepage. Removing the unsupported quality override fixes hero optimizer 400 responses and uses Next's default quality 75. These are concrete source-level corrections; production bytes and cache hits remain unmeasured.
- **Risk:** Source image, layout, and gallery behavior remain unchanged; quality 75 is the product-card default. The quality change is reversible if visual review finds degradation.

### P1 — Avoid excessive deep-page Firestore reads

- **Evidence:** The existing API accepts up to page 1,000 at pageSize 20. `getProducts()` fetches `max(pageSize * page + 20, 60)`, so the highest accepted general/category request can read up to 20,020 product documents to return 20. Search is capped at 200; category fallback is capped at 100.
- **Impact:** Large deep-page requests can increase Firebase reads and function work. This is not yet evidence of the reported Vercel Fast Origin Transfer.
- **Risk/action:** Reducing the cap arbitrarily cuts off infinite browsing. The current helper filters and sorts in memory; cursor pagination changes query/order semantics and requires a separately reviewed design. Leave behavior intact until catalog size and caller requirements are measured.

### P2 — Establish the source of ISR Writes before changing freshness

- **Evidence:** The latest successful local build classifies only `/` and `/categories` as static with one-hour revalidation. Product listing/detail, category detail, and search routes are dynamic in the build. No `revalidatePath`, `revalidateTag`, or `unstable_cache` calls were found. Current aggregate ISR Writes value is 301K; the value does not prove 301K separate regenerations.
- **Impact:** `/` and `/categories` are the only time-based ISR write candidates in this build. Runtime route attribution is unavailable.
- **Risk/action:** Do not change intervals until the production route/write breakdown is available; homepage product content includes price/stock and promotional data.

### P2 — Separate Firebase product tracking writes from Vercel transfer

- **Evidence:** Product detail mounts increment `viewCount`; signed-in visits update recently viewed. The recent-history transaction skips a write when the product is already first but still reads the user document. These are Firestore operations, not evidence of Vercel ISR or Fast Origin Transfer.
- **Impact:** The transaction can reduce redundant Firestore writes; its savings are unmeasured. View count remains unchanged to preserve analytics meaning.
- **Risk/action:** Do not change the definition of a view or user history without owner approval and Firebase metrics.

### P3 — Review API and cache response sizes with real route data

- **Evidence:** `/api/products` returns at most 20 lean records, uses `public, s-maxage=60, stale-while-revalidate=120`, and has an unchanged response shape. The response includes public price and stock fields. Orders, payments, cart, wishlist, inventory, and user-specific responses are not candidates for public caching.
- **Impact:** Existing API caching can serve repeat requests for identical query keys; high-cardinality pages/filters reduce reuse. No cache-hit or payload-size breakdown is available.
- **Freshness risk:** The shared cache can return product price/stock up to 60 seconds old normally and older values during stale revalidation. Separately, `api/orders/create` records prices/totals supplied by the client rather than re-reading current product prices. That order behavior is outside this optimization change and was not modified.
- **Risk/action:** I left the existing policy unchanged because removing shared caching could increase function/origin traffic, and route-level usage is unavailable. Checkout/order price verification needs a separate business-logic review before relying on the API cache for order correctness. This optimization adds no new public cache.

## Current production evidence and limits

Last dashboard figures previously recorded for the project were Fast Origin Transfer **10.14 GB / 10 GB**, ISR Writes **301K**, ISR Reads **857K**, Fast Data Transfer **8.94 GB / 100 GB**, CDN Requests **45K**, and Function Invocations **31K**. The homepage rendered in the current browser session, but that does not independently confirm the team’s Vercel pause state, courtesy-period quota, or deploy permission. The Vercel connector currently cannot access project-level logs/usage for `mero-pasal`.

Fast Origin Transfer must be distinguished from Fast Data Transfer, ISR operations, and Firebase document/storage usage. No actual route/image attribution or before/after savings can be claimed without project-level usage/log data aligned to a deployment and date window.

## Implemented after the audit

- `src/components/home/HeroBanner.tsx` no longer requests unsupported optimizer quality 85; it uses Next Image's supported default quality of 75. A local production optimizer request returned an error for 85 and HTTP 200 for 75. This fixes invalid image requests; the impact on the historical Fast Origin Transfer total is unknown.
- The existing homepage card `sizes` correction to `20vw` at the five-column desktop breakpoint remains in the working tree.

## Current-run validation

### Local checks

- `npx tsc --noEmit` — passed.
- `npm run lint` — passed with 0 errors and 25 existing warnings. No new lint warning appeared in the modified files.
- `npm run build` — passed; all 35 static pages generated. `/` and `/categories` remain the only one-hour revalidated static routes; product, category-slug, search, and API routes remain dynamic.
- `git diff --check` — passed. Git printed line-ending conversion notices only.
- Next Image optimizer: the local production build returned HTTP 200 for `quality=75`, `image/avif`, 99,156 bytes at the tested 1200px source width. The earlier `quality=85` request returned an unsupported-quality error. Built homepage HTML contains q=75 image variants and no q=85 variants.
- Static hero asset check — HTTP 200 with `public, max-age=31536000, immutable`.
- Product API pagination checks — page 0, negative, fractional, non-finite, and page 1,001, plus pageSize 0, >20, and non-finite inputs returned HTTP 400. `page=1&pageSize=20` returned HTTP 200 with the existing `products,total,page,hasMore` structure and `public, s-maxage=60, stale-while-revalidate=120`.

### Production access and test limits

- The current signed-in Chrome session showed the public storefront homepage rendering. This confirms the page is accessible in that session, but does not independently confirm the Vercel team pause/courtesy status or deployment permission.
- Vercel MCP resolves the requested team but returns no `mero-pasal` project: project/repository search are empty, direct lookup is 404, and the team’s project/deployment results expose `campus-connect` only. Project-level usage/log attribution and preview deploy checks were unavailable.
- No preview or production deployment was attempted. No Vercel settings, billing, plan, Firebase data, or security rules were changed.
- Authentication, cart/wishlist, checkout/payment, order, inventory, and admin flows were not exercised end-to-end. Those implementation files were not modified. Price/stock freshness was preserved by not changing product data caches or revalidation.
- No production before/after measurements exist, so there is no numeric savings claim. Quality 85 was rejected by the local image optimizer, so a valid q85 output size could not be compared with q75. Image transfer savings and effects on 30-day Fast Origin Transfer remain unmeasured.

## Deployment status

**Not deployed.** The user reports a 3x, 30-day courtesy allowance, and the production homepage renders in the current browser session, but Vercel’s connected tools still cannot resolve `mero-pasal` or confirm the scope’s deployment eligibility. A preview deploy is therefore not safe to attempt. No deployment URL is available from this run.

## Monitoring for the courtesy period

1. At Vercel project level, record daily Fast Origin Transfer, ISR read/write units, function invocations, and image optimization output bytes for `mero-pasal`.
2. Break down production requests by `/_next/image`, dynamic product/category routes, `/api/products`, and the two static ISR paths. Include cache status and function-origin bytes where available.
3. Track image optimizer 4xx counts after the quality fix and compare output bytes on representative Firebase Storage images at common viewport widths.
4. Watch Firestore document reads separately from Vercel transfer; the page-1,000 API bound still permits up to 20,020 product reads.
5. Revisit revalidation and pagination only after actual route/freshness evidence. Do not treat aggregate ISR units as a count of page regenerations.

---

# NexShop Phase 2 Optimization Report

**Date:** 2026-11-19
**Scope:** Safe code changes based on `PERFORMANCE_AUDIT.md`. No deployment or production data changes were made.

## Changes implemented

### Product API pagination validation

- `src/app/api/products/route.ts` now accepts only positive integer `page` and `pageSize` values. Explicit values containing signs, decimals, whitespace, non-numeric characters, zero, negative values, non-finite values, or unsafe integers are rejected with HTTP 400.
- `pageSize` is limited to 20, matching the actual infinite-scroll client (`ProductGridInfinite.tsx`). `page` is limited to 1,000, which bounds catalog depth to 20,000 products and caps the largest current Firestore query limit at approximately 20,020 documents.
- Missing parameters retain their previous defaults (`page=1`, `pageSize=20`). Successful response shape, filtering, sorting, search, and normal pagination remain unchanged.

### Recently viewed write deduplication

- `src/lib/firebase/users.ts`, `recordRecentlyViewed()`, now reads and conditionally updates the user document in a Firestore transaction.
- If the requested product is already first, the transaction makes no document write. If it is elsewhere, it is moved to the front, receives a fresh `viewedAt`, and the list remains capped at 20 items. Transactions serialize conflicting updates and retry on concurrent document changes, preserving updates from other product visits.
- **Timestamp semantics:** A repeat visit while the product is already first no longer refreshes `viewedAt` or the user `updatedAt`. `viewedAt` therefore represents when the product most recently moved to the front, not every repeated visit. This follows the requested no-op behavior; if the timestamp must represent the latest visit, the write cannot be skipped without changing the data model or accepting stale timestamps.
- The transaction still performs a document read. Avoiding that read safely is not possible with the existing whole-array document structure without risking lost updates or changing the schema.

### Infinite-scroll duplicate request guard

- `src/components/product/ProductGridInfinite.tsx` now takes an immediate `useRef` lock before starting a page request. This closes the race where the observer and the Load More button can invoke `loadMore()` before React commits the `loading` state update.
- Loading state, page increments, error handling, pagination, and rendered UI are unchanged.

## Product view counter proposal

No counter behavior was changed. `incrementProductViewCount()` continues to count every product detail component mount. A possible future deduplication is a client-side per-session/per-product guard that writes at most once per session, or server-side buffered aggregation. Either changes what `viewCount` means (unique session views or delayed approximate counts instead of every mount) and may affect popularity ranking. It requires an explicit business decision and measurement plan before implementation. React Strict Mode may duplicate the effect in development; that alone does not establish production double-counting.

## Other reviewed paths

- Homepage and related product/review queries were left unchanged. Consolidating them could change section ordering, content freshness, stock/prices, or review completeness.
- No additional proven duplicate request was found in homepage, product detail, category, search, or filter loading during source review. The infinite-scroll observer/button race above was the directly demonstrated concurrency risk.
- No UI, payment, order, authentication, checkout, inventory, SEO, Firestore rules, collection structure, or database migration changes were made.

## Files modified

- `src/app/api/products/route.ts`
- `src/lib/firebase/users.ts`
- `src/components/product/ProductGridInfinite.tsx`
- `OPTIMIZATION_REPORT.md` (this report)

## Expected resource savings

- Invalid and oversized pagination requests are rejected before Firestore queries. The cap also bounds work for accepted deep-page requests. No traffic measurements were available to estimate request counts or savings.
- When a signed-in user revisits the same product while it is already at the top of recently viewed, the user document write is skipped. The read remains necessary for race-safe ordering. Savings depend on repeat-visit frequency and were not measured.
- Concurrent duplicate infinite-scroll calls now issue one request instead of two. This is a narrow race guard; occurrence rate and byte/read savings were not measured.
- No percentage savings are claimed.

## Risks and limitations

- The page limit intentionally stops pagination after 20,000 products. Current frontend requests page size 20 and the existing query path becomes increasingly expensive at deep pages. If NexShop must expose more than 20,000 results through this endpoint, a cursor-based pagination design should be reviewed separately.
- Skipping a recently viewed update leaves `viewedAt` unchanged on repeat visits while the item remains first, as described above.
- A Firestore transaction still incurs a read; concurrent edits may cause transaction retries. The transaction preserves the existing user document shape.
- No live Firebase operation, browser interaction, or production traffic comparison was performed.

## Validation

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with 0 errors and 25 warnings. These are the same existing repository warnings reported in the Phase 1 audit; no new warning appeared in the changed files.
- `npm run build`: passed on Next.js 16.2.12 with Turbopack; all 35 static-generation steps completed. Route classification matched the Phase 1 audit (`/` and `/categories` static with one-hour revalidation; products and slug routes dynamic).
- `git diff --check`: passed. Git emitted only line-ending conversion notices for the three edited source files.
- No dedicated automated tests exist for the API validation, Firestore transaction, or infinite-scroll interaction, and none were added per repository task instructions. API response compatibility was reviewed statically: successful response fields and cache headers are unchanged.
