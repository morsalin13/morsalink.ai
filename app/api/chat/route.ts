import Groq from "groq-sdk";

export const runtime = "nodejs"; // IMPORTANT

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages,
    });

    const text = completion.choices[0].message.content;

    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    console.error("GROQ ERROR:", e);
    return new Response("SERVER_ERROR", { status: 500 });
  }
}
