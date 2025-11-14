import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // In the future: read JSON body with serialized draft, upload to Walrus
  // For now, return a stubbed manifest CID and hash
  await new Promise((r) => setTimeout(r, 600));
  const fakeCid = "bafybeigdyrstubcidexample1234567890abcdef";
  const fakeHash = "sha256-3b8a2f7f2c1a6b0c6d1e9eaa3b6f5c8d";

  return new Response(
    JSON.stringify({ ok: true, cid: fakeCid, hash: fakeHash }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}
