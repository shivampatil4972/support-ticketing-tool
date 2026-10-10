const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  db,
  users,
  reset,
  start,
  stop,
  request,
  storedUploads,
} = require("./helpers");

const fields = {
  title: "Invoice is wrong",
  description: "The attached invoice has the wrong total",
  priority: "medium",
};

const realPdf = {
  name: "invoice.pdf",
  type: "application/pdf",
  content: Buffer.from("%PDF-1.7\n%test file\n"),
};

// A ticket owned by client organization 100
const ticketRow = (attachmentPath) => ({
  id: 5,
  client_id: 100,
  assigned_agent_id: null,
  status: "open",
  sla_due_date: new Date(Date.now() + 3600000),
  attachment_path: attachmentPath,
});

before(start);
after(stop);
beforeEach(() => reset((sql) => (/INSERT INTO/.test(sql) ? { insertId: 5 } : [])));

test("a real PDF is stored and can be downloaded by its owner", async () => {
  const created = await request("POST", "/api/tickets", {
    user: users.client,
    form: { fields, file: realPdf },
  });

  assert.equal(created.status, 201);
  assert.equal(created.json.data.created_by, users.client.id);

  const stored = created.json.data.attachment_path;
  assert.deepEqual(storedUploads(), [stored]);

  reset((sql) => (/FROM tickets t/.test(sql) ? [ticketRow(stored)] : []));

  const download = await request("GET", "/api/tickets/5/attachment", {
    user: users.client,
  });

  assert.equal(download.status, 200);
  assert.equal(download.text, realPdf.content.toString());

  const denied = await request("GET", "/api/tickets/5/attachment", {
    user: users.otherClient,
  });

  assert.equal(denied.status, 403);
});

test("a file whose contents do not match its extension is rejected", async () => {
  const before = storedUploads().length;

  const res = await request("POST", "/api/tickets", {
    user: users.client,
    form: {
      fields,
      file: {
        name: "malware.pdf",
        type: "application/pdf",
        content: Buffer.from("MZ\x90\x00 this is not a pdf"),
      },
    },
  });

  assert.equal(res.status, 400);
  assert.equal(storedUploads().length, before);
  assert.equal(db.calls.filter((c) => /INSERT INTO tickets/.test(c.sql)).length, 0);
});

test("a disallowed file type is rejected", async () => {
  const before = storedUploads().length;

  const res = await request("POST", "/api/tickets", {
    user: users.client,
    form: {
      fields,
      file: { name: "run.exe", type: "application/octet-stream", content: Buffer.from("MZ") },
    },
  });

  assert.equal(res.status, 400);
  assert.equal(storedUploads().length, before);
});

test("the upload is discarded when validation fails", async () => {
  const before = storedUploads().length;

  const res = await request("POST", "/api/tickets", {
    user: users.client,
    form: { fields: { ...fields, title: "" }, file: realPdf },
  });

  assert.equal(res.status, 400);
  assert.equal(storedUploads().length, before);
});

test("the upload is discarded when the reply is forbidden", async () => {
  const before = storedUploads().length;

  reset((sql) => (/FROM tickets t/.test(sql) ? [ticketRow(null)] : []));

  const res = await request("POST", "/api/tickets/5/reply", {
    user: users.otherClient,
    form: { fields: { message: "Let me in" }, file: realPdf },
  });

  assert.equal(res.status, 403);
  assert.equal(storedUploads().length, before);
});
