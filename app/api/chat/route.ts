// app/api/chat/route.ts

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages" }),
        { status: 400 }
      );
    }

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content:
                "You are Morsalink AI, a friendly, human-like assistant created by Morsalin. Talk naturally like ChatGPT.",
            },
            ...messages,
          ],
          temperature: 0.7,
          stream: false, // 🔴 VERY IMPORTANT
        }),
      }
    );

    const data = await groqRes.json();

    const text =
      data?.choices?.[0]?.message?.content ??
      "I couldn’t generate a response.";

    return new Response(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Groq error:", err);
    return new Response("Groq error", { status: 500 });
  }
}
