import assert from "node:assert/strict";
import { openaiResponsesToOpenAIRequest } from "../open-sse/translator/request/openai-responses.js";

const translated = openaiResponsesToOpenAIRequest("deepseek-v4-flash", {
  input: [{
    type: "function_call",
    call_id: "call_interrupted",
    name: "exec_command",
    arguments: "{\"cmd\":\"dir\"",
  }],
}, true, null);

const argumentsString = translated.messages[0].tool_calls[0].function.arguments;
assert.doesNotThrow(() => JSON.parse(argumentsString));
console.log("valid tool-call arguments");