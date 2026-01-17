// app/api/chat/route.ts

// 🧠 SYSTEM PROMPT (PERSONALITY)
const SYSTEM_PROMPT = `
You are Morsalink AI, a friendly and human-like conversational assistant created by Morsalin.

Rules:
- Talk like a real human, not a search engine
- Handle casual conversation naturally
- Keep replies short and warm by default
- Do NOT over-explain unless asked
- Avoid robotic or encyclopedic tone
- Ask friendly follow-up questions sometimes
- Match user's language and mood

Identity:
If asked who you are, reply:
"I am Morsalink AI, created by Morsalin."
`;

// 🔹 HUMAN / SMALL TALK RESPONSES (CORE PART)
function humanReply(question: string): string | null {
  const q = question.toLowerCase().trim();

  // greetings
  if (["hi", "hello", "hey", "yo"].includes(q))
    return "Hey 🙂 How’s it going?";

  if (q === "how are you")
    return "I’m doing good 😊 How about you?";

  if (q === "what's up" || q === "whats up")
    return "Not much, just here with you 🙂 What’s on your mind?";

  if (q === "really" || q === "really?")
    return "Yeah 🙂 What made you ask?";

  if (q === "ok" || q === "okay")
    return "Alright 👍 What would you like to talk about next?";

  if (q === "thanks" || q === "thank you")
    return "You’re welcome 😊";

  if (q === "bye" || q === "goodbye")
    return "Bye 👋 Take care!";

  if (q === "lol" || q === "haha")
    return "😄 Glad that made you smile!";

  if (q === "hmm")
    return "Thinking about something? 🤔";

  if (q === "yes")
    return "Got it 👍 Tell me more.";

  if (q === "no")
    return "Alright 🙂 What would you like instead?";

  if (q === "who made you")
    return "I was created by Morsalin.";

  if (q === "are you real")
    return "I’m not human, but I try to talk like one 🙂";

  if (q.length <= 2 || q === "?")
    return "Can you explain a bit more? I want to understand 🙂";

  return null;
}

// 🔹 IDENTITY (HARD RULE)
function identityReply(question: string): string | null {
  if (question.toLowerCase().includes("who are you")) {
    return "I am Morsalink AI, created by Morsalin.";
  }
  return null;
}

// 🔹 GEMINI (MAIN BRAIN)
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
    "Hmm, I’m not completely sure about that."
  );
}

// 🔹 WIKIPEDIA (LAST FALLBACK – FACT ONLY)
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
      }, 12); // human-like speed
    },
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = messages[messages.length - 1]?.content;

  if (!question) {
    return new Response("Please ask something.", { status: 400 });
  }

  // 0️⃣ HUMAN SMALL TALK (TOP PRIORITY)
  const human = humanReply(question);
  if (human) {
    return new Response(streamText(human), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 1️⃣ IDENTITY
  const identity = identityReply(question);
  if (identity) {
    return new Response(streamText(identity), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let answer = "";

  // 2️⃣ GEMINI
  try {
    answer = await geminiAnswer(question);
  } catch {
    // 3️⃣ WIKIPEDIA → HUMAN REWRITE
    const wiki = await wikipediaAnswer(question);
    if (wiki) {
      answer = `Alright, here’s a simple way to look at it 🙂\n\n${wiki}`;
    } else {
      answer =
        "I’m not totally sure about that 🤔 Can you ask it in a different way?";
    }
  }

  return new Response(streamText(answer), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
