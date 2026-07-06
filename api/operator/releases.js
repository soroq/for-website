const { methodNotAllowed, notConfigured, json } = require("../_lib/http");
const { requireOperator } = require("../_lib/operator-auth");
const { fetchJSON, isOperatorScopeDenied } = require("../_lib/control-plane");

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

  let operator = null;
  try {
    operator = await requireOperator(req, res);
    if (!operator) {
      return;
    }

    const params = new URLSearchParams();
    const appId = queryValue(req, "app_id");
    if (!appId && !operator.isAdmin) {
      json(res, 200, []);
      return;
    }

    if (appId) {
      params.set("app_id", appId);
    }

    const query = params.toString();
    json(
      res,
      200,
      await fetchJSON(query ? `/v1/releases?${query}` : "/v1/releases", { operator }),
    );
  } catch (error) {
    if (operator && !operator.isAdmin && isOperatorScopeDenied(error)) {
      json(res, 200, []);
      return;
    }

    notConfigured(res, error);
  }
};
