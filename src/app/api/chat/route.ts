import { NextRequest } from "next/server";
import { ChatService } from "@/lib/db/queries";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gpt-4o-mini";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type RequestBody = {
  messages?: ChatMessage[];
  webSearch?: boolean;
  thinkHarder?: boolean;
  model?: string;
};

export async function POST(req: NextRequest) {
  // Get the API key from settings or environment
  let apiKey: string | null = null;
  
  try {
    apiKey = await ChatService.getSetting('openai-key');
  } catch {
    // If no user key stored, fall back to environment variable
    apiKey = process.env.OPENAI_API_KEY;
  }

  if (!apiKey) {
    console.error("No OpenAI API key configured");
    return new Response("Service unavailable", { status: 503 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch (error) {
    console.error("Invalid JSON in request body:", error);
    return new Response("Invalid request format", { status: 400 });
  }

  const { messages, webSearch, thinkHarder, model } = body;

  // Get selected model from request or settings, with fallback to default
  let selectedModel = model;
  if (!selectedModel) {
    try {
      selectedModel = await ChatService.getSetting('selected-model') || DEFAULT_MODEL;
    } catch {
      selectedModel = DEFAULT_MODEL;
    }
  }

  if (!Array.isArray(messages)) {
    return new Response("Messages array is required", { status: 400 });
  }

  const sysBits: string[] = [];
  if (webSearch) sysBits.push("You may reference the web when helpful.");
  if (thinkHarder) sysBits.push("Be deliberate and give clearer reasoning.");

  const system = sysBits.length
    ? `Mode flags: ${sysBits.join(" ")}`
    : "You are Scope, a calm, minimal assistant.";

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error(`OpenAI API error (${r.status}):`, errorText);
      
      if (r.status === 401) {
        return new Response("API key invalid", { status: 503 });
      } else if (r.status === 429) {
        return new Response("Rate limit exceeded", { status: 429 });
      } else if (r.status >= 500) {
        return new Response("AI service temporarily unavailable", { status: 503 });
      } else {
        return new Response("Invalid request to AI service", { status: 400 });
      }
    }

    if (!r.body) {
      console.error("OpenAI API returned no response body");
      return new Response("AI service error", { status: 503 });
    }

    // Pipe OpenAI's SSE stream directly to the client
    return new Response(r.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Unexpected error in chat API:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
