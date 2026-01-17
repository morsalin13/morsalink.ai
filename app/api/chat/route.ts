import { NextResponse } from "next/server";

async function geminiAnswer(prompt: string) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) throw new Error("Gemini failed");

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function duckDuckGoAnswer(query: string) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    query
  )}&format=json&no_redirect=1&no_html=1`;

  const res = await fetch(url);
  const data = await res.json();

  return (
    data.AbstractText ||
    data.Answer ||
    data.RelatedTopics?.[0]?.Text ||
    "I searched the web but couldn't find a clear answer."
  );
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = messages[messages.length - 1]?.content;

  if (!question) {
    return NextResponse.json({ text: "Please ask a question." });
  }

  // 1️⃣ Try Gemini first
  try {
    const geminiText = await geminiAnswer(question);
    if (geminiText) {
      return NextResponse.json({ text: geminiText });
    }
  } catch (err) {
    // ❌ Gemini failed → silently fallback
  }

  // 2️⃣ Fallback to DuckDuckGo (NO ERROR TO USER)
  const ddgText = await duckDuckGoAnswer(question);
  return NextResponse.json({ text: ddgText });
}
