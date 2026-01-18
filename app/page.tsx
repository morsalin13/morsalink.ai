"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

// 📋 copy helper
function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hi! I'm Morsalink AI. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;

    const userMsg: Msg = { role: "user", content: input.trim() };

    // show user + placeholder assistant
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
        }),
      });

      if (!res.ok) throw new Error("API error");

      const text = await res.text();

      // typing animation (UI only)
      let i = 0;
      const speed = 16;

      const interval = setInterval(() => {
        i++;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: text.slice(0, i),
          };
          return copy;
        });

        if (i >= text.length) {
          clearInterval(interval);
          setLoading(false);
        }
      }, speed);
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "⚠️ Something went wrong. Please try again.",
        };
        return copy;
      });
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

        {/* CHAT AREA */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "text-right" : "text-left"}
            >
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

              {/* assistant actions */}
              {m.role === "assistant" && m.content && (
                <div className="mt-1 flex gap-3 text-xs text-zinc-400">
                  <button
                    onClick={() => copyText(m.content)}
                    className="hover:text-white"
                    title="Copy"
                  >
                    📋
                  </button>
                  <button className="hover:text-green-400">👍</button>
                  <button className="hover:text-red-400">👎</button>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="text-sm text-zinc-400">AI is typing…</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <footer className="border-t border-zinc-800 p-4">
          <div className="relative">
            <input
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-5 py-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Message Morsalink AI"
            />
            <button
              onClick={send}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition"
            >
              ↑
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
