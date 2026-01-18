// app/api/chat/route.ts

// 🧠 SYSTEM PROMPT (SIMPLE & NORMAL)
const SYSTEM_PROMPT = `
You are Morsalink AI, a friendly and natural conversational assistant created by Morsalin.

Guidelines:
- Talk normally like ChatGPT
- Be friendly and human-like
- Answer even casual or silly questions naturally
- Do NOT act like a dictionary or search engine
- Keep answers clear and natural
- Match the user's language (Bangla / English / mixed)
- If unsure, respond honestly instead of making things up

Identity:
If asked who you are, reply clearly:
"I am Morsalink AI, created by Morsalin."
`;

// 🔹 IDENTITY RULE (ONLY ONE HARD RULE)
function identityReply(question: string): string | null {
  if (question.toLowerCase().includes("who are you")) {
    return "I am Morsalink AI, created by Morsalin.";
  }
  return null;
}

// 🔹 GROQ (ONLY BRAIN)
async function groqAnswer(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("GROQ ERROR:", err);
    throw new Error("Groq failed");
  }

  const data = await res.json();
  return (
    data.choices?.[0]?.message?.content ||
    "Hmm 🤔 I’m not sure how to answer that."
  );
}

// 🔥 STREAMING (ChatGPT-like typing)
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
      }, 14); // natural typing speed
    },
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = messages[messages.length - 1]?.content;

  if (!question) {
    return new Response("Ask me something 🙂", { status: 400 });
  }

  // 🔹 Identity check
  const identity = identityReply(question);
  if (identity) {
    return new Response(streamText(identity), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 🔹 Everything else → Groq
  try {
    const answer = await groqAnswer(question);
    return new Response(streamText(answer), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(
      streamText(
        "Something went wrong 😕 Please try again."
      ),
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
