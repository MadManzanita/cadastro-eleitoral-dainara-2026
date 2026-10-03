import { NextResponse } from "next/server";
import { sessionFromRequest, supabaseAdmin } from "../../../lib/server-auth";

export const runtime = "nodejs";
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  try {
    const session = sessionFromRequest(request);
    if (!session) return fail("Faça login para continuar.", 401);
    if (session.role !== "admin" || request.headers.get("x-access-context")) return fail("Somente o administrativo pode transferir cadastros.", 403);
    const body = await request.json();
    if (!Array.isArray(body.activistIds) || !Array.isArray(body.familyIds) ||
        ![...body.activistIds, ...body.familyIds, body.targetId].every((id) => typeof id === "string" && uuid.test(id)) ||
        !["leader", "activist"].includes(body.targetRole)) return fail("Seleção ou destino inválido.");
    const activists = [...new Set(body.activistIds)], families = [...new Set(body.familyIds)];
    if (activists.length + families.length < 1 || activists.length + families.length > 500) return fail("Selecione de 1 a 500 cadastros por transferência.");
    const { data, error } = await supabaseAdmin().rpc("transfer_trust_registrations", {
      p_actor: session.id, p_activists: activists, p_families: families,
      p_target_role: body.targetRole, p_target_id: body.targetId,
    });
    if (error) {
      if (error.code === "P0001") return fail(error.message, 409);
      if (error.code === "42501") return fail("Acesso administrativo necessário.", 403);
      throw error;
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error("trust transfer", error?.code);
    return fail("Não foi possível confirmar a transferência. Atualize a lista antes de tentar novamente.", 500);
  }
}
