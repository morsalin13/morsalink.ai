// app/api/chat/route.ts

// 🧠 SYSTEM PROMPT (PERSONALITY)
const SYSTEM_PROMPT = `
You are Morsalink AI, a friendly and human-like conversational assistant created by Morsalin.

Rules:
- Talk naturally like a real person
- Handle casual conversation properly
- Do NOT sound like a search engine
- Do NOT over-explain unless asked
- Avoid robotic or encyclopedic tone
- If unsure, ask a friendly follow-up
- Match the user's language and mood

Identity:
If asked who you are, reply:
"I am Morsalink AI, created by Morsalin."
`;

// 🔹 SMALL TALK & HUMAN RESPONSES (VERY IMPORTANT)
function smallTalkAnswer(question: string): string | null {
  const q = question.toLowerCase().trim();

  // greetings
  if (["hi", "hello", "hey", "yo"].includes(q)) {
    return "Hey 🙂 How’s it going?";
  }

  if (q === "how are you") {
    return "I’m doing great, thanks for asking 😊 How about you?";
  }

  if (q === "really" || q === "really?") {
    return "Yeah 🙂 What made you ask?";
  }

  if (q === "ok" || q === "okay") {
    return "Alright 👍 What would you like to talk about?";
  }

  if (q === "thanks" || q === "thank you") {
    return "You’re welcome! 😊";
  }

  if (q === "bye") {
    return "Bye 👋 Talk to you later!";
  }

  if (q === "?" || q.length <= 2) {
    return "Can you tell me a bit more? I want to understand 🙂";
  }

  return null;
}

// 🔹 IDENTITY (HARD RULE)
function customIdentityAnswer(question: string): string | null {
  const q = question.toLowerCase();
  if (q.includes("who are you")) {
    return "I am Morsalink AI, created by Morsalin.";
  }
  return null;
}

// 🔹 GEMINI (CHAT BRAIN)
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
    "Hmm, I’m not fully sure about that yet."
  );
}

// 🔹 WIKIPEDIA (FACT SOURCE ONLY)
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

// 🔥 STREAMING (ChatGPT-style typing)
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

  // 0️⃣ SMALL TALK (HIGHEST PRIORITY)
  const smallTalk = smallTalkAnswer(question);
  if (smallTalk) {
    return new Response(streamText(smallTalk), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 1️⃣ IDENTITY
  const identity = customIdentityAnswer(question);
  if (identity) {
    return new Response(streamText(identity), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let answer = "";

  // 2️⃣ GEMINI (REAL CHAT)
  try {
    answer = await geminiAnswer(question);
  } catch {
    // 3️⃣ WIKIPEDIA → HUMAN REWRITE
    const wiki = await wikipediaAnswer(question);
    if (wiki) {
      answer = `Okay, let me explain this simply 🙂\n\n${wiki}\n\nIf you want, I can explain it in another way or go deeper.`;
    } else {
      answer = "Hmm, I’m not sure about that. Can you ask it another way?";
    }
  }

  return new Response(streamText(answer), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
