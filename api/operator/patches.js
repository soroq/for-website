const { methodNotAllowed, notConfigured, json } = require("../_lib/http");
const { requireOperator } = require("../_lib/operator-auth");
const { fetchJSON, isOperatorScopeDenied } = require("../_lib/control-plane");

const allowedFilters = ["app_id", "release_id", "runtime_id", "channel", "track"];

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
    for (const key of allowedFilters) {
      const value = queryValue(req, key);
      if (value) {
        params.set(key, value);
      }
    }

    if (!params.has("app_id") && !operator.isAdmin) {
      json(res, 200, []);
      return;
    }

    const query = params.toString();
    json(
      res,
      200,
      await fetchJSON(query ? `/v1/patches?${query}` : "/v1/patches", { operator }),
    );
  } catch (error) {
    if (operator && !operator.isAdmin && isOperatorScopeDenied(error)) {
      json(res, 200, []);
      return;
    }

    notConfigured(res, error);
  }
};
