function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function csv(name) {
  return optional(name)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function firebasePublicConfig() {
  const config = {
    apiKey: required("FIREBASE_API_KEY"),
    authDomain: required("FIREBASE_AUTH_DOMAIN"),
    projectId: required("FIREBASE_PROJECT_ID"),
    appId: required("FIREBASE_APP_ID"),
  };

  const optionalPairs = [
    ["storageBucket", "FIREBASE_STORAGE_BUCKET"],
    ["messagingSenderId", "FIREBASE_MESSAGING_SENDER_ID"],
    ["measurementId", "FIREBASE_MEASUREMENT_ID"],
  ];

  for (const [key, envName] of optionalPairs) {
    const value = optional(envName);
    if (value) {
      config[key] = value;
    }
  }

  return config;
}

function firebaseServiceAccount() {
  const inlineJson = optional("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (inlineJson) {
    return JSON.parse(inlineJson);
  }

  const base64Json = optional("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64");
  if (base64Json) {
    return JSON.parse(Buffer.from(base64Json, "base64").toString("utf8"));
  }

  return {
    projectId: required("FIREBASE_PROJECT_ID"),
    clientEmail: required("FIREBASE_CLIENT_EMAIL"),
    privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

function controlPlaneBaseUrl() {
  return optional("SOROQ_CONTROL_PLANE_BASE_URL", "https://api.soroq.dev");
}

function controlPlaneOperatorToken() {
  return optional("SOROQ_CONTROL_PLANE_OPERATOR_TOKEN", optional("SOROQ_OPERATOR_TOKEN"));
}

module.exports = {
  controlPlaneBaseUrl,
  controlPlaneOperatorToken,
  csv,
  firebasePublicConfig,
  firebaseServiceAccount,
  optional,
  required,
};
