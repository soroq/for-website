const { csv } = require("./env");
const { json } = require("./http");
const { getFirebaseAdminApp } = require("./firebase-admin");

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

async function requireOperator(req, res) {
  const token = readBearerToken(req);
  if (!token) {
    json(res, 401, { error: "Sign in as an operator first." });
    return null;
  }

  let decoded;
  try {
    decoded = await getFirebaseAdminApp().auth().verifyIdToken(token);
  } catch (error) {
    json(res, 401, {
      error: "Operator token verification failed.",
      detail: error.message,
    });
    return null;
  }

  const email = (decoded.email || "").trim().toLowerCase();
  if (!email || decoded.email_verified === false) {
    json(res, 403, {
      error: "The signed-in Firebase account is not an eligible operator.",
    });
    return null;
  }

  const allowlist = csv("SOROQ_OPERATOR_ALLOWED_EMAILS");
  if (allowlist.length > 0 && !allowlist.includes(email)) {
    json(res, 403, {
      error: `Operator ${email} is not allowlisted for this hosted surface.`,
    });
    return null;
  }

  const adminEmails = csv("SOROQ_OPERATOR_ADMIN_EMAILS");
  return { email, decoded, isAdmin: adminEmails.includes(email) };
}

module.exports = {
  requireOperator,
};
