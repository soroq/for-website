# Soroq Website

Standalone Vercel-ready website surface for Soroq.

This repository intentionally contains only the website/Vercel surface:

- `website/` — Vite/React marketing and operator UI
- `api/` — Vercel serverless proxy routes required by the operator UI
- root Vite/TypeScript/Vercel config

It intentionally does not include the Soroq monorepo internals such as engine forks, runtime,
backend source, packages, docs, build artifacts, or local Vercel state.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Vercel should use:

- Build command: `npm run build`
- Output directory: `dist`
