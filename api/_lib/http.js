function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function methodNotAllowed(req, res, methods) {
  res.setHeader("Allow", methods.join(", "));
  json(res, 405, { error: `Method ${req.method} is not allowed.` });
}

function notConfigured(res, error) {
  json(res, 500, {
    error: "Hosted operator surface is not configured yet.",
    detail: error.message,
  });
}

module.exports = {
  json,
  methodNotAllowed,
  notConfigured,
};
