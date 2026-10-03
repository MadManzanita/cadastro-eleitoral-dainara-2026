import { test } from "node:test";
import assert from "node:assert/strict";
import { manausCoverage, neighborhoodCounts, registrationTerritory } from "../lib/neighborhood-counts.mjs";

test("reproduces the reported 211 excess map registrations without changing the overall total", () => {
  const db = {
    leaderships: Array.from({ length: 27 }, () => ({ neighborhood: "Centro" })),
    activists: Array.from({ length: 208 }, (_, i) => ({ neighborhood: i < 165 ? "Centro" : "Zona Rural / Localidade" })),
    families: [
      ...Array.from({ length: 1799 }, () => ({ municipality: "Manaus", neighborhood: "Centro" })),
      ...Array.from({ length: 74 }, (_, i) => ({ municipality: "Careiro", neighborhood: i < 19 ? "Centro" : "Zona Rural / Localidade" })),
    ],
  };
  const groups = neighborhoodCounts(db), map = manausCoverage(db);
  assert.equal(groups.reduce((sum, group) => sum + group.total, 0), 2108);
  assert.equal(groups.filter((g) => g.municipality === "Manaus").reduce((sum,g) => sum + g.total,0), 1799);
  assert.equal(map.total, 1799);
  assert.equal(Object.values(map.counts).reduce((sum,n)=>sum+n,0), 1799);
  assert.equal(map.unknownMunicipality, 235);
});

test("municipality and neighborhood spelling are normalized in both views", () => {
  const db = { families: [{ municipality: " MANAUS ", neighborhood: "sao jose operario" }, { municipality: "manaus", neighborhood: "Centro" }, { municipality: "Parintins", neighborhood: "Centro" }] };
  assert.equal(manausCoverage(db).counts.Leste, 1);
  assert.equal(manausCoverage(db).counts.Sul, 1);
  assert.equal(neighborhoodCounts(db).filter(g=>g.municipality==="Manaus").reduce((s,g)=>s+g.total,0),2);
  assert.equal(registrationTerritory({ neighborhood: "Centro", manausZone: "Sul" }).municipality, "");
});

test("Manaus without a known zone is explicit and reconciles with the city filter", () => {
  const db = { families: [{ municipality: "Manaus", neighborhood: "Bairro sem identificação" }, { municipality: "Manaus" }, { municipality: "Manaus", neighborhood: "Aleixo" }] };
  const map = manausCoverage(db);
  assert.equal(map.total, 3);
  assert.equal(map.unzoned, 2);
  assert.equal(Object.values(map.counts).reduce((s,n)=>s+n,0)+map.unzoned,map.total);
});
