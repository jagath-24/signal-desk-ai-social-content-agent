import { describe, expect, it } from "vitest";
import { generateVariants } from "./contentGeneration";

describe("content generation", () => {
  it("returns three human-review variants in demo mode", async () => {
    const previousKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const result = await generateVariants("building a consistent content system");
    if (previousKey) process.env.GROQ_API_KEY = previousKey;
    expect(result.provider).toBe("demo");
    expect(result.variants).toHaveLength(3);
    expect(result.variants.map((variant) => variant.tone)).toEqual(["professional", "casual", "punchy"]);
  });
});
