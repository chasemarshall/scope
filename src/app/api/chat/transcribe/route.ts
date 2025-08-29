import { NextRequest } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return new Response("no file", { status: 400 });

  const upstream = new FormData();
  upstream.append("file", file, file.name || "audio.webm");
  upstream.append("model", "whisper-1"); // transcription model
  // Optional: language hints or prompt
  // upstream.append("language", "en");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
    body: upstream as any,
  });

  if (!r.ok) {
    const t = await r.text();
    return new Response(t, { status: r.status });
  }
  const data = await r.json();
  return Response.json({ text: data.text ?? "" });
}
