// One serverless function for several small operator endpoints.
//
// The Vercel Hobby plan deploys at most 12 functions, and this site was at 12. These handlers keep their
// public paths (/api/operator/me, /firebase-config, /analytics, /healthz); Vercel serves any static
// api/operator/<name>.js first, so every other endpoint is unaffected. Only names listed here resolve;
// anything else is a 404, never a dynamic require of a caller-chosen path.
const handlers = {
  me: require("../_operator/me"),
  "firebase-config": require("../_operator/firebase-config"),
  analytics: require("../_operator/analytics"),
  healthz: require("../_operator/healthz"),
};

module.exports = async function handler(req, res) {
  const raw = req.query && req.query.resource;
  const name = Array.isArray(raw) ? raw[0] : raw;
  const target = Object.prototype.hasOwnProperty.call(handlers, name) ? handlers[name] : null;
  if (!target) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  return target(req, res);
};
