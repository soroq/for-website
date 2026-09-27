import { describe, expect, it } from "vitest";

import { buildAnalyticsView } from "./analytics";
import type { ApiState, JsonRecord } from "./types";

const ready = (payload: unknown): ApiState<JsonRecord> => ({
  status: "ready",
  data: payload as JsonRecord,
  error: null,
});

const populated = {
  totals: {
    patches: 3,
    observed_patches: 2,
    successful_devices: 90,
    failed_devices: 10,
    unverified_devices: 100,
    rolled_back_patches: 1,
  },
  notice: "100 of 100 reporting devices sent telemetry with no operator credential",
  patches: [
    {
      patch_id: "p2",
      patch_number: 2,
      channel: "stable",
      track: "stable",
      rolled_back: false,
      observed: true,
      successful_devices: 90,
      failed_devices: 10,
      verified_successful_devices: 0,
      verified_failed_devices: 0,
      unverified_devices: 100,
      failure_classes: { boot_crash: 3, signature_refused: 7 },
    },
    {
      patch_id: "p1",
      patch_number: 1,
      channel: "stable",
      track: "stable",
      rolled_back: true,
      observed: false,
      successful_devices: 0,
      failed_devices: 0,
      verified_successful_devices: 0,
      verified_failed_devices: 0,
      unverified_devices: 0,
    },
  ],
};

describe("delivery analytics", () => {
  it("renders what the server counted, newest patch first", () => {
    // The positive control: without a populated case, a view that returns nothing passes everything.
    const view = buildAnalyticsView(ready(populated));
    expect(view.rows.map((row) => row.patchNumber)).toEqual([2, 1]);
    expect(view.totals.successfulDevices).toBe(90);
    expect(view.totals.rolledBackPatches).toBe(1);
    expect(view.unavailable).toBe("");
    expect(view.rows[0].adoption).toBe("90%");
  });

  it("says NO TELEMETRY for a patch nobody reported on, never 0%", () => {
    // "0% adoption" is a claim about devices that were never heard from, and an operator reading a
    // wall of 0% cannot tell a failed rollout from a fleet that has not checked in.
    const view = buildAnalyticsView(ready(populated));
    const silent = view.rows.find((row) => row.patchNumber === 1);
    expect(silent?.observed).toBe(false);
    expect(silent?.adoption).toBe("no telemetry");
    expect(silent?.adoption).not.toContain("0%");
  });

  it("distinguishes observed-with-no-install from unobserved", () => {
    // A server-rollback notice reaches this state: the patch HAS been heard from, and no device has
    // reported installing or failing it.
    const view = buildAnalyticsView(
      ready({
        patches: [
          { patch_id: "p1", patch_number: 1, observed: true, successful_devices: 0, failed_devices: 0 },
        ],
      }),
    );
    expect(view.rows[0].adoption).toBe("no install reported");
  });

  it("computes adoption from reporting devices, not from a fleet size it does not know", () => {
    const view = buildAnalyticsView(
      ready({
        patches: [
          { patch_id: "p1", patch_number: 1, observed: true, successful_devices: 1, failed_devices: 3 },
        ],
      }),
    );
    expect(view.rows[0].adoption).toBe("25%");
  });

  it("names the unverified share instead of netting it off", () => {
    const view = buildAnalyticsView(ready(populated));
    expect(view.totals.unverifiedDevices).toBe(100);
    expect(view.notice).toContain("no operator credential");
    expect(view.rows[0].verifiedSuccessfulDevices).toBe(0);
  });

  it("does not recompute the totals the server sent", () => {
    // The server's totals are authoritative. Recomputing them here would render a second opinion as
    // fact, and a disagreement between the two would be invisible.
    const view = buildAnalyticsView(
      ready({ ...populated, totals: { ...populated.totals, successful_devices: 4242 } }),
    );
    expect(view.totals.successfulDevices).toBe(4242);
  });

  it("summarises what was NOT observed rather than implying it was fine", () => {
    expect(buildAnalyticsView(ready(populated)).summary).toBe(
      "2 of 3 patches reported on, 1 with no telemetry, 1 rolled back.",
    );
    expect(
      buildAnalyticsView(ready({ totals: { patches: 4, observed_patches: 0 }, patches: [] })).summary,
    ).toBe("None of the 4 patches has been reported on by any device.");
    expect(buildAnalyticsView(ready({ totals: { patches: 0 }, patches: [] })).summary).toBe(
      "No patches have been published for this app yet.",
    );
  });

  it("orders failure classes by how many devices hit them", () => {
    const view = buildAnalyticsView(ready(populated));
    // Alphabetical order and count order DISAGREE here on purpose: sorted by label, boot_crash comes
    // first, and the row an operator needs to see first is the one that hit the most devices.
    expect(view.rows[0].failureClasses).toEqual([
      { label: "signature_refused", title: "Refused: signature", count: 7 },
      { label: "boot_crash", title: "boot_crash", count: 3 },
    ]);
  });

  it("reports a refusal as UNAVAILABLE, never as a fleet with no devices", () => {
    const view = buildAnalyticsView({
      status: "error",
      data: null,
      error: "operator is not allowed for this app: com.example.fleet",
    });
    expect(view.unavailable).toContain("not allowed");
    expect(view.rows).toHaveLength(0);
    expect(view.summary).toBe("");
  });

  it("survives a payload with nothing in it", () => {
    for (const payload of [null, {}, { patches: "nonsense" }, { patches: [null, 7, "x"] }]) {
      const view = buildAnalyticsView(ready(payload));
      expect(view.rows).toHaveLength(0);
      expect(view.totals.patches).toBe(0);
    }
  });
});

// THE SHIPPED SCREEN MUST USE THIS MODEL.
describe("the shipped console uses this model", () => {
  const read = async (relativePath: string) => {
    const { readFileSync } = await import("node:fs");
    return readFileSync(new URL(relativePath, import.meta.url), "utf8");
  };

  it("the console page builds the view from the analytics state and renders the panel", async () => {
    const page = await read("../console/OperatorConsolePage.tsx");
    expect(page).toContain("buildAnalyticsView(analyticsState)");
    expect(page).toContain("<OperatorAnalyticsPanel");
    expect(page).toContain("/api/operator/analytics?app_id=");
  });

  it("the proxy forwards and computes nothing", async () => {
    const proxy = await read("../../../api/_operator/analytics.js");
    expect(proxy).toContain("forwardJSON");
    expect(proxy).toContain("/v1/analytics");
    expect(proxy).not.toContain("isOperatorScopeDenied");
  });
});
