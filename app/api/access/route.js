export async function POST(request) {
  const { code } = await request.json();
  const releaseCode = process.env.RELEASE_CODE;

  if (!releaseCode) {
    return Response.json({ valid: false }, { status: 503 });
  }

  return Response.json({ valid: code === releaseCode });
}
