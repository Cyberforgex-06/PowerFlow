import { test } from "node:test";
import assert from "node:assert/strict";
import { billStatus, outstanding, safeNext } from "../src/lib/billing";
import type { Tables } from "../src/lib/database.types";
test("unpaid past-due bills become overdue, including after partial pending states", () => {
  assert.equal(
    billStatus({ status: "pending", due_date: "2026-09-29" }, "2026-09-30"),
    "overdue",
  );
  assert.equal(
    billStatus({ status: "pending", due_date: "2026-09-30" }, "2026-09-30"),
    "pending",
  );
  assert.equal(
    billStatus({ status: "paid", due_date: "2026-09-29" }, "2026-09-30"),
    "paid",
  );
  assert.equal(
    billStatus({ status: "cancelled", due_date: "2026-09-29" }, "2026-09-30"),
    "cancelled",
  );
});
test("balance excludes paid and cancelled bills", () => {
  const bills = [
    { status: "pending", total_amount: 18450 },
    { status: "overdue", total_amount: 2500 },
    { status: "paid", total_amount: 9000 },
    { status: "cancelled", total_amount: 500 },
  ] as Tables<"bills">[];
  assert.equal(outstanding(bills), 20950);
});
test("authentication callback permits only the known reset destination", () => {
  for (const input of [
    "https://evil.example",
    "//evil.example",
    "/admin",
    "/\\evil.example",
    null,
  ])
    assert.equal(safeNext(input), "/dashboard");
  assert.equal(safeNext("/reset-password"), "/reset-password");
});
