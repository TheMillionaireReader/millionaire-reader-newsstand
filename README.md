# The Millionaire Reader — Newsstand

An editorial, magazine-rack-style discovery site for The Millionaire Reader Substack.

## Stack
- Next.js App Router + TypeScript
- Responsive CSS magazine covers
- Substack archive API with RSS fallback
- Vercel-ready

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Deploy
Import this repository into Vercel and deploy with the default Next.js settings. No environment variables are required for the first version.

## Content behavior
- Pulls article titles, subtitles, dates, links, and available metadata from the public Substack archive.
- Attempts the public RSS feed if the archive endpoint fails.
- If neither source responds, the site shows the last confirmed article instead of inventing entries.
- Magazine covers are original typographic designs using the real article titles, not official Substack cover artwork.
- Full essays remain on Substack; the Newsstand previews and links to each canonical article.
- Browsing categories are inferred from titles and any available tags. They are not presented as official publication tags.

## Publication
https://themillionairereader.substack.com
