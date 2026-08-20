const KEY = "dainara-eleitoral-test-data";

const initialData = {
  leaders: [{ id: "leader-demo", name: "Liderança de teste", cpf: "", title: "", createdAt: new Date().toISOString() }],
  activists: [],
  admins: []
};

export function getData() {
  if (typeof window === "undefined") return initialData;
  try { return JSON.parse(localStorage.getItem(KEY)) || initialData; } catch { return initialData; }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function addRecord(type, record) {
  const data = getData();
  data[type] = [...data[type], { ...record, id: crypto.randomUUID(), createdAt: new Date().toISOString() }];
  saveData(data);
  return data;
}

export function updateRecord(type, id, changes) {
  const data = getData();
  data[type] = data[type].map((record) =>
    record.id === id ? { ...record, ...changes, updatedAt: new Date().toISOString() } : record
  );
  saveData(data);
  return data;
}
