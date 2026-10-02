// A stable ID order breaks ties in the caller's existing sort order.
// Continue until an empty page, including when the server caps page size.
export async function fetchAllRows(query) {
  const rows = [];
  const ordered = query.order("id", { ascending: true });
  const pageSize = 500;
  while (true) {
    const { data, error } = await ordered.range(rows.length, rows.length + pageSize - 1);
    if (error) return { data: null, error };
    if (!data?.length) return { data: rows, error: null };
    rows.push(...data);
  }
}
