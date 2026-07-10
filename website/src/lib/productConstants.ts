// Single source of truth for Soroq product constants surfaced on the website.
// Update these values here only; content/pages should import from this module.
export const PRODUCT = {
  cliVersion: "v0.2.2",
  packages: { soroqFlutter: "0.2.3", soroqSdk: "0.1.6" },
  frontendId: "soroq-flutter-frontend-f74781f6-6903c161",
  androidToolchainId: "soroq-android-3.44.2-release-12d3315131f5",
  iosToolchainId: "soroq-ios-3.44.2-profile-f74781f6-3499c008-local-r3-dynmodules",
  apiBaseUrl: "https://api.soroq.dev",
  hostedLoginUrl: "https://soroq.dev",
  installRepo: "https://github.com/soroq/install",
  installScriptUrl: "https://raw.githubusercontent.com/soroq/install/main/install.sh",
  platforms: { macos: "supported", linux: "supported", windows: "pending" },
  tiers: {
    android: "experimental (fresh-user proven)",
    ios: "experimental, device-only (physical iPhone, fresh-user proven)",
  },
} as const;

export type Product = typeof PRODUCT;
