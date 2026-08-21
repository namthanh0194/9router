import { describe, expect, it } from "vitest";
import {
  OPENCODE_GO_DEEPSEEK_TRIGGER_TOKEN_LIMIT,
  OPENCODE_GO_DEEPSEEK_TARGET_TOKEN_LIMIT,
  pruneOpenCodeGoDeepSeekContext,
} from "../../open-sse/rtk/pruneOpenCodeGoDeepSeek.js";

const large = (char, size = 600) => char.repeat(size);

describe("pruneOpenCodeGoDeepSeekContext — conservative token estimation", () => {
  it("uses ~1.5 bytes per token estimation rather than optimistic 2 bytes", () => {
    const body = {
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: large("a", 1500) }],
    };

    const stats = pruneOpenCodeGoDeepSeekContext(body, 2000, 1000);
    expect(stats.estimatedTokensBefore).toBeGreaterThan(900);
  });

  it("reports floorReached when context is pruned but cannot reach targetTokens safely", () => {
    const body = {
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "keep system" },
        { role: "user", content: "old request" },
        { role: "assistant", content: null, tool_calls: [{ id: "call_old", type: "function", function: { name: "read", arguments: large("a", 300) } }] },
        { role: "tool", tool_call_id: "call_old", content: large("b", 300) },
        { role: "assistant", content: "old answer" },
        { role: "user", content: large("latest user", 1200) },
        { role: "assistant", content: "latest answer" },
      ],
    };

    const stats = pruneOpenCodeGoDeepSeekContext(body, 500, 200);

    expect(stats.pruned).toBe(true);
    expect(stats.droppedMessages).toBeGreaterThanOrEqual(2);
    expect(stats.estimatedTokensAfter).toBeGreaterThan(200);
    expect(stats.floorReached).toBe(true);
    expect(body.messages.some(message => message?.tool_call_id === "call_old")).toBe(false);
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
    expect(stats.floorReached).toBe(false);
    expect(stats.droppedMessages).toBeGreaterThanOrEqual(2);
    expect(stats.estimatedTokensBefore).toBeGreaterThan(500);
    expect(stats.estimatedTokensAfter).toBeLessThanOrEqual(350);
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
    const stats = pruneOpenCodeGoDeepSeekContext(body, 1200, 200);

    expect(stats.estimatedTokensBefore).toBeGreaterThan(200);
    expect(stats.pruned).toBe(false);
    expect(stats.floorReached).toBe(false);
    expect(stats.droppedMessages).toBe(0);
    expect(body).toEqual(before);
  });
});

