const { firebasePublicConfig } = require("../_lib/env");
const { json, methodNotAllowed, notConfigured } = require("../_lib/http");

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(req, res, ["GET"]);
    return;
  }

  try {
    json(res, 200, {
      firebase: firebasePublicConfig(),
      provider: "google",
    });
  } catch (error) {
    notConfigured(res, error);
  }
};
