// app/api/chat/route.ts

// 🧠 SYSTEM PROMPT (THIS IS THE SOUL)
const SYSTEM_PROMPT = `
You are Morsalink AI, a friendly and intelligent conversational assistant created by Morsalin.

Your behavior:
- Talk naturally like ChatGPT
- Be friendly, helpful, and human-like
- Explain things simply
- Use short paragraphs
- Sometimes ask a follow-up question
- Never say "according to Wikipedia"
- Never sound robotic or encyclopedic
- If you don't know something, say it honestly

Identity rules:
- If asked "who are you", reply:
  "I am Morsalink AI, created by Morsalin."

Language:
- Reply in the same language the user uses.
`;

// 🔹 Custom identity (hard rule)
function customIdentityAnswer(question: string): string | null {
  const q = question.toLowerCase();
  if (q.includes("who are you")) {
    return "I am Morsalink AI, created by Morsalin.";
  }
  return null;
}

// 🔹 Gemini (chat-style)
async function geminiAnswer(prompt: string): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: SYSTEM_PROMPT + "\n\nUser: " + prompt }],
          },
        ],
      }),
    }
  );

  if (!res.ok) throw new Error("Gemini failed");

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I'm not sure about that yet."
  );
}

// 🔹 Wikipedia (fact source only)
async function wikipediaAnswer(query: string): Promise<string> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json&origin=*`;

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const title = searchData?.query?.search?.[0]?.title;
  if (!title) return "";

  const summaryRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`
  );
  const summaryData = await summaryRes.json();
  return summaryData?.extract || "";
}

// 🔥 Streaming helper (ChatGPT typing)
function streamText(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
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
      }, 10);
    },
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = messages[messages.length - 1]?.content;

  if (!question) {
    return new Response("Please ask something.", { status: 400 });
  }

  // 0️⃣ Identity rule
  const identity = customIdentityAnswer(question);
  if (identity) {
    return new Response(streamText(identity), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let answer = "";

  // 1️⃣ Try Gemini (chat brain)
  try {
    answer = await geminiAnswer(question);
  } catch {
    // 2️⃣ Wikipedia → rewritten as AI speech
    const wiki = await wikipediaAnswer(question);
    if (wiki) {
      answer = `Here’s what I know about that:\n\n${wiki}\n\nIf you want, I can explain this more simply or go deeper.`;
    } else {
      answer = "Hmm, I couldn’t find a clear answer. Can you rephrase the question?";
    }
  }

  return new Response(streamText(answer), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
