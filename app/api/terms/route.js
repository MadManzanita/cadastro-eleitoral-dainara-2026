import { NextResponse } from "next/server";
import { sessionFromRequest, supabaseAdmin } from "../../../lib/server-auth";
import { orderTermRecords, parseTermSelections, TermSelectionError } from "../../../lib/term-selection.mjs";

export const runtime = "nodejs";

const fail = (error, status = 400) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

const normalize = (type, row) => ({
  key: `${type}:${row.id}`,
  type,
  id: row.id,
  leaderId: type === "activist" ? row.leadership_id : row.id,
  name: String(row.name || "").trim(),
  cpf: String(row.cpf || "").replace(/\D/g, ""),
  address: String(row.address || "").trim(),
  neighborhood: String(row.neighborhood || "").trim(),
});

export async function GET(request) {
  try {
    const session = sessionFromRequest(request);
    if (!session || !["admin", "leader"].includes(session.role)) return fail("Faça login para gerar os termos de adesão.", 401);

    const selections = parseTermSelections(request.nextUrl.searchParams.getAll("person"));
    if (session.role === "leader" && selections.some((item) => item.type === "leadership" && item.id !== session.id)) {
      return fail("Você só pode gerar o termo da sua própria liderança.", 403);
    }

    const leadershipIds = selections.filter((item) => item.type === "leadership").map((item) => item.id);
    const activistIds = selections.filter((item) => item.type === "activist").map((item) => item.id);
    const db = supabaseAdmin();

    const leadershipQuery = leadershipIds.length
      ? db.from("leaderships").select("id,name,cpf,address,neighborhood,archived_at").in("id", leadershipIds).is("archived_at", null)
      : Promise.resolve({ data: [], error: null });
    let activistQuery = activistIds.length
      ? db.from("activists").select("id,leadership_id,name,cpf,address,neighborhood").in("id", activistIds)
      : Promise.resolve({ data: [], error: null });
    if (activistIds.length && session.role === "leader") activistQuery = activistQuery.eq("leadership_id", session.id);

    const [leaderships, activists] = await Promise.all([leadershipQuery, activistQuery]);
    if (leaderships.error) throw leaderships.error;
    if (activists.error) throw activists.error;

    const parentIds = [...new Set((activists.data || []).map((item) => item.leadership_id))];
    const parents = parentIds.length
      ? await db.from("leaderships").select("id,archived_at").in("id", parentIds).is("archived_at", null)
      : { data: [], error: null };
    if (parents.error) throw parents.error;
    const activeParentIds = new Set((parents.data || []).map((item) => item.id));

    const records = [
      ...(leaderships.data || []).map((row) => normalize("leadership", row)),
      ...(activists.data || []).filter((row) => activeParentIds.has(row.leadership_id)).map((row) => normalize("activist", row)),
    ];
    const items = orderTermRecords(selections, records);

    return NextResponse.json(
      { items, count: items.length },
      { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } },
    );
  } catch (cause) {
    if (cause instanceof TermSelectionError) return fail(cause.message, cause.status);
    console.error("terms route", cause);
    return fail("Não foi possível carregar os cadastros para os termos.", 500);
  }
}
