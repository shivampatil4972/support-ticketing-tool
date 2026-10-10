const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const { db, users, reset, start, stop, request } = require("./helpers");

// A ticket owned by client organization 100, assigned to agent 2
const ticket = {
  id: 5,
  title: "Printer on fire",
  description: "It is very much on fire",
  attachment_path: null,
  priority: "high",
  status: "open",
  client_id: 100,
  assigned_agent_id: 2,
  sla_due_date: new Date(Date.now() + 3600000),
  organization_name: "Org A",
};

const ticketHandler = (sql) => {
  if (/FROM tickets t/.test(sql)) return [ticket];
  if (/INSERT INTO comments/.test(sql)) return { insertId: 77 };
  return [];
};

const inserts = (table) =>
  db.calls.filter((call) => new RegExp(`INSERT INTO ${table}`).test(call.sql));

before(start);
after(stop);
beforeEach(() => reset(ticketHandler));

// ==============================
// Signup
// ==============================

test("signup ignores a requested role and creates a client", async () => {
  reset((sql) => (/INSERT INTO/.test(sql) ? { insertId: 42 } : []));

  const res = await request("POST", "/api/auth/signup", {
    body: {
      name: "Mallory",
      email: "mallory@test.dev",
      password: "secret123",
      role: "admin",
      client_id: 100,
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.json.data.role, "client");

  const [userInsert] = inserts("users");
  assert.ok(userInsert.params.includes("client"));
  assert.ok(!userInsert.params.includes("admin"));

  // Gets a fresh organization rather than joining organization 100
  assert.equal(inserts("clients").length, 1);
  assert.equal(res.json.data.client_id, 42);
});

// ==============================
// Authentication
// ==============================

test("ticket routes require a token", async () => {
  const res = await request("GET", "/api/tickets/5");

  assert.equal(res.status, 401);
});

test("uploads are not served without authentication", async () => {
  const res = await request("GET", "/uploads/anything.pdf");

  assert.equal(res.status, 404);
});

// ==============================
// Ticket access
// ==============================

test("client can view a ticket of their own organization", async () => {
  const res = await request("GET", "/api/tickets/5", { user: users.client });

  assert.equal(res.status, 200);
  assert.equal(res.json.data.ticket.id, 5);
});

test("client cannot view another organization's ticket", async () => {
  const res = await request("GET", "/api/tickets/5", {
    user: users.otherClient,
  });

  assert.equal(res.status, 403);
});

test("agent cannot view a ticket assigned to another agent", async () => {
  const res = await request("GET", "/api/tickets/5", {
    user: users.otherAgent,
  });

  assert.equal(res.status, 403);
});

// ==============================
// Replies
// ==============================

test("client can reply to their own ticket", async () => {
  const res = await request("POST", "/api/tickets/5/reply", {
    user: users.client,
    body: { message: "Any update?" },
  });

  assert.equal(res.status, 201);
  assert.equal(inserts("comments").length, 1);
});

test("client cannot reply to another organization's ticket", async () => {
  const res = await request("POST", "/api/tickets/5/reply", {
    user: users.otherClient,
    body: { message: "Let me in" },
  });

  assert.equal(res.status, 403);
  assert.equal(res.json.data, null);
  assert.equal(inserts("comments").length, 0);
});

test("agent cannot reply to a ticket assigned to another agent", async () => {
  const res = await request("POST", "/api/tickets/5/reply", {
    user: users.otherAgent,
    body: { message: "Not mine" },
  });

  assert.equal(res.status, 403);
  assert.equal(inserts("comments").length, 0);
});

test("client cannot add an internal note", async () => {
  const res = await request("POST", "/api/tickets/5/internal-note", {
    user: users.client,
    body: { message: "Sneaky" },
  });

  assert.equal(res.status, 403);
  assert.equal(inserts("comments").length, 0);
});

// ==============================
// Attachments
// ==============================

test("client cannot download another organization's attachment", async () => {
  const res = await request("GET", "/api/tickets/5/attachment", {
    user: users.otherClient,
  });

  assert.equal(res.status, 403);
});

test("client cannot download an internal note's attachment", async () => {
  reset((sql) => {
    if (/FROM comments/.test(sql)) {
      return [{ attachment_path: "note.pdf", is_internal: 1 }];
    }

    return ticketHandler(sql);
  });

  const res = await request("GET", "/api/tickets/5/comments/9/attachment", {
    user: users.client,
  });

  assert.equal(res.status, 404);
});

// ==============================
// Status and assignment
// ==============================

test("status update succeeds when the organization has no client user", async () => {
  const res = await request("PATCH", "/api/tickets/5/status", {
    user: users.admin,
    body: { status: "closed" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.json.data.status, "closed");
});

test("status update rejects an unknown status", async () => {
  const res = await request("PATCH", "/api/tickets/5/status", {
    user: users.admin,
    body: { status: "banana" },
  });

  assert.equal(res.status, 400);
});

test("agent cannot assign tickets", async () => {
  const res = await request("PATCH", "/api/tickets/5/assign", {
    user: users.agent,
    body: { assigned_agent_id: 2 },
  });

  assert.equal(res.status, 403);
});

// ==============================
// Listing
// ==============================

test("ticket list caps the page size", async () => {
  reset((sql) => (/COUNT\(\*\) AS total/.test(sql) ? [{ total: 0 }] : []));

  const res = await request("GET", "/api/tickets?limit=100000", {
    user: users.admin,
  });

  assert.equal(res.status, 200);
  assert.equal(res.json.data.pagination.limit, 100);
});

test("unexpected errors do not leak details", async () => {
  reset(() => {
    throw new Error("ER_SECRET: SELECT password FROM users");
  });

  const res = await request("POST", "/api/auth/login", {
    body: { email: "a@test.dev", password: "whatever" },
  });

  assert.equal(res.status, 500);
  assert.equal(res.json.message, "Login failed");
});
