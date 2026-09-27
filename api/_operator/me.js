const { methodNotAllowed, notConfigured, json } = require("../_lib/http");
const { requireOperator } = require("../_lib/operator-auth");

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

    json(res, 200, {
      email: operator.email,
      is_admin: Boolean(operator.isAdmin),
      ok: true,
    });
  } catch (error) {
    notConfigured(res, error);
  }
};
