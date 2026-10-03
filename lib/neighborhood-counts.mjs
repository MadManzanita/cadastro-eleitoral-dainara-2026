import { AMAZONAS_MUNICIPALITIES, MANAUS_ZONES } from "../app/data/territories.js";

export const normalizePlace = (value) => String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
const towns = new Map(AMAZONAS_MUNICIPALITIES.map((name) => [normalizePlace(name), name]));
const neighborhoods = new Map(Object.keys(MANAUS_ZONES).map((name) => [normalizePlace(name), name]));

export function registrationTerritory(person) {
  const rawTown = String(person.municipality || "").trim();
  const municipality = towns.get(normalizePlace(rawTown)) || rawTown;
  const rawNeighborhood = String(person.neighborhood || "").trim();
  const neighborhood = municipality === "Manaus" ? neighborhoods.get(normalizePlace(rawNeighborhood)) || rawNeighborhood : rawNeighborhood;
  return { municipality, neighborhood, manausZone: municipality === "Manaus" ? MANAUS_ZONES[neighborhood] || "" : "" };
}

export function neighborhoodCounts(db) {
  const groups = new Map();
  for (const type of ["leaderships", "activists", "families"]) {
    for (const person of db[type] || []) {
      const territory = registrationTerritory(person);
      const neighborhood = territory.neighborhood || "Sem bairro informado";
      const municipality = territory.municipality || "Município não informado";
      // Legacy leader/activist records do not store a municipality: don't invent one.
      const key = JSON.stringify([normalizePlace(municipality), normalizePlace(neighborhood)]);
      if (!groups.has(key)) groups.set(key, { key, neighborhood, municipality, total: 0, leaderships: 0, activists: 0, families: 0 });
      const group = groups.get(key);
      group[type]++; group.total++;
    }
  }
  return [...groups.values()].sort((a, b) => a.neighborhood.localeCompare(b.neighborhood, "pt-BR") || a.municipality.localeCompare(b.municipality, "pt-BR"));
}

export function manausCoverage(db) {
  const counts = Object.fromEntries([...new Set(Object.values(MANAUS_ZONES))].map((zone) => [zone, 0]));
  let total = 0, unzoned = 0, unknownMunicipality = 0;
  for (const group of neighborhoodCounts(db)) {
    if (group.municipality === "Município não informado") unknownMunicipality += group.total;
    if (group.municipality !== "Manaus") continue;
    total += group.total;
    const zone = MANAUS_ZONES[group.neighborhood];
    if (zone) counts[zone] += group.total;
    else unzoned += group.total;
  }
  return { counts, total, unzoned, unknownMunicipality };
}
