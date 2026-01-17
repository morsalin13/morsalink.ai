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

// 🔹 Wikipedia fallback (NO API KEY)
async function wikipediaAnswer(query: string): Promise<string> {
  // 1) search title
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json&origin=*`;

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const title = searchData?.query?.search?.[0]?.title;
  if (!title) return "";

  // 2) fetch summary
  const summaryRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`
  );
  const summaryData = await summaryRes.json();

  return summaryData?.extract || "";
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = messages[messages.length - 1]?.content;

  if (!question) {
    return new Response("Please ask a question.", { status: 400 });
  }

  let fullAnswer = "";

  // 1️⃣ Try Gemini
  try {
    fullAnswer = await geminiAnswer(question);
  } catch {
    // 2️⃣ Fallback to Wikipedia only
    fullAnswer =
      (await wikipediaAnswer(question)) ||
      "I couldn't find a clear answer.";
  }

  // 🔥 STREAM response (ChatGPT-style typing)
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
      }, 10); // typing speed (fast & smooth)
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
