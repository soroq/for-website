// Typed documentation content model for the Soroq docs system.
// The registry (registry.ts) is PURE DATA built against these types so it can be
// consumed both by the React docs app AND by scripts/gen-search-index.mjs (which
// transpiles this + the registry with the TypeScript compiler and walks it).
//
// Design note (why not `body: string`): a Soroq doc section carries commands,
// platform-specific code tabs, callouts (Note/Warning/Experimental/DeviceOnly),
// expected output, and env setup — none of which survive a flat string. We keep
// structured fields and derive the search text + heading anchors from them.

export type Platform = "android" | "ios";

// Signal palette: verified=green, staged=amber, rollback=red, note=blue,
// experimental=violet, device=coral. Tones map to the field-manual colors.
export type CalloutTone =
  | "note"
  | "warning"
  | "experimental"
  | "device"
  | "verified"
  | "staged"
  | "rollback";

export type DocCallout = { tone: CalloutTone; title?: string; body: string };

// A platform-specific code tab. When a section has codeTabs, the layout renders
// only the tab for the active platform (Android|iOS selector).
export type CodeTab = { platform: Platform; label?: string; code: string };

// One environment variable the reader exports before running a step, annotated
// with where its value comes from so nothing is a bare, unexplained <id>.
export type DocEnvVar = {
  name: string; // e.g. SOROQ_APP_ID
  example: string; // a concrete example value
  origin: "you-choose" | "generated" | "soroq-returns" | "constant";
  note: string;
};

export type DocRow = { term: string; detail: string };

export type DocSection = {
  heading: string;
  anchor: string; // slug of heading; stable deep-link target
  platform?: Platform; // section only shown when this platform is active
  intro?: string;
  cwd?: string; // working directory the commands assume
  env?: DocEnvVar[]; // `export SOROQ_*` setup rendered as an explained block
  commands?: string[]; // platform-neutral shell commands
  codeTabs?: CodeTab[]; // platform-specific commands (selector-driven)
  output?: string; // expected output of the step
  next?: string; // the command/step that comes next
  callouts?: DocCallout[];
  rows?: DocRow[];
};

export type DocRelated = { label: string; slug: string };

export type DocPage = {
  slug: string; // clean URL segment, no leading slash, no .html
  title: string;
  group: string; // nav group label; ties to NAV_GROUPS order
  order: number; // order within the group
  summary: string; // one-line description (nav + search + meta)
  platform?: Platform; // page is inherently single-platform
  status?: "experimental" | "stable";
  sections: DocSection[];
  related?: DocRelated[];
  metadata: Record<string, string>;
};

export type NavGroup = { label: string; order: number };
