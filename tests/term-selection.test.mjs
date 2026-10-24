import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { orderTermRecords, parseTermSelections, TermSelectionError } from "../lib/term-selection.mjs";

const leader = "11111111-1111-4111-8111-111111111111";
const activist = "22222222-2222-4222-8222-222222222222";

test("preserva tipo e ordem exatos da seleção", () => {
  const selected = parseTermSelections([`activist:${activist}`, `leadership:${leader}`]);
  const ordered = orderTermRecords(selected, [
    { key: `leadership:${leader}`, name: "Liderança" },
    { key: `activist:${activist}`, name: "Ativista" },
  ]);
  assert.deepEqual(ordered.map((item) => item.name), ["Ativista", "Liderança"]);
});
test("rejeita cadastros repetidos para impedir duplicidade no lote", () => {
  assert.throws(
    () => parseTermSelections([`leadership:${leader}`, `leadership:${leader}`]),
    (error) => error instanceof TermSelectionError && /repetido/.test(error.message),
  );
});

test("cancela o lote inteiro quando algum cadastro não é encontrado", () => {
  const selected = parseTermSelections([`leadership:${leader}`, `activist:${activist}`]);
  assert.throws(
    () => orderTermRecords(selected, [{ key: `leadership:${leader}`, name: "Liderança" }]),
    (error) => error instanceof TermSelectionError && error.status === 404,
  );
});

test("mantém o modelo original byte a byte", async () => {
  const file = await readFile(new URL("../public/modelos/modelo-termo-adesao.docx", import.meta.url));
  const hash = createHash("sha256").update(file).digest("hex").toUpperCase();
  assert.equal(hash, "FEA25DAEF31EAD1A0CD3C4C51DEB158012340F43CE197A20F8A73DB6EC9756E6");
});
