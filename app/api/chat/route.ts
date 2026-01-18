// app/api/chat/route.ts

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request", { status: 400 });
    }

    const res = await fetch(
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
          stream: true,
        }),
      }
    );

    if (!res.ok || !res.body) {
      throw new Error("Groq API failed");
    }

    // 🔥 STREAM RESPONSE
    const reader = res.body.getReader();
    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(encoder.encode(decoder.decode(value)));
          }
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (err) {
    return new Response("Groq error", { status: 500 });
  }
}
