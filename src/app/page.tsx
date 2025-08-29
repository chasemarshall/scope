"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Orbit,
  Plus,
  Send,
  Mic,
  PanelRightOpen,
  PanelRightClose,
  Edit3,
  Search as SearchIcon,
  Check,
  Brain,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TranscriptionResponse {
  text: string;
}

/** SSE line parser for OpenAI chat streams (choices[].delta.content) */
async function* parseSSEStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string, void, unknown> {
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
        } catch {}
      }
    }
  }
}

export default function Page() {
  // Chat & UI state
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // feature flags moved under the "+" popover
  const [webSearch, setWebSearch] = useState(false);
  const [thinkHarder, setThinkHarder] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // mic state (client-side recorder → /api/transcribe)
  const [micActive, setMicActive] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Cleanup MediaRecorder and audio stream on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && micActive) {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [micActive]);

  // threads (stub)
  const [threads, setThreads] = useState<string[]>([
    "Project notes",
    "Ideas",
    "Untitled chat",
  ]);

  // scrolling
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs]);

  // textarea auto-grow + morph pill → rounded rectangle after >2 lines
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [isTall, setIsTall] = useState(false);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const lineHeight = 24; // px
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 240); // cap height ~ 8–9 lines
    el.style.height = next + "px";
    setIsTall(next > lineHeight * 2 + 6); // switch only after >2 lines
  }, [input]);

  // layout columns (fixed width rail when collapsed)
  const gridCols = useMemo(
    () => (sidebarOpen ? "280px 1fr" : "64px 1fr"),
    [sidebarOpen]
  );

  /** Optimized message update for streaming */
  const updateLastMessage = useCallback((content: string) => {
    setMsgs((p) => {
      const updated = [...p];
      updated[updated.length - 1] = { role: "assistant", content };
      return updated;
    });
  }, []);

  /** Send a text message to our streaming endpoint */
  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (threads.length === 0) setThreads(["New chat"]);
    if (threads[0] === "Untitled chat")
      setThreads((t) => [text.slice(0, 32), ...t.slice(1)]);

    const next: ChatMessage[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: next, webSearch, thinkHarder }),
      });
      if (!res.ok || !res.body) throw new Error("No stream");

      setMsgs((p) => [...p, { role: "assistant", content: "" }]);
      let acc = "";
      let lastUpdateTime = Date.now();
      
      for await (const tok of parseSSEStream(res.body)) {
        acc += tok;
        const now = Date.now();
        // Throttle updates to every 16ms (60fps) or when complete
        if (now - lastUpdateTime > 16) {
          updateLastMessage(acc);
          lastUpdateTime = now;
        }
      }
      // Final update to ensure complete content
      updateLastMessage(acc);
    } catch (e) {
      setMsgs((p) => [
        ...p,
        { role: "assistant", content: "⚠️ Connection lost. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, msgs, threads, webSearch, thinkHarder, updateLastMessage]);

  /** Start/stop mic and transcribe with whisper-1 via /api/transcribe */
  async function toggleMic() {
    if (micActive) {
      mediaRecorderRef.current?.stop();
      setMicActive(false);
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("file", blob, "speech.webm");

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          if (res.ok) {
            const { text }: TranscriptionResponse = await res.json();
            if (text && text.trim()) {
              setInput((prev) => (prev ? prev + " " + text : text));
            }
          } else {
            console.error("Transcription failed with status:", res.status);
          }
        } catch (error) {
          console.error("Transcription request failed:", error);
        }
        
        // Clean up stream and refs
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
      };

      mr.start(250);
      mediaRecorderRef.current = mr;
      setMicActive(true);
    } catch (error) {
      console.error("Failed to start microphone:", error);
      setMicActive(false);
    }
  }

  // close + menu when clicking outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setShowPlusMenu(false);
    }
    if (showPlusMenu) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showPlusMenu]);

  return (
    <div className="h-dvh w-full grid" style={{ gridTemplateColumns: gridCols }}>
      {/* Sidebar */}
      <aside className="h-full border-r border-[rgb(var(--border))] bg-[rgb(var(--panel))] overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center gap-2 px-2 sm:px-3 border-b border-[rgb(var(--border))]">
          <div className="size-7 rounded-xl bg-white/5 grid place-items-center ml-1">
            <Orbit size={16} />
          </div>

          {sidebarOpen && <div className="font-medium tracking-tight ml-1">Scope</div>}

          {/* Collapse/Expand control */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="ml-auto relative grid place-items-center size-8 rounded-lg hover:bg-white/5 group"
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? (
              // When open: show the "close" control
              <PanelRightClose size={16} />
            ) : (
              // When collapsed: show ONE icon — logo, which swaps to "open" on hover
              <span className="relative block w-4 h-4">
                <Orbit
                  size={16}
                  className="absolute inset-0 m-auto transition-opacity duration-150 group-hover:opacity-0"
                />
                <PanelRightOpen
                  size={16}
                  className="absolute inset-0 m-auto opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                />
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        {sidebarOpen ? (
          <div className="p-3 space-y-2">
            <button
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-[rgb(var(--border))] hover:bg-white/5 transition"
              onClick={() => setThreads((t) => ["Untitled chat", ...t])}
            >
              <Plus size={16} /> New chat
            </button>
            <button className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-[rgb(var(--border))] hover:bg-white/5 transition">
              <SearchIcon size={16} /> Search
            </button>

            <div className="pt-2">
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
          </div>
        ) : (
          // collapsed icon rail (fixed 64px; buttons won't squish)
          <div className="py-3 grid gap-2 justify-items-center" style={{ width: 64 }}>
            <button
              title="New chat"
              onClick={() => setThreads((t) => ["Untitled chat", ...t])}
              className="size-10 rounded-lg grid place-items-center hover:bg-white/5"
            >
              <Edit3 size={16} />
            </button>
            <button title="Search" className="size-10 rounded-lg grid place-items-center hover:bg-white/5">
              <SearchIcon size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <section className="h-full bg-[rgb(var(--panel-2))] flex flex-col">
        {/* Header */}
        <header className="h-14 px-4 flex items-center">
          <div className="font-medium tracking-tight">Chat</div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <div className="mx-auto w-full max-w-3xl space-y-3 pb-28">
            {msgs.map((m, idx) => (
              <div
                key={idx}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
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

        {/* Composer (floating) */}
        <div className="pointer-events-none relative">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl px-4 pb-5">
            <div
              className={[
                "flex items-center gap-2 border border-[rgb(var(--border))] bg-neutral-900/70 p-2 shadow-lg",
                isTall ? "rounded-2xl" : "rounded-full",
              ].join(" ")}
            >
              {/* Plus + Popover (opens ABOVE the pill) */}
              <div className="relative">
                <button
                  title="Add"
                  onClick={() => setShowPlusMenu((v) => !v)}
                  className="grid place-items-center size-9 rounded-full hover:bg-black/40 transition"
                >
                  <Plus size={18} />
                </button>

                {showPlusMenu && (
                  <div
                    ref={menuRef}
                    className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-[rgb(var(--border))] bg-neutral-900/95 backdrop-blur px-2 py-2 shadow-xl"
                  >
                    <div className="text-[11px] uppercase text-neutral-500 px-2 pb-1">Modes</div>
                    <button
                      onClick={() => setWebSearch((v) => !v)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-sm"
                    >
                      <span className="grid place-items-center size-5 rounded-full border border-neutral-700">
                        {webSearch && <Check size={12} />}
                      </span>
                      <SearchIcon size={16} className="opacity-80" />
                      <span className="flex-1">Web search</span>
                    </button>
                    <button
                      onClick={() => setThinkHarder((v) => !v)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 text-sm"
                    >
                      <span className="grid place-items-center size-5 rounded-full border border-neutral-700">
                        {thinkHarder && <Check size={12} />}
                      </span>
                      <Brain size={16} className="opacity-80" />
                      <span className="flex-1">Think harder</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <textarea
                ref={areaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder={loading ? "Thinking…" : "Ask anything"}
                disabled={loading}
                className="flex-1 bg-transparent resize-none outline-none placeholder:text-neutral-500 py-2 px-1"
                style={{ maxHeight: 240 }}
                aria-label="Message input"
              />

              {/* Mic: records → /api/transcribe → inserts text */}
              <button
                title={micActive ? "Stop recording" : "Start recording"}
                onClick={toggleMic}
                className="grid place-items-center size-9 rounded-full hover:bg-black/40 transition"
                aria-label={micActive ? "Stop recording" : "Start voice recording"}
                aria-pressed={micActive}
              >
                <Mic size={18} />
              </button>

              {/* Send: circular */}
              <button
                onClick={onSend}
                disabled={loading || !input.trim()}
                title="Send message"
                className="grid place-items-center size-9 rounded-full border border-[rgb(var(--border))] bg-white/5 hover:bg-white/10 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>

            {/* Active badges (subtle blue) */}
            {(webSearch || thinkHarder) && (
              <div className="mt-3 flex items-center gap-2">
                {webSearch && (
                  <span
                    className="inline-flex items-center gap-2 h-8 rounded-full border px-3 text-xs"
                    style={{
                      backgroundColor: "rgba(96, 165, 250, 0.12)",
                      borderColor: "rgba(96, 165, 250, 0.35)",
                      color: "rgb(191, 219, 254)",
                    }}
                  >
                    <SearchIcon size={16} />
                    Web search
                  </span>
                )}
                {thinkHarder && (
                  <span
                    className="inline-flex items-center gap-2 h-8 rounded-full border px-3 text-xs"
                    style={{
                      backgroundColor: "rgba(96, 165, 250, 0.12)",
                      borderColor: "rgba(96, 165, 250, 0.35)",
                      color: "rgb(191, 219, 254)",
                    }}
                  >
                    <Brain size={16} />
                    Think harder
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 text-[11px] text-neutral-500 text-center">
              AI can make mistakes — Validate important info.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
