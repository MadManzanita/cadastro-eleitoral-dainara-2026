export const normalizePlace = (value) => String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

export function neighborhoodCounts(db) {
  const groups = new Map();
  for (const type of ["leaderships", "activists", "families"]) {
    for (const person of db[type] || []) {
      const neighborhood = person.neighborhood?.trim() || "Sem bairro informado";
      const municipality = person.municipality?.trim() || "Município não informado";
      // Legacy leader/activist records do not store a municipality: don't invent one.
      const key = JSON.stringify([normalizePlace(municipality), normalizePlace(neighborhood)]);
      if (!groups.has(key)) groups.set(key, { key, neighborhood, municipality, total: 0, leaderships: 0, activists: 0, families: 0 });
      const group = groups.get(key);
      group[type]++; group.total++;
    }
  }
  return [...groups.values()].sort((a, b) => a.neighborhood.localeCompare(b.neighborhood, "pt-BR") || a.municipality.localeCompare(b.municipality, "pt-BR"));
}
