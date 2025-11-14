import { NextRequest } from "next/server";

function collapseSpaces(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function capitalizeFirst(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ensurePunctuation(text: string) {
  if (!text) return text;
  return /[.!?]$/.test(text) ? text : text + ".";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { text = "", action = "clarity", tone = "friendly" } = body as {
    text: string;
    action: "clarity" | "grammar" | "tone";
    tone?: string;
  };

  let transformed = text;
  if (action === "clarity") {
    transformed = collapseSpaces(text);
  } else if (action === "grammar") {
    transformed = ensurePunctuation(capitalizeFirst(collapseSpaces(text)));
  } else if (action === "tone") {
    const tag = tone?.toLowerCase() || "friendly";
    transformed = `[${tag}] ` + collapseSpaces(text);
  }

  // Simulate latency for UX
  await new Promise((r) => setTimeout(r, 300));

  return new Response(JSON.stringify({ transformedText: transformed }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
