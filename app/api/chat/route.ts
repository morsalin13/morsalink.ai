// app/api/chat/route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    const chat = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
    });

    const text =
      chat.choices?.[0]?.message?.content ||
      "I couldn't think of a reply.";

    // IMPORTANT: plain text response
    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("Groq error:", err);
    return new NextResponse(
      "⚠️ AI error. Check server logs.",
      { status: 500 }
    );
  }
}
