const { fetchJSON, isOperatorScopeDenied } = require("../_lib/control-plane");
const { optional } = require("../_lib/env");
const { json, methodNotAllowed, notConfigured } = require("../_lib/http");
const { requireOperator } = require("../_lib/operator-auth");

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asList(value, keys) {
  if (Array.isArray(value)) {
    return value.map(asRecord);
  }

  const record = asRecord(value);
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key].map(asRecord);
    }
  }

  return [];
}

function text(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return "";
}

function hasAny(record, keys) {
  return keys.some((key) => {
    const value = record[key];
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return Boolean(value);
  });
}

function workspaceSlug(email) {
  return email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "personal";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(req, res, ["GET"]);
    return;
  }

  try {
    const operator = await requireOperator(req, res);
    if (!operator) {
      return;
    }

    async function fetchScopedList(path) {
      try {
        return await fetchJSON(path, { operator });
      } catch (error) {
        if (!operator.isAdmin && isOperatorScopeDenied(error)) {
          return [];
        }
        throw error;
      }
    }

    const [appsPayload, releasesPayload, patchesPayload] = await Promise.all([
      fetchScopedList("/v1/apps"),
      operator.isAdmin ? fetchScopedList("/v1/releases") : [],
      operator.isAdmin ? fetchScopedList("/v1/patches") : [],
    ]);

    const apps = asList(appsPayload, ["apps", "items", "data"]);
    const releases = asList(releasesPayload, ["releases", "items", "data"]);
    const patches = asList(patchesPayload, ["patches", "items", "data"]);
    const operatorEmail = operator.email.trim().toLowerCase();
    const ownedApps = apps.filter(
      (app) => text(app, ["owner_email", "owner", "email"]).toLowerCase() === operatorEmail,
    );
    const unownedVisibleApps = apps.filter(
      (app) => !text(app, ["owner_email", "owner", "email"]),
    );
    const rolledBackPatches = patches.filter((patch) =>
      ["rolled_back", "rollback", "is_rolled_back"].some((key) => {
        const value = patch[key];
        if (typeof value === "string") {
          return ["true", "yes", "1", "rolled_back"].includes(
            value.trim().toLowerCase(),
          );
        }
        return Boolean(value);
      }),
    );
    const signedReleases = releases.filter((release) =>
      hasAny(release, [
        "manifest_signature",
        "manifest_signing_key_id",
        "signing_key_id",
        "signature",
        "signed_manifest",
      ]),
    );
    const signedPatches = patches.filter((patch) =>
      hasAny(patch, [
        "manifest_signature",
        "manifest_signing_key_id",
        "artifact_signature",
        "bundle_signature",
        "signature",
      ]),
    );

    json(res, 200, {
      operator: {
        email: operatorEmail,
        auth_provider: "firebase",
        verified: true,
      },
      workspace: {
        name: "Personal workspace",
        slug: workspaceSlug(operatorEmail),
        tenancy_model: "owner_email",
      },
      ownership: {
        mode: "owner_email",
        enforced: true,
        visible_app_count: apps.length,
        owned_app_count: ownedApps.length,
        unowned_visible_app_count: unownedVisibleApps.length,
        sampled_apps: apps.slice(0, 8).map((app) => ({
          id: text(app, ["id", "app_id"]),
          name: text(app, ["name", "display_name", "app_name"]),
          owner_email: text(app, ["owner_email", "owner", "email"]),
        })),
      },
      developer_experience: {
        hosted_surface_url: optional(
          "SOROQ_HOSTED_SURFACE_URL",
          "https://soroq-hosted-surface.vercel.app",
        ),
        commands: [
          { label: "Login", command: "soroq login" },
          { label: "Initialize app", command: "soroq init" },
          { label: "Release Android", command: "soroq release android" },
          { label: "Patch Android", command: "soroq patch android" },
          { label: "Rollback patch", command: "soroq rollback --patch-id <patch-id>" },
        ],
      },
      billing: {
        plan: "free_beta",
        billing_enforced: false,
        payment_provider: "not_connected",
        pricing_model: "developer beta while production billing is prepared",
        billable_apps: apps.length,
        billable_releases: releases.length,
        billable_patches: patches.length,
      },
      trust: {
        firebase_operator_auth: true,
        internal_operator_token_exposed_to_browser: false,
        owner_scoping: true,
        signed_release_count: signedReleases.length,
        signed_patch_count: signedPatches.length,
        rollback_guard: true,
        rolled_back_patch_count: rolledBackPatches.length,
      },
      domains: {
        marketing: optional("SOROQ_MARKETING_URL", "https://soroq.dev"),
        console: optional("SOROQ_CONSOLE_URL", "https://console.soroq.dev"),
        api: optional("SOROQ_API_URL", "https://api.soroq.dev"),
        docs: optional("SOROQ_DOCS_URL", "https://docs.soroq.dev"),
        dns_status: "pending_domain_connection",
      },
    });
  } catch (error) {
    notConfigured(res, error);
  }
};
