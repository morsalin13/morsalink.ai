"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm Morsalink AI. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [imageMode, setImageMode] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;

    const userMsg: Msg = { role: "user", content: input.trim() };

    // show user msg instantly + empty assistant bubble
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    setImgUrl(null);

    try {
      if (imageMode) {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userMsg.content }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Image generation failed");
        setImgUrl(data.url);
        setLoading(false);
        return;
      }

      // 🔥 STREAMING CHAT (no cursor)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      }

      setLoading(false);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "⚠️ " + (e?.message || "Something went wrong") },
      ]);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl flex min-h-screen flex-col">
        {/* HEADER */}
        <header className="border-b border-zinc-800 p-4 text-center">
          <h1 className="text-xl font-bold tracking-wide bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Morsalink AI
          </h1>
        </header>

        {/* CHAT */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={`inline-block max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap
                ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-900 border border-zinc-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {imgUrl && (
            <img
              src={imgUrl}
              alt="generated"
              className="rounded-xl border border-zinc-700 max-w-full"
            />
          )}

          {loading && <div className="text-sm text-zinc-400">AI is typing…</div>}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <footer className="border-t border-zinc-800 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400 select-none">
            <input
              type="checkbox"
              checked={imageMode}
              onChange={(e) => setImageMode(e.target.checked)}
            />
            Image mode
          </label>

          <div className="relative">
            <input
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-5 py-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={imageMode ? "Describe image…" : "Message Morsalink AI"}
            />
            <button
              onClick={send}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition"
              aria-label="Send"
            >
              ↑
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
