import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    const publisher = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space";
    const search = req.nextUrl.search || "";
    const url = `${publisher}/v1/quilts${search}`;

    const headers = new Headers();
    const ct = req.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    const auth = req.headers.get("authorization");
    if (auth) headers.set("authorization", auth);

    const res = await fetch(url, { method: "PUT", headers, body: req.body as any, // stream the incoming body
      // Node.js fetch requires duplex when a ReadableStream body is provided
      // @ts-expect-error: duplex is a Node-specific extension
      duplex: "half" });
    const contentType = res.headers.get("content-type") || "";
    const status = res.status;

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Walrus error", status, body: text }, { status });
    }

    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status });
    } else {
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status,
        headers: { "content-type": contentType || "application/octet-stream" },
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Proxy failed" }, { status: 500 });
  }
}
