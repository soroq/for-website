const { methodNotAllowed, notConfigured } = require("../_lib/http");
const { requireOperator } = require("../_lib/operator-auth");
const { forwardJSON } = require("../_lib/control-plane");

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

    await forwardJSON(res, "/healthz", { operator });
  } catch (error) {
    notConfigured(res, error);
  }
};
