const { methodNotAllowed, notConfigured, json } = require("../_lib/http");
const { requireOperator } = require("../_lib/operator-auth");
const { forwardJSON } = require("../_lib/control-plane");

// OPERATIONAL OTA ANALYTICS, FORWARDED.
//
// Every number the console shows is computed by the control plane from the client-id sets it stores.
// Nothing is derived here, because a total computed in two places is a total that can disagree with
// itself. The status is forwarded too: a 403 must reach the browser as a 403 rather than as an empty
// result, which is what two of the sibling read handlers do with a scope denial.
function queryValue(req, key) {
  const raw = req.query[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
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

    const appId = queryValue(req, "app_id");
    if (!appId) {
      json(res, 400, { error: "Missing required query parameter: app_id" });
      return;
    }

    await forwardJSON(res, `/v1/analytics?app_id=${encodeURIComponent(appId)}`, { operator });
  } catch (error) {
    notConfigured(res, error);
  }
};
