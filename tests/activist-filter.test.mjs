import test from "node:test";
import assert from "node:assert/strict";
import { filterActivistsByLeadership } from "../lib/activist-filter.mjs";

const activists = [
  { id: "a1", name: "Ana", leaderId: "l1" },
  { id: "a2", name: "Bia", leaderId: "l2" },
  { id: "a3", name: "Caio", leaderId: "l1" },
];

test("mostra somente ativistas da liderança selecionada", () => {
  assert.deepEqual(filterActivistsByLeadership(activists, "l1").map((item) => item.id), ["a1", "a3"]);
  assert.deepEqual(filterActivistsByLeadership(activists, "l2").map((item) => item.id), ["a2"]);
});

test("sem liderança selecionada mantém todos os ativistas", () => {
  assert.deepEqual(filterActivistsByLeadership(activists, ""), activists);
});
