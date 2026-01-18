import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content;

    if (!userMessage) {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    const completion = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768", // ✅ FIXED MODEL
      messages: [
        {
          role: "system",
          content:
            "You are Morsalink AI, a friendly, human-like assistant created by Morsalin. Talk naturally.",
        },
        { role: "user", content: userMessage },
      ],
    });

    const text =
      completion.choices[0]?.message?.content ||
      "I couldn’t think of a reply.";

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("GROQ ERROR:", err);
    return NextResponse.json(
      { error: "Groq request failed" },
      { status: 500 }
    );
  }
}
