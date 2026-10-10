const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

// Must be set before the app loads; each test file runs in its own process
process.env.SIGNUP_RATE_LIMIT_MAX = "2";

const { reset, start, stop, request } = require("./helpers");

before(start);
after(stop);

test("signup is rate limited per client", async () => {
  reset((sql) => (/INSERT INTO/.test(sql) ? { insertId: 1 } : []));

  const signup = (n) =>
    request("POST", "/api/auth/signup", {
      body: { name: "Spammer", email: `spam${n}@test.dev`, password: "secret123" },
    });

  assert.equal((await signup(1)).status, 201);
  assert.equal((await signup(2)).status, 201);

  const blocked = await signup(3);

  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.success, false);
});
