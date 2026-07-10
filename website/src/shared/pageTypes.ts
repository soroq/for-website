// Shared page/route types and path helpers (moved verbatim from App.tsx).

export type ProductPageKey =
  | "quickstart"
  | "cli"
  | "control-plane"
  | "compatibility"
  | "operator"
  | "getting-started"
  | "android-quickstart"
  | "ios-quickstart"
  | "troubleshooting";

export type ProductPageConfig = {
  key: ProductPageKey;
  path: string;
  eyebrow: string;
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  facts: string[];
};

export const normalizePath = (value: string) =>
  value !== "/" && value.endsWith(".html") ? value.slice(0, -5) : value;

export function isOperatorRoute(pathname: string) {
  return pathname === "/operator" || pathname.endsWith("/operator.html");
}
