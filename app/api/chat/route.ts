// app/api/chat/route.ts

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content;

    if (!userMessage) {
      return new Response("No message", { status: 400 });
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
                "You are Morsalink AI. Talk naturally like ChatGPT. Be friendly, short, and human-like.",
            },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error("Groq API error:", err);
      throw new Error("Groq failed");
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content || "No response";

    // 🔥 STREAM (for typing animation)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let i = 0;
        const interval = setInterval(() => {
          if (i < text.length) {
            controller.enqueue(encoder.encode(text[i]));
            i++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 12);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("CHAT ROUTE ERROR:", e);
    return new Response(
      "Something went wrong. Please try again.",
      { status: 500 }
    );
  }
}
