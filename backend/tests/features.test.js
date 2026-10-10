const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const { db, users, reset, start, stop, request } = require("./helpers");

const hours = (n) => n * 3600000;

// A ticket owned by client organization 100, created by client 10
const baseTicket = {
  id: 5,
  title: "Printer on fire",
  priority: "high",
  status: "open",
  client_id: 100,
  created_by: 10,
  assigned_agent_id: 2,
  agentName: "Agent",
  first_response_at: null,
  closed_at: null,
  sla_due_date: new Date(Date.now() + hours(1)),
};

// Serves `ticket` for ticket lookups and reports writes as successful
const serve = (ticket, overrides = () => undefined) =>
  reset((sql, params) => {
    const custom = overrides(sql, params);
    if (custom !== undefined) return custom;

    if (/^\s*(INSERT|UPDATE)/.test(sql)) return { insertId: 77, affectedRows: 1 };
    if (/FROM tickets t/.test(sql)) return [ticket];
    return [];
  });

const calls = (pattern) => db.calls.filter((call) => pattern.test(call.sql));

const events = () => calls(/INSERT INTO ticket_events/).map((c) => c.params);

// Flattened [userId, ticketId, type, message, date] rows of bulk inserts
const notifications = () =>
  calls(/INSERT INTO notifications/).flatMap((c) => c.params[0]);

before(start);
after(stop);
beforeEach(() => serve(baseTicket));

// ==============================
// Claim
// ==============================

test("agent can claim an unassigned ticket", async () => {
  const res = await request("POST", "/api/tickets/5/claim", { user: users.agent });

  assert.equal(res.status, 200);
  assert.equal(res.json.data.assigned_agent_id, users.agent.id);

  const [update] = calls(/UPDATE tickets/);
  assert.match(update.sql, /assigned_agent_id IS NULL/);
  assert.equal(events()[0][2], "claimed");
});

test("claiming a ticket someone else already has is a conflict", async () => {
  serve(baseTicket, (sql) =>
    /UPDATE tickets/.test(sql) ? { affectedRows: 0 } : undefined,
  );

  const res = await request("POST", "/api/tickets/5/claim", {
    user: users.otherAgent,
  });

  assert.equal(res.status, 409);
  assert.equal(events().length, 0);
});

test("only agents can claim tickets", async () => {
  const res = await request("POST", "/api/tickets/5/claim", { user: users.admin });

  assert.equal(res.status, 403);
});

// ==============================
// Assign, reassign, unassign
// ==============================

test("admin can reassign a ticket and both agents are notified", async () => {
  serve(baseTicket, (sql) =>
    /FROM users\s+WHERE id = \?\s+AND role = 'agent'/.test(sql)
      ? [{ id: 3, name: "Agent Two", email: "agent2@test.dev" }]
      : undefined,
  );

  const res = await request("PATCH", "/api/tickets/5/assign", {
    user: users.admin,
    body: { assigned_agent_id: 3 },
  });

  assert.equal(res.status, 200);
  assert.equal(res.json.data.assigned_agent_id, 3);

  const [event] = events();
  assert.deepEqual(event.slice(2), ["assigned", "Agent", "Agent Two"]);

  const notified = notifications().map((row) => [row[0], row[2]]);
  assert.deepEqual(notified, [[3, "assigned"], [2, "unassigned"]]);
});

test("admin can unassign a ticket", async () => {
  const res = await request("PATCH", "/api/tickets/5/assign", {
    user: users.admin,
    body: { assigned_agent_id: null },
  });

  assert.equal(res.status, 200);
  assert.equal(res.json.data.assigned_agent_id, null);
  assert.equal(events()[0][2], "unassigned");
});

test("assign requires assigned_agent_id to be present", async () => {
  const res = await request("PATCH", "/api/tickets/5/assign", {
    user: users.admin,
    body: {},
  });

  assert.equal(res.status, 400);
});

// ==============================
// Filters and sorting
// ==============================

test("ticket list applies status, priority, overdue filters and sorting", async () => {
  reset((sql) => (/COUNT\(\*\) AS total/.test(sql) ? [{ total: 0 }] : []));

  const res = await request(
    "GET",
    "/api/tickets?status=open&priority=urgent&sla=overdue&sort=due",
    { user: users.admin },
  );

  assert.equal(res.status, 200);

  const [listQuery] = calls(/LIMIT \? OFFSET \?/);
  assert.match(listQuery.sql, /t\.status = \?/);
  assert.match(listQuery.sql, /t\.priority = \?/);
  assert.match(listQuery.sql, /t\.sla_due_date < UTC_TIMESTAMP\(\)/);
  assert.match(listQuery.sql, /ORDER BY t\.status = 'closed' ASC, t\.sla_due_date ASC/);
  assert.deepEqual(listQuery.params.slice(0, 2), ["open", "urgent"]);
});

test("unknown filter and sort values are ignored, not injected", async () => {
  reset((sql) => (/COUNT\(\*\) AS total/.test(sql) ? [{ total: 0 }] : []));

  const res = await request(
    "GET",
    "/api/tickets?status=hacked&sort=" + encodeURIComponent("id; DROP TABLE users"),
    { user: users.admin },
  );

  assert.equal(res.status, 200);

  const [listQuery] = calls(/LIMIT \? OFFSET \?/);
  assert.doesNotMatch(listQuery.sql, /DROP/);
  assert.match(listQuery.sql, /ORDER BY t\.created_at DESC/);
  assert.ok(!listQuery.params.includes("hacked"));
});

// ==============================
// Audit timeline
// ==============================

test("ticket details include the event timeline", async () => {
  serve(baseTicket, (sql) =>
    /FROM ticket_events/.test(sql)
      ? [{ id: 1, type: "created", userName: "Client A" }]
      : undefined,
  );

  const res = await request("GET", "/api/tickets/5", { user: users.client });

  assert.equal(res.status, 200);
  assert.equal(res.json.data.events[0].type, "created");
});

test("status change is recorded and the client is notified", async () => {
  const res = await request("PATCH", "/api/tickets/5/status", {
    user: users.agent,
    body: { status: "closed" },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(events()[0].slice(2), ["status_changed", "open", "closed"]);
  assert.deepEqual(notifications().map((row) => row[0]), [users.client.id]);
});

test("setting the same status again records nothing", async () => {
  const res = await request("PATCH", "/api/tickets/5/status", {
    user: users.agent,
    body: { status: "open" },
  });

  assert.equal(res.status, 200);
  assert.equal(events().length, 0);
  assert.equal(notifications().length, 0);
});

// ==============================
// Reopen and status rules
// ==============================

test("client can reopen a recently closed ticket", async () => {
  serve({ ...baseTicket, status: "closed", closed_at: new Date(Date.now() - hours(24)) });

  const res = await request("POST", "/api/tickets/5/reopen", { user: users.client });

  assert.equal(res.status, 200);
  assert.equal(res.json.data.status, "open");
  assert.equal(events()[0][2], "reopened");
  assert.deepEqual(notifications().map((row) => row[0]), [users.agent.id]);
});

test("client cannot reopen a ticket closed long ago", async () => {
  serve({ ...baseTicket, status: "closed", closed_at: new Date(Date.now() - hours(24 * 30)) });

  const res = await request("POST", "/api/tickets/5/reopen", { user: users.client });

  assert.equal(res.status, 400);
  assert.equal(calls(/UPDATE tickets/).length, 0);
});

test("admin can reopen a ticket closed long ago", async () => {
  serve({ ...baseTicket, status: "closed", closed_at: new Date(Date.now() - hours(24 * 30)) });

  const res = await request("POST", "/api/tickets/5/reopen", { user: users.admin });

  assert.equal(res.status, 200);
});

test("client cannot reopen another organization's ticket", async () => {
  serve({ ...baseTicket, status: "closed", closed_at: new Date() });

  const res = await request("POST", "/api/tickets/5/reopen", {
    user: users.otherClient,
  });

  assert.equal(res.status, 403);
});

test("an open ticket cannot be reopened", async () => {
  const res = await request("POST", "/api/tickets/5/reopen", { user: users.client });

  assert.equal(res.status, 400);
});

test("client cannot reply to a closed ticket", async () => {
  serve({ ...baseTicket, status: "closed", closed_at: new Date() });

  const res = await request("POST", "/api/tickets/5/reply", {
    user: users.client,
    body: { message: "One more thing" },
  });

  assert.equal(res.status, 400);
  assert.equal(calls(/INSERT INTO comments/).length, 0);
});

test("a client reply moves a pending ticket back to open", async () => {
  serve({ ...baseTicket, status: "pending" });

  const res = await request("POST", "/api/tickets/5/reply", {
    user: users.client,
    body: { message: "Here is the info you asked for" },
  });

  assert.equal(res.status, 201);
  assert.equal(res.json.data.ticket_status, "open");
  assert.deepEqual(events()[0].slice(2), ["status_changed", "pending", "open"]);
});

test("the first staff reply records the first response time", async () => {
  const res = await request("POST", "/api/tickets/5/reply", {
    user: users.agent,
    body: { message: "Looking into it" },
  });

  assert.equal(res.status, 201);
  assert.equal(calls(/SET first_response_at/).length, 1);
});

test("an internal note does not count as a first response", async () => {
  const res = await request("POST", "/api/tickets/5/internal-note", {
    user: users.agent,
    body: { message: "Customer seems confused" },
  });

  assert.equal(res.status, 201);
  assert.equal(calls(/SET first_response_at/).length, 0);
});

// ==============================
// Notifications
// ==============================

test("a client reply notifies the assigned agent", async () => {
  await request("POST", "/api/tickets/5/reply", {
    user: users.client,
    body: { message: "Any update?" },
  });

  assert.deepEqual(notifications().map((row) => [row[0], row[2]]), [
    [users.agent.id, "reply"],
  ]);
});

test("an internal note never notifies the client", async () => {
  await request("POST", "/api/tickets/5/internal-note", {
    user: users.admin,
    body: { message: "Escalating this" },
  });

  const recipients = notifications().map((row) => row[0]);

  assert.deepEqual(recipients, [users.agent.id]);
});

test("a new ticket notifies the admins", async () => {
  serve(baseTicket, (sql) =>
    /WHERE role = 'admin'/.test(sql) ? [{ id: users.admin.id }] : undefined,
  );

  const res = await request("POST", "/api/tickets", {
    user: users.client,
    body: {
      title: "Cannot log in",
      description: "The login page rejects my password",
      priority: "urgent",
    },
  });

  assert.equal(res.status, 201);
  assert.equal(events()[0][2], "created");
  assert.deepEqual(notifications().map((row) => row[0]), [users.admin.id]);
});

test("users only read and update their own notifications", async () => {
  reset((sql) => {
    if (/COUNT\(\*\) AS unreadCount/.test(sql)) return [{ unreadCount: 1 }];
    if (/FROM notifications/.test(sql)) return [{ id: 9, message: "Hi", is_read: 0 }];
    return { affectedRows: 1 };
  });

  const list = await request("GET", "/api/notifications", { user: users.client });

  assert.equal(list.status, 200);
  assert.equal(list.json.data.unreadCount, 1);
  assert.ok(calls(/FROM notifications/).every((c) => c.params[0] === users.client.id));

  await request("PATCH", "/api/notifications/9/read", { user: users.client });

  const [update] = calls(/UPDATE notifications/);
  assert.match(update.sql, /user_id = \?/);
  assert.deepEqual(update.params, ["9", users.client.id]);
});

test("notifications require authentication", async () => {
  const res = await request("GET", "/api/notifications");

  assert.equal(res.status, 401);
});

// ==============================
// Performance dashboard
// ==============================

test("performance report computes averages and SLA hit rate", async () => {
  const metrics = {
    totalTickets: 10,
    activeTickets: 2,
    closedTickets: 8,
    overdueTickets: 1,
    avgFirstResponseMinutes: "42.6000",
    avgResolutionMinutes: null,
    closedWithinSla: 6,
  };

  reset((sql) => {
    if (/FROM users u/.test(sql)) {
      return [{ id: 2, name: "Agent", email: "agent@test.dev", ...metrics }];
    }

    if (/FROM tickets t/.test(sql)) return [{ ...metrics, unassignedTickets: 3 }];

    return [];
  });

  const res = await request("GET", "/api/admin/performance", { user: users.admin });

  assert.equal(res.status, 200);

  const [agent] = res.json.data.agents;
  assert.equal(agent.avgFirstResponseMinutes, 43);
  assert.equal(agent.avgResolutionMinutes, null);
  assert.equal(agent.slaHitRate, 75);
  assert.equal(res.json.data.overall.unassignedTickets, 3);
});

test("only admins can view the performance report", async () => {
  const res = await request("GET", "/api/admin/performance", { user: users.agent });

  assert.equal(res.status, 403);
});
