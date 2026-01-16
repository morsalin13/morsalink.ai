import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const token = process.env.HF_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "HF_TOKEN missing in .env.local" },
        { status: 500 }
      );
    }

    const { prompt } = await req.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 🔥 BEST FREE MODEL (fast + decent quality)
    const model = "black-forest-labs/FLUX.1-schnell";

    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            guidance_scale: 7,
            num_inference_steps: 30,
            width: 768,
            height: 768,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: `HF error ${response.status}: ${err}` },
        { status: 500 }
      );
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return NextResponse.json({
      url: `data:image/png;base64,${base64}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Image generation failed" },
      { status: 500 }
    );
  }
}
