// app/api/chat/route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192", // ✅ FIXED MODEL
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      max_tokens: 512,
    });

    const text =
      completion.choices[0]?.message?.content ||
      "I couldn't think of a reply.";

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("GROQ ERROR:", err);
    return NextResponse.json(
      { text: "⚠️ AI error. Please try again." },
      { status: 500 }
    );
  }
}
