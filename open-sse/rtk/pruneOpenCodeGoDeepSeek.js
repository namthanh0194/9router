export const OPENCODE_GO_DEEPSEEK_CONTEXT_BYTE_LIMIT = 1_200_000;

const encoder = new TextEncoder();

function serializedBytes(body) {
  try {
    return encoder.encode(JSON.stringify(body)).length;
  } catch {
    return 0;
  }
}

function isNaturalUserMessage(message) {
  return message?.role === "user";
}

function findLatestUserIndex(messages) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (isNaturalUserMessage(messages[index])) return index;
  }
  return -1;
}

function findOldestCompletedToolPair(messages, latestUserIndex) {
  for (let index = 0; index < latestUserIndex; index++) {
    const toolCallIds = new Set((messages[index]?.tool_calls || []).map(call => call?.id).filter(Boolean));
    if (toolCallIds.size === 0) continue;

    const resultIds = new Set();
    let endIndex = index;
    for (let nextIndex = index + 1; nextIndex < latestUserIndex && messages[nextIndex]?.role === "tool"; nextIndex++) {
      const resultId = messages[nextIndex]?.tool_call_id;
      if (resultId) resultIds.add(resultId);
      endIndex = nextIndex;
    }

    if (endIndex > index && [...toolCallIds].every(id => resultIds.has(id))) {
      return { startIndex: index, endIndex };
    }
  }
  return null;
}

function findOldestConversationTurn(messages, latestUserIndex) {
  for (let index = 0; index < latestUserIndex; index++) {
    if (!isNaturalUserMessage(messages[index])) continue;

    let endIndex = latestUserIndex - 1;
    for (let nextIndex = index + 1; nextIndex < latestUserIndex; nextIndex++) {
      if (isNaturalUserMessage(messages[nextIndex])) {
        endIndex = nextIndex - 1;
        break;
      }
    }

    const turn = messages.slice(index, endIndex + 1);
    if (turn.some(message => message?.role === "system" || message?.role === "developer")) continue;
    return { startIndex: index, endIndex };
  }
  return null;
}

export function pruneOpenCodeGoDeepSeekContext(body, maxBytes = OPENCODE_GO_DEEPSEEK_CONTEXT_BYTE_LIMIT) {
  const messages = body?.messages;
  const bytesBefore = serializedBytes(body);
  const stats = {
    pruned: false,
    droppedMessages: 0,
    bytesBefore,
    bytesAfter: bytesBefore,
  };

  if (!Array.isArray(messages) || bytesBefore <= maxBytes) return stats;

  while (stats.bytesAfter > maxBytes) {
    const latestUserIndex = findLatestUserIndex(messages);
    if (latestUserIndex <= 0) break;

    const toolPair = findOldestCompletedToolPair(messages, latestUserIndex);
    const range = toolPair || findOldestConversationTurn(messages, latestUserIndex);
    if (!range) break;

    const count = range.endIndex - range.startIndex + 1;
    messages.splice(range.startIndex, count);
    stats.droppedMessages += count;
    stats.bytesAfter = serializedBytes(body);
  }

  stats.pruned = stats.droppedMessages > 0;
  return stats;
}

