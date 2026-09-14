import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ error: "O acesso por SMS está temporariamente suspenso. Use a senha da Rede de confiança." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}

