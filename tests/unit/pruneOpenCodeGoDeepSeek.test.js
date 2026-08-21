import { describe, expect, it } from "vitest";
import { pruneOpenCodeGoDeepSeekContext } from "../../open-sse/rtk/pruneOpenCodeGoDeepSeek.js";

const large = (char, size = 600) => char.repeat(size);

describe("pruneOpenCodeGoDeepSeekContext", () => {
  it("drops oldest completed tool exchanges before old conversation turns", () => {
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

    const stats = pruneOpenCodeGoDeepSeekContext(body, 1_100);

    expect(stats.pruned).toBe(true);
    expect(stats.droppedMessages).toBeGreaterThanOrEqual(2);
    expect(stats.bytesAfter).toBeLessThanOrEqual(1_100);
    expect(body.messages.some(message => message?.tool_calls?.some(call => call.id === "call_old"))).toBe(false);
    expect(body.messages.some(message => message?.tool_call_id === "call_old")).toBe(false);
    expect(body.messages.at(-2)).toEqual({ role: "user", content: "latest request" });
    expect(body.messages.at(-1)).toEqual({ role: "assistant", content: "latest answer" });
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

    const stats = pruneOpenCodeGoDeepSeekContext(body, 600);

    expect(stats.pruned).toBe(true);
    expect(body.messages).toEqual([
      { role: "system", content: "keep system" },
      { role: "developer", content: "keep developer" },
      { role: "user", content: "latest request" },
      { role: "assistant", content: "latest answer" },
    ]);
  });

  it("does nothing when the request already fits", () => {
    const body = { messages: [{ role: "user", content: "hi" }] };

    expect(pruneOpenCodeGoDeepSeekContext(body, 1_000)).toMatchObject({
      pruned: false,
      droppedMessages: 0,
    });
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
  });
});

