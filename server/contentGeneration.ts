import type { SocialPost } from "../drizzle/schema";

type Tone = SocialPost["tone"];
export type GeneratedVariant = {
  title: string;
  tone: Tone;
  copy: string;
  hashtags: string;
};

const toneInstructions: Record<Tone, string> = {
  professional: "clear, strategic, credible, and useful for a thoughtful LinkedIn audience",
  casual: "warm, conversational, approachable, and lightly playful",
  punchy: "short, opinionated, high-contrast, and memorable with an energetic hook",
};

function normalizeJson(text: string): GeneratedVariant[] {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { variants?: GeneratedVariant[] } | GeneratedVariant[];
  return Array.isArray(parsed) ? parsed : parsed.variants ?? [];
}

function fallbackVariants(topic: string): GeneratedVariant[] {
  const label = topic.trim().replace(/\.$/, "");
  return [
    {
      title: `A practical lens on ${label}`,
      tone: "professional",
      copy: `The best way to think about ${label.toLowerCase()} is not as a one-off tactic — but as a system.\n\nStart with one repeatable behavior, make the outcome visible, and give it enough time to compound. Simple is not shallow when it is practiced consistently.`,
      hashtags: "#Strategy #BuildBetter",
    },
    {
      title: `${label}: the honest version`,
      tone: "casual",
      copy: `A small reminder about ${label.toLowerCase()}: you do not need a perfect process to make progress.\n\nPick the next useful step, make it easy to repeat, and let the work teach you what to improve.`,
      hashtags: "#CreatorWorkflow #KeepGoing",
    },
    {
      title: `Stop overcomplicating ${label}`,
      tone: "punchy",
      copy: `${label} does not need more noise.\n\nIt needs a sharper question.\n\nThen one useful move.\n\nThat is the whole playbook.`,
      hashtags: "#Focus #WorkSmarter",
    },
  ];
}

export async function generateVariants(topic: string): Promise<{ variants: GeneratedVariant[]; provider: "groq" | "demo" }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { variants: fallbackVariants(topic), provider: "demo" };

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const prompt = `Create exactly three social media post variants for this topic: "${topic}". Use one variant for each tone: professional, casual, punchy. Each variant should be under 280 words, have a concise title, natural line breaks, and 2-4 relevant hashtags. Return only valid JSON in this shape: {"variants":[{"title":"...","tone":"professional|casual|punchy","copy":"...","hashtags":"#one #two"}]}`;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: "system", content: `You are a senior social editor. Write ${toneInstructions.professional}, ${toneInstructions.casual}, and ${toneInstructions.punchy} variants.` },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    console.warn(`[Groq] Request failed with ${response.status}; using demo variants`);
    return { variants: fallbackVariants(topic), provider: "demo" };
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return { variants: fallbackVariants(topic), provider: "demo" };
  try {
    const variants = normalizeJson(content).filter((variant) => ["professional", "casual", "punchy"].includes(variant.tone));
    return { variants: variants.length === 3 ? variants : fallbackVariants(topic), provider: variants.length === 3 ? "groq" : "demo" };
  } catch {
    return { variants: fallbackVariants(topic), provider: "demo" };
  }
}
