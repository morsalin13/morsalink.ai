// app/api/chat/route.ts

// 🔹 CUSTOM IDENTITY (highest priority)
function customIdentityAnswer(question: string): string | null {
  const q = question.toLowerCase().trim();

  if (
    q === "who are you" ||
    q === "who are you?" ||
    q.includes("who are you")
  ) {
    return "I am Morsalink AI made by Morsalin.";
  }

  return null;
}

// 🔹 Gemini AI
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

// 🔹 Wikipedia fallback (no API key)
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

// 🔥 STREAM helper (ChatGPT-style)
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
      }, 10); // typing speed (fast & smooth)
    },
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = messages[messages.length - 1]?.content;

  if (!question) {
    return new Response("Please ask a question.", { status: 400 });
  }

  // 0️⃣ CUSTOM IDENTITY (highest priority)
  const identity = customIdentityAnswer(question);
  if (identity) {
    return new Response(streamText(identity), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  let fullAnswer = "";

  // 1️⃣ Gemini
  try {
    fullAnswer = await geminiAnswer(question);
  } catch {
    // 2️⃣ Wikipedia fallback
    fullAnswer =
      (await wikipediaAnswer(question)) ||
      "I couldn't find a clear answer.";
  }

  return new Response(streamText(fullAnswer), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
