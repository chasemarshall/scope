// src/app/api/transcribe/route.ts
import { NextRequest } from "next/server";

interface OpenAITranscriptionResponse {
  text: string;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Get the API key from cookie or environment
  let apiKey: string | null = null;
  
  // Try to get from cookie first
  apiKey = req.cookies.get('setting_openai-key')?.value ?? null;
  
  // If no user key in cookie, fall back to environment variable
  if (!apiKey) {
    apiKey = process.env.OPENAI_API_KEY ?? null;
  }

  if (!apiKey) {
    console.error("No OpenAI API key configured for transcription");
    return new Response("Service unavailable - no API key", { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return new Response("missing file", { status: 400 });

  const upstream = new FormData();
  upstream.append("file", file, file.name || "audio.webm");
  upstream.append("model", "whisper-1");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (!r.ok) return new Response(await r.text(), { status: r.status });
  const data = await r.json() as OpenAITranscriptionResponse;
  return Response.json({ text: data.text ?? "" });
}

// (Optional sanity check so visiting /api/transcribe in a browser proves the route exists)
export async function GET() {
  return new Response("use POST", { status: 405 });
}

