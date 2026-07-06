const { forwardRaw } = require("./control-plane");
const { json, methodNotAllowed, notConfigured } = require("./http");
const { requireOperator } = require("./operator-auth");

const maxProxyBodyBytes = 256 << 20;

function queryValue(req, key) {
  const raw = req.query?.[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

function requestSearch(req) {
  const parsed = new URL(req.url || "", "https://soroq.local");
  return parsed.search;
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }
  if (req.body && typeof req.body === "object") {
    return Buffer.from(JSON.stringify(req.body));
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxProxyBodyBytes) {
      throw new Error("Request body is larger than the hosted proxy limit.");
    }
    chunks.push(buffer);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function handlePatchArtifact(req, res, artifact) {
  const patchID = queryValue(req, "id");
  if (!patchID) {
    json(res, 400, { error: "patch id is required." });
    return;
  }

  const encodedPatchID = encodeURIComponent(patchID);
  const upstreamPath = `/v1/patches/${encodedPatchID}/${artifact}`;

  try {
    if (req.method === "GET") {
      await forwardRaw(res, `${upstreamPath}${requestSearch(req)}`, {
        method: "GET",
        accept: req.headers.accept,
        range: req.headers.range,
      });
      return;
    }

    if (req.method === "POST" && artifact === "bundle") {
      const operator = await requireOperator(req, res);
      if (!operator) {
        return;
      }

      const body = await readRawBody(req);
      await forwardRaw(res, upstreamPath, {
        method: "POST",
        operator,
        body,
        contentType: req.headers["content-type"],
        accept: req.headers.accept,
      });
      return;
    }

    methodNotAllowed(req, res, artifact === "bundle" ? ["GET", "POST"] : ["GET"]);
  } catch (error) {
    if (String(error.message || "").includes("hosted proxy limit")) {
      json(res, 413, { error: error.message });
      return;
    }
    notConfigured(res, error);
  }
}

module.exports = {
  handlePatchArtifact,
  readRawBody,
};
