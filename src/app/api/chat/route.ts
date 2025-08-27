import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Proxies OpenAI Chat Completions with stream=true.
 * We return OpenAI's SSE stream directly and parse it on the client.
 */
export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: "Upstream error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pass OpenAI's event stream straight through.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

