// End-to-end run of the real app against a real MySQL server.
//
//   npm run test:e2e
//
// Uses the connection settings in .env but creates its own throwaway
// database (support_ticketing_e2e_tmp) and drops it afterwards, so the
// real database is never touched. Walks the full workflow for every role.
const fs = require("fs");
const os = require("os");
const path = require("path");

const backend = path.join(__dirname, "..");
const req = (m) => require(path.join(backend, m));

require("dotenv").config({ path: path.join(backend, ".env") });
const mysql = require("mysql2/promise");

const TMP_DB = "support_ticketing_e2e_tmp";
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "ticketing-e2e-"));

process.env.DB_NAME = TMP_DB;
process.env.UPLOAD_DIR = uploadDir;
process.env.NODE_ENV = "test";
process.env.EMAIL_USER = "";
process.env.EMAIL_PASS = "";
process.env.SIGNUP_RATE_LIMIT_MAX = "100";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`);
};

const main = async () => {
  const root = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  let server, pool;

  try {
    await root.query(`DROP DATABASE IF EXISTS ${TMP_DB}; CREATE DATABASE ${TMP_DB}; USE ${TMP_DB};`);

    const schema = fs.readFileSync(path.join(backend, "schema.sql"), "utf8")
      .replace(/CREATE DATABASE[^;]*;/i, "").replace(/USE [^;]*;/i, "");
    await root.query(schema);

    const migrations = fs.readdirSync(path.join(backend, "migrations")).filter((f) => f.endsWith(".sql")).sort();
    for (const file of migrations) {
      await root.query(fs.readFileSync(path.join(backend, "migrations", file), "utf8"));
    }
    check(`schema + ${migrations.length} migrations apply to an empty database`, true);

    pool = req("config/database");
    const app = req("app");
    const { registerUser } = req("services/authService");

    await new Promise((r) => { server = app.listen(0, r); });
    const base = `http://127.0.0.1:${server.address().port}/api`;

    const call = async (method, url, { token, body, form } = {}) => {
      const headers = {};
      let payload;
      if (token) headers.Authorization = `Bearer ${token}`;
      if (form) {
        payload = new FormData();
        for (const [k, v] of Object.entries(form.fields)) payload.append(k, v);
        if (form.file) payload.append("attachment", new Blob([form.file], { type: "application/pdf" }), "doc.pdf");
      } else if (body) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
      }
      const res = await fetch(base + url, { method, headers, body: payload });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* binary */ }
      return { status: res.status, json, text, data: json?.data };
    };

    const login = async (email) => (await call("POST", "/auth/login", { body: { email, password: "secret123" } })).data.token;
    const notes = async (token) => (await call("GET", "/notifications", { token })).data;
    const pdf = Buffer.from("%PDF-1.7\nhello\n");

    // ---------- users ----------
    await registerUser({ name: "Admin", email: "admin@e2e.dev", password: "secret123", role: "admin" });
    const admin = await login("admin@e2e.dev");

    const escalate = await call("POST", "/auth/signup", { body: { name: "Mallory", email: "mal@e2e.dev", password: "secret123", role: "admin" } });
    check("signup with role=admin still creates a client", escalate.status === 201 && escalate.data.role === "client", JSON.stringify(escalate.json));

    for (const [name, email] of [["Agent One", "a1@e2e.dev"], ["Agent Two", "a2@e2e.dev"]]) {
      const r = await call("POST", "/admin/users", { token: admin, body: { name, email, password: "secret123", role: "agent" } });
      check(`admin creates ${name}`, r.status === 201, JSON.stringify(r.json));
    }
    await call("POST", "/auth/signup", { body: { name: "Client A", email: "ca@e2e.dev", password: "secret123" } });
    await call("POST", "/auth/signup", { body: { name: "Client B", email: "cb@e2e.dev", password: "secret123" } });

    const [a1, a2, ca, cb] = await Promise.all(["a1@e2e.dev", "a2@e2e.dev", "ca@e2e.dev", "cb@e2e.dev"].map(login));
    const badRole = await call("PUT", "/admin/users/2", { token: admin, body: { role: "superuser" } });
    check("admin user update rejects invalid role", badRole.status === 400);

    // ---------- create ----------
    const created = await call("POST", "/tickets", { token: ca, form: { fields: { title: "Printer on fire", description: "It is very much on fire", priority: "urgent" }, file: pdf } });
    check("client creates ticket with PDF", created.status === 201 && created.data.attachment_path, JSON.stringify(created.json));
    const id = created.data.id;

    const fake = await call("POST", "/tickets", { token: ca, form: { fields: { title: "Fake file", description: "This is not really a pdf", priority: "low" }, file: Buffer.from("MZ not a pdf") } });
    check("fake PDF rejected and not stored", fake.status === 400 && fs.readdirSync(uploadDir).length === 1, `${fake.status} files=${fs.readdirSync(uploadDir).length}`);

    check("admin notified of new ticket", (await notes(admin)).notifications.some((n) => n.type === "ticket_created" && n.ticket_id === id));

    // ---------- lists and filters ----------
    const unassigned = await call("GET", "/tickets/unassigned?sort=priority", { token: a1 });
    check("agent sees ticket in unassigned queue", unassigned.status === 200 && unassigned.data.tickets.some((t) => t.id === id));
    for (const qs of ["status=open&priority=urgent&sort=due", "sla=overdue&sort=oldest", "search=Printer&sort=priority", "status=closed"]) {
      const r = await call("GET", `/tickets?${qs}`, { token: admin });
      check(`list filter ${qs}`, r.status === 200, JSON.stringify(r.json));
    }
    const filtered = await call("GET", "/tickets?status=closed", { token: admin });
    check("status=closed filter excludes the open ticket", filtered.data.pagination.total === 0);
    const mine = await call("GET", "/tickets", { token: cb });
    check("client B's list does not include client A's ticket", mine.data.pagination.total === 0);

    // ---------- claim ----------
    const claim1 = await call("POST", `/tickets/${id}/claim`, { token: a1 });
    const claim2 = await call("POST", `/tickets/${id}/claim`, { token: a2 });
    check("agent one claims the ticket", claim1.status === 200, JSON.stringify(claim1.json));
    check("agent two's claim is a 409 conflict", claim2.status === 409, String(claim2.status));
    check("agent two cannot view agent one's ticket", (await call("GET", `/tickets/${id}`, { token: a2 })).status === 403);

    // ---------- access control ----------
    check("client B cannot view the ticket", (await call("GET", `/tickets/${id}`, { token: cb })).status === 403);
    check("client B cannot reply", (await call("POST", `/tickets/${id}/reply`, { token: cb, body: { message: "hi" } })).status === 403);
    check("client B cannot download attachment", (await call("GET", `/tickets/${id}/attachment`, { token: cb })).status === 403);
    check("client B cannot reopen", (await call("POST", `/tickets/${id}/reopen`, { token: cb })).status === 403);
    const dl = await call("GET", `/tickets/${id}/attachment`, { token: ca });
    check("client A downloads the attachment", dl.status === 200 && dl.text === pdf.toString());

    // ---------- replies ----------
    const reply = await call("POST", `/tickets/${id}/reply`, { token: a1, form: { fields: { message: "Looking into it" }, file: pdf } });
    check("agent replies with attachment", reply.status === 201, JSON.stringify(reply.json));
    const cdl = await call("GET", `/tickets/${id}/comments/${reply.data.id}/attachment`, { token: ca });
    check("client A downloads the reply attachment", cdl.status === 200 && cdl.text === pdf.toString(), String(cdl.status));
    check("client A notified of reply", (await notes(ca)).notifications.some((n) => n.type === "reply"));

    const note = await call("POST", `/tickets/${id}/internal-note`, { token: a1, form: { fields: { message: "Customer is upset" }, file: pdf } });
    check("agent adds internal note", note.status === 201);
    const clientView = await call("GET", `/tickets/${id}`, { token: ca });
    check("client cannot see the internal note", clientView.data.comments.length === 1 && !clientView.data.comments.some((c) => c.is_internal));
    check("client cannot download internal note attachment", (await call("GET", `/tickets/${id}/comments/${note.data.id}/attachment`, { token: ca })).status === 404);
    check("first response time recorded", clientView.data.ticket.first_response_at !== null);
    check("creator name shown", clientView.data.ticket.clientName === "Client A" && clientView.data.ticket.agentName === "Agent One", JSON.stringify([clientView.data.ticket.clientName, clientView.data.ticket.agentName]));
    check("comment role returned", clientView.data.comments[0].role === "agent");

    // ---------- status rules ----------
    check("agent sets pending", (await call("PATCH", `/tickets/${id}/status`, { token: a1, body: { status: "pending" } })).status === 200);
    const cr = await call("POST", `/tickets/${id}/reply`, { token: ca, body: { message: "Here is more info" } });
    check("client reply moves pending back to open", cr.status === 201 && cr.data.ticket_status === "open", JSON.stringify(cr.json));
    check("agent notified of client reply", (await notes(a1)).notifications.some((n) => n.type === "reply"));

    // ---------- reassign / unassign ----------
    const agents = (await call("GET", "/admin/users", { token: admin })).data.filter((u) => u.role === "agent");
    const agentTwoId = agents.find((u) => u.email === "a2@e2e.dev").id;
    const re = await call("PATCH", `/tickets/${id}/assign`, { token: admin, body: { assigned_agent_id: agentTwoId } });
    check("admin reassigns to agent two", re.status === 200 && re.data.assigned_agent_id === agentTwoId, JSON.stringify(re.json));
    check("agent one loses access after reassignment", (await call("GET", `/tickets/${id}`, { token: a1 })).status === 403);
    check("agent two notified of assignment", (await notes(a2)).notifications.some((n) => n.type === "assigned"));
    check("agent one notified of unassignment", (await notes(a1)).notifications.some((n) => n.type === "unassigned" && n.ticket_id === null));
    const un = await call("PATCH", `/tickets/${id}/assign`, { token: admin, body: { assigned_agent_id: null } });
    check("admin unassigns", un.status === 200 && un.data.assigned_agent_id === null, JSON.stringify(un.json));
    check("agent two claims it back", (await call("POST", `/tickets/${id}/claim`, { token: a2 })).status === 200);

    // ---------- close / reopen ----------
    check("agent one can no longer change status", (await call("PATCH", `/tickets/${id}/status`, { token: a1, body: { status: "closed" } })).status === 403);
    check("agent two closes", (await call("PATCH", `/tickets/${id}/status`, { token: a2, body: { status: "closed" } })).status === 200);
    const closed = await call("GET", `/tickets/${id}`, { token: ca });
    check("closed ticket has closed_at and can be reopened", closed.data.ticket.closed_at !== null && closed.data.ticket.can_reopen === true && closed.data.ticket.sla_status === "Resolved", JSON.stringify(closed.data.ticket));
    check("client notified of status change", (await notes(ca)).notifications.some((n) => n.type === "status_changed"));
    check("client cannot reply while closed", (await call("POST", `/tickets/${id}/reply`, { token: ca, body: { message: "wait" } })).status === 400);

    const perf = await call("GET", "/admin/performance", { token: admin });
    const p2 = perf.data?.agents.find((a) => a.email === "a2@e2e.dev");
    check("performance report", perf.status === 200 && p2 && p2.closedTickets === 1 && p2.slaHitRate === 100 && p2.avgFirstResponseMinutes !== null && perf.data.overall.totalTickets === 1, JSON.stringify(perf.json));

    const reopened = await call("POST", `/tickets/${id}/reopen`, { token: ca });
    check("client reopens", reopened.status === 200 && reopened.data.status === "open", JSON.stringify(reopened.json));
    const after = await call("GET", `/tickets/${id}`, { token: ca });
    check("reopened ticket is open with closed_at cleared", after.data.ticket.status === "open" && after.data.ticket.closed_at === null);
    check("agent notified of reopen", (await notes(a2)).notifications.some((n) => n.type === "reopened"));

    // ---------- timeline ----------
    const types = after.data.events.map((e) => e.type).join(",");
    check("audit timeline in order", types === "created,claimed,status_changed,status_changed,assigned,unassigned,claimed,status_changed,reopened", types);
    check("timeline names the actor", after.data.events[0].userName === "Client A" && after.data.events[4].from_value === "Agent One" && after.data.events[4].to_value === "Agent Two");

    // ---------- notifications ----------
    const before = await notes(ca);
    const one = await call("PATCH", `/notifications/${before.notifications[0].id}/read`, { token: ca });
    const foreign = await call("PATCH", `/notifications/${before.notifications[0].id}/read`, { token: cb });
    check("mark one notification read", one.status === 200 && (await notes(ca)).unreadCount === before.unreadCount - 1);
    check("cannot mark someone else's notification", foreign.status === 404, String(foreign.status));
    await call("PATCH", "/notifications/read-all", { token: ca });
    check("mark all read", (await notes(ca)).unreadCount === 0);

    // ---------- dashboards / delete ----------
    for (const [url, token] of [["/admin/dashboard", admin], ["/tickets/dashboard", a2], ["/tickets/client-dashboard", ca], ["/tickets/assigned?sort=due", a2]]) {
      check(`GET ${url}`, (await call("GET", url, { token })).status === 200);
    }
    check("admin deletes ticket", (await call("DELETE", `/tickets/${id}`, { token: admin })).status === 200);
    check("deleted ticket is gone", (await call("GET", `/tickets/${id}`, { token: admin })).status === 404);
    check("non-numeric id rejected", (await call("GET", "/tickets/abc", { token: admin })).status === 400);
  } catch (e) {
    failures++;
    console.log("CRASHED:", e.stack || e.message);
  } finally {
    if (server) { server.closeAllConnections(); await new Promise((r) => server.close(r)); }
    if (pool) await pool.end().catch(() => {});
    await root.query(`DROP DATABASE IF EXISTS ${TMP_DB}`);
    await root.end();
    fs.rmSync(uploadDir, { recursive: true, force: true });
    console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED (temporary database dropped)");
    if (failures) process.exitCode = 1;
  }
};

main();
