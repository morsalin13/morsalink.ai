// app/api/chat/route.ts
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `
You are Morsalink AI, a friendly, human-like assistant created by Morsalin.
Talk naturally like ChatGPT.
Keep answers clear and helpful.
Reply in the user's language.
`;

async function groqAnswer(messages: any[]) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const answer = await groqAnswer(messages);

    return NextResponse.json({ text: answer });
  } catch (err) {
    return NextResponse.json(
      { text: "⚠️ AI is temporarily unavailable. Please try again." },
      { status: 200 }
    );
  }
}
