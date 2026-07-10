import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandBlock } from "@/shared/primitives";
import type { ProductPageConfig, ProductPageKey } from "@/shared/pageTypes";

export const publicInstallCommand = `curl --proto '=https' --tlsv1.2 https://raw.githubusercontent.com/soroq/install/main/install.sh -sSf | bash
export PATH="$HOME/.soroq/bin:$PATH"
soroq version   # -> soroq v0.2.2`;

export type DocTone = "info" | "warn" | "success";

export type DocCallout = { tone?: DocTone; title?: string; body: string };

export type DocStep = {
  title: string;
  body?: string;
  commands?: string[];
  callout?: DocCallout;
};

export type DocRow = { term: string; detail: string };

export type DocSection = {
  heading: string;
  intro?: string;
  steps?: DocStep[];
  commands?: string[];
  callout?: DocCallout;
  callouts?: DocCallout[];
  rows?: DocRow[];
};

export type DocLink = { label: string; href: string; external?: boolean };

export type DocPage = {
  intro?: string;
  sections: DocSection[];
  links?: DocLink[];
};

export const docPages: Partial<Record<ProductPageKey, DocPage>> = {
  "getting-started": {
    intro:
      "This is the real new-user flow, in order. Installs and doctor work without an account; only publishing needs a login.",
    sections: [
      {
        heading: "1. Install the Soroq CLI",
        intro:
          "macOS and Linux are supported for the beta (Linux is now natively CI-validated, not emulated). This installs both soroq and soroqctl. You can also build from source on any of the three platforms.",
        commands: [publicInstallCommand],
        callouts: [
          {
            tone: "info",
            body: "Prefer to build it yourself? git clone https://github.com/soroq/install && cd install/backend && make build gives you soroq v0.2.2. Full install details, checksum verification, and quarantine removal live on the CLI page. Windows is pending — see the Windows acceptance checklist.",
          },
        ],
      },
      {
        heading: "2. Install the frontend and toolchains",
        intro:
          "Pin the frontend and both platform toolchains, then run doctor. None of these steps require a login.",
        commands: [
          "soroq frontend install soroq-flutter-frontend-f74781f6-6903c161 --api https://api.soroq.dev",
          "soroq toolchain install soroq-android-3.44.2-release-12d3315131f5 --api https://api.soroq.dev",
          "soroq toolchain install soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules --api https://api.soroq.dev",
          "soroq toolchain doctor",
        ],
        callouts: [
          {
            tone: "success",
            body: "soroq toolchain doctor reports whether the frontend and toolchains are present and consistent.",
          },
        ],
      },
      {
        heading: "3. Log in (only for publishing)",
        intro:
          "Authenticate against the hosted surface, then confirm your identity. You only need this before you publish a release or patch.",
        commands: [
          "soroq login --hosted-surface https://soroq.dev --api https://api.soroq.dev",
          "soroq whoami --api https://api.soroq.dev",
        ],
      },
      {
        heading: "4. Ship your first patch",
        intro:
          "Pick a platform quickstart and run a full base to patch to rollback cycle.",
      },
    ],
    links: [
      { label: "Install the CLI", href: "/cli" },
      { label: "Android hard OTA quickstart", href: "/android-quickstart" },
      { label: "iOS hard OTA quickstart", href: "/ios-quickstart" },
      { label: "Troubleshooting", href: "/troubleshooting" },
    ],
  },
  cli: {
    intro:
      "The Soroq CLI ships as a public install script (macOS + Linux) and as a public source tree you can build yourself. Either way you get both soroq and soroqctl in $HOME/.soroq/bin.",
    sections: [
      {
        heading: "Install on macOS or Linux",
        intro:
          "Run the public installer, add the bin directory to your PATH, and check the version. macOS (Apple Silicon + Intel) and Linux (amd64 + arm64) are supported; install.sh auto-detects OS + architecture.",
        commands: [publicInstallCommand],
        callouts: [
          {
            tone: "warn",
            body: "macOS (Apple Silicon + Intel) and Linux (amd64 + arm64) are supported and smoke-tested — Linux is now natively validated in CI, not under emulation. Windows is pending (see the Windows acceptance checklist). Building from source is supported on all three.",
          },
        ],
      },
      {
        heading: "Build from source (supported)",
        intro:
          "backend/ is the public CLI source — the same client code shipped in the binary releases, exported deterministically from the main repo (operator-only publishing and private control-plane code are excluded). No private module, private Git dependency, or local path is required.",
        commands: [
          "git clone https://github.com/soroq/install",
          "cd install/backend",
          "make build        # stamps ./VERSION -> ./soroq + ./soroqctl",
          "./soroq version   # -> soroq v0.2.2",
          "# or plainly, without the Makefile:",
          "go build ./cmd/soroq ./cmd/soroqctl",
          "go test ./...",
        ],
        callouts: [
          {
            tone: "info",
            body: "The two operator-only commands (frontend publish, toolchain publish) are intentionally not in this build; every normal developer command (install/doctor, login/whoami/logout, init, release, patch, rollback) is present.",
          },
        ],
      },
      {
        heading: "Verify the download (SHA256)",
        intro:
          "install.sh verifies the SHA256 automatically. To check manually, download the release tarball and checksums.txt from the public release, then verify.",
        commands: ["shasum -a 256 -c checksums.txt"],
      },
      {
        heading: "Clear the macOS quarantine",
        intro:
          "If Gatekeeper blocks the binaries, remove the quarantine attribute:",
        commands: [
          'xattr -dr com.apple.quarantine "$HOME/.soroq/bin/soroq" "$HOME/.soroq/bin/soroqctl"',
        ],
      },
      {
        heading: "Confirm the version",
        commands: ["soroq version   # -> soroq v0.2.2"],
      },
    ],
    links: [
      {
        label: "github.com/soroq/install",
        href: "https://github.com/soroq/install",
        external: true,
      },
      {
        label: "Release v0.2.2 (downloads + checksums.txt)",
        href: "https://github.com/soroq/install/releases/tag/v0.2.2",
        external: true,
      },
      {
        label: "Windows acceptance checklist (pending)",
        href: "https://github.com/soroq/install/blob/main/docs/windows-acceptance.md",
        external: true,
      },
      { label: "Getting started", href: "/getting-started" },
    ],
  },
  "android-quickstart": {
    intro:
      "A complete copy-paste flow: stock Flutter app, base APK release, a visible code patch at full rollout, and a verified rollback. Replace each <id> with your own identifier.",
    sections: [
      {
        heading: "1. Create the app and add Soroq",
        commands: [
          "flutter create my_app",
          "cd my_app",
          "flutter pub add soroq_flutter",
          "soroq init --app-id <id> --channel stable --api https://api.soroq.dev",
        ],
      },
      {
        heading: "2. Cut the base release",
        intro: "Register the stock APK as the base the patch will target.",
        commands: [
          "soroq release android --toolchain soroq-android-3.44.2-release-12d3315131f5 --artifact-type apk --api https://api.soroq.dev --release-id <id> --version 1.0.0+1 --channel stable",
        ],
      },
      {
        heading: "3. Change visible code and patch",
        intro:
          "Edit a lib/ Dart file so a visible value changes, then publish a code patch at 100% rollout.",
        commands: [
          "soroq patch android --release-id <id> --toolchain soroq-android-3.44.2-release-12d3315131f5 --artifact-type apk --api https://api.soroq.dev --patch-id <id> --channel stable --track stable --kind code --rollout 100",
        ],
        callout: {
          tone: "info",
          title: "Two-cold-start model",
          body: "The first launch after a patch is published stages the patch (downloads and verifies it). The next cold start activates it. A single launch does not both stage and activate.",
        },
      },
      {
        heading: "4. Roll back",
        commands: [
          "soroq rollback --patch-id <id> --api https://api.soroq.dev --verify",
        ],
        callout: {
          tone: "warn",
          title: "Rollback nuance (be honest with yourself)",
          body: "An already-running process may still show patched code for that launch. The NEXT cold start serves the base. Rollback is a server-side decision; --verify confirms it landed.",
        },
      },
      {
        heading: "Proven flow",
        intro:
          "This exact cycle has been exercised end to end on the experimental hard-OTA tier.",
        rows: [
          { term: "Base", detail: "app shows value 42" },
          { term: "Patch", detail: "app shows value 91 after activation" },
          { term: "Rollback", detail: "next cold start returns to 42" },
          { term: "Tamper", detail: "a tampered patch is refused (fail-closed)" },
        ],
      },
    ],
    links: [
      { label: "Getting started", href: "/getting-started" },
      { label: "Install the CLI", href: "/cli" },
      { label: "iOS quickstart", href: "/ios-quickstart" },
      { label: "Troubleshooting", href: "/troubleshooting" },
    ],
  },
  "ios-quickstart": {
    intro:
      "iOS hard OTA is experimental and physical-device only. It does not run on the simulator, and Apple signing is required to install and run on device. The engine and toolchain are an experimental tier.",
    sections: [
      {
        heading: "Requirements",
        callouts: [
          {
            tone: "warn",
            title: "Physical iPhone only",
            body: "The simulator is not supported. You need a real device, Apple signing set up, and the experimental iOS engine/toolchain tier.",
          },
        ],
      },
      {
        heading: "1. Create the app and install frontend + toolchain",
        commands: [
          "flutter create my_app && cd my_app",
          "flutter pub add soroq_flutter",
          "soroq frontend install soroq-flutter-frontend-f74781f6-6903c161 --api https://api.soroq.dev",
          "soroq toolchain install soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules --api https://api.soroq.dev",
        ],
      },
      {
        heading: "2. Declare patchable functions in soroq.yaml",
        intro:
          "List the functions the engine is allowed to patch under ios_engine. Use the lib/<file>.dart#<function> form.",
        commands: [
          `ios_engine:
  enabled: true
  patchable:
    - "lib/foo.dart#myFn"`,
        ],
        callout: {
          tone: "info",
          title: "manifest_trust auto-scaffolds",
          body: "Soroq generates manifest_trust for you: only the public key is written into your project. The private seed is stored at mode 0600 and gitignored.",
        },
      },
      {
        heading: "3. Build the signed base release",
        commands: [
          "soroq release ios --engine --build --toolchain soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules --app-id <id> --release-id <id> --channel <ch> --api https://api.soroq.dev",
        ],
      },
      {
        heading: "4. Publish an engine patch",
        commands: [
          "soroq patch ios --engine --toolchain soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules --app-id <id> --release-id <id> --patch-id <id> --channel <ch> --api https://api.soroq.dev",
        ],
        callout: {
          tone: "info",
          body: "A patch may only direct-call retained or manifest-listed symbols. Calls into symbols that were stripped are not available to the patch.",
        },
      },
      {
        heading: "5. Roll back",
        commands: [
          "soroq rollback ios-engine --patch-id <id> --api https://api.soroq.dev --verify",
        ],
      },
      {
        heading: "Expected values",
        rows: [
          { term: "Base", detail: "device shows the base value" },
          { term: "Patch", detail: "device shows the patched value" },
          { term: "Rollback", detail: "device returns to the base value" },
          {
            term: "Tamper",
            detail: "refused: sig=FAIL, bad manifest signature (fail-closed)",
          },
        ],
      },
    ],
    links: [
      { label: "Getting started", href: "/getting-started" },
      { label: "Install the CLI", href: "/cli" },
      { label: "Android quickstart", href: "/android-quickstart" },
      { label: "Troubleshooting", href: "/troubleshooting" },
    ],
  },
  troubleshooting: {
    intro:
      "The errors you are most likely to hit, with the fix for each. Patches are version and runtime specific, and signature failures are fail-closed.",
    sections: [
      {
        heading: "Login and identity",
        rows: [
          {
            term: "Keychain not found",
            detail:
              "On a fresh or sandboxed HOME the token falls back to ~/.soroq/config.json at mode 0600. Verify with soroq whoami.",
          },
        ],
      },
      {
        heading: "Missing frontend or toolchain",
        rows: [
          {
            term: "Frontend missing",
            detail:
              "soroq frontend install soroq-flutter-frontend-f74781f6-6903c161 --api https://api.soroq.dev",
          },
          {
            term: "Toolchain missing",
            detail:
              "soroq toolchain install <toolchain> --api https://api.soroq.dev (Android: soroq-android-3.44.2-release-12d3315131f5, iOS: soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules)",
          },
        ],
      },
      {
        heading: "Android",
        rows: [
          {
            term: "Status looks stale after a check",
            detail:
              "Read getAutoUpdateState() after the check completes, not only the immediate return value of runAutoUpdateNow().",
          },
          {
            term: "Rollback still shows patched code",
            detail:
              "An already-running process may keep patched code for that launch. The NEXT cold start serves the base.",
          },
        ],
      },
      {
        heading: "iOS",
        rows: [
          {
            term: "Nothing happens on the simulator",
            detail:
              "Hard OTA is physical-device only. The simulator is not supported.",
          },
          {
            term: "App will not install or run",
            detail: "Apple signing is required to install and run on device.",
          },
        ],
      },
      {
        heading: "Platforms",
        rows: [
          {
            term: "Windows",
            detail:
              "Windows is pending. install.sh does not offer it and install.ps1 stays gated behind SOROQ_INSTALL_ALLOW_WINDOWS=1. It becomes supported only after the interactive gates pass: github.com/soroq/install/blob/main/docs/windows-acceptance.md",
          },
          {
            term: "Prefer building from source",
            detail:
              "Supported on macOS and Linux (Windows pending): git clone https://github.com/soroq/install && cd install/backend && make build (or go build ./cmd/soroq ./cmd/soroqctl) -> soroq v0.2.2.",
          },
        ],
      },
      {
        heading: "Versions and signatures",
        rows: [
          {
            term: "Version bump / runtime_id mismatch",
            detail:
              "Patches are version and runtime specific. A version bump needs a new base release and a new patch built against it.",
          },
          {
            term: "manifest_signature_invalid / tamper error",
            detail:
              "This is fail-closed: the patch is NOT applied. Rebuild and re-sign from a trusted manifest.",
          },
        ],
      },
    ],
    links: [
      { label: "Getting started", href: "/getting-started" },
      { label: "Install the CLI", href: "/cli" },
      { label: "Android quickstart", href: "/android-quickstart" },
      { label: "iOS quickstart", href: "/ios-quickstart" },
    ],
  },
};


export const docCalloutTone: Record<DocTone, { wrap: string; icon: string }> = {
  info: { wrap: "border-blueprint/25 bg-blueprint/[0.08]", icon: "text-blueprint" },
  warn: { wrap: "border-coral/30 bg-coral/[0.08]", icon: "text-coral" },
  success: { wrap: "border-success/30 bg-success/[0.1]", icon: "text-success" },
};

export function DocCalloutCard({ callout }: { callout: DocCallout }) {
  const tone = callout.tone ?? "info";
  const styles = docCalloutTone[tone];
  const Icon = tone === "warn" ? AlertCircle : tone === "success" ? CheckCircle2 : ShieldCheck;

  return (
    <div className={`flex gap-3 rounded-2xl border p-4 ${styles.wrap}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${styles.icon}`} />
      <div className="min-w-0">
        {callout.title ? (
          <p className="text-sm font-bold text-foreground">{callout.title}</p>
        ) : null}
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{callout.body}</p>
      </div>
    </div>
  );
}

export function DocHeroAside({
  page,
  doc,
  reducedMotion,
}: {
  page: ProductPageConfig;
  doc: DocPage;
  reducedMotion: boolean | null;
}) {
  return (
    <motion.aside
      className="relative w-full min-w-0 overflow-hidden rounded-[2rem] bg-white p-6 shadow-card ring-1 ring-primary/10 sm:p-7"
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.08 }}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ListChecks className="size-5" />
        </span>
        <p className="font-mono text-xs uppercase text-muted-foreground">On this page</p>
      </div>
      <ol className="mt-5 grid gap-2">
        {doc.sections.map((section, index) => (
          <li
            key={section.heading}
            className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-page px-4 py-3"
          >
            <span className="grid size-7 place-items-center rounded-full bg-accent font-mono text-xs font-bold text-accent-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm font-semibold text-foreground">{section.heading}</span>
          </li>
        ))}
      </ol>
      {doc.links && doc.links.length > 0 ? (
        <div className="mt-6 border-t border-primary/10 pt-5">
          <p className="font-mono text-xs uppercase text-muted-foreground">Related</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-white px-3 py-2 text-xs font-bold text-foreground shadow-soft transition-colors hover:bg-accent"
              >
                {link.external ? (
                  <ExternalLink className="size-3.5 text-coral" />
                ) : (
                  <ArrowRight className="size-3.5 text-coral" />
                )}
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        {page.eyebrow}
      </p>
    </motion.aside>
  );
}

export function DocsArticle({
  doc,
  reducedMotion,
}: {
  doc: DocPage;
  reducedMotion: boolean | null;
}) {
  return (
    <section className="mx-auto max-w-[1420px] px-5 pb-20 sm:px-8">
      {doc.intro ? (
        <p className="mx-auto mb-10 max-w-3xl text-lg leading-8 text-muted-foreground">
          {doc.intro}
        </p>
      ) : null}
      <div className="grid gap-5">
        {doc.sections.map((section, index) => (
          <motion.article
            key={section.heading}
            className="rounded-[1.75rem] border border-primary/10 bg-white p-5 shadow-card sm:p-8"
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.14 }}
            transition={{ duration: 0.5, delay: Math.min(index, 3) * 0.05 }}
          >
            <h2 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {section.heading}
            </h2>
            {section.intro ? (
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {section.intro}
              </p>
            ) : null}

            {section.commands && section.commands.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {section.commands.map((command) => (
                  <CommandBlock key={command} code={command} />
                ))}
              </div>
            ) : null}

            {section.steps && section.steps.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {section.steps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-primary/10 bg-page p-4 sm:p-5"
                  >
                    <p className="text-base font-bold text-foreground">{step.title}</p>
                    {step.body ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {step.body}
                      </p>
                    ) : null}
                    {step.commands && step.commands.length > 0 ? (
                      <div className="mt-4 grid gap-3">
                        {step.commands.map((command) => (
                          <CommandBlock key={command} code={command} />
                        ))}
                      </div>
                    ) : null}
                    {step.callout ? (
                      <div className="mt-4">
                        <DocCalloutCard callout={step.callout} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {section.rows && section.rows.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-primary/10">
                {section.rows.map((row, rowIndex) => (
                  <div
                    key={row.term}
                    className={`grid gap-1 px-4 py-4 sm:grid-cols-[0.42fr_1fr] sm:gap-4 ${
                      rowIndex > 0 ? "border-t border-primary/10" : ""
                    }`}
                  >
                    <span className="font-bold text-foreground">{row.term}</span>
                    <span className="text-sm leading-6 text-muted-foreground">
                      {row.detail}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {section.callout ? (
              <div className="mt-5">
                <DocCalloutCard callout={section.callout} />
              </div>
            ) : null}
            {section.callouts && section.callouts.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {section.callouts.map((callout) => (
                  <DocCalloutCard key={callout.body} callout={callout} />
                ))}
              </div>
            ) : null}
          </motion.article>
        ))}
      </div>

      {doc.links && doc.links.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {doc.links.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="outline"
              className="rounded-xl bg-white"
            >
              <a
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
              >
                {link.label}
                {link.external ? (
                  <ExternalLink data-icon="inline-end" />
                ) : (
                  <ArrowRight data-icon="inline-end" />
                )}
              </a>
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

