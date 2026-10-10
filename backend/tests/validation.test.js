const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const { db, users, reset, start, stop, request } = require("./helpers");

before(start);
after(stop);
beforeEach(() => reset(() => ({ affectedRows: 1 })));

test("non-numeric ticket ids are rejected before reaching the database", async () => {
  const res = await request("GET", "/api/tickets/abc", { user: users.admin });

  assert.equal(res.status, 400);
  assert.equal(db.calls.filter((c) => /FROM tickets/.test(c.sql)).length, 0);
});

test("non-numeric user ids are rejected", async () => {
  const res = await request("DELETE", "/api/admin/users/1;drop", {
    user: users.admin,
  });

  assert.equal(res.status, 400);
});

test("admin user update rejects an invalid role", async () => {
  const res = await request("PUT", "/api/admin/users/10", {
    user: users.admin,
    body: { role: "superuser" },
  });

  assert.equal(res.status, 400);
  assert.equal(db.calls.filter((c) => /UPDATE users/.test(c.sql)).length, 0);
});

test("admin user update rejects an invalid email", async () => {
  const res = await request("PUT", "/api/admin/users/10", {
    user: users.admin,
    body: { email: "not-an-email" },
  });

  assert.equal(res.status, 400);
});

test("admin user update accepts valid fields and normalizes the email", async () => {
  const res = await request("PUT", "/api/admin/users/10", {
    user: users.admin,
    body: { name: "New Name", email: "New@Test.dev", role: "agent" },
  });

  assert.equal(res.status, 200);

  const [update] = db.calls.filter((c) => /UPDATE users/.test(c.sql));
  assert.ok(update.params.includes("new@test.dev"));
});

test("admin user creation requires a role", async () => {
  const res = await request("POST", "/api/admin/users", {
    user: users.admin,
    body: { name: "No Role", email: "norole@test.dev", password: "secret123" },
  });

  assert.equal(res.status, 400);
});

test("non-admins cannot update users", async () => {
  const res = await request("PUT", "/api/admin/users/10", {
    user: users.agent,
    body: { role: "admin" },
  });

  assert.equal(res.status, 403);
});
