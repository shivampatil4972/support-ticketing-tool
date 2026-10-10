// Test harness: runs the real Express app against a fake database pool.

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
// Keep sendEmail in its "not configured" branch
process.env.EMAIL_USER = "";
process.env.EMAIL_PASS = "";

const fs = require("fs");
const os = require("os");
const path = require("path");
const jwt = require("jsonwebtoken");

// Uploads go to a throwaway directory, never the real backend/uploads
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "ticketing-test-"));
process.env.UPLOAD_DIR = uploadDir;

const databasePath = require.resolve("../config/database");

// Each test sets `db.handler` to answer queries: (sql, params) => rows
const db = {
  calls: [],
  handler: () => [],
};

const run = async (sql, params = []) => {
  db.calls.push({ sql, params });
  return [await db.handler(sql, params)];
};

require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: { execute: run, query: run },
};

const app = require("../app");

const users = {
  admin: { id: 1, name: "Admin", email: "admin@test.dev", role: "admin", client_id: null, is_active: 1 },
  agent: { id: 2, name: "Agent", email: "agent@test.dev", role: "agent", client_id: null, is_active: 1 },
  otherAgent: { id: 3, name: "Agent Two", email: "agent2@test.dev", role: "agent", client_id: null, is_active: 1 },
  client: { id: 10, name: "Client A", email: "a@test.dev", role: "client", client_id: 100, is_active: 1 },
  otherClient: { id: 11, name: "Client B", email: "b@test.dev", role: "client", client_id: 200, is_active: 1 },
};

const tokenFor = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

// Answers the auth middleware's user lookup, defers everything else
const withUsers = (handler) => (sql, params) => {
  if (/FROM users WHERE id = \?/.test(sql)) {
    return Object.values(users).filter((user) => user.id === params[0]);
  }

  return handler(sql, params);
};

const reset = (handler = () => []) => {
  db.calls = [];
  db.handler = withUsers(handler);
};

let server;
let baseUrl;

const start = () =>
  new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

const stop = () =>
  new Promise((resolve) => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
    server.closeAllConnections();
    server.close(resolve);
  });

// `body` is sent as JSON; `form` (fields plus an optional file) as multipart
const request = async (method, url, { user, body, form } = {}) => {
  const headers = {};
  let payload;

  if (user) headers.Authorization = `Bearer ${tokenFor(user)}`;

  if (form) {
    payload = new FormData();

    for (const [key, value] of Object.entries(form.fields || {})) {
      payload.append(key, value);
    }

    if (form.file) {
      payload.append(
        "attachment",
        new Blob([form.file.content], { type: form.file.type }),
        form.file.name,
      );
    }
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(baseUrl + url, {
    method,
    headers,
    body: payload,
  });

  const text = await response.text();

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Not a JSON response
  }

  return { status: response.status, json, text };
};

const storedUploads = () => fs.readdirSync(uploadDir);

module.exports = { db, users, reset, start, stop, request, storedUploads };
