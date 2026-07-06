const $ = (id) => document.getElementById(id);

const els = {
  apiBase: $("api-base"),
  patchId: $("patch-id"),
  signInGoogleButton: $("sign-in-google"),
  signInGithubButton: $("sign-in-github"),
  signOutButton: $("sign-out"),
  authBanner: $("auth-banner"),
  authState: $("auth-state"),
  authEmail: $("auth-email"),
  authProvider: $("auth-provider"),
  serverAuthState: $("server-auth-state"),
  healthButton: $("check-healthz"),
  loadButton: $("load-patch"),
  rollbackButton: $("rollback-patch"),
  banner: $("status-banner"),
  controlPlaneState: $("control-plane-state"),
  patchNumber: $("patch-number"),
  rolledBack: $("rolled-back"),
  successCount: $("success-count"),
  failureCount: $("failure-count"),
  lastEventKind: $("last-event-kind"),
  lastEventAt: $("last-event-at"),
  successClients: $("success-clients"),
  failureClients: $("failure-clients"),
  rawJson: $("raw-json"),
};

let lastHealth = null;
let rollbackArmed = false;
let authReady = false;
let firebaseAuth = null;
let currentUser = null;
let currentToken = null;

function normalizeApiBase(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return window.location.origin;
  }
  return trimmed.replace(/\/+$/, "");
}

function patchPath() {
  const patchId = els.patchId.value.trim();
  if (!patchId) {
    throw new Error("Enter a patch ID first.");
  }
  return { patchId, encoded: encodeURIComponent(patchId) };
}

function setBusy(isBusy) {
  for (const button of [
    els.signInGoogleButton,
    els.signInGithubButton,
    els.signOutButton,
    els.healthButton,
    els.loadButton,
    els.rollbackButton,
  ]) {
    button.disabled = isBusy;
  }
}

function resetRollbackArm() {
  rollbackArmed = false;
  els.rollbackButton.textContent = "Roll back patch";
}

function setBanner(message, tone = "") {
  els.banner.className = `status-banner${tone ? ` ${tone}` : ""}`;
  els.banner.textContent = message;
}

function setAuthBanner(message, tone = "") {
  els.authBanner.className = `status-banner${tone ? ` ${tone}` : ""}`;
  els.authBanner.textContent = message;
}

function syncOperatorButtons() {
  const disabled = !authReady || !currentUser;
  els.healthButton.disabled = disabled;
  els.loadButton.disabled = disabled;
  els.rollbackButton.disabled = disabled;
  els.signInGoogleButton.disabled = !authReady || Boolean(currentUser);
  els.signInGithubButton.disabled = !authReady || Boolean(currentUser);
  els.signOutButton.disabled = !currentUser;
}

function currentProviderLabel() {
  const providerId = currentUser?.providerData?.[0]?.providerId || "";
  if (providerId === "google.com") {
    return "Google";
  }
  if (providerId === "github.com") {
    return "GitHub";
  }
  if (providerId === "password") {
    return "Email / Password";
  }
  return currentUser ? providerId || "Custom" : "Not signed in";
}

function updateAuthDisplay() {
  if (!authReady) {
    els.authState.textContent = "loading";
    els.authEmail.textContent = "Waiting for Firebase config";
    els.authProvider.textContent = "Waiting for Firebase config";
    els.serverAuthState.textContent = "Not verified yet";
    syncOperatorButtons();
    return;
  }

  if (!currentUser) {
    els.authState.textContent = "signed out";
    els.authEmail.textContent = "Not signed in";
    els.authProvider.textContent = "Not signed in";
    els.serverAuthState.textContent = "Not verified yet";
    syncOperatorButtons();
    return;
  }

  els.authState.textContent = "signed in";
  els.authEmail.textContent = currentUser.email || "Signed-in operator";
  els.authProvider.textContent = currentProviderLabel();
  syncOperatorButtons();
}

function request(path, options = {}) {
  const base = normalizeApiBase(els.apiBase.value);
  return fetch(`${base}${path}`, {
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
}

function renderHealth(health) {
  lastHealth = health;
  resetRollbackArm();
  els.patchNumber.textContent = String(health.patch_number ?? "—");
  els.rolledBack.textContent = health.rolled_back ? "Yes" : "No";
  els.successCount.textContent = String(health.success_count ?? 0);
  els.failureCount.textContent = String(health.failure_count ?? 0);
  els.lastEventKind.textContent = health.last_event_kind || "No events yet";
  els.lastEventAt.textContent = health.last_event_at || "Not recorded yet";
  els.successClients.textContent =
    health.successful_client_ids?.length
      ? health.successful_client_ids.join(", ")
      : "No successful client IDs recorded yet.";
  els.failureClients.textContent =
    health.failed_client_ids?.length
      ? health.failed_client_ids.join(", ")
      : "No failed client IDs recorded yet.";
  els.rawJson.textContent = JSON.stringify(health, null, 2);
}

async function verifyServerSession() {
  const response = await request("/api/operator/me");
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Server-side operator verification failed.");
  }
  els.serverAuthState.textContent = `Verified for ${body.email}`;
}

async function loadFirebaseConfig() {
  const base = normalizeApiBase(els.apiBase.value);
  const response = await fetch(`${base}/api/operator/firebase-config`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Failed to load Firebase config.");
  }
  return body.firebase;
}

async function signInWithProvider(kind) {
  if (!firebaseAuth) {
    setAuthBanner("Firebase Auth is not ready yet.", "bad");
    return;
  }

  setBusy(true);
  try {
    let provider;
    let providerLabel;
    if (kind === "github") {
      provider = new firebase.auth.GithubAuthProvider();
      provider.addScope("read:user");
      provider.addScope("user:email");
      providerLabel = "GitHub";
    } else {
      provider = new firebase.auth.GoogleAuthProvider();
      providerLabel = "Google";
    }
    await firebaseAuth.signInWithPopup(provider);
    setAuthBanner(`Signed in with ${providerLabel}. Verifying hosted operator access…`);
  } catch (error) {
    setAuthBanner(error.message, "bad");
  } finally {
    setBusy(false);
  }
}

async function signOutOperator() {
  if (!firebaseAuth) {
    return;
  }
  setBusy(true);
  try {
    await firebaseAuth.signOut();
    setAuthBanner("Signed out of the hosted operator surface.");
  } catch (error) {
    setAuthBanner(error.message, "bad");
  } finally {
    setBusy(false);
  }
}

async function bootAuth() {
  setAuthBanner("Loading Firebase configuration from the hosted surface…");
  try {
    const config = await loadFirebaseConfig();
    firebase.initializeApp(config);
    firebaseAuth = firebase.auth();
    authReady = true;
    updateAuthDisplay();

    firebaseAuth.onAuthStateChanged(async (user) => {
      currentUser = user;
      currentToken = user ? await user.getIdToken() : null;
      updateAuthDisplay();
      if (!user) {
        els.serverAuthState.textContent = "Not verified yet";
        setAuthBanner("Sign in with Google or GitHub before checking patch operations.", "");
        return;
      }

      try {
        await verifyServerSession();
        setAuthBanner("Operator access verified. Hosted patch operations are ready.", "good");
      } catch (error) {
        els.serverAuthState.textContent = "Rejected";
        setAuthBanner(error.message, "bad");
      }
    });
  } catch (error) {
    setAuthBanner(error.message, "bad");
    els.authState.textContent = "unavailable";
    els.authEmail.textContent = "Firebase config missing";
    els.authProvider.textContent = "Unavailable";
    els.serverAuthState.textContent = "Unavailable";
  } finally {
    syncOperatorButtons();
  }
}

async function checkHealthz() {
  if (!currentUser) {
    setBanner("Sign in before checking the hosted control plane.", "bad");
    return;
  }
  setBusy(true);
  try {
    const response = await request("/api/operator/healthz");
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "Control plane health check failed.");
    }
    els.controlPlaneState.textContent = body.status || "ok";
    setBanner("Control plane is reachable.", "good");
  } catch (error) {
    els.controlPlaneState.textContent = "unreachable";
    setBanner(error.message, "bad");
  } finally {
    setBusy(false);
  }
}

async function loadPatchHealthWithMessage(successMessage = "Patch health loaded.") {
  if (!currentUser) {
    setBanner("Sign in before loading patch health.", "bad");
    return;
  }
  setBusy(true);
  try {
    const { patchId } = patchPath();
    const response = await request(
      `/api/operator/patch-health?patch_id=${encodeURIComponent(patchId)}`,
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "Failed to load patch health.");
    }
    renderHealth(body);
    setBanner(successMessage, "good");
  } catch (error) {
    setBanner(error.message, "bad");
  } finally {
    setBusy(false);
  }
}

async function rollbackPatch() {
  if (!currentUser) {
    setBanner("Sign in before rolling back a patch.", "bad");
    return;
  }
  if (!lastHealth) {
    setBanner("Load patch health before triggering rollback.", "bad");
    return;
  }

  if (!rollbackArmed) {
    rollbackArmed = true;
    els.rollbackButton.textContent = "Confirm rollback";
    setBanner(`Click rollback again to revoke ${lastHealth.patch_id}.`, "bad");
    return;
  }
  setBusy(true);
  try {
    const { patchId } = patchPath();
    const response = await request(
      `/api/operator/rollback?patch_id=${encodeURIComponent(patchId)}`,
      {
      method: "POST",
      },
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "Rollback request failed.");
    }
    resetRollbackArm();
    await loadPatchHealthWithMessage(`Rollback applied to ${body.id}; health refreshed.`);
  } catch (error) {
    resetRollbackArm();
    setBanner(error.message, "bad");
    setBusy(false);
  }
}

function hydrateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const api = params.get("api");
  const patch = params.get("patch");
  els.apiBase.value = api || window.location.origin;
  if (patch) {
    els.patchId.value = patch;
  }
}

hydrateFromQuery();
syncOperatorButtons();
bootAuth();
els.signInGoogleButton.addEventListener("click", () => signInWithProvider("google"));
els.signInGithubButton.addEventListener("click", () => signInWithProvider("github"));
els.signOutButton.addEventListener("click", signOutOperator);
els.healthButton.addEventListener("click", checkHealthz);
els.loadButton.addEventListener("click", () => loadPatchHealthWithMessage());
els.rollbackButton.addEventListener("click", rollbackPatch);
