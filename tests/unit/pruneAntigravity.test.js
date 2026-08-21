import { describe, expect, it } from "vitest";
import { pruneAntigravityContext } from "../../open-sse/rtk/pruneAntigravity.js";

const large = (char, size = 600) => char.repeat(size);

describe("pruneAntigravityContext — configurable token limits", () => {
  it("does not prune below triggerTokens even when above targetTokens", () => {
    const body = {
      request: {
        contents: [
          { role: "user", parts: [{ text: large("a", 300) }] },
          { role: "model", parts: [{ text: large("b", 300) }] },
          { role: "user", parts: [{ text: "latest request" }] },
        ],
      },
    };
    const before = structuredClone(body);

    const stats = pruneAntigravityContext(body, 900, 200);

    expect(stats.pruned).toBe(false);
    expect(body).toEqual(before);
  });

  it("prunes down to targetTokens only after triggerTokens is exceeded", () => {
    const body = {
      request: {
        contents: [
          { role: "user", parts: [{ text: large("a") }] },
          { role: "model", parts: [{ functionCall: { id: "call_old", name: "read", args: { path: large("b") } } }] },
          { role: "user", parts: [{ functionResponse: { id: "call_old", name: "read", response: { result: large("c") } } }] },
          { role: "user", parts: [{ text: "latest request" }] },
          { role: "model", parts: [{ text: "latest answer" }] },
        ],
      },
    };

    const stats = pruneAntigravityContext(body, 500, 350);

    expect(stats.pruned).toBe(true);
    expect(stats.estimatedTokensBefore).toBeGreaterThan(500);
    expect(stats.estimatedTokensAfter).toBeLessThanOrEqual(350);
    expect(body.request.contents.at(-2)).toEqual({ role: "user", parts: [{ text: "latest request" }] });
    expect(body.request.contents.at(-1)).toEqual({ role: "model", parts: [{ text: "latest answer" }] });
  });
});
