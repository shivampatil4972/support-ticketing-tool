const { test } = require("node:test");
const assert = require("node:assert/strict");

const { calculateSlaDueDate, formatSlaStatus } = require("../utils/sla");

const hoursFromNow = (mysqlDate) =>
  (new Date(`${mysqlDate.replace(" ", "T")}Z`) - Date.now()) / 3600000;

test("SLA due date follows ticket priority", () => {
  assert.ok(Math.abs(hoursFromNow(calculateSlaDueDate("urgent")) - 4) < 0.01);
  assert.ok(Math.abs(hoursFromNow(calculateSlaDueDate("high")) - 24) < 0.01);
  assert.ok(Math.abs(hoursFromNow(calculateSlaDueDate("medium")) - 72) < 0.01);
  assert.ok(Math.abs(hoursFromNow(calculateSlaDueDate("low")) - 168) < 0.01);
});

test("SLA status reflects due date and ticket status", () => {
  const past = new Date(Date.now() - 60000);
  const future = new Date(Date.now() + 60000);

  assert.equal(formatSlaStatus(past, "open"), "OVERDUE");
  assert.equal(formatSlaStatus(future, "pending"), "ON TRACK");
  assert.equal(formatSlaStatus(past, "closed"), "Resolved");
});
