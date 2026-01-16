import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages : [];

    // Simple transcript বানাচ্ছি (chat->text prompt)
    const transcript = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const ai = new GoogleGenAI({ apiKey });

    // ✅ Google docs example অনুযায়ী model
    const resp = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: transcript || "Say hi!",
    });

    return NextResponse.json({ text: resp.text ?? "" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Gemini chat error" },
      { status: 500 }
    );
  }
}
