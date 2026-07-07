const { methodNotAllowed, notConfigured, json } = require("../_lib/http");
const { getFirebaseAdminApp } = require("../_lib/firebase-admin");
const { forwardJSON } = require("../_lib/control-plane");

// Reads a JSON body whether Vercel already parsed it (object / string) or it
// arrives as a raw stream. Never throws on malformed input — returns {} so the
// caller can respond with a clean 401 rather than a 500.
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  let raw = "";
  if (typeof req.body === "string") {
    raw = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    raw = req.body.toString("utf8");
  } else {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      raw = Buffer.concat(chunks).toString("utf8");
    } catch (_error) {
      return {};
    }
  }
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(req, res, ["POST"]);
    return;
  }

  const body = await readJsonBody(req);
  const idToken = typeof body.id_token === "string" ? body.id_token.trim() : "";

  // --- Everything below that can 401 runs BEFORE any path that can 500. ---
  if (!idToken) {
    json(res, 401, { error: "Sign in first: missing id_token." });
    return;
  }

  let email;
  try {
    const decoded = await getFirebaseAdminApp().auth().verifyIdToken(idToken);
    email = (decoded.email || "").trim().toLowerCase();
    if (!email) {
      json(res, 401, { error: "Signed-in account has no verified email." });
      return;
    }
  } catch (error) {
    json(res, 401, {
      error: "Sign-in verification failed.",
      detail: error.message,
    });
    return;
  }

  // From here a throw means the upstream control plane is misconfigured -> 500.
  try {
    // forwardJSON adds the Bearer operator token and, from operator.email, the
    // X-Soroq-Operator-Email header. The backend re-checks operator eligibility
    // (allowed emails) and refuses non-loopback redirect_uri, forwarding its
    // status + body verbatim (e.g. 403 unallowed email, 400 bad redirect).
    await forwardJSON(res, "/v1/cli/auth/authorize", {
      method: "POST",
      operator: { email },
      body: {
        code_challenge: body.code_challenge,
        code_challenge_method: body.code_challenge_method || "S256",
        state: body.state,
        redirect_uri: body.redirect_uri,
      },
    });
  } catch (error) {
    notConfigured(res, error);
  }
};
