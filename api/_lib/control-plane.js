const { controlPlaneBaseUrl, controlPlaneOperatorToken } = require("./env");
const { json } = require("./http");

function upstreamUrl(path) {
  return new URL(path, `${controlPlaneBaseUrl().replace(/\/+$/, "")}/`).toString();
}

function controlPlaneHeaders(options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
  };
  const operatorToken = controlPlaneOperatorToken();
  if (operatorToken) {
    headers.Authorization = `Bearer ${operatorToken}`;
  }
  const operatorEmail = (options.operator?.email || "").trim().toLowerCase();
  if (operatorEmail) {
    headers["X-Soroq-Operator-Email"] = operatorEmail;
  }

  return headers;
}

async function readJSONResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    return { raw: text };
  }
}

async function fetchJSON(path, options = {}) {
  const response = await fetch(upstreamUrl(path), {
    method: options.method || "GET",
    headers: controlPlaneHeaders(options),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = await readJSONResponse(response);
  if (!response.ok) {
    const error = new Error(`Control plane returned HTTP ${response.status}.`);
    error.statusCode = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

function errorText(error) {
  const parts = [];
  if (error && typeof error === "object") {
    const body = error.body;
    if (body && typeof body === "object") {
      for (const key of ["error", "detail", "message", "raw"]) {
        const value = body[key];
        if (typeof value === "string" && value.trim()) {
          parts.push(value.trim());
        }
      }
    }
    if (typeof error.message === "string" && error.message.trim()) {
      parts.push(error.message.trim());
    }
  }
  return parts.join(" ");
}

function isOperatorScopeDenied(error) {
  return (
    error &&
    typeof error === "object" &&
    error.statusCode === 403 &&
    /operator\b.*\bnot allowed|not allowlisted|not eligible/i.test(errorText(error))
  );
}

async function forwardJSON(res, path, options = {}) {
  const headers = controlPlaneHeaders(options);

  const response = await fetch(upstreamUrl(path), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  json(res, response.status, await readJSONResponse(response));
}

async function forwardRaw(res, path, options = {}) {
  const headers = {
    Accept: options.accept || "application/json",
    ...(options.contentType ? { "Content-Type": options.contentType } : {}),
    ...(options.range ? { Range: options.range } : {}),
  };
  const operatorToken = controlPlaneOperatorToken();
  if (operatorToken) {
    headers.Authorization = `Bearer ${operatorToken}`;
  }
  const operatorEmail = (options.operator?.email || "").trim().toLowerCase();
  if (operatorEmail) {
    headers["X-Soroq-Operator-Email"] = operatorEmail;
  }

  const response = await fetch(upstreamUrl(path), {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  for (const header of [
    "accept-ranges",
    "cache-control",
    "content-disposition",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ]) {
    const value = response.headers.get(header);
    if (value) {
      res.setHeader(header, value);
    }
  }
  res.statusCode = response.status;
  const bytes = Buffer.from(await response.arrayBuffer());
  res.end(bytes);
}

module.exports = {
  fetchJSON,
  forwardJSON,
  forwardRaw,
  isOperatorScopeDenied,
  upstreamUrl,
};
