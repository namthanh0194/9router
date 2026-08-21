import { describe, expect, it } from "vitest";
import {
  OPENCODE_GO_DEEPSEEK_TRIGGER_TOKEN_LIMIT,
  OPENCODE_GO_DEEPSEEK_TARGET_TOKEN_LIMIT,
  pruneOpenCodeGoDeepSeekContext,
} from "../../open-sse/rtk/pruneOpenCodeGoDeepSeek.js";

const large = (char, size = 600) => char.repeat(size);

describe("pruneOpenCodeGoDeepSeekContext — token limits", () => {
  it("exports trigger 850k and target 800k token limits", () => {
    expect(OPENCODE_GO_DEEPSEEK_TRIGGER_TOKEN_LIMIT).toBe(850_000);
    expect(OPENCODE_GO_DEEPSEEK_TARGET_TOKEN_LIMIT).toBe(800_000);
  });

  it("prunes down to targetTokens once triggerTokens threshold is exceeded", () => {
    const body = {
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "keep system" },
        { role: "user", content: "old request" },
        { role: "assistant", content: null, tool_calls: [{ id: "call_old", type: "function", function: { name: "read", arguments: large("a") } }] },
        { role: "tool", tool_call_id: "call_old", content: large("b") },
        { role: "assistant", content: "old answer" },
        { role: "user", content: "latest request" },
        { role: "assistant", content: "latest answer" },
      ],
    };

    const stats = pruneOpenCodeGoDeepSeekContext(body, 500, 350);

    expect(stats.pruned).toBe(true);
    expect(stats.droppedMessages).toBeGreaterThanOrEqual(2);
    expect(stats.estimatedTokensBefore).toBeGreaterThan(500);
    expect(stats.estimatedTokensAfter).toBeLessThanOrEqual(350);
    expect(body.messages.some(message => message?.tool_calls?.some(call => call.id === "call_old"))).toBe(false);
    expect(body.messages.some(message => message?.tool_call_id === "call_old")).toBe(false);
    expect(body.messages.at(-2)).toEqual({ role: "user", content: "latest request" });
    expect(body.messages.at(-1)).toEqual({ role: "assistant", content: "latest answer" });
  });

  it("does not prune if above targetTokens but below triggerTokens", () => {
    const body = {
      messages: [
        { role: "system", content: "keep system" },
        { role: "user", content: large("a", 200) },
        { role: "assistant", content: large("b", 200) },
        { role: "user", content: "latest request" },
        { role: "assistant", content: "latest answer" },
      ],
    };

    const before = JSON.parse(JSON.stringify(body));
    const stats = pruneOpenCodeGoDeepSeekContext(body, 900, 200);

    expect(stats.estimatedTokensBefore).toBeGreaterThan(200);

    expect(stats.pruned).toBe(false);

    expect(stats.droppedMessages).toBe(0);
    expect(body).toEqual(before);
  });

  it("preserves system messages and the latest user turn", () => {
    const body = {
      messages: [
        { role: "system", content: "keep system" },
        { role: "developer", content: "keep developer" },
        { role: "user", content: large("a") },
        { role: "assistant", content: large("b") },
        { role: "user", content: "latest request" },
        { role: "assistant", content: "latest answer" },
      ],
    };

    const stats = pruneOpenCodeGoDeepSeekContext(body, 400, 250);

    expect(stats.pruned).toBe(true);
    expect(body.messages).toEqual([
      { role: "system", content: "keep system" },
      { role: "developer", content: "keep developer" },
      { role: "user", content: "latest request" },
      { role: "assistant", content: "latest answer" },
    ]);
  });
});
