// app/api/chat/route.ts

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content;

    if (!userMessage) {
      return new Response("No message", { status: 400 });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
              "You are Morsalink AI, a friendly, human-like assistant. Talk naturally like ChatGPT.",
          },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Groq error:", err);
      throw new Error("Groq failed");
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "No response";

    // streaming-style response
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
    console.error(e);
    return new Response("AI is temporarily unavailable.", { status: 500 });
  }
}
