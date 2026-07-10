// Client-side static search for the docs Cmd+K palette. The index is generated
// at build time by scripts/gen-search-index.mjs -> public/search-index.json.
// No serverless function is involved (12-fn cap); this is a fetch + fuzzy match.

import { useEffect, useState } from "react";

export type SearchEntry = {
  slug: string;
  title: string;
  group: string;
  platform?: "android" | "ios";
  heading: string;
  anchor: string;
  text: string;
};

export type SearchHit = SearchEntry & { score: number };

// Lightweight fuzzy score: exact substring beats token-prefix beats subsequence.
// Higher is better; 0 means no match.
function scoreEntry(entry: SearchEntry, q: string): number {
  const needle = q.trim().toLowerCase();
  if (!needle) return 0;
  const title = entry.title.toLowerCase();
  const heading = entry.heading.toLowerCase();
  const hay = `${title} ${heading} ${entry.text}`.toLowerCase();

  let score = 0;
  if (title.includes(needle)) score += 120;
  if (heading.includes(needle)) score += 80;
  if (hay.includes(needle)) score += 40;

  // Per-token substring hits (handles multi-word queries in any order).
  const tokens = needle.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (title.includes(t)) score += 24;
    else if (heading.includes(t)) score += 16;
    else if (hay.includes(t)) score += 8;
    else if (subsequence(hay, t)) score += 3;
    else return 0; // every token must appear somehow
  }
  return score;
}

function subsequence(hay: string, needle: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}

export function searchIndex(index: SearchEntry[], query: string, limit = 8): SearchHit[] {
  return index
    .map((entry) => ({ ...entry, score: scoreEntry(entry, query) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Fetches and caches the static index once per session.
let cache: SearchEntry[] | null = null;

export function useSearchIndex(): SearchEntry[] {
  const [index, setIndex] = useState<SearchEntry[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    void fetch("/search-index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SearchEntry[]) => {
        cache = Array.isArray(data) ? data : [];
        if (alive) setIndex(cache);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return index;
}
