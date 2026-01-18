import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs"; // important for Next 15

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // ✅ LLaMA latest supported by Groq
      messages,
      temperature: 0.7,
      max_tokens: 512,
    });

    const text =
      completion.choices[0]?.message?.content ||
      "I couldn't generate a response.";

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("GROQ ERROR:", err);
    return NextResponse.json(
      { error: "Groq API error" },
      { status: 500 }
    );
  }
}
