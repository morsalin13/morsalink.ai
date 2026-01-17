// app/api/chat/route.ts

async function geminiAnswer(prompt: string): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) throw new Error("Gemini failed");

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I couldn't generate a response."
  );
}

async function duckDuckGoAnswer(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    query
  )}&format=json&no_redirect=1&no_html=1`;

  const res = await fetch(url);
  const data = await res.json();

  return (
    data.AbstractText ||
    data.Answer ||
    data.RelatedTopics?.[0]?.Text ||
    "I searched the web but couldn't find a clear answer."
  );
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = messages[messages.length - 1]?.content;

  if (!question) {
    return new Response("Please ask a question.", { status: 400 });
  }

  let fullAnswer = "";

  // 1️⃣ Gemini → try first
  try {
    fullAnswer = await geminiAnswer(question);
  } catch {
    // 2️⃣ Gemini fail → DuckDuckGo fallback
    fullAnswer = await duckDuckGoAnswer(question);
  }

  // 🔥 STREAM the answer (ChatGPT style)
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let i = 0;

      const interval = setInterval(() => {
        if (i < fullAnswer.length) {
          controller.enqueue(encoder.encode(fullAnswer[i]));
          i++;
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, 25); // typing speed (ms)
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
