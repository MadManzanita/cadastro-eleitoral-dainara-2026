import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAllRows } from "../lib/database-pagination.mjs";

function queryFor(rows, { cap = 1000, failFrom = Infinity } = {}) {
  const ranges = [];
  return {
    ranges,
    order(field) { assert.equal(field, "id"); return this; },
    async range(from, to) {
      ranges.push([from, to]);
      if (from >= failFrom) return { data: null, error: { message: "read failed" } };
      return { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null };
    },
  };
}
for (const size of [0, 500, 1237, 2200]) {
  test(`loads every row for ${size} records`, async () => {
    const rows = Array.from({ length: size }, (_, id) => ({ id }));
    assert.deepEqual(await fetchAllRows(queryFor(rows)), { data: rows, error: null });
  });
}
test("continues when the server caps pages below the requested size", async () => {
  const rows = Array.from({ length: 1237 }, (_, id) => ({ id }));
  assert.deepEqual((await fetchAllRows(queryFor(rows, { cap: 200 }))).data, rows);
});
test("does not display a partial total if a later page fails", async () => {
  const rows = Array.from({ length: 1237 }, (_, id) => ({ id }));
  const result = await fetchAllRows(queryFor(rows, { failFrom: 500 }));
  assert.equal(result.data, null);
  assert.equal(result.error.message, "read failed");
});
