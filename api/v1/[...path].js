const { methodNotAllowed, notConfigured, json } = require("../_lib/http");
const { requireOperator } = require("../_lib/operator-auth");
const { forwardRaw } = require("../_lib/control-plane");

const allowedMethods = ["GET", "POST"];
const maxProxyBodyBytes = 256 << 20;

function requestPath(req) {
  const parsed = new URL(req.url || "", "https://soroq.local");
  const rawPath = req.query?.path ?? req.query?.["...path"];
  if (rawPath) {
    const rawSegments = Array.isArray(rawPath) ? rawPath : String(rawPath).split("/");
    const encodedPath = rawSegments
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    parsed.searchParams.delete("path");
    parsed.searchParams.delete("...path");
    const search = parsed.searchParams.toString();
    return `/v1/${encodedPath}${search ? `?${search}` : ""}`;
  }

  if (parsed.pathname.startsWith("/api/v1/")) {
    return `/v1/${parsed.pathname.slice("/api/v1/".length)}${parsed.search}`;
  }
  if (parsed.pathname === "/api/v1") {
    return `/v1${parsed.search}`;
  }

  const segments = [];
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `/v1/${encodedPath}${parsed.search}`;
}

async function readRawBody(req) {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

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

module.exports = async function handler(req, res) {
  if (!allowedMethods.includes(req.method)) {
    methodNotAllowed(req, res, allowedMethods);
    return;
  }

  try {
    const operator = await requireOperator(req, res);
    if (!operator) {
      return;
    }

    const body = await readRawBody(req);
    await forwardRaw(res, requestPath(req), {
      method: req.method,
      operator,
      body,
      contentType: req.headers["content-type"],
      accept: req.headers.accept,
    });
  } catch (error) {
    if (String(error.message || "").includes("hosted proxy limit")) {
      json(res, 413, { error: error.message });
      return;
    }
    notConfigured(res, error);
  }
};
