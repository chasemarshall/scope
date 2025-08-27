"use client";

import { useEffect, useRef, useState } from "react";
import { Orbit, Plus, Send, Mic } from "lucide-react";
import TogglePill from "../../components/ui/TogglePill";
type Msg = { role: "user" | "assistant"; content: string };

/** SSE line parser for OpenAI chat streams */
async function* parseSSEStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      for (const line of chunk.split("\n")) {
        const s = line.trim();
        if (!s.startsWith("data:")) continue;
        const data = s.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string") yield delta;
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
}

export default function Page() {
  // chat state
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // UI state
  const [webSearch, setWebSearch] = useState(false);
  const [thinkHarder, setThinkHarder] = useState(false);

  // chat history (stubbed)
  const [threads, setThreads] = useState<string[]>(["Project notes", "Ideas", "Untitled chat"]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs]);

  async function onSend() {
    const text = input.trim();
    if (!text || loading) return;

    // basic title update for first thread
    if (threads.length === 0) setThreads(["New chat"]);
    if (threads[0] === "Untitled chat") setThreads(t => [text.slice(0, 32), ...t.slice(1)]);

    const next: Msg[] = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: next,
          webSearch,
          thinkHarder,
        }),
      });
      if (!res.ok || !res.body) throw new Error("No stream");

      setMsgs(prev => [...prev, { role: "assistant", content: "" }]);
      let acc = "";
      for await (const tok of parseSSEStream(res.body)) {
        acc += tok;
        setMsgs(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e) {
      setMsgs(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ Streaming failed. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-dvh w-full grid" style={{ gridTemplateColumns: "280px 1fr" }}>
      {/* Sidebar */}
      <aside className="h-full border-r border-[rgb(var(--border))] bg-[rgb(var(--panel))]">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-[rgb(var(--border))]">
          <div className="size-7 rounded-xl bg-white/5 flex items-center justify-center">
            <Orbit size={16} />
          </div>
          <div className="font-medium tracking-tight">Scope</div>
        </div>

        <div className="p-3">
          <button
            className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-[rgb(var(--border))] hover:bg-white/5 transition"
            onClick={() => setThreads(t => ["Untitled chat", ...t])}
          >
            <Plus size={16} /> New chat
          </button>
        </div>

        <div className="px-2">
          <div className="text-xs uppercase text-neutral-500 px-2 mb-2">Chats</div>
          <nav className="space-y-1 pr-1">
            {threads.map((t, i) => (
              <button
                key={i}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-[rgb(var(--border))] truncate"
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <section className="h-full bg-[rgb(var(--panel-2))] flex flex-col">
        {/* Header with expanding pills */}
        <header className="h-14 border-b border-[rgb(var(--border))] px-4 flex items-center justify-between">
          <div className="font-medium tracking-tight">Chat</div>
          <div className="flex items-center gap-2">
            <TogglePill
              label="Web search"
              icon="search"
              active={webSearch}
              onToggle={setWebSearch}
            />
            <TogglePill
              label="Think harder"
              icon="think"
              active={thinkHarder}
              onToggle={setThinkHarder}
            />
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-3xl space-y-3">
            {msgs.length === 0 && (
              <div className="text-sm text-neutral-400">
                Welcome to <span className="text-neutral-200">Scope</span>. Say hi — I’ll stream responses.
              </div>
            )}
            {msgs.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "px-4 py-3 rounded-2xl border max-w-[85%] leading-relaxed",
                    m.role === "user"
                      ? "bg-black/60 border-[rgb(var(--border))]"
                      : "bg-neutral-900/70 border-[rgb(var(--border))]",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Composer with +, mic, send */}
        <div className="border-t border-[rgb(var(--border))] p-4">
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-[rgb(var(--border))] bg-neutral-900/70 p-2">
              {/* Plus button on far left */}
              <button
                title="Add"
                className="p-2 rounded-xl border border-[rgb(var(--border))] hover:bg-black/50"
              >
                <Plus size={18} />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder={loading ? "Thinking…" : "Message…"}
                disabled={loading}
                className="flex-1 bg-transparent resize-none outline-none placeholder:text-neutral-500 p-2"
              />

              {/* Mic button */}
              <button
                title="Voice input"
                className="p-2 rounded-xl border border-[rgb(var(--border))] hover:bg-black/50 disabled:opacity-50"
                disabled={loading}
              >
                <Mic size={18} />
              </button>

              {/* Send button */}
              <button
                onClick={onSend}
                disabled={loading || !input.trim()}
                className="p-2 rounded-xl border border-[rgb(var(--border))] hover:bg-black/50 disabled:opacity-50"
                title="Send"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 text-center">
              Scope · minimal · OLED-dark · streaming
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
