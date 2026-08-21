import fs from "node:fs";

const path = "open-sse/translator/request/openai-responses.js";
let source = fs.readFileSync(path, "utf8");

const oldHelper = `const clampCallId = (id) => (typeof id === "string" && id.length > MAX_CALL_ID_LEN ? id.substring(0, MAX_CALL_ID_LEN) : id);`;
const newHelper = `${oldHelper}

function normalizeToolArguments(value) {
  if (typeof value !== "string") return JSON.stringify(value ?? {});
  try {
    JSON.parse(value);
    return value;
  } catch {
    // ponytail: fallback to empty JSON object when client history has truncated/malformed arguments.
    return "{}";
  }
}`;

const oldCall = `arguments: typeof toolInput === "string" ? toolInput : JSON.stringify(toolInput ?? {})`;
const newCall = `arguments: normalizeToolArguments(toolInput)`;

if (!source.includes(oldHelper) || !source.includes(oldCall)) {
  throw new Error("Target fragments not found");
}

source = source.replace(oldHelper, newHelper).replace(oldCall, newCall);
fs.writeFileSync(path, source, "utf8");
console.log("Patched open-sse/translator/request/openai-responses.js");