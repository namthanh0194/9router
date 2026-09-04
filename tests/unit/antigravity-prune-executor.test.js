import { describe, expect, it } from "vitest";
import { AntigravityExecutor } from "../../open-sse/executors/antigravity.js";

const large = (char, size = 600) => char.repeat(size);

const credentials = {
  projectId: "synthetic-project",
  connectionId: "synthetic-connection",
};

describe("AntigravityExecutor dynamic context pruning", () => {
  it("uses dynamic trigger and target thresholds passed to transformRequest", () => {
    const executor = new AntigravityExecutor();
    const body = {
      stream: true,
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

    const output = executor.transformRequest("gemini-3.7-flash", body, true, credentials, {
      antigravity: { triggerTokens: 500, targetTokens: 250 },
    });

    expect(output.request.contents).toHaveLength(2);
    expect(output.request.contents.at(-2)).toEqual({ role: "user", parts: [{ text: "latest request" }] });
    expect(output.request.contents.at(-1)).toEqual({ role: "model", parts: [{ text: "latest answer" }] });
  });
});
