const { methodNotAllowed, notConfigured, json } = require("../_lib/http");
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

    const patchId = (req.query.patch_id || "").trim();
    if (!patchId) {
      json(res, 400, { error: "Missing required query parameter: patch_id" });
      return;
    }

    await forwardJSON(res, `/v1/patches/${encodeURIComponent(patchId)}/health`, {
      operator,
    });
  } catch (error) {
    notConfigured(res, error);
  }
};
