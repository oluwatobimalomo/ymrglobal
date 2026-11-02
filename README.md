# YMR Global

A modern, static Astro website for Young Ministers Retreat. It uses the supplied anniversary flyer, locally stored photos from ymrglobal.org, Google Sans Flex throughout, and a live countdown to YMR 2026 (December 26–30, 2026). The homepage retains the current YMR site’s public copy and sections, replaces the 2025 event with the 2026 City Takers anniversary, and omits the app promotion. It includes Vision and Mission, YMR principles, who-we-are copy, initiatives, expectations, impact cards, photos, registration, contact and social links.

The requested cinematic web workflow is implemented with GSAP ScrollTrigger, a small procedural Three.js flame model, and Pretext measurements that align the principle and expectation headings. Three.js is imported only when the flame approaches the viewport. Current YMR photos and the supplied flyer are used as the site imagery. fal.ai-generated media is not included because this workspace has no fal API key; this preserves real YMR photography without substituting generated material.

## Run locally in VS Code

1. Use Node.js 22.23.4 or later.
2. Open this folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run `npm install` once, then `npm run dev`.
5. Open the local URL printed in the terminal (usually `http://localhost:4321`).

Stop the server with `Ctrl+C`. To create a production build locally, run `npm run build`; `npm run preview` serves that build for a final local check.

## Supabase form submissions

The prayer request and testimony forms submit to Supabase Postgres through its REST Data API. Create a Supabase project, run `supabase/schema.sql` in its SQL Editor, then set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` for local builds and in the production host's build environment. Rebuild and redeploy after setting the variables. The publishable key is intentionally public; never place a Supabase secret/service-role key in a `PUBLIC_` variable or browser code. RLS and the grants in the schema allow anonymous inserts only and deny public reads, updates, and deletes. Review records in the Supabase dashboard.

Prayer requests are stored in `public.prayer_requests`. Testimonies are stored in `public.testimony_submissions` with a `pending` review status and are not published automatically. Configure Supabase email/database backups and decide the retention period and access owners before launch. Public insert endpoints can receive spam; add a verification/rate-limiting layer (for example, a Supabase Edge Function with CAPTCHA verification) before promoting the live forms.

## Privacy and form submissions

The `/prayer-wall` and `/testimonies` pages accept information that may be personal or sensitive. Configured submissions are stored in YMR's Supabase project; the site's public key can insert records but cannot read them. The forms link to the site privacy page and ask visitors to share only details they are comfortable sending.

Before launch, confirm who in the YMR team receives these submissions, how long they are kept, how deletion requests are handled, and obtain consent before publishing an identifiable testimony. Update the privacy page if the actual workflow differs.

There is no newsletter request form in the current footer. The old newsletter setup notes have been removed from this guide.

## Search and sharing

The site generates `/sitemap.xml` and `/robots.txt`, and page templates provide canonical URLs, social sharing metadata, and organization structured data. After deployment, verify the domain in Google Search Console and Bing Webmaster Tools, submit the sitemap, and inspect indexed URLs and mobile usability. Keep event dates, registration details, page titles, and social preview images accurate.

## Deploy later

Push this folder to a GitHub repository, connect it to the chosen hosting provider, and set the two public Supabase build variables there. The Astro site remains a static frontend; Supabase handles form storage. Do not change the live domain's DNS until the new deployment is ready to replace the current site.

## Content that needs confirmation before launch

- Confirm that the flyer’s 2026 event dates (December 26–30) and venue (Old Auditorium, Redemption City of God) are final.
- Confirm the 2026 enquiries number shown on the flyer and the final registration URL.
- Replace the registration link if the current registration portal changes.
- Confirm the 10th-anniversary messaging and event details with YMR before launch.
- Add approved, recent event photography and participant testimonies when available. The local testimony archive currently paraphrases four stories shared anonymously by participants.
- Confirm which old WordPress URLs need redirects to preserve existing links and search traffic.
- Confirm that the YMR team has permission to keep using the imported official photos and supplied logo artwork.

The retreat photos are local copies of public assets from the current YMR website. The 70 gallery originals are retained in `work/gallery-originals`; the site serves 1200px compressed copies from `public/images/gallery/editions/optimized` to reduce transfer size. The hero uses the supplied 2026 flyer as a contained image so its anniversary and City Takers branding stays intact and uncropped. The at-a-glance cards use the event date, 10th anniversary, theme, and venue instead of displaying the source site's zero-valued impact counters as if they were meaningful figures.

The homepage opens directly on the content with a staggered headline reveal, grouped scroll reveals, and a scroll-reactive Three.js flame. Motion respects the reduced-motion preference, and all content remains visible if JavaScript or WebGL is unavailable.

The countdown is set to midnight at the start of December 26, 2026 in Nigeria (WAT, UTC+1). Update `eventStart` in `src/components/Countdown.astro` if the event's official start time is later in the day.
