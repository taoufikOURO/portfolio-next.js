# AGENTS.md

## Project

Next.js 16 App Router portfolio (React 19, Tailwind CSS 4, TypeScript, pnpm).
Single app, not a monorepo: `pnpm-workspace.yaml` only holds pnpm build settings.
All UI copy and metadata are French (`lang="fr"`).

## Commands

`pnpm dev` — dev server on `http://localhost:3000`

`pnpm build` / `pnpm start`

`pnpm lint` — ESLint 9 flat config

`pnpm exec tsc --noEmit` — type check (no dedicated script)

No tests or CI exist; do not invent a test command.

## Content and data

- All content lives in `data/*.json`; no DB/CMS. Prefer accessors in `app/lib/data.ts`
  over importing JSON directly, except where a page already reads JSON.
- Projects: `estPublie: false` hides a project everywhere. `slug` is optional but
  must be unique; fallback is generated from `titre`. `github` is `{ nom, url }[]`.
  Missing images render a `FolderGit2` placeholder in `components/ProjectCard.tsx`;
  metadata still falls back to `/images/projets/default-project.svg`.
- Articles: metadata in `data/articles.json`, bodies in `data/articles/*.md` or a
  GitHub URL. Each record needs `mdFile`; the `Article` interface in
  `app/lib/data.ts` omits it, and the detail page reads the JSON directly.
- Article Markdown is rendered by a hand-written parser in
  `app/articles/[slug]/page.tsx` (highlight.js for code), not a Markdown library.
- Images live in `public/images/{profile,projets,stack}` and are referenced as
  URL strings from JSON.
- Shared types are in `app/types/data.ts`; `Article` is defined in `app/lib/data.ts`.

## App structure

- `app/page.tsx` composes the homepage sections in order: intro, about, stack,
  formations, projects, articles, contact.
- There is intentionally no navbar/Header. Subpages start with a back link;
  `Footer.tsx` is minimal and global.
- Server components by default. `"use client"` only in
  `components/Reveal.tsx` and `components/ShareArticleButton.tsx`.
- Homepage sections are full-height, vertically centered (`.section`), and their
  content is animated on scroll with `Reveal` (framer-motion, reduced-motion
  aware). Keep the animation subtle: fade + short upward movement once.
- Icons come from `lucide-react`; do not use emoji.
- Dynamic routes use Next 16 async `params: Promise<...>` and `generateStaticParams`.

## Styling

- The site is light-mode only. `body` is `--bg`, sections use `.section`, and the
  layout stays content-first and centered with `.shell`.
- Tailwind v4 via `@tailwindcss/postcss`; there is no `tailwind.config.*`.
  Theme colors are CSS vars in `app/globals.css` (`--bg`, `--surface`,
  `--surface-2`, `--text`, `--muted`, `--line`, `--line-strong`, `--accent`,
  `--accent-soft`) used as `text-(--muted)`, `bg-(--surface)`, etc.
- Headings use Space Grotesk (`--font-space-grotesk`) via `.heading`; body copy
  uses Instrument Sans. Use moderate sizes, not oversized display type.
- Reuse custom classes from `app/globals.css` (`.shell`, `.section`, `.heading`,
  `.eyebrow`, `.btn`, `.card`, `.media-frame`, `.tag`, `.article-shell`) before
  adding new CSS.
- `ProjectCard.tsx` is shared by the homepage and `/projets`.
- Article Markdown parser strips the first H1 so the page title is not duplicated.
  Code-block and highlight.js styles live in `app/globals.css`.
- `metadataBase` uses `NEXT_PUBLIC_SITE_URL`, defaulting to `http://localhost:3000`;
  `.env*` is gitignored.
