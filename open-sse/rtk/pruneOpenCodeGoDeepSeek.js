export const OPENCODE_GO_DEEPSEEK_TRIGGER_TOKEN_LIMIT = 850_000;
export const OPENCODE_GO_DEEPSEEK_TARGET_TOKEN_LIMIT = 800_000;
export const OPENCODE_GO_DEEPSEEK_BYTES_PER_TOKEN = 1.5;

const encoder = new TextEncoder();

function estimateTokens(body) {
  try {
    return Math.ceil(encoder.encode(JSON.stringify(body)).length / OPENCODE_GO_DEEPSEEK_BYTES_PER_TOKEN);
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

export function pruneOpenCodeGoDeepSeekContext(
  body,
  triggerTokens = OPENCODE_GO_DEEPSEEK_TRIGGER_TOKEN_LIMIT,
  targetTokens = OPENCODE_GO_DEEPSEEK_TARGET_TOKEN_LIMIT,
  enabled = true,
) {
  const messages = body?.messages;
  const estimatedTokensBefore = estimateTokens(body);
  const stats = {
    pruned: false,
    droppedMessages: 0,
    floorReached: false,
    estimatedTokensBefore,
    estimatedTokensAfter: estimatedTokensBefore,
  };

  if (!enabled || !Array.isArray(messages) || estimatedTokensBefore <= triggerTokens) return stats;

  while (stats.estimatedTokensAfter > targetTokens) {
    const latestUserIndex = findLatestUserIndex(messages);
    if (latestUserIndex <= 0) break;

    const toolPair = findOldestCompletedToolPair(messages, latestUserIndex);
    const range = toolPair || findOldestConversationTurn(messages, latestUserIndex);
    if (!range) break;

    const count = range.endIndex - range.startIndex + 1;
    messages.splice(range.startIndex, count);
    stats.droppedMessages += count;
    stats.estimatedTokensAfter = estimateTokens(body);
  }

  stats.pruned = stats.droppedMessages > 0;
  stats.floorReached = stats.estimatedTokensAfter > targetTokens;
  return stats;
}
