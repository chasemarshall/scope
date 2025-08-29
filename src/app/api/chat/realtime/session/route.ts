// src/app/api/realtime/session/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const body = {
    // Your saved prompt “object” on the platform:
    prompt: {
      id: "pmpt_68aea5a2d13c8195abe54996341335f203d676cc82abcf77",
      version: "1",
    },
    // If your PMPT already sets voice/instructions, you can omit these:
    voice: "alloy",
    input_audio_transcription: { model: "whisper-1" },
    modalities: ["audio", "text"],
  };

  const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "OpenAI-Beta": "realtime=v1",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text();
    return new Response(t || "realtime create failed", { status: r.status });
  }
  const json = await r.json();
  return Response.json(json);
}
