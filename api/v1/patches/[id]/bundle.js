const { handlePatchArtifact } = require("../../../_lib/patch-artifact-proxy");

module.exports = async function handler(req, res) {
  await handlePatchArtifact(req, res, "bundle");
};
