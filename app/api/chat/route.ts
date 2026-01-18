// app/api/chat/route.ts
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `
You are Morsalink AI, a friendly, natural, human-like assistant created by Morsalin.
Talk like ChatGPT.
Be short, clear, and helpful.
Never sound like a search engine.
Match the user's language.
`;

async function groqAnswer(messages: any[]) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192", // ✅ stable & smart
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Groq API failed");
  }

  return res.body;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const stream = await groqAnswer(messages);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Groq error" },
      { status: 500 }
    );
  }
}
