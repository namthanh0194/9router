export const ANTIGRAVITY_CONTEXT_TOKEN_LIMIT = 850_000;
export const ANTIGRAVITY_CONTEXT_TRIGGER_TOKEN_LIMIT = ANTIGRAVITY_CONTEXT_TOKEN_LIMIT;
export const ANTIGRAVITY_CONTEXT_TARGET_TOKEN_LIMIT = ANTIGRAVITY_CONTEXT_TOKEN_LIMIT;

function countPartChars(part) {
  if (!part || typeof part !== "object") return 0;
  if (typeof part.text === "string") return part.text.length;
  if (part.functionCall) {
    const nameLen = part.functionCall.name ? part.functionCall.name.length : 0;
    const argsLen = part.functionCall.args
      ? (typeof part.functionCall.args === "string" ? part.functionCall.args.length : JSON.stringify(part.functionCall.args).length)
      : 0;
    return nameLen + argsLen;
  }
  if (part.functionResponse) {
    const nameLen = part.functionResponse.name ? part.functionResponse.name.length : 0;
    const respLen = part.functionResponse.response
      ? (typeof part.functionResponse.response === "string" ? part.functionResponse.response.length : JSON.stringify(part.functionResponse.response).length)
      : 0;
    return nameLen + respLen;
  }
  if (part.inlineData) {
    // Gemini vision standard image cost: ~258 tokens (equiv. ~1032 characters)
    return 1032;
  }
  return 0;
}

export function estimateTokens(body) {
  try {
    const request = body?.request || body;
    const contents = Array.isArray(request?.contents) ? request.contents : null;
    if (!contents) {
      const json = JSON.stringify(body, (key, value) => key === "thoughtSignature" ? undefined : value);
      return Math.ceil(json.length / 4);
    }

    let totalChars = 0;
    if (request.systemInstruction?.parts && Array.isArray(request.systemInstruction.parts)) {
      for (const p of request.systemInstruction.parts) {
        totalChars += countPartChars(p);
      }
    }
    if (request.tools) {
      totalChars += JSON.stringify(request.tools).length;
    }
    for (const c of contents) {
      if (Array.isArray(c?.parts)) {
        for (const p of c.parts) {
          totalChars += countPartChars(p);
        }
      }
    }

    return Math.ceil(totalChars / 4) + (contents.length * 4);
  } catch {
    return 0;
  }
}

function toolKey(value) {
  return value?.id || value?.name || null;
}

function isToolPair(callContent, responseContent) {
  const calls = (callContent?.parts || [])
    .map(part => toolKey(part.functionCall))
    .filter(Boolean);
  const responses = new Set((responseContent?.parts || [])
    .map(part => toolKey(part.functionResponse))
    .filter(Boolean));
  return calls.length > 0 && calls.every(key => responses.has(key));
}

function isNaturalUserTurn(content) {
  if (content?.role !== "user" || !Array.isArray(content.parts)) return false;
  if (content.parts.some(part => part.functionResponse)) return false;
  return content.parts.some(part => typeof part.text === "string" || part.inlineData || part.fileData);
}

function findLatestUserIndex(contents) {
  for (let index = contents.length - 1; index >= 0; index--) {
    if (isNaturalUserTurn(contents[index])) return index;
  }
  return -1;
}

function findOldestToolPair(contents, latestUserIndex) {
  const maxSearchIndex = latestUserIndex > 0 ? latestUserIndex - 1 : contents.length - 2;
  // Always preserve contents[0] (initial user prompt) and keep at least 4 contents total
  for (let index = 1; index <= maxSearchIndex; index++) {
    if (contents.length <= 4) return -1;
    if (isToolPair(contents[index], contents[index + 1])) return index;
  }
  return -1;
}

function findOldestConversationTurn(contents, latestUserIndex) {
  if (latestUserIndex <= 2) return null;
  for (let index = 1; index < latestUserIndex; index++) {
    if (!isNaturalUserTurn(contents[index])) continue;
    let endIndex = latestUserIndex - 1;
    for (let nextIndex = index + 1; nextIndex < latestUserIndex; nextIndex++) {
      if (isNaturalUserTurn(contents[nextIndex])) {
        endIndex = nextIndex - 1;
        break;
      }
    }
    return { startIndex: index, endIndex };
  }
  return null;
}

export function pruneAntigravityContext(
  body,
  triggerTokens = ANTIGRAVITY_CONTEXT_TRIGGER_TOKEN_LIMIT,
  targetTokens = ANTIGRAVITY_CONTEXT_TARGET_TOKEN_LIMIT,
  enabled = true,
) {
  const contents = body?.request?.contents;
  const estimatedTokensBefore = estimateTokens(body);
  const stats = {
    pruned: false,
    droppedContents: 0,
    floorReached: false,
    estimatedTokensBefore,
    estimatedTokensAfter: estimatedTokensBefore,
  };

  if (!enabled || !Array.isArray(contents) || estimatedTokensBefore <= triggerTokens) return stats;

  while (stats.estimatedTokensAfter > targetTokens) {
    const latestUserIndex = findLatestUserIndex(contents);
    if (latestUserIndex <= 0) break;

    const pairIndex = findOldestToolPair(contents, latestUserIndex);
    if (pairIndex >= 0) {
      contents.splice(pairIndex, 2);
      stats.droppedContents += 2;
    } else {
      const turn = findOldestConversationTurn(contents, latestUserIndex);
      if (!turn) break;
      const count = turn.endIndex - turn.startIndex + 1;
      contents.splice(turn.startIndex, count);
      stats.droppedContents += count;
    }
    stats.estimatedTokensAfter = estimateTokens(body);
  }

  stats.pruned = stats.droppedContents > 0;
  stats.floorReached = stats.estimatedTokensAfter > targetTokens;
  return stats;
}
