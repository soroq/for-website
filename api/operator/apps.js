const { methodNotAllowed, notConfigured, json } = require("../_lib/http");
const { requireOperator } = require("../_lib/operator-auth");
const { fetchJSON, isOperatorScopeDenied } = require("../_lib/control-plane");

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

    json(res, 200, await fetchJSON("/v1/apps", { operator }));
  } catch (error) {
    if (operator && !operator.isAdmin && isOperatorScopeDenied(error)) {
      json(res, 200, []);
      return;
    }

    notConfigured(res, error);
  }
};
