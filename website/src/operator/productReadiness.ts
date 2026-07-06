import {
  formatMetric,
  formatRecordText,
  getRecordValue,
  nestedRecord,
  nestedRecords,
} from "./records";
import type { ConsoleStat, ConsoleValueRow, JsonRecord } from "./types";

export type ProductCommandRow = {
  label: string;
  command: string;
};

export type ProductReadinessView = {
  ownershipRows: ConsoleStat[];
  developerCommandRows: ProductCommandRow[];
  billingRows: ConsoleStat[];
  trustRows: ConsoleStat[];
  domainRows: ConsoleValueRow[];
  sampledOwnershipApps: JsonRecord[];
};

const defaultDeveloperCommandRows: ProductCommandRow[] = [
  { label: "Login", command: "soroq login" },
  { label: "Initialize app", command: "soroq init" },
  { label: "Release Android", command: "soroq release android" },
  { label: "Patch Android", command: "soroq patch android" },
  { label: "Rollback patch", command: "soroq rollback --patch-id <patch-id>" },
];

export function buildProductReadinessView({
  product,
  appCount,
  releaseCount,
  patchCount,
  rolledBackPatchCount,
}: {
  product: JsonRecord | null;
  appCount: number;
  releaseCount: number;
  patchCount: number;
  rolledBackPatchCount: number;
}): ProductReadinessView {
  const ownership = nestedRecord(product, "ownership");
  const developer = nestedRecord(product, "developer_experience");
  const billing = nestedRecord(product, "billing");
  const trust = nestedRecord(product, "trust");
  const domains = nestedRecord(product, "domains");
  const productCommands = nestedRecords(developer, "commands");

  return {
    developerCommandRows:
      productCommands.length > 0
        ? productCommands.map((command) => ({
            label: formatRecordText(command, ["label"], "Command"),
            command: formatRecordText(command, ["command"], "soroq --help"),
          }))
        : defaultDeveloperCommandRows,
    ownershipRows: [
      {
        label: "Mode",
        value: formatRecordText(ownership, ["mode"], "owner_email"),
        helper: "workspace boundary",
      },
      {
        label: "Visible apps",
        value: formatMetric(
          getRecordValue(ownership, ["visible_app_count"]),
          String(appCount),
        ),
        helper: "after auth scoping",
      },
      {
        label: "Owned apps",
        value: formatMetric(getRecordValue(ownership, ["owned_app_count"]), String(appCount)),
        helper: "matching operator email",
      },
      {
        label: "Unowned visible",
        value: formatMetric(getRecordValue(ownership, ["unowned_visible_app_count"])),
        helper: "legacy migration watch",
      },
    ],
    billingRows: [
      {
        label: "Plan",
        value: formatRecordText(billing, ["plan"], "free_beta"),
        helper: "alpha access",
      },
      {
        label: "Apps",
        value: formatMetric(getRecordValue(billing, ["billable_apps"]), String(appCount)),
        helper: "metered workspaces later",
      },
      {
        label: "Releases",
        value: formatMetric(
          getRecordValue(billing, ["billable_releases"]),
          String(releaseCount),
        ),
        helper: "stored bases",
      },
      {
        label: "Patches",
        value: formatMetric(
          getRecordValue(billing, ["billable_patches"]),
          String(patchCount),
        ),
        helper: "published payloads",
      },
    ],
    trustRows: [
      {
        label: "Operator auth",
        value: formatRecordText(trust, ["firebase_operator_auth"], "true"),
        helper: "Firebase ID token",
      },
      {
        label: "Owner scoping",
        value: formatRecordText(trust, ["owner_scoping"], "true"),
        helper: "backend enforced",
      },
      {
        label: "Signed releases",
        value: formatMetric(getRecordValue(trust, ["signed_release_count"])),
        helper: `${releaseCount} visible releases`,
      },
      {
        label: "Rolled back",
        value: formatMetric(
          getRecordValue(trust, ["rolled_back_patch_count"]),
          String(rolledBackPatchCount),
        ),
        helper: "server suppression",
      },
    ],
    domainRows: [
      { label: "Marketing", value: formatRecordText(domains, ["marketing"], "soroq.dev") },
      {
        label: "Console",
        value: formatRecordText(domains, ["console"], "console.soroq.dev"),
      },
      { label: "API", value: formatRecordText(domains, ["api"], "api.soroq.dev") },
      { label: "Docs", value: formatRecordText(domains, ["docs"], "docs.soroq.dev") },
    ],
    sampledOwnershipApps: nestedRecords(ownership, "sampled_apps"),
  };
}
