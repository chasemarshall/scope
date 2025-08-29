// src/app/api/transcribe/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return new Response("missing file", { status: 400 });

  const upstream = new FormData();
  upstream.append("file", file, file.name || "audio.webm");
  upstream.append("model", "whisper-1");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
    body: upstream as any,
  });

  if (!r.ok) return new Response(await r.text(), { status: r.status });
  const data = await r.json(); // { text: "..." }
  return Response.json({ text: data.text ?? "" });
}

// (Optional sanity check so visiting /api/transcribe in a browser proves the route exists)
export async function GET() {
  return new Response("use POST", { status: 405 });
}

