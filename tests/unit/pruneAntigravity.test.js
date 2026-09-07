import { describe, expect, it } from "vitest";
import { pruneAntigravityContext } from "../../open-sse/rtk/pruneAntigravity.js";

const large = (char, size = 800) => char.repeat(size);

describe("pruneAntigravityContext — configurable token limits", () => {
  it("ignores thought signatures when estimating context tokens", () => {
    const body = {
      request: {
        contents: [
          { role: "user", parts: [{ text: "read the file" }] },
          { role: "model", parts: [{ thoughtSignature: large("s", 10_000), functionCall: { id: "call_1", name: "read", args: { path: "README.md" } } }] },
          { role: "user", parts: [{ functionResponse: { id: "call_1", name: "read", response: { result: "small result" } } }] },
          { role: "user", parts: [{ text: "latest request" }] },
        ],
      },
    };
    const before = structuredClone(body);

    const stats = pruneAntigravityContext(body, 500, 300);

    expect(stats.pruned).toBe(false);
    expect(stats.estimatedTokensBefore).toBeLessThan(500);
    expect(body).toEqual(before);
  });

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

  it("preserves initial user prompt and latest user turn when pruning", () => {
    const body = {
      request: {
        contents: [
          { role: "user", parts: [{ text: "System / initial user instruction" }] },
          { role: "model", parts: [{ functionCall: { id: "c1", name: "view_file", args: { path: large("x", 1000) } } }] },
          { role: "user", parts: [{ functionResponse: { id: "c1", name: "view_file", response: { result: large("y", 1000) } } }] },
          { role: "user", parts: [{ text: "Latest user prompt" }] },
          { role: "model", parts: [{ text: "Latest model reply" }] },
        ],
      },
    };

    const stats = pruneAntigravityContext(body, 400, 200);
    expect(stats.pruned).toBe(true);
    expect(body.request.contents[0].parts[0].text).toBe("System / initial user instruction");
    expect(body.request.contents.at(-2).parts[0].text).toBe("Latest user prompt");
    expect(body.request.contents.at(-1).parts[0].text).toBe("Latest model reply");
  });

  it("flags floorReached when target cannot be reached without dropping safe turns", () => {
    const body = {
      request: {
        contents: [
          { role: "user", parts: [{ text: large("init", 500) }] },
          { role: "user", parts: [{ text: large("latest", 500) }] },
        ],
      },
    };
    const stats = pruneAntigravityContext(body, 200, 100);
    expect(stats.floorReached).toBe(true);
    expect(stats.pruned).toBe(false);
    expect(body.request.contents.length).toBe(2);
  });

  it("does not prune a ~100k token conversation when trigger is set to 800k", () => {
    // 100 tool pairs of ~2.5KB each (~250KB content = ~65k tokens)
    const contents = [{ role: "user", parts: [{ text: "Initial instructions" }] }];
    for (let i = 0; i < 100; i++) {
      contents.push({
        role: "model",
        parts: [{ functionCall: { id: `c_${i}`, name: "bash", args: { command: "npm test" } } }]
      });
      contents.push({
        role: "user",
        parts: [{ functionResponse: { id: `c_${i}`, name: "bash", response: { result: "test log output line\n".repeat(100) } } }]
      });
    }
    contents.push({ role: "user", parts: [{ text: "Latest query" }] });

    const body = {
      request: {
        contents,
        tools: [{ functionDeclarations: [{ name: "bash", description: "Run bash", parameters: { type: "object" } }] }]
      }
    };

    const stats = pruneAntigravityContext(body, 800_000, 750_000);
    expect(stats.pruned).toBe(false);
    expect(stats.estimatedTokensBefore).toBeLessThan(800_000);
    expect(body.request.contents.length).toBe(202);
  });
});
