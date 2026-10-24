const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = new Set(["leadership", "activist"]);

export class TermSelectionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "TermSelectionError";
    this.status = status;
  }
}
export function parseTermSelections(values, { max = 100 } = {}) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TermSelectionError("Selecione pelo menos um cadastro para gerar os termos.");
  }
  if (values.length > max) {
    throw new TermSelectionError(`Selecione no máximo ${max} cadastros por impressão.`);
  }

  const seen = new Set();
  return values.map((raw) => {
    const value = String(raw || "").trim();
    const separator = value.indexOf(":");
    const type = value.slice(0, separator);
    const id = value.slice(separator + 1);
    if (separator < 1 || !TYPES.has(type) || !UUID.test(id)) {
      throw new TermSelectionError("A seleção de cadastros é inválida. Refaça a seleção no painel.");
    }
    const key = `${type}:${id}`;
    if (seen.has(key)) {
      throw new TermSelectionError("Há um cadastro repetido na seleção. Refaça a seleção no painel.");
    }
    seen.add(key);
    return { key, type, id };
  });
}

export function orderTermRecords(selections, records) {
  const byKey = new Map();
  for (const record of records) {
    if (!record?.key || byKey.has(record.key)) {
      throw new TermSelectionError("Não foi possível confirmar o vínculo único dos cadastros.", 409);
    }
    byKey.set(record.key, record);
  }
  const ordered = selections.map((selection) => byKey.get(selection.key));
  if (ordered.some((record) => !record)) {
    throw new TermSelectionError("Um ou mais cadastros não existem, estão arquivados ou não podem ser acessados.", 404);
  }
  return ordered;
}
